const { ProductionOrchestratorService } = require('./server/dist/orchestration/production-ready-fixed.js');

async function testGroupListingFix() {
  console.log('🧪 Testing Group Listing Fix - Should Show All Groups');
  console.log('==================================================\n');

  try {
    const orchestrator = new ProductionOrchestratorService();

    // Create a test session
    const session = await orchestrator.startSession('test-user-456');
    console.log(`✅ Created test session: ${session.sessionId}\n`);

    const testListingRequests = [
      "list all groups",
      "groups available",
      "show me all groups",
      "what groups are there?"
    ];

    for (const request of testListingRequests) {
      console.log(`📝 Testing: "${request}"`);

      try {
        const response = await orchestrator.processMessage({
          userId: 'test-user-456',
          sessionId: session.sessionId,
          content: request
        });

        console.log(`   ✅ Response received:`);
        console.log(`      Agent Used: ${response.agentUsed[response.agentUsed.length - 1]}`);
        console.log(`      Confidence: ${response.confidence}`);

        // Check if it's using the matching agent as expected
        const primaryAgent = response.agentUsed[response.agentUsed.length - 1];
        const isCorrect = primaryAgent === 'matching';
        console.log(`      Agent Routing: ${isCorrect ? '✅ CORRECT (matching)' : '❌ INCORRECT'}`);

        // Show part of the response to verify it lists groups
        const responsePreview = response.response.substring(0, 200) + '...';
        console.log(`      Response Preview: ${responsePreview}`);

        // Check if the response mentions groups
        const mentionsGroups = response.response.toLowerCase().includes('group');
        console.log(`      Mentions Groups: ${mentionsGroups ? '✅ YES' : '❌ NO'}`);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }

      console.log('');
    }

    // Clean up
    await orchestrator.endSession(session.sessionId);
    console.log('✅ Test session ended');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testGroupListingFix().catch(console.error);