import { Router } from 'express';
import { body } from 'express-validator';
import { DatabaseService } from '../services/database';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();

// Validation rules for member onboarding
const memberOnboardingValidation = [
  body('memberId').isUUID().withMessage('Valid member ID is required'),
  body('recoveryGoals').isArray().withMessage('Recovery goals must be an array'),
  body('wellnessGoals').isArray().withMessage('Wellness goals must be an array'),
  body('anxietyLevel').isInt({ min: 1, max: 10 }).withMessage('Anxiety level must be between 1-10'),
  body('depressionLevel').isInt({ min: 1, max: 10 }).withMessage('Depression level must be between 1-10'),
  body('stressLevel').isInt({ min: 1, max: 10 }).withMessage('Stress level must be between 1-10'),
  body('supportNeeds').isArray().withMessage('Support needs must be an array'),
  body('groupSize').isIn(['small', 'medium', 'large']).withMessage('Invalid group size'),
  body('sessionFrequency').isIn(['daily', 'weekly', 'biweekly']).withMessage('Invalid session frequency'),
];

// Validation rules for therapist onboarding
const therapistOnboardingValidation = [
  body('memberId').isUUID().withMessage('Valid member ID is required'),
  body('licenseNumber').notEmpty().withMessage('License number is required'),
  body('licenseState').notEmpty().withMessage('License state is required'),
  body('licenseExpiration').isISO8601().withMessage('Valid license expiration date is required'),
  body('specializations').isArray().withMessage('Specializations must be an array'),
  body('yearsExperience').isInt({ min: 0 }).withMessage('Years of experience must be a positive number'),
  body('education').notEmpty().withMessage('Education background is required'),
  body('bio').isLength({ min: 50 }).withMessage('Bio must be at least 50 characters'),
  body('approachStyle').notEmpty().withMessage('Therapeutic approach is required'),
  body('languagesSpoken').isArray().withMessage('Languages spoken must be an array'),
];

// Validation rules for admin onboarding
const adminOnboardingValidation = [
  body('memberId').isUUID().withMessage('Valid member ID is required'),
  body('mfaEnabled').isBoolean().withMessage('MFA status is required'),
  body('completedHIPAATraining').isBoolean().withMessage('HIPAA training status is required'),
  body('completedSecurityTraining').isBoolean().withMessage('Security training status is required'),
  body('completedPlatformTraining').isBoolean().withMessage('Platform training status is required'),
  body('completedCrisisProtocol').isBoolean().withMessage('Crisis protocol training status is required'),
];

// Complete member onboarding
router.post('/member/complete', validateRequest(memberOnboardingValidation), asyncHandler(async (req, res) => {
  const {
    memberId,
    recoveryGoals,
    wellnessGoals,
    customGoals,
    anxietyLevel,
    depressionLevel,
    stressLevel,
    supportNeeds,
    previousExperience,
    groupSize,
    sessionFrequency,
    timePreference,
    communicationStyle,
    privacyLevel
  } = req.body;

  try {
    // Update member with onboarding data
    await dbService.updateMember(memberId, {
      recoveryGoals: JSON.stringify(recoveryGoals),
      wellnessGoals: JSON.stringify(wellnessGoals)
    });

    // Create initial mood entry
    await dbService.createMoodEntry({
      memberId,
      score: Math.round((anxietyLevel + depressionLevel + stressLevel) / 3),
      emotions: JSON.stringify({
        anxiety: anxietyLevel,
        depression: depressionLevel,
        stress: stressLevel
      }),
      notes: customGoals || 'Initial onboarding assessment'
    });

    // Store onboarding preferences (you may want to create a MemberPreferences table)
    const onboardingData = {
      supportNeeds: JSON.stringify(supportNeeds),
      previousExperience,
      groupSize,
      sessionFrequency,
      timePreference,
      communicationStyle,
      privacyLevel,
      completedAt: new Date().toISOString()
    };

    // Log audit event
    await dbService.createAuditLog({
      memberId,
      action: 'onboarding_completed',
      resource: 'member_onboarding',
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
      metadata: onboardingData
    });

    logger.info(`Member onboarding completed: ${memberId}`);

    res.json({
      success: true,
      message: 'Member onboarding completed successfully',
      data: { memberId, completedAt: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Member onboarding completion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
      timestamp: new Date().toISOString()
    });
  }
}));

// Complete therapist onboarding
router.post('/therapist/complete', validateRequest(therapistOnboardingValidation), asyncHandler(async (req, res) => {
  const {
    memberId,
    licenseNumber,
    licenseState,
    licenseExpiration,
    specializations,
    yearsExperience,
    education,
    certifications,
    bio,
    approachStyle,
    languagesSpoken,
    availabilityHours,
    emergencyAvailable,
    groupSizePreference,
    uploadedFiles
  } = req.body;

  try {
    // Create or update therapist profile
    const therapistProfileData = {
      memberId,
      licenseNumber,
      specializations: JSON.stringify(specializations),
      bio,
      isVerified: false, // Requires manual verification
    };

    // Check if therapist profile already exists
    const existingProfile = await dbService.getTherapistProfile(memberId);
    if (existingProfile) {
      await dbService.updateTherapistProfile(memberId, therapistProfileData);
    } else {
      await dbService.createTherapistProfile(therapistProfileData);
    }

    // Store additional onboarding data
    const onboardingData = {
      licenseState,
      licenseExpiration,
      yearsExperience,
      education,
      certifications: JSON.stringify(certifications || []),
      approachStyle,
      languagesSpoken: JSON.stringify(languagesSpoken),
      availabilityHours,
      emergencyAvailable,
      groupSizePreference,
      uploadedFiles: JSON.stringify(uploadedFiles || {}),
      submittedAt: new Date().toISOString(),
      verificationStatus: 'pending'
    };

    // Log audit event
    await dbService.createAuditLog({
      memberId,
      action: 'therapist_onboarding_submitted',
      resource: 'therapist_onboarding',
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
      metadata: onboardingData
    });

    logger.info(`Therapist onboarding submitted: ${memberId}`);

    res.json({
      success: true,
      message: 'Therapist onboarding submitted for review',
      data: {
        memberId,
        submittedAt: new Date().toISOString(),
        verificationStatus: 'pending',
        estimatedReviewTime: '3-5 business days'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Therapist onboarding submission failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit therapist onboarding',
      timestamp: new Date().toISOString()
    });
  }
}));

// Complete admin onboarding
router.post('/admin/complete', validateRequest(adminOnboardingValidation), asyncHandler(async (req, res) => {
  const {
    memberId,
    mfaEnabled,
    securityQuestion1,
    securityAnswer1,
    securityQuestion2,
    securityAnswer2,
    memberManagement,
    therapistApproval,
    systemConfiguration,
    auditAccess,
    crisisManagement,
    dataExport,
    platformSettings,
    complianceReporting,
    completedHIPAATraining,
    completedSecurityTraining,
    completedPlatformTraining,
    completedCrisisProtocol,
    agreedToResponsibilities
  } = req.body;

  try {
    // Verify all required trainings are completed
    if (!completedHIPAATraining || !completedSecurityTraining ||
        !completedPlatformTraining || !completedCrisisProtocol ||
        !agreedToResponsibilities) {
      return res.status(400).json({
        success: false,
        error: 'All required trainings must be completed',
        timestamp: new Date().toISOString()
      });
    }

    // Update member role to admin (if not already)
    await dbService.updateMember(memberId, {
      role: 'admin'
    });

    // Store admin configuration
    const adminData = {
      mfaEnabled,
      securityQuestions: JSON.stringify([
        { question: securityQuestion1, answer: securityAnswer1 },
        { question: securityQuestion2, answer: securityAnswer2 }
      ]),
      permissions: JSON.stringify({
        memberManagement,
        therapistApproval,
        systemConfiguration,
        auditAccess,
        crisisManagement,
        dataExport,
        platformSettings,
        complianceReporting
      }),
      trainings: JSON.stringify({
        hipaa: { completed: completedHIPAATraining, completedAt: new Date().toISOString() },
        security: { completed: completedSecurityTraining, completedAt: new Date().toISOString() },
        platform: { completed: completedPlatformTraining, completedAt: new Date().toISOString() },
        crisis: { completed: completedCrisisProtocol, completedAt: new Date().toISOString() }
      }),
      agreedToResponsibilities,
      activatedAt: new Date().toISOString()
    };

    // Log audit event
    await dbService.createAuditLog({
      memberId,
      action: 'admin_onboarding_completed',
      resource: 'admin_onboarding',
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
      metadata: adminData
    });

    logger.info(`Admin onboarding completed: ${memberId}`);

    res.json({
      success: true,
      message: 'Admin onboarding completed successfully',
      data: {
        memberId,
        activatedAt: new Date().toISOString(),
        role: 'admin',
        permissions: {
          memberManagement,
          therapistApproval,
          systemConfiguration,
          auditAccess,
          crisisManagement,
          dataExport,
          platformSettings,
          complianceReporting
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Admin onboarding completion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete admin onboarding',
      timestamp: new Date().toISOString()
    });
  }
}));

// Get onboarding status
router.get('/status/:memberId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberId } = req.params;

  // Verify member can access this onboarding status
  if (req.member?.id !== memberId && req.member?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const member = await dbService.getMemberById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
        timestamp: new Date().toISOString()
      });
    }

    const status = {
      memberId,
      role: member.role,
      onboardingCompleted: false,
      verificationStatus: 'pending'
    };

    // Check role-specific onboarding status
    if (member.role === 'therapist') {
      const therapistProfile = await dbService.getTherapistProfile(memberId);
      status.onboardingCompleted = !!therapistProfile;
      status.verificationStatus = therapistProfile?.isVerified ? 'verified' : 'pending';
    } else if (member.role === 'admin') {
      // Check if admin onboarding was completed (could check audit logs)
      status.onboardingCompleted = true; // Simplified for now
      status.verificationStatus = 'active';
    } else {
      // For regular members, check if they have goals set
      status.onboardingCompleted = !!(member.recoveryGoals && member.wellnessGoals);
      status.verificationStatus = 'active';
    }

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get onboarding status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get onboarding status',
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;