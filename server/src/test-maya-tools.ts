/**
 * Test script to verify Maya (FacilitatorAgent) can access and use her tools correctly
 */

import { FacilitatorAgent } from './agents/FacilitatorAgent';
import ToolExecutor from './tools/executor';
import { ToolContext } from './tools/schemas';

async function testMayaTools() {
  console.log('🧪 Testing Maya (FacilitatorAgent) Tool Integration...\n');
  
  try {
    // Initialize Maya
    const maya = new FacilitatorAgent();
    const toolExecutor = new ToolExecutor();
    
    console.log('✅ Maya initialized successfully');
    console.log('Available tools:', maya.getInfo().availableTools);
    
    // Test context
    const testContext: ToolContext = {
      memberId: 'test_member_123',
      sessionId: 'test_session_456',
      groupId: 'test_group_789',
      timestamp: new Date(),
      agent: 'facilitator'
    };
    
    console.log('\n📧 Testing postMessage tool...');
    try {
      const postMessageResult = await toolExecutor.executeTool(
        'postMessage',
        {
          groupId: 'test_group_789',
          memberId: testContext.memberId,
          content: 'Hello, this is Maya testing the postMessage tool.',
          messageType: 'text',
          threadId: testContext.sessionId,
          metadata: { test: true }
        },
        testContext
      );
      console.log('✅ postMessage tool working:', postMessageResult.success);
      if (postMessageResult.data) {
        console.log('   Message ID:', postMessageResult.data.messageId);
      }
    } catch (error: any) {
      console.log('❌ postMessage tool failed:', error.message);
    }
    
    console.log('\n📋 Testing createActionItem tool...');
    try {
      const actionItemResult = await toolExecutor.executeTool(
        'createActionItem',
        {
          groupId: 'test_group_789',
          assigneeId: testContext.memberId,
          title: 'Practice daily mindfulness',
          description: 'Spend 10 minutes each morning practicing mindfulness meditation',
          priority: 'medium',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'self_care'
        },
        testContext
      );
      console.log('✅ createActionItem tool working:', actionItemResult.success);
      if (actionItemResult.data) {
        console.log('   Action Item ID:', actionItemResult.data.actionItemId);
      }
    } catch (error: any) {
      console.log('❌ createActionItem tool failed:', error.message);
    }
    
    console.log('\n📊 Testing summarizeSession tool...');
    try {
      const summaryResult = await toolExecutor.executeTool(
        'summarizeSession',
        {
          groupId: 'test_group_789',
          sessionId: testContext.sessionId,
          includeParticipants: true,
          includeKeyTopics: true,
          includeActionItems: true,
          summaryType: 'detailed',
          audienceType: 'therapist'
        },
        testContext
      );
      console.log('✅ summarizeSession tool working:', summaryResult.success);
      if (summaryResult.data) {
        console.log('   Summary length:', summaryResult.data.summary.length, 'characters');
        console.log('   Engagement score:', summaryResult.data.keyMetrics?.engagementScore);
      }
    } catch (error: any) {
      console.log('❌ summarizeSession tool failed:', error.message);
    }
    
    console.log('\n🤖 Testing Maya full workflow...');
    try {
      const testMessage = "I've been feeling anxious lately and I'm looking for some coping strategies.";
      const mayaResponse = await maya.execute(testMessage, testContext);
      
      console.log('✅ Maya full workflow working:', mayaResponse.confidence > 0.5);
      console.log('   Tools used:', mayaResponse.toolsUsed);
      console.log('   Response preview:', mayaResponse.response.substring(0, 100) + '...');
      console.log('   Confidence:', mayaResponse.confidence);
    } catch (error: any) {
      console.log('❌ Maya full workflow failed:', error.message);
      console.log('   Stack trace:', error.stack);
    }
    
    console.log('\n✨ Maya tool integration test completed!');
    
  } catch (error: any) {
    console.error('💥 Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testMayaTools().catch(console.error);