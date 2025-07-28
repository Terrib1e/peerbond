import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface DatabaseConfig {
  type: 'prisma';
  connectionString?: string;
  options?: Record<string, any>;
}

export class DatabaseService {
  private prisma: PrismaClient;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig = { type: 'prisma' }) {
    this.config = config;
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      errorFormat: 'pretty'
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('✅ Database connected successfully');

      // Create default AI facilitator if not exists
      await this.createDefaultAIFacilitator();

      // Clean up expired sessions
      await this.cleanupExpiredSessions();

      // Create sample data for development
      if (process.env.NODE_ENV === 'development') {
        await this.initializeSampleData();
      }
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new Error('Database health check failed');
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  private async createDefaultAIFacilitator(): Promise<void> {
    try {
      const existingFacilitator = await this.prisma.aIFacilitator.findFirst({
        where: { name: 'Maya' }
      });

      if (!existingFacilitator) {
        await this.prisma.aIFacilitator.create({
          data: {
            id: 'ai-maya',
            name: 'Maya',
            personality: 'Supportive, empathetic, and encouraging AI facilitator',
            specialization: JSON.stringify(['recovery', 'anxiety', 'depression', 'general']),
            responseStyle: 'supportive',
            isActive: true
          }
        });
        logger.info('✅ Default AI facilitator created');
      }
    } catch (error) {
      logger.error('⚠️  Failed to create default AI facilitator:', error);
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      if (result.count > 0) {
        logger.info(`🧹 Cleaned up ${result.count} expired sessions`);
      }
    } catch (error) {
      logger.error('⚠️  Failed to cleanup expired sessions:', error);
    }
  }

  private async initializeSampleData(): Promise<void> {
    try {
      // Check if admin user already exists
      const existingAdmin = await this.prisma.user.findUnique({
        where: { email: 'admin@peerbond.com' }
      });

      if (!existingAdmin) {
        // Create admin user
        const hashedPassword = await bcrypt.hash('password123', 12);
        const adminUser = await this.prisma.user.create({
          data: {
            id: 'admin-1',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@peerbond.com',
            password: hashedPassword,
            role: 'admin',
            recoveryGoals: JSON.stringify([]),
            wellnessGoals: JSON.stringify([]),
            experienceLevel: 'advanced',
            isPremium: true,
            isActive: true
          }
        });

        // Create sample groups
        const sampleGroups = [
          {
            id: 'group-1',
            name: 'Recovery Support Circle',
            description: 'A supportive group for individuals in recovery',
            type: 'recovery',
            maxMembers: 8,
            isPrivate: false,
            isActive: true
          },
          {
            id: 'group-2',
            name: 'Anxiety & Stress Management',
            description: 'Learn coping strategies and connect with others managing anxiety and stress',
            type: 'wellness',
            maxMembers: 8,
            isPrivate: false,
            isActive: true
          },
          {
            id: 'group-3',
            name: 'General Support Community',
            description: 'Open discussion for life challenges, personal growth, and peer support',
            type: 'general',
            maxMembers: 10,
            isPrivate: false,
            isActive: true
          }
        ];

        for (const groupData of sampleGroups) {
          const group = await this.prisma.group.create({
            data: groupData
          });

          // Add admin as member
          await this.prisma.groupMember.create({
            data: {
              userId: adminUser.id,
              groupId: group.id,
              role: 'facilitator'
            }
          });
        }

        logger.info('✅ Sample data initialized');
      }
    } catch (error) {
      logger.error('⚠️  Failed to initialize sample data:', error);
    }
  }

  // User methods
  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    recoveryGoals?: string[];
    wellnessGoals?: string[];
    experienceLevel?: string;
    role?: string;
  }): Promise<any> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    return await this.prisma.user.create({
      data: {
        id: uuidv4(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        recoveryGoals: JSON.stringify(userData.recoveryGoals || []),
        wellnessGoals: JSON.stringify(userData.wellnessGoals || []),
        experienceLevel: userData.experienceLevel || 'beginner',
        role: userData.role || 'member',
        isPremium: false,
        isActive: true
      }
    });
  }

  async getUserById(id: string): Promise<any> {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        groupMemberships: {
          include: {
            group: true
          }
        },
        subscription: true,
        therapistProfile: true
      }
    });
  }

  async getUserByEmail(email: string): Promise<any> {
    return await this.prisma.user.findUnique({
      where: { email },
      include: {
        groupMemberships: {
          include: {
            group: true
          }
        },
        subscription: true,
        therapistProfile: true
      }
    });
  }

  async getUsers(
    page: number = 1,
    limit: number = 20,
    filters: {
      search?: string;
      status?: boolean;
      experienceLevel?: string;
      role?: string;
    } = {}
  ): Promise<{ users: any[]; total: number }> {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters.status !== undefined) {
      where.isActive = filters.status;
    }

    if (filters.experienceLevel) {
      where.experienceLevel = filters.experienceLevel;
    }

    if (filters.role) {
      where.role = filters.role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          experienceLevel: true,
          isPremium: true,
          isActive: true,
          role: true,
          createdAt: true,
          lastActive: true
        }
      }),
      this.prisma.user.count({ where })
    ]);

    return { users, total };
  }

  async updateUser(id: string, updates: any): Promise<any> {
    const data: any = { ...updates };

    // Handle array fields that need JSON stringification
    if (data.recoveryGoals) {
      data.recoveryGoals = JSON.stringify(data.recoveryGoals);
    }
    if (data.wellnessGoals) {
      data.wellnessGoals = JSON.stringify(data.wellnessGoals);
    }

    return await this.prisma.user.update({
      where: { id },
      data
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    });
  }

  async getUserGroups(userId: string): Promise<any[]> {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: true
      }
    });

    return memberships.map(m => m.group);
  }

  // Group methods
  async createGroup(groupData: {
    name: string;
    description: string;
    type: string;
    maxMembers?: number;
    isPrivate?: boolean;
    createdBy?: string;
    members?: string[];
    facilitators?: string[];
  }): Promise<any> {
    const group = await this.prisma.group.create({
      data: {
        id: uuidv4(),
        name: groupData.name,
        description: groupData.description,
        type: groupData.type,
        maxMembers: groupData.maxMembers || 6,
        isPrivate: groupData.isPrivate || false,
        isActive: true,
        createdBy: groupData.createdBy,
        facilitatorId: groupData.facilitators?.[0] // Set the first facilitator as the main facilitator
      }
    });

    // Add creator as facilitator member if provided
    if (groupData.createdBy) {
      await this.addGroupMember(group.id, groupData.createdBy, 'facilitator');
    }

    // Add additional members if provided
    if (groupData.members) {
      for (const memberId of groupData.members) {
        if (memberId !== groupData.createdBy) { // Avoid duplicate if creator is already added
          await this.addGroupMember(group.id, memberId, 'member');
        }
      }
    }

    // Add additional facilitators if provided
    if (groupData.facilitators) {
      for (const facilitatorId of groupData.facilitators) {
        if (facilitatorId !== groupData.createdBy) { // Avoid duplicate if creator is already added
          await this.addGroupFacilitator(group.id, facilitatorId);
        }
      }
    }

    // Return the created group with members
    return await this.getGroupById(group.id);
  }

  async getGroupById(id: string): Promise<any> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
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
        messages: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return null;
    }

    // Transform the response to match frontend expectations
    return {
      ...group,
      members: group.members.map((member: any) => member.userId),
      facilitators: group.members
        .filter((member: any) => member.role === 'facilitator')
        .map((member: any) => member.userId),
      createdBy: group.members[0]?.userId // Fallback to first member for now
    };
  }

  async getGroups(
    page: number = 1,
    limit: number = 20,
    filters: {
      search?: string;
      type?: string;
      status?: boolean;
      privacy?: boolean;
      userId?: string;
    } = {}
  ): Promise<{ groups: any[]; total: number }> {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status !== undefined) {
      where.isActive = filters.status;
    }

    if (filters.privacy !== undefined) {
      where.isPrivate = !filters.privacy;
    }

    if (filters.userId) {
      where.members = {
        some: {
          userId: filters.userId
        }
      };
    }

    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastActivity: 'desc' },
        include: {
          members: {
            select: {
              userId: true,
              role: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true
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
      }),
      this.prisma.group.count({ where })
    ]);

    // Transform the response to match frontend expectations
    const transformedGroups = groups.map(group => ({
      ...group,
      members: group.members.map((member: any) => member.userId),
      facilitators: group.members
        .filter((member: any) => member.role === 'facilitator')
        .map((member: any) => member.userId),
      createdBy: group.members[0]?.userId // Fallback to first member for now
    }));

    return { groups: transformedGroups, total };
  }

  async updateGroup(id: string, updates: any): Promise<any> {
    return await this.prisma.group.update({
      where: { id },
      data: updates
    });
  }

  async deleteGroup(id: string): Promise<void> {
    await this.prisma.group.delete({
      where: { id }
    });
  }

  async addGroupMember(groupId: string, userId: string, role: string = 'member'): Promise<any> {
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (existingMember) {
      return existingMember;
    }

    return await this.prisma.groupMember.create({
      data: {
        id: uuidv4(),
        userId,
        groupId,
        role
      }
    });
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await this.prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });
  }

  // Message methods
  async createMessage(messageData: {
    groupId: string;
    userId: string;
    content: string;
    type?: string;
  }): Promise<any> {
    const message = await this.prisma.message.create({
      data: {
        id: uuidv4(),
        groupId: messageData.groupId,
        userId: messageData.userId,
        content: messageData.content,
        type: messageData.type || 'user'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // Update group last activity
    await this.prisma.group.update({
      where: { id: messageData.groupId },
      data: { lastActivity: new Date() }
    });

    return message;
  }

  async getMessages(
    groupId: string,
    page: number = 1,
    limit: number = 50,
    filters: {
      before?: Date;
      after?: Date;
    } = {}
  ): Promise<{ messages: any[]; total: number }> {
    const where: any = { groupId };

    if (filters.before) {
      where.createdAt = { ...where.createdAt, lt: filters.before };
    }

    if (filters.after) {
      where.createdAt = { ...where.createdAt, gt: filters.after };
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' }, // Changed from 'desc' to 'asc' for proper chat ordering
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          reactions: {
            select: {
              emoji: true,
              userId: true,
              createdAt: true
            }
          }
        }
      }),
      this.prisma.message.count({ where })
    ]);

    return { messages, total };
  }

  async updateMessage(id: string, updates: any): Promise<any> {
    return await this.prisma.message.update({
      where: { id },
      data: { ...updates, updatedAt: new Date() }
    });
  }

  async deleteMessage(id: string): Promise<void> {
    await this.prisma.message.delete({
      where: { id }
    });
  }

  async addMessageReaction(messageId: string, userId: string, emoji: string): Promise<any> {
    return await this.prisma.reaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      },
      update: {},
      create: {
        id: uuidv4(),
        messageId,
        userId,
        emoji
      }
    });
  }

  async removeMessageReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.reaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      }
    });
  }

  // Session methods
  async createSession(sessionData: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<any> {
    return await this.prisma.session.create({
      data: {
        id: uuidv4(),
        userId: sessionData.userId,
        token: sessionData.token,
        expiresAt: sessionData.expiresAt
      }
    });
  }

  async getSessionByToken(token: string): Promise<any> {
    return await this.prisma.session.findUnique({
      where: { token },
      include: {
        user: true
      }
    });
  }

  async deleteSessionByToken(token: string): Promise<void> {
    await this.prisma.session.delete({
      where: { token }
    });
  }

  // Analytics methods
  async getAnalytics(): Promise<any> {
    const [
      totalUsers,
      activeUsers,
      totalGroups,
      activeGroups,
      totalMessages,
      premiumUsers
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          lastActive: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.prisma.group.count(),
      this.prisma.group.count({ where: { isActive: true } }),
      this.prisma.message.count(),
      this.prisma.user.count({ where: { isPremium: true } })
    ]);

    const averageGroupSize = totalGroups > 0
      ? await this.prisma.groupMember.count() / totalGroups
      : 0;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        premium: premiumUsers,
        growth: 0
      },
      groups: {
        total: totalGroups,
        active: activeGroups,
        averageSize: averageGroupSize
      },
      messages: {
        total: totalMessages,
        today: 0,
        averagePerGroup: totalGroups > 0 ? totalMessages / totalGroups : 0
      },
      engagement: {
        dailyActiveUsers: activeUsers,
        averageSessionDuration: 0,
        messagesSentToday: 0
      }
    };
  }

  // Message by ID
  async getMessageById(id: string): Promise<any> {
    return await this.prisma.message.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        reactions: {
          select: {
            emoji: true,
            userId: true,
            createdAt: true
          }
        }
      }
    });
  }

  // Group facilitator methods
  async addGroupFacilitator(groupId: string, userId: string): Promise<any> {
    return await this.addGroupMember(groupId, userId, 'facilitator');
  }

  async removeGroupFacilitator(groupId: string, userId: string): Promise<void> {
    await this.removeGroupMember(groupId, userId);
  }

  // User activity methods
  async getUserActivity(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ logs: any[]; total: number }> {
    // Since we don't have audit logs table yet, return empty
    return { logs: [], total: 0 };
  }

  // Audit log methods
  async createAuditLog(auditData: {
    userId: string;
    action: string;
    resource?: string;
    resourceId?: string;
    details?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<any> {
    try {
      // Try to create audit log in database if table exists
      return await this.prisma.auditLog.create({
        data: {
          userId: auditData.userId,
          action: auditData.action,
          entityType: auditData.resource,
          entityId: auditData.resourceId,
          details: typeof auditData.metadata === 'object' ? JSON.stringify(auditData.metadata) : auditData.metadata,
          ipAddress: auditData.ipAddress,
          userAgent: auditData.userAgent,
          timestamp: new Date()
        }
      });
    } catch (error) {
      // Fall back to console logging if audit table doesn't exist
      if (process.env.NODE_ENV === 'development') {
        logger.info('Audit Log (fallback):', auditData);
      }
      // Return a mock audit log entry
      return {
        id: uuidv4(),
        ...auditData,
        createdAt: new Date()
      };
    }
  }

  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ logs: any[]; total: number }> {
    // Return empty for now since audit logs table isn't implemented
    return { logs: [], total: 0 };
  }

  // Advanced analytics methods (placeholders)
  async getUserAnalytics(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'User analytics would be implemented with real database queries' };
  }

  async getGroupAnalytics(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'Group analytics would be implemented with real database queries' };
  }

  async getMessageAnalytics(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'Message analytics would be implemented with real database queries' };
  }

  async getEngagementAnalytics(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'Engagement analytics would be implemented with real database queries' };
  }

  async getUserActivityAnalytics(userId: string, period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'User activity analytics would be implemented with real database queries' };
  }

  async getGroupSpecificAnalytics(groupId: string, period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'Group specific analytics would be implemented with real database queries' };
  }

  async getRealTimeAnalytics(): Promise<any> {
    return { placeholder: 'Real-time analytics would be implemented with real database queries' };
  }

  async getRetentionAnalytics(cohortPeriod: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'Retention analytics would be implemented with real database queries' };
  }

  async getFunnelAnalytics(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'Funnel analytics would be implemented with real database queries' };
  }

  async getAIAnalytics(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'AI analytics would be implemented with real database queries' };
  }

  async getPremiumAnalytics(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'Premium analytics would be implemented with real database queries' };
  }

  async getUserStats(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'User stats would be implemented with real database queries' };
  }

  async getGroupStats(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'Group stats would be implemented with real database queries' };
  }

  async getMessageStats(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    return { placeholder: 'Message stats would be implemented with real database queries' };
  }

  // Database statistics
  async getStats(): Promise<any> {
    const [userCount, groupCount, messageCount, activeUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.group.count(),
      this.prisma.message.count(),
      this.prisma.user.count({
        where: {
          lastActive: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      totalUsers: userCount,
      totalGroups: groupCount,
      totalMessages: messageCount,
      activeUsers: activeUsers,
      databaseHealth: 'healthy'
    };
  }

  // AI Facilitator support methods
  async getRecentMessages(groupId: string, limit: number = 10): Promise<any[]> {
    return await this.prisma.message.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });
  }

  async getGroupMembers(groupId: string): Promise<any[]> {
    const groupMemberships = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            experienceLevel: true,
            avatar: true,
            lastActive: true,
            isActive: true
          }
        }
      }
    });

    return groupMemberships;
  }

  // Group Assignment Methods

  async getGroupAssignments(filters: {
    userId?: string;
    groupId?: string;
    page?: number;
    limit?: number;
  }): Promise<any[]> {
    const { userId, groupId, page = 1, limit = 50 } = filters;

    const where: any = {
      isActive: true
    };

    if (userId) where.userId = userId;
    if (groupId) where.groupId = groupId;

    const assignments = await this.prisma.groupAssignment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            experienceLevel: true,
            role: true,
            isActive: true
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            maxMembers: true,
            isPrivate: true,
            isActive: true
          }
        },
        assigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    return assignments;
  }

  async getGroupAssignment(userId: string, groupId: string): Promise<any | null> {
    return await this.prisma.groupAssignment.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true
          }
        },
        assigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });
  }

  async createGroupAssignment(data: {
    userId: string;
    groupId: string;
    assignedBy: string;
    notes?: string;
  }): Promise<any> {
    const assignment = await this.prisma.groupAssignment.create({
      data: {
        userId: data.userId,
        groupId: data.groupId,
        assignedBy: data.assignedBy,
        notes: data.notes,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true
          }
        },
        assigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    logger.info(`Group assignment created: User ${data.userId} assigned to group ${data.groupId} by ${data.assignedBy}`);
    return assignment;
  }

  async deleteGroupAssignment(userId: string, groupId: string): Promise<void> {
    await this.prisma.groupAssignment.delete({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    logger.info(`Group assignment deleted: User ${userId} unassigned from group ${groupId}`);
  }

  async getUserAssignedGroups(userId: string): Promise<any[]> {
    const assignments = await this.prisma.groupAssignment.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            maxMembers: true,
            isPrivate: true,
            isActive: true,
            lastActivity: true,
            createdAt: true,
            members: {
              select: {
                userId: true
              }
            },
            _count: {
              select: {
                members: true
              }
            }
          }
        },
        assigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      }
    });

    return assignments.map(assignment => ({
      ...assignment.group,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assigner,
      assignmentNotes: assignment.notes,
      memberCount: assignment.group.members.length
    }));
  }

  async getUserAvailableGroups(userId: string): Promise<any[]> {
    // Get groups that are either:
    // 1. Assigned to the user, OR
    // 2. Public groups that the user can freely join
    
    const assignedGroups = await this.getUserAssignedGroups(userId);
    const assignedGroupIds = assignedGroups.map(g => g.id);

    // Get public groups that aren't assigned to the user
    const publicGroups = await this.prisma.group.findMany({
      where: {
        isActive: true,
        isPrivate: false,
        id: {
          notIn: assignedGroupIds
        }
      },
      include: {
        members: {
          select: {
            userId: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    // Combine assigned and public groups
    const availableGroups = [
      ...assignedGroups.map(g => ({
        ...g,
        isAssigned: true,
        isMember: g.members?.some((m: any) => m.userId === userId) || false,
        memberCount: g._count?.members || g.members?.length || 0,
        canJoin: !g.members?.some((m: any) => m.userId === userId) && 
                 (g._count?.members || g.members?.length || 0) < g.maxMembers
      })),
      ...publicGroups.map(g => ({
        ...g,
        memberCount: g._count.members,
        isAssigned: false,
        isMember: g.members.some(m => m.userId === userId),
        canJoin: !g.members.some(m => m.userId === userId) && g._count.members < g.maxMembers,
        members: g.members.map(m => m.userId) // Convert to array of userIds for frontend
      }))
    ];

    return availableGroups;
  }

  // Mood Entry Methods
  async createMoodEntry(data: {
    userId: string;
    score: number;
    emotions?: string;
    triggers?: string;
    notes?: string;
  }): Promise<any> {
    return await this.prisma.moodEntry.create({
      data: {
        userId: data.userId,
        score: data.score,
        emotions: data.emotions,
        triggers: data.triggers,
        notes: data.notes
      }
    });
  }

  // Therapist Profile Methods
  async getTherapistProfile(userId: string): Promise<any> {
    return await this.prisma.therapistProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async createTherapistProfile(data: {
    userId: string;
    licenseNumber: string;
    specializations: string;
    bio: string;
    isVerified?: boolean;
  }): Promise<any> {
    return await this.prisma.therapistProfile.create({
      data: {
        userId: data.userId,
        licenseNumber: data.licenseNumber,
        specializations: data.specializations,
        bio: data.bio,
        isVerified: data.isVerified || false
      }
    });
  }

  // Therapist-Client Assignment Methods
  async getTherapistClientAssignments(filters: {
    therapistId?: string;
    clientId?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const { therapistId, clientId, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (therapistId) where.therapistId = therapistId;
    if (clientId) where.clientId = clientId;

    const [assignments, total] = await Promise.all([
      this.prisma.therapistClientAssignment.findMany({
        where,
        skip,
        take: limit,
        include: {
          therapist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              lastActive: true
            }
          }
        },
        orderBy: { assignedAt: 'desc' }
      }),
      this.prisma.therapistClientAssignment.count({ where })
    ]);

    return {
      assignments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getTherapistClientAssignment(therapistId: string, clientId: string): Promise<any> {
    return await this.prisma.therapistClientAssignment.findUnique({
      where: {
        therapistId_clientId: {
          therapistId,
          clientId
        }
      }
    });
  }

  async createTherapistClientAssignment(data: {
    therapistId: string;
    clientId: string;
    notes?: string;
    createdBy?: string;
  }): Promise<any> {
    return await this.prisma.therapistClientAssignment.create({
      data: {
        therapistId: data.therapistId,
        clientId: data.clientId,
        notes: data.notes,
        createdBy: data.createdBy,
        isActive: true
      },
      include: {
        therapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async deleteTherapistClientAssignment(therapistId: string, clientId: string): Promise<void> {
    await this.prisma.therapistClientAssignment.update({
      where: {
        therapistId_clientId: {
          therapistId,
          clientId
        }
      },
      data: {
        isActive: false
      }
    });
  }

  async getTherapistsWithClientCount(): Promise<any[]> {
    const therapists = await this.prisma.user.findMany({
      where: {
        role: 'therapist',
        isActive: true
      },
      include: {
        therapistProfile: true,
        therapistClients: {
          where: { isActive: true },
          select: { id: true }
        }
      }
    });

    return therapists.map(therapist => ({
      id: therapist.id,
      firstName: therapist.firstName,
      lastName: therapist.lastName,
      email: therapist.email,
      clientCount: therapist.therapistClients.length,
      isVerified: therapist.therapistProfile?.isVerified || false,
      specializations: therapist.therapistProfile?.specializations
    }));
  }

  async getTherapistClients(therapistId: string): Promise<any[]> {
    const assignments = await this.prisma.therapistClientAssignment.findMany({
      where: {
        therapistId,
        isActive: true
      },
      include: {
        client: {
          include: {
            groupMemberships: {
              where: {
                group: { isActive: true }
              },
              include: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    return assignments.map(assignment => ({
      ...assignment.client,
      assignedAt: assignment.assignedAt,
      notes: assignment.notes,
      groups: assignment.client.groupMemberships.map(gm => gm.group)
    }));
  }

  async updateTherapistProfile(userId: string, data: any): Promise<any> {
    return await this.prisma.therapistProfile.update({
      where: { userId },
      data
    });
  }

  // Public methods for counting records
  async getUserCount(filters?: any): Promise<number> {
    return this.prisma.user.count(filters);
  }

  async getGroupCount(filters?: any): Promise<number> {
    return this.prisma.group.count(filters);
  }

  async getMessageCount(filters?: any): Promise<number> {
    return this.prisma.message.count(filters);
  }

  // Public method for accessing prisma directly for complex queries
  get client(): PrismaClient {
    return this.prisma;
  }
}