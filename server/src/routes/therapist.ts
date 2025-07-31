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
    const therapistId = req.member!.id;

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
                  memberId: therapistId,
                  role: 'facilitator'
                }
              }
            }
          ]
        }
      }),
      // TODO: Implement real crisis detection system
      Promise.resolve(0)
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

// Get specific group members
router.get('/groups/:groupId/members', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId } = req.params;
    const therapistId = req.member!.id;

    logger.info(`🔍 Therapist ${therapistId} requesting members for group ${groupId}`);

    // Get the group with members, ensuring therapist has access
    const group = await dbService.client.group.findFirst({
      where: {
        id: groupId,
        isActive: true,
        OR: [
          { createdBy: therapistId }, // Groups created by this therapist
          { facilitatorId: therapistId }, // Groups where this therapist is facilitator
          {
            members: {
              some: {
                memberId: therapistId,
                role: 'facilitator'
              }
            }
          } // Groups where therapist is a member with facilitator role
        ]
      },
      include: {
        members: {
          select: {
            memberId: true,
            role: true,
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or access denied',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`📋 Found ${group.members.length} members for group ${groupId}`);

    res.json({
      success: true,
      data: { members: group.members },
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

// Get therapist's groups
router.get('/groups', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { limit = 10 } = req.query;
    const therapistId = req.member!.id;

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
                memberId: therapistId,
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
            memberId: true,
            role: true,
            member: {
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

// Add member to group
router.post('/groups/:groupId/members', therapistAuth, validateRequest([
  body('memberId').isUUID().withMessage('Vareq.member ID is required'),
  body('role').isIn(['member', 'facilitator']).withMessage('Valid role is required')
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId } = req.params;
    const { memberId, role } = req.body;
    const therapistId = req.member!.id;

    logger.info(`👥 Therapist ${therapistId} adding memberereq.memberId} as ${role} to group ${groupId}`);

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
                memberId: therapistId,
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

    // Check if member is already a member
    const existingMember = await dbService.client.groupMember.findFirst({
      where: {
        groupId,
        memberId
      }
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'member is already a member of this group',
        timestamp: new Date().toISOString()
      });
    }

    // Add the member
    const newMember = await dbService.client.groupMember.create({
      data: {
        groupId,
        memberId,
        role,
        joinedAt: new Date()
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    logger.info(`✅ memberereq.memberId} added as ${role} to group ${groupId} by therapist ${therapistId}`);

    res.status(201).json({
      success: true,
      data: { member: newMember },
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
router.delete('/groups/:groupId/members/:memberId', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId, memberId } = req.params;
    const therapistId = req.member!.id;

    logger.info(`👥 Therapist ${therapistId} removing memberereq.memberId} from group ${groupId}`);

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
                memberId: therapistId,
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

    // Check if member is a member
    const member = await dbService.client.groupMember.findFirst({
      where: {
        groupId,
        memberId
      }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'member is not a member of this group',
        timestamp: new Date().toISOString()
      });
    }

    // Remove the member
    await dbService.client.groupMember.delete({
      where: {
        id: member.id
      }
    });

    logger.info(`✅ memberereq.memberId} removed from group ${groupId} by therapist ${therapistId}`);

    res.json({
      success: true,
      message: 'Member removed successfully',
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

// Create a new group
router.post('/groups', therapistAuth, validateRequest([
  body('name').trim().isLength({ min: 1 }).withMessage('Group name is required'),
  body('description').trim().isLength({ min: 1 }).withMessage('Group description is required'),
  body('type').isIn(['recovery', 'wellness', 'general', 'crisis', 'anxiety', 'depression']).withMessage('Valid group type is required'),
  body('maxMembers').optional().isInt({ min: 2, max: 50 }).withMessage('Max members must be between 2 and 50'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean')
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { name, description, type, maxMembers = 8, isPrivate = false } = req.body;
  const therapistId = req.member!.id;

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
      memberId: therapistId,
      action: 'group_created',
      resource: 'group',
      resourceId: newGroup.id,
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
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

// Update/Edit a group
router.put('/groups/:groupId', therapistAuth, validateRequest([
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Group name cannot be empty'),
  body('description').optional().trim().isLength({ min: 1 }).withMessage('Group description cannot be empty'),
  body('type').optional().isIn(['recovery', 'wellness', 'general', 'crisis', 'anxiety', 'depression']).withMessage('Valid group type is required'),
  body('maxMembers').optional().isInt({ min: 2, max: 50 }).withMessage('Max members must be between 2 and 50'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { groupId } = req.params;
  const therapistId = req.member!.id;
  const updates = req.body;

  try {
    logger.info(`📝 Therapist ${therapistId} updating group ${groupId}`);

    // Verify therapist has permission to edit this group (creator or facilitator)
    const group = await dbService.client.group.findFirst({
      where: {
        id: groupId,
        isActive: true,
        OR: [
          { createdBy: therapistId }, // Creator can edit
          { facilitatorId: therapistId }, // Main facilitator can edit
          {
            members: {
              some: {
                memberId: therapistId,
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
        error: 'Group not found or you do not have permission to edit this group',
        timestamp: new Date().toISOString()
      });
    }

    // Update the group
    const updatedGroup = await dbService.client.group.update({
      where: { id: groupId },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        members: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
                experienceLevel: true,
                role: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    // Log the group update
    await dbService.createAuditLog({
      memberId: therapistId,
      action: 'group_updated',
      resource: 'group',
      resourceId: groupId,
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
      metadata: { 
        updatedFields: Object.keys(updates),
        groupName: updatedGroup.name 
      }
    });

    logger.info(`✅ Group updated successfully: ${groupId} by therapist ${therapistId}`);

    // Transform the response to match frontend expectations
    const transformedGroup = {
      ...updatedGroup,
      members: updatedGroup.members.map((groupMember: any) => groupMember.memberId),
      facilitators: updatedGroup.members
        .filter((groupMember: any) => groupMember.role === 'facilitator')
        .map((groupMember: any) => groupMember.memberId),
      createdBy: updatedGroup.members[0]?.memberId || updatedGroup.createdBy
    };

    res.json({
      success: true,
      data: {
        group: transformedGroup,
        message: 'Group updated successfully.'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update group',
      timestamp: new Date().toISOString()
    });
  }
}));

// Delete a group
router.delete('/groups/:groupId', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId } = req.params;
    const therapistId = req.member!.id;

    logger.info(`🗑️ Therapist ${therapistId} attempting to delete group ${groupId}`);

    // Verify therapist has permission to delete this group (only the creator can delete)
    const group = await dbService.client.group.findFirst({
      where: {
        id: groupId,
        isActive: true,
        createdBy: therapistId // Only the creator can delete
      },
      include: {
        members: {
          select: {
            memberId: true
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

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or you do not have permission to delete this group',
        timestamp: new Date().toISOString()
      });
    }

    // Soft delete the group (mark as inactive)
    await dbService.client.group.update({
      where: { id: groupId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    // Log the group deletion
    await dbService.createAuditLog({
      memberId: therapistId,
      action: 'group_deleted',
      resource: 'group',
      resourceId: groupId,
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
      metadata: {
        groupName: group.name,
        memberCount: group._count.members,
        messageCount: group._count.messages
      }
    });

    logger.info(`✅ Group ${groupId} (${group.name}) deleted by therapist ${therapistId}`);

    res.json({
      success: true,
      message: 'Group deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete group',
      timestamp: new Date().toISOString()
    });
  }
}));

// Create a new client
router.post('/clients', therapistAuth, validateRequest([
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['member', 'therapist']).withMessage('Role must be member or therapist'),
  body('experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid experience level'),
  body('phoneNumber').optional().trim(),
  body('emergencyContact').optional().isObject(),
  body('initialNotes').optional().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { firstName, lastName, email, password, role = 'member', experienceLevel = 'beginner', phoneNumber, emergencyContact, initialNotes } = req.body;
  const therapistId = req.member!.id;

  try {
    // Check if member already exists
    const existingMember = await dbService.getMemberByEmail(email);
    if (existingMember) {
      return res.status(409).json({
        success: false,
        error: 'A member with this email already exists',
        timestamp: new Date().toISOString()
      });
    }

    // Create the client member account (password will be hashed by createMember)
    const newClient = await dbService.createMember({
      firstName,
      lastName,
      email,
      password: password, // Pass plain password - createMember will hash it
      role: role,
      experienceLevel: experienceLevel
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
        memberId: newClient.id,
        action: 'client_note_added',
        resource: 'client',
        resourceId: newClient.id,
        ipAddress: req.ip,
        memberAgent: req.get('User-Agent') || 'unknown',
        metadata: { note: initialNotes, addedBy: therapistId }
      });
    }

    // Log the client creation
    await dbService.createAuditLog({
      memberId: therapistId,
      action: 'client_created',
      resource: 'client',
      resourceId: newClient.id,
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
      metadata: { clientEmail: email, emergencyContact, phoneNumber }
    });

    logger.info(`Client created by therapist: ${email} by ${therapistId}`);

    // Remove password from response
    const { password: _, ...clientWithoutPassword } = newClient;

    res.status(201).json({
      success: true,
      data: {
        client: clientWithoutPassword,
        message: 'Client created successfully with the specified password.'
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

// Update/Edit a client
router.put('/clients/:clientId', therapistAuth, validateRequest([
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['member', 'therapist']).withMessage('Role must be member or therapist'),
  body('experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid experience level'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isPremium').optional().isBoolean().withMessage('isPremium must be a boolean')
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { clientId } = req.params;
  const therapistId = req.member!.id;
  const updates = req.body;

  try {
    // Verify the client exists and is assigned to this therapist
    const clientAssignment = await dbService.getTherapistClientAssignment(therapistId, clientId);
    if (!clientAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Client not found or not assigned to you',
        timestamp: new Date().toISOString()
      });
    }

    // Hash password if provided
    if (updates.password) {
      const saltRounds = 12;
      updates.password = await bcrypt.hash(updates.password, saltRounds);
    }

    // Update the client
    const updatedClient = await dbService.updateMember(clientId, updates);

    // Log the client update
    await dbService.createAuditLog({
      memberId: therapistId,
      action: 'client_updated',
      resource: 'client',
      resourceId: clientId,
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
      metadata: { 
        updatedFields: Object.keys(updates),
        clientEmail: updatedClient.email 
      }
    });

    logger.info(`Client updated by therapist: ${clientId} by ${therapistId}`);

    // Remove password from response
    const { password: _, ...clientWithoutPassword } = updatedClient;

    res.json({
      success: true,
      data: {
        client: clientWithoutPassword,
        message: 'Client updated successfully.'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client',
      timestamp: new Date().toISOString()
    });
  }
}));

// Delete a client (soft delete - deactivate)
router.delete('/clients/:clientId', therapistAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { clientId } = req.params;
  const therapistId = req.member!.id;

  try {
    // Verify the client exists and is assigned to this therapist
    const clientAssignment = await dbService.getTherapistClientAssignment(therapistId, clientId);
    if (!clientAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Client not found or not assigned to you',
        timestamp: new Date().toISOString()
      });
    }

    // Get client info before deletion for logging
    const client = await dbService.getMemberById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
        timestamp: new Date().toISOString()
      });
    }

    // Soft delete: deactivate the client
    await dbService.updateMember(clientId, { isActive: false });

    // Deactivate the therapist-client assignment
    await dbService.deleteTherapistClientAssignment(therapistId, clientId);

    // Log the client deletion
    await dbService.createAuditLog({
      memberId: therapistId,
      action: 'client_deleted',
      resource: 'client',
      resourceId: clientId,
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
      metadata: { 
        clientEmail: client.email,
        clientName: `${client.firstName} ${client.lastName}`
      }
    });

    logger.info(`Client deleted by therapist: ${clientId} by ${therapistId}`);

    res.json({
      success: true,
      data: {
        message: 'Client deleted successfully.'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete client',
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
  const therapistId = req.member!.id;

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
  const therapistId = req.member!.id;
  const {
    page = 1,
    limit = 20,
    search,
    type,
    status,
    dateRange,
    clientId
  } = req.query;

  try {
    // TODO: Implement database methods for therapy sessions
    // For now, return empty array since sessions feature needs proper database schema
    const sessions: any[] = [];
    const total = 0;

    logger.info(`📅 Therapist ${therapistId} requested sessions: found ${total} sessions`);

    res.json({
      success: true,
      data: {
        sessions,
        total,
        message: 'Sessions feature requires database schema implementation for TherapySession model'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get therapist sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions',
      timestamp: new Date().toISOString()
    });
  }
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
  const therapistId = req.member!.id;
  const sessionData = req.body;

  try {
    // TODO: Implement database method for creating therapy sessions
    // For now, return success message indicating feature needs implementation
    logger.info(`📅 Therapist ${therapistId} attempted to create session`);

    res.status(501).json({
      success: false,
      error: 'Sessions feature requires database schema implementation',
      message: 'TherapySession model needs to be added to Prisma schema',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to create session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
      timestamp: new Date().toISOString()
    });
  }
}));

// Get assessments
router.get('/assessments', therapistAuth, validateRequest([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('clientId').optional().isUUID(),
  query('severity').optional().isIn(['minimal', 'mild', 'moderate', 'severe']),
  query('timeRange').optional().isIn(['1month', '3months', '6months', '1year', 'all'])
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const therapistId = req.member!.id;
  const {
    page = 1,
    limit = 20,
    clientId,
    severity,
    timeRange
  } = req.query;

  try {
    // TODO: Implement database methods for mental health assessments
    // For now, return empty array since assessments feature needs proper database schema
    const assessments: any[] = [];
    const total = 0;

    logger.info(`📋 Therapist ${therapistId} requested assessments: found ${total} assessments`);

    res.json({
      success: true,
      data: {
        assessments,
        total,
        message: 'Assessments feature requires database schema implementation for Assessment model'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get assessments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get assessments',
      timestamp: new Date().toISOString()
    });
  }
}));

// Create assessment
router.post('/assessments', therapistAuth, validateRequest([
  body('clientId').isUUID(),
  body('type').isIn(['phq9', 'gad7', 'custom', 'beck_depression', 'beck_anxiety', 'dass21']),
  body('score').isInt({ min: 0 }),
  body('maxScore').isInt({ min: 1 }),
  body('notes').optional().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const therapistId = req.member!.id;
  const assessmentData = req.body;

  try {
    // TODO: Implement database method for creating assessments
    logger.info(`📋 Therapist ${therapistId} attempted to create assessment`);

    res.status(501).json({
      success: false,
      error: 'Assessments feature requires database schema implementation',
      message: 'Assessment model needs to be added to Prisma schema',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to create assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create assessment',
      timestamp: new Date().toISOString()
    });
  }
}));

// Get goals
router.get('/goals', therapistAuth, validateRequest([
  query('clientId').optional().isUUID(),
  query('category').optional().isIn(['behavioral', 'emotional', 'cognitive', 'social', 'physical']),
  query('status').optional().isIn(['not_started', 'in_progress', 'completed', 'paused', 'abandoned'])
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const therapistId = req.member!.id;
  const {
    clientId,
    category,
    status
  } = req.query;

  try {
    // TODO: Implement database methods for therapy goals
    // For now, return empty array since goals feature needs proper database schema
    const goals: any[] = [];
    const total = 0;

    logger.info(`🎯 Therapist ${therapistId} requested goals: found ${total} goals`);

    res.json({
      success: true,
      data: {
        goals,
        total,
        message: 'Goals feature requires database schema implementation for TherapyGoal model'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get goals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get goals',
      timestamp: new Date().toISOString()
    });
  }
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

  // TODO: Implement database method for updating goals
  res.status(501).json({
    success: false,
    error: 'Goals feature requires database schema implementation',
    message: 'TherapyGoal model needs to be added to Prisma schema',
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
  const therapistId = req.member!.id;
  const {
    page = 1,
    limit = 20,
    severity,
    status,
    alertType,
    timeRange
  } = req.query;

  try {
    // TODO: Implement database methods for crisis alerts
    // For now, return empty array since crisis alerts need proper database schema
    const alerts: any[] = [];
    const total = 0;

    logger.info(`🚨 Therapist ${therapistId} requested crisis alerts: found ${total} alerts`);

    res.json({
      success: true,
      data: {
        alerts,
        total,
        message: 'Crisis alerts feature requires database schema implementation for CrisisAlert model'
      },
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

// Get crisis statistics
router.get('/crisis-stats', therapistAuth, validateRequest([
  query('timeRange').optional().isIn(['1h', '24h', '7d', '30d', 'all'])
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const therapistId = req.member!.id;
  const { timeRange } = req.query;

  try {
    // TODO: Implement database methods for crisis statistics
    const stats = {
      criticalAlerts: 0,
      activeAlerts: 0,
      aiDetected: 0,
      resolvedToday: 0,
      avgResponseTime: 0
    };

    logger.info(`📊 Therapist ${therapistId} requested crisis stats`);

    res.json({
      success: true,
      data: { 
        stats,
        message: 'Crisis statistics require database schema implementation'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get crisis statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get crisis statistics',
      timestamp: new Date().toISOString()
    });
  }
}));

// Acknowledge crisis alert
router.post('/crisis-alerts/:alertId/acknowledge', therapistAuth, validateRequest([
  body('notes').optional().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { alertId } = req.params;
  const { notes } = req.body;

  // TODO: Implement database method for acknowledging crisis alerts
  res.status(501).json({
    success: false,
    error: 'Crisis alerts feature requires database schema implementation',
    message: 'CrisisAlert model needs to be added to Prisma schema',
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

  // TODO: Implement database method for resolving crisis alerts
  res.status(501).json({
    success: false,
    error: 'Crisis alerts feature requires database schema implementation',
    message: 'CrisisAlert model needs to be added to Prisma schema',
    timestamp: new Date().toISOString()
  });
}));

// Escalate crisis alert
router.post('/crisis-alerts/:alertId/escalate', therapistAuth, validateRequest([
  body('reason').notEmpty().trim()
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { alertId } = req.params;
  const { reason } = req.body;

  // TODO: Implement database method for escalating crisis alerts
  res.status(501).json({
    success: false,
    error: 'Crisis alerts feature requires database schema implementation',
    message: 'CrisisAlert model needs to be added to Prisma schema',
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
    createdBy: req.member?.firstName + ' ' + req.member?.lastName,
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
    flaggedBy: req.member?.firstName + ' ' + req.member?.lastName,
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
  query('memberId').optional().isUUID().withMessage('Invalid member ID'),
  query('groupId').optional().isUUID().withMessage('Invalid group ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberId, groupId, page = 1, limit = 50 } = req.query;

  const assignments = await dbService.getGroupAssignments({
    memberId: req.member!.id,
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

// Assign group to member (therapist can assign groups to their clients)
router.post('/group-assignments', therapistAuth, validateRequest([
  body('memberId').isUUID().withMessage('Vareq.member ID is required'),
  body('groupId').isUUID().withMessage('Valid group ID is required'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberId, groupId, notes } = req.body;
  const assignedBy = req.member!.id;

  // Check if assignment already exists
  const existingAssignment = await dbService.getGroupAssignment(memberId, groupId);
  if (existingAssignment) {
    return res.status(400).json({
      success: false,
      error: 'member is already assigned to this group',
      timestamp: new Date().toISOString()
    });
  }

  const assignment = await dbService.createGroupAssignment({
    memberId,
    groupId,
    assignedBy,
    notes
  });

  // Log audit event
  await dbService.createAuditLog({
    memberId: assignedBy,
    action: 'group_assignment_create',
    resource: 'group_assignment',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: { memberId, groupId, notes }
  });

  logger.info(`Group assignment created by therapist: memberereq.memberId} assigned to group ${groupId} by ${assignedBy}`);

  res.status(201).json({
    success: true,
    data: { assignment },
    timestamp: new Date().toISOString()
  });
}));

// Remove group assignment
router.delete('/group-assignments/:memberId/:groupId', therapistAuth, validateRequest([
  query('memberId').isUUID().withMessage('Invalid member ID'),
  query('groupId').isUUID().withMessage('Invalid group ID'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberId, groupId } = req.params;
  const therapistId = req.member!.id;

  const assignment = await dbService.getGroupAssignment(memberId, groupId);
  if (!assignment) {
    return res.status(404).json({
      success: false,
      error: 'Group assignment not found',
      timestamp: new Date().toISOString()
    });
  }

  await dbService.deleteGroupAssignment(memberId, groupId);

  // Log audit event
  await dbService.createAuditLog({
    memberId: therapistId,
    action: 'group_assignment_delete',
    resource: 'group_assignment',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: { memberId, groupId }
  });

  logger.info(`Group assignment deleted by therapist: memberereq.memberId} unassigned from group ${groupId} by ${therapistId}`);

  res.json({
    success: true,
    message: 'Group assignment removed successfully',
    timestamp: new Date().toISOString()
  });
}));

// Get groups assigned to a specific member
router.get('/members/:memberId/assigned-groups', therapistAuth, validateRequest([
  query('memberId').isUUID().withMessage('Invalid member ID'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberId } = req.params;

  const assignedGroups = await dbService.getMemberAssignedGroups(memberId);

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
    const therapistId = req.member!.id;
    
    // TODO: Implement database methods for crisis alerts
    // For now, return empty array since crisis alerts need proper database schema
    const alerts: any[] = [];

    logger.info(`🚨 Therapist ${therapistId} requested simple crisis alerts: found ${alerts.length} alerts`);

    res.json({
      success: true,
      data: { 
        alerts,
        message: 'Crisis alerts feature requires database schema implementation'
      },
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

export default router;