"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestGroupTool = void 0;
const zod_1 = require("zod");
const base_1 = require("../base");
const SuggestGroupSchema = zod_1.z.object({
    memberId: zod_1.z.string().describe('The ID of the member seeking a support group'),
    goals: zod_1.z.array(zod_1.z.string()).optional().describe('Specific goals or topics the member wants to address'),
    language: zod_1.z.string().optional().describe('Preferred language for the group')
});
class SuggestGroupTool extends base_1.BaseTool {
    name = 'suggestGroup';
    description = 'Finds the best peer-support groups for a member based on their needs and preferences';
    schema = SuggestGroupSchema;
    permissions = ['group:read', 'member:read'];
    rateLimit = { requests: 10, window: 3600 }; // 10 requests per hour
    async run(args, _context) {
        // In a real implementation, this would query a database
        const language = args.language ?? 'en';
        // For now, return mock data
        const mockGroups = [
            {
                groupId: 'grp_anxiety_001',
                name: 'Overcoming Anxiety Together',
                description: 'A supportive group focused on managing anxiety through CBT techniques and peer support',
                memberCount: 5,
                matchScore: 0.92,
                meetingSchedule: 'Tuesdays and Thursdays at 7 PM EST',
                facilitator: {
                    id: 'fac_001',
                    name: 'Dr. Sarah Johnson',
                    credentials: 'Licensed Clinical Psychologist'
                }
            },
            {
                groupId: 'grp_mindful_002',
                name: 'Mindfulness & Stress Relief',
                description: 'Learn and practice mindfulness techniques to manage daily stress',
                memberCount: 6,
                matchScore: 0.87,
                meetingSchedule: 'Mondays and Wednesdays at 6 PM EST',
                facilitator: {
                    id: 'fac_002',
                    name: 'Michael Chen',
                    credentials: 'Certified Mindfulness Instructor'
                }
            },
            {
                groupId: 'grp_general_003',
                name: 'General Mental Wellness',
                description: 'Open discussion group for various mental health topics and mutual support',
                memberCount: 4,
                matchScore: 0.75,
                meetingSchedule: 'Fridays at 5 PM EST',
                facilitator: {
                    id: 'fac_003',
                    name: 'Emma Rodriguez',
                    credentials: 'Licensed Clinical Social Worker'
                }
            }
        ];
        // Filter by language if specified
        let suggestions = mockGroups;
        if (language !== 'en') {
            // In real implementation, filter by language
            suggestions = suggestions.slice(0, 1); // Return fewer results for non-English
        }
        // Sort by match score
        suggestions.sort((a, b) => b.matchScore - a.matchScore);
        // Return top 4-6 suggestions as specified
        return suggestions.slice(0, Math.min(6, suggestions.length));
    }
    async validate(args, _context) {
        // Additional business logic validation
        if (args.goals && args.goals.length > 10) {
            throw new Error('Too many goals specified. Please limit to 10 or fewer.');
        }
        return true;
    }
}
exports.SuggestGroupTool = SuggestGroupTool;
//# sourceMappingURL=suggestGroup.js.map