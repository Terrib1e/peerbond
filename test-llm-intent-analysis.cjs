const { ProductionOrchestratorService } = require('./server/dist/orchestration/production-ready-fixed.js');

async function testLLMIntentAnalysis() {
  console.log('🧪 Testing LLM-Powered Intent Analysis');
  console.log('=====================================\n');

  try {
    const orchestrator = new ProductionOrchestratorService();

        const testMessages = [
      {
        content: "list groups",
        expectedAgent: "matching",
        description: "Simple group listing request"
      },
      {
        content: "groups available",
        expectedAgent: "matching",
        description: "Available groups request"
      },
      {
        content: "what groups are there?",
        expectedAgent: "matching",
        description: "Question about available groups"
      },
      {
        content: "show me all groups",
        expectedAgent: "matching",
        description: "Show all groups request"
      },
      {
        content: "I'm looking for a support group for anxiety",
        expectedAgent: "matching",
        description: "Group finding request"
      },
      {
        content: "I've been feeling really overwhelmed lately and need someone to talk to",
        expectedAgent: "facilitator",
        description: "Emotional support request"
      },
      {
        content: "How am I doing in my recovery journey? I want to track my progress",
        expectedAgent: "insight",
        description: "Progress tracking request"
      },
      {
        content: "Can you show me all available support groups?",
        expectedAgent: "matching",
        description: "List all groups request"
      },
      {
        content: "I need coping strategies for dealing with depression",
        expectedAgent: "facilitator",
        description: "Therapeutic support request"
      },
      {
        content: "What milestones have I achieved so far?",
        expectedAgent: "insight",
        description: "Journey reflection request"
      }
    ];

    // Create a test session
    const session = await orchestrator.startSession('test-user-123');
    console.log(`✅ Created test session: ${session.sessionId}\n`);

    for (const testCase of testMessages) {
      console.log(`📝 Testing: "${testCase.content}"`);
      console.log(`   Description: ${testCase.description}`);
      console.log(`   Expected Agent: ${testCase.expectedAgent}`);

      try {
        // Test the message processing
        const response = await orchestrator.processMessage({
          userId: 'test-user-123',
          sessionId: session.sessionId,
          content: testCase.content
        });

        console.log(`   ✅ Response received:`);
        console.log(`      Agent Used: ${response.agentUsed[response.agentUsed.length - 1]}`);
        console.log(`      Confidence: ${response.confidence}`);
        console.log(`      Tools: ${response.toolResults?.find(r => r.tool === 'aiRouting')?.toolsUsed?.join(', ') || 'N/A'}`);
        console.log(`      Reasoning: ${response.metadata?.aiRoutingDecision?.reasoning || 'N/A'}`);

        const primaryAgent = response.agentUsed[response.agentUsed.length - 1];
        const isCorrect = primaryAgent === testCase.expectedAgent ||
                         (primaryAgent === 'sentiment' && response.agentUsed.includes(testCase.expectedAgent));

        console.log(`      Result: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }

      console.log('');
    }

    // Test session analytics
    console.log('📊 Testing Session Analytics');
    const analytics = await orchestrator.getSessionAnalytics(session.sessionId);
    console.log('   Analytics:', analytics);
    console.log('');

    // Clean up
    await orchestrator.endSession(session.sessionId);
    console.log('✅ Test session ended');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLLMIntentAnalysis().catch(console.error);