"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListAllGroupsTool = void 0;
const zod_1 = require("zod");
const base_1 = require("../base");
const ListAllGroupsSchema = zod_1.z.object({
    memberId: zod_1.z.string().describe('The member requesting to list all groups'),
    limit: zod_1.z.number().optional().describe('Maximum number of groups to return'),
    includeInactive: zod_1.z.boolean().optional().describe('Include inactive groups in the results')
});
class ListAllGroupsTool extends base_1.BaseTool {
    name = 'listAllGroups';
    description = 'Lists all available peer support groups that a member can join';
    schema = ListAllGroupsSchema;
    permissions = ['group:read'];
    rateLimit = { requests: 20, window: 3600 }; // 20 requests per hour
    async run(args, _context) {
        // In a real implementation, this would query your database
        // For now, return mock data that matches your system
        const limit = args.limit ?? 50;
        const includeInactive = args.includeInactive ?? false;
        const mockGroups = [
            {
                groupId: 'grp_anxiety_001',
                name: 'Anxiety Support Circle',
                description: 'A safe space for those dealing with anxiety disorders. We share coping strategies and support each other through difficult times.',
                type: 'anxiety_support',
                memberCount: 6,
                maxMembers: 8,
                isActive: true,
                facilitator: {
                    id: 'fac_001',
                    name: 'Dr. Sarah Johnson'
                },
                meetingSchedule: 'Tuesdays and Thursdays at 7 PM EST',
                tags: ['anxiety', 'coping', 'peer-support']
            },
            {
                groupId: 'grp_depression_002',
                name: 'Depression Recovery Group',
                description: 'Supporting each other through depression with understanding, hope, and practical strategies for daily life.',
                type: 'depression_support',
                memberCount: 4,
                maxMembers: 8,
                isActive: true,
                facilitator: {
                    id: 'fac_002',
                    name: 'Michael Chen'
                },
                meetingSchedule: 'Mondays and Wednesdays at 6 PM EST',
                tags: ['depression', 'recovery', 'hope']
            },
            {
                groupId: 'grp_mindfulness_003',
                name: 'Mindfulness & Meditation',
                description: 'Learn and practice mindfulness techniques together. Perfect for stress reduction and emotional regulation.',
                type: 'mindfulness',
                memberCount: 7,
                maxMembers: 10,
                isActive: true,
                facilitator: {
                    id: 'fac_003',
                    name: 'Emma Rodriguez'
                },
                meetingSchedule: 'Fridays at 5 PM EST',
                tags: ['mindfulness', 'meditation', 'stress-relief']
            },
            {
                groupId: 'grp_general_004',
                name: 'General Mental Wellness',
                description: 'Open discussion group for various mental health topics. A welcoming community for all experiences.',
                type: 'general_support',
                memberCount: 5,
                maxMembers: 12,
                isActive: true,
                facilitator: {
                    id: 'fac_004',
                    name: 'Dr. Alex Kim'
                },
                meetingSchedule: 'Saturdays at 3 PM EST',
                tags: ['general', 'wellness', 'community']
            },
            {
                groupId: 'grp_trauma_005',
                name: 'Trauma Healing Circle',
                description: 'A supportive environment for trauma survivors to share experiences and healing strategies.',
                type: 'trauma_support',
                memberCount: 3,
                maxMembers: 6,
                isActive: true,
                facilitator: {
                    id: 'fac_005',
                    name: 'Dr. Lisa Park'
                },
                meetingSchedule: 'Thursdays at 7 PM EST',
                tags: ['trauma', 'healing', 'ptsd']
            },
            {
                groupId: 'grp_social_006',
                name: 'Social Connection Hub',
                description: 'For those struggling with loneliness and social anxiety. Build connections and social skills together.',
                type: 'social_support',
                memberCount: 8,
                maxMembers: 10,
                isActive: true,
                facilitator: {
                    id: 'fac_006',
                    name: 'Jordan Martinez'
                },
                meetingSchedule: 'Sundays at 4 PM EST',
                tags: ['social', 'connection', 'loneliness']
            }
        ];
        // Filter based on arguments
        let filteredGroups = mockGroups;
        if (!includeInactive) {
            filteredGroups = filteredGroups.filter(group => group.isActive);
        }
        // Apply limit
        if (limit > 0) {
            filteredGroups = filteredGroups.slice(0, limit);
        }
        // Sort by member count (most active first) then by name
        filteredGroups.sort((a, b) => {
            if (a.memberCount !== b.memberCount) {
                return b.memberCount - a.memberCount;
            }
            return a.name.localeCompare(b.name);
        });
        console.log(`Listed ${filteredGroups.length} groups for member ${args.memberId}`);
        return filteredGroups;
    }
    async validate(args, _context) {
        // Validate limit
        const limit = args.limit ?? 50;
        if (limit < 1 || limit > 100) {
            throw new Error('Limit must be between 1 and 100');
        }
        return true;
    }
}
exports.ListAllGroupsTool = ListAllGroupsTool;
//# sourceMappingURL=listAllGroups.js.map