"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinGroupTool = void 0;
const zod_1 = require("zod");
const base_1 = require("../base");
const JoinGroupSchema = zod_1.z.object({
    memberId: zod_1.z.string().describe('The member who wants to join the group'),
    groupId: zod_1.z.string().describe('The ID of the group to join'),
    introMessage: zod_1.z.string().optional().describe('Optional introduction message for the group'),
    notifyMembers: zod_1.z.boolean().default(true).describe('Whether to notify existing members')
});
class JoinGroupTool extends base_1.BaseTool {
    name = 'joinGroup';
    description = 'Allows a member to join a peer support group';
    schema = JoinGroupSchema;
    permissions = ['group:join', 'member:update'];
    rateLimit = { requests: 5, window: 3600 }; // 5 joins per hour
    async run(args, context) {
        // In a real implementation, this would:
        // 1. Check if group exists and is active
        // 2. Verify member isn't already a member
        // 3. Check group capacity
        // 4. Add member to group members
        // 5. Send notifications
        // 6. Create welcome materials
        // Mock implementation
        const mockGroups = {
            'grp_anxiety_001': {
                name: 'Anxiety Support Circle',
                currentMembers: 6,
                maxMembers: 8,
                nextMeeting: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                facilitator: 'Dr. Sarah Johnson'
            },
            'grp_depression_002': {
                name: 'Depression Recovery Group',
                currentMembers: 4,
                maxMembers: 8,
                nextMeeting: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
                facilitator: 'Michael Chen'
            }
        };
        const group = mockGroups[args.groupId];
        if (!group) {
            throw new Error(`Group ${args.groupId} not found`);
        }
        if (group.currentMembers >= group.maxMembers) {
            throw new Error(`Group ${group.name} is currently full`);
        }
        // "Join" the group
        group.currentMembers += 1;
        // Generate welcome message
        const welcomeMessage = `Welcome to ${group.name}! We're so glad you've joined us.

Your next meeting is ${group.nextMeeting.toLocaleDateString()} at ${group.nextMeeting.toLocaleTimeString()}.

${args.introMessage ? `Your introduction has been shared with the group: "${args.introMessage}"` : 'Feel free to introduce yourself when you\'re ready.'}`;
        const facilitatorMessage = `Hi ${context.memberId}, I'm ${group.facilitator}, the facilitator for ${group.name}. I wanted to personally welcome you to our group. We meet twice a week and focus on creating a safe, supportive environment for everyone. Looking forward to meeting you at our next session!`;
        console.log(`Member ${args.memberId} joined group ${args.groupId}`);
        if (args.notifyMembers) {
            console.log(`Notifying ${group.currentMembers - 1} existing members about new member`);
        }
        return {
            success: true,
            groupId: args.groupId,
            groupName: group.name,
            welcomeMessage,
            nextMeeting: group.nextMeeting,
            memberCount: group.currentMembers,
            facilitatorMessage
        };
    }
    async validate(args, _context) {
        // Additional validation
        if (args.introMessage && args.introMessage.length > 500) {
            throw new Error('Introduction message must be 500 characters or less');
        }
        // In production, check:
        // - Member eligibility
        // - Group requirements
        // - Scheduling conflicts
        return true;
    }
}
exports.JoinGroupTool = JoinGroupTool;
//# sourceMappingURL=joinGroup.js.map