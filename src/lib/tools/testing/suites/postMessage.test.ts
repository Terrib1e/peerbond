import { TestSuite } from '../testRunner';

export const postMessageTestSuite: TestSuite = {
  name: 'PostMessage Tool Tests',
  cases: [
    {
      name: 'Should post valid message',
      tool: 'postMessage',
      args: {
        threadId: 'thread_123',
        content: 'Hello, this is a test message'
      },
      expectedResult: {
        success: true
      }
    },
    {
      name: 'Should post message with reply',
      tool: 'postMessage',
      args: {
        threadId: 'thread_123',
        content: 'This is a reply',
        replyToId: 'msg_original'
      },
      expectedResult: {
        success: true
      }
    },
    {
      name: 'Should post message with attachments',
      tool: 'postMessage',
      args: {
        threadId: 'thread_123',
        content: 'Check out this resource',
        attachments: [{
          type: 'link',
          url: 'https://example.com/resource',
          name: 'Helpful Resource'
        }]
      },
      expectedResult: {
        success: true
      }
    },
    {
      name: 'Should fail with empty content',
      tool: 'postMessage',
      args: {
        threadId: 'thread_123',
        content: ''
      },
      shouldFail: true
    },
    {
      name: 'Should fail with spam content',
      tool: 'postMessage',
      args: {
        threadId: 'thread_123',
        content: 'Buy now! Limited offer! Click here!'
      },
      shouldFail: true
    },
    {
      name: 'Should fail with excessive length',
      tool: 'postMessage',
      args: {
        threadId: 'thread_123',
        content: 'a'.repeat(2001)
      },
      shouldFail: true
    }
  ]
};