import { ToolRegistry } from '../registry';
import { ListAllGroupsTool } from './listAllGroups';
import { SuggestGroupTool } from './suggestGroup';
import { JoinGroupTool } from './joinGroup';

// Import types we need
interface DatabaseService {
  getGroups(page?: number, limit?: number, filters?: any): Promise<{ groups: any[]; total: number }>;
  getGroupById(groupId: string): Promise<any>;
  prisma: any;
}

/**
 * Integrate tools with real database
 */
export class DatabaseIntegratedTools {
  private databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Enhanced ListAllGroups that uses real database
   */
  createDatabaseListAllGroups() {
    const tool = new ListAllGroupsTool();

    // Override the run method to use database
    (tool as any).run = async (args: any, _context: any) => {
      try {
        const { groups } = await this.databaseService.getGroups(
          1, // page
          args.limit || 50, // limit
          {
            status: !args.includeInactive, // only active groups
            memberId: args.memberId
          }
        );

        return groups.map(group => ({
          groupId: group.id,
          name: group.name,
          description: group.description,
          type: group.type,
          memberCount: Array.isArray(group.members) ? group.members.length : 0,
          maxMembers: group.maxMembers || 8,
          isActive: group.isActive,
          facilitator: group.facilitator ? {
            id: group.facilitator.id,
            name: group.facilitator.name
          } : undefined,
          meetingSchedule: group.schedule,
          tags: group.tags || []
        }));
      } catch (error) {
        console.error('[DatabaseListAllGroups] Error:', error);
        throw new Error('Failed to retrieve groups from database');
      }
    };

    return tool;
  }

  /**
   * Enhanced SuggestGroup that uses real database and matching logic
   */
  createDatabaseSuggestGroup() {
    const tool = new SuggestGroupTool();

    (tool as any).run = async (args: any, _context: any) => {
      try {
        // Get all active groups
        const { groups } = await this.databaseService.getGroups(
          1,
          100, // get more for better matching
          {
            status: true,
            memberId: args.memberId
          }
        );

        // Score and rank groups based on member goals
        const scoredGroups = groups.map(group => {
          let score = 0;
          const groupText = `${group.name} ${group.description} ${group.type}`.toLowerCase();

          // Score based on goal matches
          args.goals?.forEach((goal: string) => {
            if (groupText.includes(goal.toLowerCase())) {
              score += 2;
            }
          });

          // Prefer groups with space
          const memberCount = Array.isArray(group.members) ? group.members.length : 0;
          const hasSpace = memberCount < (group.maxMembers || 8);
          if (hasSpace) score += 1;

          // Prefer active groups with some members
          if (memberCount > 0 && memberCount < 6) score += 0.5;

          return { ...group, matchScore: score };
        });

        // Sort by score and return top matches
        const topGroups = scoredGroups
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 6)
          .map(group => ({
            groupId: group.id,
            name: group.name,
            description: group.description,
            memberCount: Array.isArray(group.members) ? group.members.length : 0,
            matchScore: group.matchScore / 10, // normalize to 0-1
            meetingSchedule: group.schedule || 'Schedule TBD',
            facilitator: group.facilitator ? {
              id: group.facilitator.id,
              name: group.facilitator.name,
              credentials: group.facilitator.credentials || 'Mental Health Professional'
            } : {
              id: 'pending',
              name: 'Facilitator TBD',
              credentials: 'Mental Health Professional'
            }
          }));

        return topGroups;
      } catch (error) {
        console.error('[DatabaseSuggestGroup] Error:', error);
        throw new Error('Failed to suggest groups from database');
      }
    };

    return tool;
  }

  /**
   * Enhanced JoinGroup that uses real database
   */
  createDatabaseJoinGroup() {
    const tool = new JoinGroupTool();

    (tool as any).run = async (args: any, _context: any) => {
      try {
        // Get group details first
        const group = await this.databaseService.getGroupById(args.groupId);

        if (!group) {
          throw new Error(`Group ${args.groupId} not found`);
        }

        if (!group.isActive) {
          throw new Error(`Group ${group.name} is not currently active`);
        }

        // Check current member count
        const memberCount = await this.databaseService.prisma.groupMember.count({
          where: { groupId: args.groupId }
        });

        if (memberCount >= (group.maxMembers || 8)) {
          throw new Error(`Group ${group.name} is currently full (${memberCount}/${group.maxMembers || 8} members)`);
        }

        // Check if member is already a member
        const existingMembership = await this.databaseService.prisma.groupMember.findUnique({
          where: {
            memberId_groupId: {
              memberId: args.memberId,
              groupId: args.groupId
            }
          }
        });

        if (existingMembership) {
          throw new Error('You are already a member of this group');
        }

        // Add member to group
        await this.databaseService.prisma.groupMember.create({
          data: {
            memberId: args.memberId,
            groupId: args.groupId,
            role: 'member'
          }
        });

        // Send notification to group if requested
        if (args.notifyMembers) {
          // In production, this would trigger real notifications
          console.log(`[JoinGroup] Notifying group members about new member ${args.memberId}`);
        }

        // Generate welcome message
        const welcomeMessage = `Welcome to ${group.name}! We're so glad you've joined us.

${group.description}

${args.introMessage ? `Your introduction: "${args.introMessage}"` : 'Feel free to introduce yourself when you\'re ready.'}

Next meeting: ${group.schedule || 'Check the group schedule for meeting times'}`;

        return {
          success: true,
          groupId: args.groupId,
          groupName: group.name,
          welcomeMessage,
          nextMeeting: group.nextMeeting ? new Date(group.nextMeeting) : undefined,
          memberCount: memberCount + 1,
          facilitatorMessage: group.facilitator ?
            `Hi! I'm ${group.facilitator.name}, the facilitator for ${group.name}. Looking forward to having you in our group!` :
            undefined
        };

      } catch (error) {
        console.error('[DatabaseJoinGroup] Error:', error);
        throw error;
      }
    };

    return tool;
  }

  /**
   * Register all database-integrated tools
   */
  registerDatabaseTools() {
    // Unregister mock tools
    ToolRegistry.unregister('listAllGroups');
    ToolRegistry.unregister('suggestGroup');
    ToolRegistry.unregister('joinGroup');

    // Register database-integrated versions
    ToolRegistry.register(this.createDatabaseListAllGroups());
    ToolRegistry.register(this.createDatabaseSuggestGroup());
    ToolRegistry.register(this.createDatabaseJoinGroup());

    console.log('[DatabaseIntegration] Tools updated to use real database');
  }
}