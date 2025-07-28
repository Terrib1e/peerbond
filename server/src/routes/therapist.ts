import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../services/database';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();

// Validation helper
const validateRequest = (validations: any[]) => {
  return async (req: any, res: any, next: any) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
    }
    next();
  };
};

// Middleware to ensure only therapists and admins can access these routes
const therapistAuth = requireRole(['therapist', 'admin']);

// Get therapist statistics
router.get('/stats', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const therapistId = req.user!.id;

    // Get therapist's assigned clients and groups
    const [assignedClients, therapistGroups, criticalAlerts] = await Promise.all([
      dbService.getTherapistClients(therapistId),
      // Count groups that the therapist created or is a facilitator of
      dbService.client.group.count({
        where: {
          isActive: true,
          OR: [
            { createdBy: therapistId },
            { facilitatorId: therapistId },
            {
              members: {
                some: {
                  userId: therapistId,
                  role: 'facilitator'
                }
              }
            }
          ]
        }
      }),
      // Mock critical alerts for now - would come from real crisis detection
      Promise.resolve(1)
    ]);

    const totalGroups = therapistGroups;

    // Calculate engagement based on assigned clients only
    const totalClients = assignedClients.length;
    const recentActiveClients = assignedClients.filter(client => {
      if (!client.lastActive) return false;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(client.lastActive) >= sevenDaysAgo;
    }).length;

    const avgEngagement = totalClients > 0 ? Math.round((recentActiveClients / totalClients) * 100) : 0;

    const stats = {
      totalClients,
      activeGroups: totalGroups,
      criticalAlerts,
      avgEngagement
    };

    logger.info(`📊 Therapist ${therapistId} stats: ${totalClients} clients, ${totalGroups} groups`);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get therapist stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      timestamp: new Date().toISOString()
    });
  }
}));

// Get therapist's groups
router.get('/groups', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { limit = 10 } = req.query;
    const therapistId = req.user!.id;

    logger.info(`🔍 Therapist ${therapistId} requesting groups`);

    // Get groups that the therapist created or is a facilitator of
    const groups = await dbService.client.group.findMany({
      where: {
        isActive: true,
        OR: [
          { createdBy: therapistId }, // Groups created by this therapist
          { facilitatorId: therapistId }, // Groups where this therapist is facilitator
          {
            members: {
              some: {
                userId: therapistId,
                role: 'facilitator'
              }
            }
          } // Groups where therapist is a member with facilitator role
        ]
      },
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      }
    });

    logger.info(`📋 Found ${groups.length} groups for therapist ${therapistId}`);

    // Transform groups to match expected format
    const formattedGroups = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      type: group.type,
      participants: group._count.members,
      memberCount: group._count.members,
      messageCount: group._count.messages,
      isActive: group.isActive,
      createdAt: group.createdAt,
      maxMembers: group.maxMembers,
      isPrivate: group.isPrivate,
      members: group.members
    }));

    res.json({
      success: true,
      data: { groups: formattedGroups, total: formattedGroups.length },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get therapist groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get groups',
      timestamp: new Date().toISOString()
    });
  }
}));

// Create a new group
router.post('/groups', therapistAuth, validateRequest([
  body('name').trim().isLength({ min: 1 }).withMessage('Group name is required'),
  body('description').trim().isLength({ min: 1 }).withMessage('Group description is required'),
  body('type').isIn(['recovery', 'wellness', 'general', 'crisis', 'anxiety', 'depression']).withMessage('Valid group type is required'),
  body('maxMembers').optional().isInt({ min: 2, max: 50 }).withMessage('Max members must be between 2 and 50'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean')
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { name, description, type, maxMembers = 8, isPrivate = false } = req.body;
  const therapistId = req.user!.id;

  try {
    logger.info(`🏗️ Therapist ${therapistId} creating group: ${name}`);

    // Create the group
    const newGroup = await dbService.createGroup({
      name,
      description,
      type,
      maxMembers: parseInt(maxMembers),
      isPrivate: Boolean(isPrivate),
      createdBy: therapistId,
      facilitators: [therapistId] // Therapist becomes facilitator
    });

    logger.info(`✅ Group created successfully: ${newGroup.id} by therapist ${therapistId}`);

    // Log the group creation
    await dbService.createAuditLog({
      userId: therapistId,
      action: 'group_created',
      resource: 'group',
      resourceId: newGroup.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || 'unknown',
      metadata: { name, type, maxMembers, isPrivate }
    });

    logger.info(`Group created by therapist: ${name} by ${therapistId}`);

    res.status(201).json({
      success: true,
      data: { group: newGroup },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to create group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create group',
      timestamp: new Date().toISOString()
    });
  }
}));

// Create a new client
router.post('/clients', therapistAuth, validateRequest([
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phoneNumber').optional().trim(),
  body('emergencyContact').optional().isObject(),
  body('initialNotes').optional().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { firstName, lastName, email, phoneNumber, emergencyContact, initialNotes } = req.body;
  const therapistId = req.user!.id;

  try {
    // Check if user already exists
    const existingUser = await dbService.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'A user with this email already exists',
        timestamp: new Date().toISOString()
      });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

    // Create the client user account
    const newClient = await dbService.createUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'member',
      experienceLevel: 'beginner'
    });

    // Create therapist-client assignment
    await dbService.client.therapistClientAssignment.create({
      data: {
        therapistId,
        clientId: newClient.id,
        notes: initialNotes || 'Initial client assignment',
        createdBy: therapistId
      }
    });

    // Add initial therapist note if provided
    if (initialNotes) {
      await dbService.createAuditLog({
        userId: newClient.id,
        action: 'client_note_added',
        resource: 'client',
        resourceId: newClient.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
        metadata: { note: initialNotes, addedBy: therapistId }
      });
    }

    // Log the client creation
    await dbService.createAuditLog({
      userId: therapistId,
      action: 'client_created',
      resource: 'client',
      resourceId: newClient.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || 'unknown',
      metadata: { clientEmail: email, emergencyContact, phoneNumber }
    });

    logger.info(`Client created by therapist: ${email} by ${therapistId}`);

    // Remove password from response
    const { password: _, ...clientWithoutPassword } = newClient;

    res.status(201).json({
      success: true,
      data: {
        client: clientWithoutPassword,
        tempPassword, // Send this once so therapist can share with client
        message: 'Client created successfully. Please share the temporary password securely with the client.'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to create client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create client',
      timestamp: new Date().toISOString()
    });
  }
}));

// Get therapist's clients
router.get('/clients', therapistAuth, validateRequest([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('search').optional().trim(),
  query('riskLevel').optional().isIn(['high', 'medium', 'low']),
  query('progressTrend').optional().isIn(['improving', 'stable', 'declining', 'at_risk']),
  query('groupId').optional().isUUID(),
  query('engagementLevel').optional().isIn(['high', 'medium', 'low']),
  query('fields').optional().trim(),
  query('role').optional().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    riskLevel,
    progressTrend,
    groupId,
    engagementLevel,
    fields,
    role
  } = req.query;

  // Get real clients from database (only assigned to this therapist)
  const therapistId = req.user!.id;

  try {
    logger.info(`🔍 Therapist ${therapistId} requesting clients with params:`, {
      page, limit, search, riskLevel, progressTrend, groupId, engagementLevel, fields, role
    });
    const clients = await dbService.getTherapistClients(therapistId);
    logger.info(`📋 Found ${clients.length} clients for therapist ${therapistId}`);

    if (clients.length > 0) {
      clients.forEach((client, index) => {
        logger.info(`   Client ${index + 1}: ${client.firstName} ${client.lastName} (${client.email})`);
      });
    }

    // Apply pagination manually since getTherapistClients doesn't support it yet
    const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedClients = clients.slice(startIndex, endIndex);
    const totalClients = clients.length;

    // Transform clients to match expected format
    const formattedClients = paginatedClients.map(client => {
      const groups = client.groups || [];

      // If fields parameter is specified, return only those fields
      if (fields) {
        const requestedFields = (fields as string).split(',').map(f => f.trim());
        const filteredClient: any = {};

        requestedFields.forEach(field => {
          switch (field) {
            case 'id':
              filteredClient.id = client.id;
              break;
            case 'firstName':
              filteredClient.firstName = client.firstName;
              break;
            case 'lastName':
              filteredClient.lastName = client.lastName;
              break;
            case 'email':
              filteredClient.email = client.email;
              break;
            default:
              // Include any other fields that exist on the client
              if (client.hasOwnProperty(field)) {
                filteredClient[field] = (client as any)[field];
              }
          }
        });

        return filteredClient;
      }

      // Calculate engagement score based on recent activity
      const daysSinceLastActive = client.lastActive
        ? Math.floor((Date.now() - client.lastActive.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      let engagementScore = 100;
      if (daysSinceLastActive > 7) engagementScore = 25;
      else if (daysSinceLastActive > 3) engagementScore = 50;
      else if (daysSinceLastActive > 1) engagementScore = 75;

      const trend = engagementScore < 30 ? 'at_risk' :
                    engagementScore < 60 ? 'stable' : 'improving';

      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        experienceLevel: client.experienceLevel,
        isPremium: client.isPremium,
        isActive: client.isActive,
        role: client.role,
        createdAt: client.createdAt?.toISOString() || new Date().toISOString(),
        lastActive: client.lastActive?.toISOString() || null,
        assignedAt: client.assignedAt?.toISOString() || null,
        notes: client.notes,
        progress: {
          trend,
          engagementScore,
          lastActive: daysSinceLastActive === 0 ? 'Today' :
                     daysSinceLastActive === 1 ? 'Yesterday' :
                     daysSinceLastActive < 7 ? `${daysSinceLastActive} days ago` :
                     'Over a week ago',
          sessionsCompleted: 0,
          goalsMet: 0,
          totalGoals: 0,
          riskFactors: daysSinceLastActive > 7 ? ['Extended inactivity'] : [],
          recentMilestones: []
        },
        currentGroups: groups,
        emergencyContact: null
      };
    });

    logger.info(`📤 Returning ${formattedClients.length} formatted clients to therapist ${therapistId}`);

    res.json({
      success: true,
      data: {
        clients: formattedClients,
        total: totalClients
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get therapist clients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get clients',
      timestamp: new Date().toISOString()
    });
  }
}));

// Get therapist's sessions
router.get('/sessions', therapistAuth, validateRequest([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('type').optional().isIn(['individual', 'group', 'assessment', 'crisis', 'family']),
  query('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']),
  query('dateRange').optional().isIn(['upcoming', 'today', 'this_week', 'this_month', 'past', 'all']),
  query('clientId').optional().isUUID()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const mockSessions = [
    {
      id: 'session-1',
      title: 'Weekly Check-in with Sarah',
      type: 'individual',
      clientId: 'client-1',
      clientName: 'Sarah Johnson',
      scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      duration: 50,
      status: 'scheduled',
      meetingType: 'video',
      meetingLink: 'https://meet.example.com/session-1',
      objectives: ['Discuss weekly progress', 'Review coping strategies'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'session-2',
      title: 'Crisis Intervention - Michael',
      type: 'crisis',
      clientId: 'client-2',
      clientName: 'Michael Chen',
      scheduledDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
      duration: 90,
      status: 'scheduled',
      meetingType: 'phone',
      objectives: ['Address crisis situation', 'Develop safety plan'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  res.json({
    success: true,
    data: {
      sessions: mockSessions,
      total: mockSessions.length
    },
    timestamp: new Date().toISOString()
  });
}));

// Create new session
router.post('/sessions', therapistAuth, validateRequest([
  body('title').notEmpty().trim(),
  body('type').isIn(['individual', 'group', 'assessment', 'crisis', 'family']),
  body('clientId').optional().isUUID(),
  body('scheduledDate').isISO8601(),
  body('duration').isInt({ min: 15, max: 180 }),
  body('meetingType').isIn(['in_person', 'video', 'phone']),
  body('objectives').optional().isArray()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const sessionData = req.body;

  // Mock creating session
  const newSession = {
    id: `session-${Date.now()}`,
    ...sessionData,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: { session: newSession },
    timestamp: new Date().toISOString()
  });
}));

// Get assessments
router.get('/assessments', therapistAuth, validateRequest([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('clientId').optional().isUUID(),
  query('severity').optional().isIn(['minimal', 'mild', 'moderate', 'severe']),
  query('timeRange').optional().isIn(['1month', '3months', '6months', '1year', 'all'])
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const mockAssessments = [
    {
      id: 'assessment-1',
      clientId: 'client-1',
      clientName: 'Sarah Johnson',
      type: 'phq9',
      name: 'PHQ-9 (Depression)',
      score: 8,
      maxScore: 27,
      interpretation: 'Mild depression symptoms',
      severity: 'mild',
      administeredDate: new Date().toISOString(),
      administeredBy: req.user?.firstName + ' ' + req.user?.lastName,
      followUpRequired: false,
      previousScore: 12,
      percentChange: -33.3,
      aiConfidence: 0.85
    },
    {
      id: 'assessment-2',
      clientId: 'client-2',
      clientName: 'Michael Chen',
      type: 'gad7',
      name: 'GAD-7 (Anxiety)',
      score: 16,
      maxScore: 21,
      interpretation: 'Severe anxiety symptoms',
      severity: 'severe',
      administeredDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      administeredBy: req.user?.firstName + ' ' + req.user?.lastName,
      followUpRequired: true,
      previousScore: 14,
      percentChange: 14.3,
      aiConfidence: 0.92
    }
  ];

  res.json({
    success: true,
    data: {
      assessments: mockAssessments,
      total: mockAssessments.length
    },
    timestamp: new Date().toISOString()
  });
}));

// Create assessment
router.post('/assessments', therapistAuth, validateRequest([
  body('clientId').isUUID(),
  body('type').isIn(['phq9', 'gad7', 'custom', 'beck_depression', 'beck_anxiety', 'dass21']),
  body('score').isInt({ min: 0 }),
  body('maxScore').isInt({ min: 1 }),
  body('notes').optional().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const assessmentData = req.body;

  const newAssessment = {
    id: `assessment-${Date.now()}`,
    ...assessmentData,
    administeredDate: new Date().toISOString(),
    administeredBy: req.user?.firstName + ' ' + req.user?.lastName,
    aiConfidence: Math.random() * 0.3 + 0.7 // Mock confidence between 0.7-1.0
  };

  res.json({
    success: true,
    data: { assessment: newAssessment },
    timestamp: new Date().toISOString()
  });
}));

// Get goals
router.get('/goals', therapistAuth, validateRequest([
  query('clientId').optional().isUUID(),
  query('category').optional().isIn(['behavioral', 'emotional', 'cognitive', 'social', 'physical']),
  query('status').optional().isIn(['not_started', 'in_progress', 'completed', 'paused', 'abandoned'])
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const mockGoals = [
    {
      id: 'goal-1',
      clientId: 'client-1',
      clientName: 'Sarah Johnson',
      title: 'Daily Meditation Practice',
      description: 'Establish a consistent daily meditation practice to reduce anxiety and improve emotional regulation',
      category: 'emotional',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      status: 'in_progress',
      priority: 'high',
      progress: 70,
      milestones: [
        { id: 'milestone-1', title: 'Complete 5 consecutive days', completed: true, completedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'milestone-2', title: 'Complete 10 consecutive days', completed: true, completedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'milestone-3', title: 'Complete 21 consecutive days', completed: false }
      ],
      lastUpdated: new Date().toISOString(),
      createdDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'goal-2',
      clientId: 'client-2',
      clientName: 'Michael Chen',
      title: 'Attend Weekly Group Sessions',
      description: 'Consistently attend weekly group therapy sessions to build social support network',
      category: 'social',
      targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
      status: 'not_started',
      priority: 'critical',
      progress: 0,
      milestones: [
        { id: 'milestone-4', title: 'Attend first session', completed: false },
        { id: 'milestone-5', title: 'Attend 4 consecutive sessions', completed: false },
        { id: 'milestone-6', title: 'Actively participate in discussions', completed: false }
      ],
      lastUpdated: new Date().toISOString(),
      createdDate: new Date().toISOString()
    }
  ];

  res.json({
    success: true,
    data: {
      goals: mockGoals,
      total: mockGoals.length
    },
    timestamp: new Date().toISOString()
  });
}));

// Create goal
router.post('/goals', therapistAuth, validateRequest([
  body('clientId').isUUID(),
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('category').isIn(['behavioral', 'emotional', 'cognitive', 'social', 'physical']),
  body('targetDate').isISO8601(),
  body('priority').isIn(['low', 'medium', 'high', 'critical']),
  body('milestones').isArray()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const goalData = req.body;

  const newGoal = {
    id: `goal-${Date.now()}`,
    ...goalData,
    status: 'not_started',
    progress: 0,
    lastUpdated: new Date().toISOString(),
    createdDate: new Date().toISOString()
  };

  res.json({
    success: true,
    data: { goal: newGoal },
    timestamp: new Date().toISOString()
  });
}));

// Update goal progress
router.patch('/goals/:goalId', therapistAuth, validateRequest([
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('status').optional().isIn(['not_started', 'in_progress', 'completed', 'paused', 'abandoned'])
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { goalId } = req.params;
  const updates = req.body;

  // Mock update
  const updatedGoal = {
    id: goalId,
    ...updates,
    lastUpdated: new Date().toISOString()
  };

  res.json({
    success: true,
    data: { goal: updatedGoal },
    timestamp: new Date().toISOString()
  });
}));

// Get crisis alerts
router.get('/crisis-alerts', therapistAuth, validateRequest([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('status').optional().isIn(['active', 'acknowledged', 'in_progress', 'resolved', 'false_positive']),
  query('alertType').optional().isIn(['ai_detected', 'manual_flag', 'assessment_score', 'inactivity', 'keywords', 'self_report']),
  query('timeRange').optional().isIn(['1h', '24h', '7d', '30d', 'all'])
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const mockAlerts = [
    {
      id: 'alert-1',
      clientId: 'client-2',
      clientName: 'Michael Chen',
      clientPhone: '+1-555-0456',
      alertType: 'ai_detected',
      severity: 'critical',
      status: 'active',
      triggeredBy: 'AI Analysis Engine',
      triggerDetails: {
        message: 'I feel like I can\'t go on anymore. Everything seems hopeless.',
        keywords: ['hopeless', 'can\'t go on'],
        context: 'Private message in Anxiety Support group'
      },
      aiConfidence: 0.94,
      riskFactors: ['Suicidal ideation keywords', 'Extended inactivity', 'Missed therapy sessions', 'High anxiety scores'],
      recommendedActions: ['Immediate contact', 'Crisis intervention', 'Emergency contact notification', 'Safety plan activation'],
      emergencyContacts: [
        { name: 'Lisa Chen', phone: '+1-555-0456', relationship: 'Sister' },
        { name: 'Crisis Hotline', phone: '988', relationship: 'Crisis Support' }
      ],
      assignedTherapist: req.user?.firstName + ' ' + req.user?.lastName,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      followUpRequired: true,
      escalationLevel: 5
    },
    {
      id: 'alert-2',
      clientId: 'client-1',
      clientName: 'Sarah Johnson',
      clientPhone: '+1-555-0123',
      alertType: 'assessment_score',
      severity: 'medium',
      status: 'acknowledged',
      triggeredBy: 'Assessment System',
      triggerDetails: {
        score: 15,
        context: 'GAD-7 assessment score increased from 8 to 15'
      },
      aiConfidence: 0.78,
      riskFactors: ['Increased anxiety symptoms', 'Score deterioration'],
      recommendedActions: ['Schedule follow-up session', 'Review treatment plan', 'Consider medication adjustment'],
      emergencyContacts: [
        { name: 'John Johnson', phone: '+1-555-0123', relationship: 'Spouse' }
      ],
      assignedTherapist: req.user?.firstName + ' ' + req.user?.lastName,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      acknowledgedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      followUpRequired: true,
      escalationLevel: 2
    }
  ];

  res.json({
    success: true,
    data: {
      alerts: mockAlerts,
      total: mockAlerts.length
    },
    timestamp: new Date().toISOString()
  });
}));

// Get crisis statistics
router.get('/crisis-stats', therapistAuth, validateRequest([
  query('timeRange').optional().isIn(['1h', '24h', '7d', '30d', 'all'])
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const mockStats = {
    criticalAlerts: 1,
    activeAlerts: 2,
    aiDetected: 8,
    resolvedToday: 3,
    avgResponseTime: 15 // minutes
  };

  res.json({
    success: true,
    data: { stats: mockStats },
    timestamp: new Date().toISOString()
  });
}));

// Acknowledge crisis alert
router.post('/crisis-alerts/:alertId/acknowledge', therapistAuth, validateRequest([
  body('notes').optional().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { alertId } = req.params;
  const { notes } = req.body;

  // Mock acknowledgment
  res.json({
    success: true,
    data: {
      alertId,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: req.user?.firstName + ' ' + req.user?.lastName,
      notes
    },
    timestamp: new Date().toISOString()
  });
}));

// Resolve crisis alert
router.post('/crisis-alerts/:alertId/resolve', therapistAuth, validateRequest([
  body('intervention').notEmpty().trim(),
  body('notes').notEmpty().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { alertId } = req.params;
  const { intervention, notes } = req.body;

  // Mock resolution
  res.json({
    success: true,
    data: {
      alertId,
      resolvedAt: new Date().toISOString(),
      resolvedBy: req.user?.firstName + ' ' + req.user?.lastName,
      intervention,
      notes
    },
    timestamp: new Date().toISOString()
  });
}));

// Escalate crisis alert
router.post('/crisis-alerts/:alertId/escalate', therapistAuth, validateRequest([
  body('reason').notEmpty().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { alertId } = req.params;
  const { reason } = req.body;

  // Mock escalation
  res.json({
    success: true,
    data: {
      alertId,
      escalatedAt: new Date().toISOString(),
      escalatedBy: req.user?.firstName + ' ' + req.user?.lastName,
      reason,
      escalatedTo: 'Crisis Intervention Team'
    },
    timestamp: new Date().toISOString()
  });
}));

// Add client note
router.post('/clients/:clientId/notes', therapistAuth, validateRequest([
  body('note').notEmpty().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { clientId } = req.params;
  const { note } = req.body;

  const newNote = {
    id: `note-${Date.now()}`,
    clientId,
    content: note,
    createdBy: req.user?.firstName + ' ' + req.user?.lastName,
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: { note: newNote },
    timestamp: new Date().toISOString()
  });
}));

// Flag client for crisis intervention
router.post('/clients/:clientId/flag-crisis', therapistAuth, validateRequest([
  body('reason').notEmpty().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { clientId } = req.params;
  const { reason } = req.body;

  const crisisFlag = {
    id: `crisis-flag-${Date.now()}`,
    clientId,
    reason,
    flaggedBy: req.user?.firstName + ' ' + req.user?.lastName,
    flaggedAt: new Date().toISOString(),
    status: 'active'
  };

  res.json({
    success: true,
    data: { crisisFlag },
    timestamp: new Date().toISOString()
  });
}));

// Group Assignment Routes for Therapists

// Get all group assignments (therapist has access to their clients' assignments)
router.get('/group-assignments', therapistAuth, validateRequest([
  query('userId').optional().isUUID().withMessage('Invalid user ID'),
  query('groupId').optional().isUUID().withMessage('Invalid group ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId, groupId, page = 1, limit = 50 } = req.query;

  const assignments = await dbService.getGroupAssignments({
    userId: userId as string,
    groupId: groupId as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  });

  res.json({
    success: true,
    data: { assignments },
    timestamp: new Date().toISOString()
  });
}));

// Assign group to user (therapist can assign groups to their clients)
router.post('/group-assignments', therapistAuth, validateRequest([
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('groupId').isUUID().withMessage('Valid group ID is required'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId, groupId, notes } = req.body;
  const assignedBy = req.user!.id;

  // Check if assignment already exists
  const existingAssignment = await dbService.getGroupAssignment(userId, groupId);
  if (existingAssignment) {
    return res.status(400).json({
      success: false,
      error: 'User is already assigned to this group',
      timestamp: new Date().toISOString()
    });
  }

  const assignment = await dbService.createGroupAssignment({
    userId,
    groupId,
    assignedBy,
    notes
  });

  // Log audit event
  await dbService.createAuditLog({
    userId: assignedBy,
    action: 'group_assignment_create',
    resource: 'group_assignment',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: { userId, groupId, notes }
  });

  logger.info(`Group assignment created by therapist: User ${userId} assigned to group ${groupId} by ${assignedBy}`);

  res.status(201).json({
    success: true,
    data: { assignment },
    timestamp: new Date().toISOString()
  });
}));

// Remove group assignment
router.delete('/group-assignments/:userId/:groupId', therapistAuth, validateRequest([
  query('userId').isUUID().withMessage('Invalid user ID'),
  query('groupId').isUUID().withMessage('Invalid group ID'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId, groupId } = req.params;
  const therapistId = req.user!.id;

  const assignment = await dbService.getGroupAssignment(userId, groupId);
  if (!assignment) {
    return res.status(404).json({
      success: false,
      error: 'Group assignment not found',
      timestamp: new Date().toISOString()
    });
  }

  await dbService.deleteGroupAssignment(userId, groupId);

  // Log audit event
  await dbService.createAuditLog({
    userId: therapistId,
    action: 'group_assignment_delete',
    resource: 'group_assignment',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: { userId, groupId }
  });

  logger.info(`Group assignment deleted by therapist: User ${userId} unassigned from group ${groupId} by ${therapistId}`);

  res.json({
    success: true,
    message: 'Group assignment removed successfully',
    timestamp: new Date().toISOString()
  });
}));

// Get groups assigned to a specific user
router.get('/users/:userId/assigned-groups', therapistAuth, validateRequest([
  query('userId').isUUID().withMessage('Invalid user ID'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;

  const assignedGroups = await dbService.getUserAssignedGroups(userId);

  res.json({
    success: true,
    data: { assignedGroups },
    timestamp: new Date().toISOString()
  });
}));

// Get progress analytics (stub endpoint)
router.get('/progress-analytics', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Return empty analytics for now
  res.json({
    success: true,
    data: {
      analytics: {
        totalClients: 0,
        activeClients: 0,
        improvingClients: 0,
        atRiskClients: 0
      }
    },
    timestamp: new Date().toISOString()
  });
}));

// Get crisis alerts
router.get('/crisis-alerts', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { limit = 5 } = req.query;

  try {
    // Mock crisis alerts for now - in production this would come from a crisis monitoring system
    const mockAlerts = [
      {
        id: 'alert_001',
        alertType: 'High Risk',
        clientName: 'John D.',
        severity: 'critical',
        message: 'Client expressed suicidal ideation in recent message',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        isResolved: false
      },
      {
        id: 'alert_002',
        alertType: 'Medication Concern',
        clientName: 'Sarah M.',
        severity: 'moderate',
        message: 'Client reported skipping medication for 3 days',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        isResolved: false
      },
      {
        id: 'alert_003',
        alertType: 'Inactivity',
        clientName: 'Mike R.',
        severity: 'low',
        message: 'Client has been inactive for 7 days',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        isResolved: false
      }
    ];

    const alerts = mockAlerts.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: { alerts },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get crisis alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get crisis alerts',
      timestamp: new Date().toISOString()
    });
  }
}));

// Get group members
router.get('/groups/:groupId/members', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId } = req.params;
    const therapistId = req.user!.id;

    logger.info(`🔍 Therapist ${therapistId} requesting members for group ${groupId}`);

    // Verify therapist has access to this group
    const group = await dbService.client.group.findFirst({
      where: {
        id: groupId,
        isActive: true,
        OR: [
          { createdBy: therapistId },
          { facilitatorId: therapistId },
          {
            members: {
              some: {
                userId: therapistId,
                role: 'facilitator'
              }
            }
          }
        ]
      }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or access denied',
        timestamp: new Date().toISOString()
      });
    }

    const members = await dbService.getGroupMembers(groupId);

    res.json({
      success: true,
      data: { members, total: members.length },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get group members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group members',
      timestamp: new Date().toISOString()
    });
  }
}));

// Add member to group
router.post('/groups/:groupId/members', therapistAuth, validateRequest([
  body('userId').isLength({ min: 1 }).withMessage('Valid user ID is required'),
  body('role').optional().isIn(['member', 'facilitator']).withMessage('Role must be member or facilitator')
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId } = req.params;
    const { userId, role = 'member' } = req.body;
    const therapistId = req.user!.id;

    logger.info(`➕ Therapist ${therapistId} adding user ${userId} to group ${groupId} as ${role}`);

    // Verify therapist has access to this group
    const group = await dbService.client.group.findFirst({
      where: {
        id: groupId,
        isActive: true,
        OR: [
          { createdBy: therapistId },
          { facilitatorId: therapistId },
          {
            members: {
              some: {
                userId: therapistId,
                role: 'facilitator'
              }
            }
          }
        ]
      }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user exists
    const user = await dbService.client.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // Add member to group
    await dbService.addGroupMember(groupId, userId, role);

    // Log the action
    await dbService.createAuditLog({
      userId: therapistId,
      action: 'group_member_added',
      resource: 'group',
      resourceId: groupId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || 'unknown',
      metadata: { addedUserId: userId, role }
    });

    res.json({
      success: true,
      message: 'Member added to group successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to add group member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add group member',
      timestamp: new Date().toISOString()
    });
  }
}));

// Remove member from group
router.delete('/groups/:groupId/members/:userId', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId, userId } = req.params;
    const therapistId = req.user!.id;

    logger.info(`➖ Therapist ${therapistId} removing user ${userId} from group ${groupId}`);

    // Verify therapist has access to this group
    const group = await dbService.client.group.findFirst({
      where: {
        id: groupId,
        isActive: true,
        OR: [
          { createdBy: therapistId },
          { facilitatorId: therapistId },
          {
            members: {
              some: {
                userId: therapistId,
                role: 'facilitator'
              }
            }
          }
        ]
      }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Check if member exists in group
    const member = await dbService.client.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in group',
        timestamp: new Date().toISOString()
      });
    }

    // Remove member from group
    await dbService.removeGroupMember(groupId, userId);

    // Log the action
    await dbService.createAuditLog({
      userId: therapistId,
      action: 'group_member_removed',
      resource: 'group',
      resourceId: groupId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || 'unknown',
      metadata: { removedUserId: userId }
    });

    res.json({
      success: true,
      message: 'Member removed from group successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to remove group member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove group member',
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;