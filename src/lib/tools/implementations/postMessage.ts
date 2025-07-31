import { z } from 'zod';
import { BaseTool } from '../base';
import { ToolContext } from '../types';

const PostMessageSchema = z.object({
  threadId: z.string().describe('The ID of the chat thread'),
  content: z.string().min(1).max(2000).describe('The message content'),
  replyToId: z.string().optional().describe('ID of the message being replied to'),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file', 'link']),
    url: z.string().url(),
    name: z.string()
  })).optional().describe('Optional attachments')
});

type PostMessageArgs = z.infer<typeof PostMessageSchema>;

interface MessageResult {
  messageId: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'failed';
}

export class PostMessageTool extends BaseTool<PostMessageArgs, MessageResult> {
  name = 'postMessage';
  description = 'Posts a message to a chat thread in a support group';
  schema = PostMessageSchema;
  permissions = ['message:write', 'thread:read'];
  rateLimit = { requests: 30, window: 60 }; // 30 messages per minute

  protected async run(args: PostMessageArgs, context: ToolContext): Promise<MessageResult> {
    // In a real implementation, this would:
    // 1. Validate thread access
    // 2. Check content filters
    // 3. Store in database
    // 4. Broadcast via WebSocket

    // Mock implementation
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate content filtering
    if (args.content.length < 1) {
      throw new Error('Message content cannot be empty');
    }

    // Simulate persistence
    console.log(`Posting message to thread ${args.threadId}:`, {
      messageId,
      memberId: context.memberId,
      content: args.content.substring(0, 50) + '...',
      replyTo: args.replyToId
    });

    return {
      messageId,
      timestamp: new Date(),
      status: 'delivered'
    };
  }

  async validate(args: PostMessageArgs, _context: ToolContext): Promise<boolean> {
    // Check for spam patterns
    const spamPatterns = [
      /\b(buy now|click here|limited offer)\b/i,
      /\b(viagra|cialis)\b/i,
      /(.)\1{10,}/ // Repeated characters
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(args.content)) {
        throw new Error('Message contains prohibited content');
      }
    }

    return true;
  }
}