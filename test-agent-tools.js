#!/usr/bin/env node

/**
 * Test Agent Tools - Quick validation of the enhanced agent system
 * Run with: node test-agent-tools.js
 */

// Set environment variables
process.env.USE_TOOL_SYSTEM = 'true';
process.env.NODE_ENV = 'test';

const path = require('path');

// Mock database service to avoid real DB dependencies during testing
const mockDatabaseService = {
  getGroups: async () => ({
    groups: [
      {
        id: 'group1',
        name: 'Anxiety Support Circle',
        description: 'A safe space for managing anxiety together',
        type: 'wellness',
        memberCount: 5,
        maxMembers: 8,
        isActive: true,
        members: ['member1', 'member2', 'member3', 'member4', 'member5'],
        compatibility: 0.9
      },
      {
        id: 'group2',
        name: 'Depression Recovery Group',
        description: 'Support for depression recovery journey',
        type: 'recovery',
        memberCount: 3,
        maxMembers: 6,
        isActive: true,
        members: ['member6', 'member7', 'member8'],
        compatibility: 0.8
      }
    ]
  }),
  getGroupById: async (id) => ({
    id,
    name: 'Test Group',
    members: ['member1', 'member2']
  }),
  getMessages: async () => ({
    messages: []
  })
};

// Mock the database service before importing agents
const moduleAlias = require('module-alias');
moduleAlias.addAlias('@db', path.join(__dirname, 'server', 'src', 'services', 'database'));

// Override require to return mock for database service
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id.includes('database') || id.includes('DatabaseService')) {
    return { DatabaseService: function() { return mockDatabaseService; } };
  }
  return originalRequire.apply(this, arguments);
};

async function testAgentTools() {
  console.log('🧪 Testing PeerBond Agent Tools System\n');

  try {
    // Import the agent factory
    const { AgentFactory } = require('./server/dist/agents/AgentFactory');

    console.log('✅ Agent Factory loaded successfully');

    const factory = AgentFactory.getInstance();
    const availableAgents = factory.getAvailableAgentTypes();

    console.log(`📊 Available agents: ${availableAgents.join(', ')}\n`);

    // Test context
    const testContext = {
      memberId: 'test-member-123',
      sessionId: 'session_123_test',
      groupId: 'group1',
      messageId: 'msg_123_test',
      timestamp: new Date(),
      metadata: { test: true }
    };

    const testResults = [];

    // Test each agent
    for (const agentType of availableAgents) {
      console.log(`🔧 Testing ${agentType} agent...`);

      const agent = factory.getAgent(agentType);
      if (!agent) {
        console.log(`❌ Failed to get ${agentType} agent`);
        continue;
      }

      try {
        let testMessage = '';

        // Customize test message per agent
        switch (agentType) {
          case 'matching':
            testMessage = 'I need help finding a support group for anxiety';
            break;
          case 'facilitator':
            testMessage = 'I\'ve been feeling really anxious lately and need support';
            break;
          case 'sentiment':
            testMessage = 'I feel overwhelmed and don\'t know what to do anymore';
            break;
          case 'insight':
            testMessage = 'How am I doing with my progress this month?';
            break;
          case 'crisis':
            testMessage = 'I need help right now, I\'m having a panic attack';
            break;
          default:
            testMessage = 'Hello, I need some support';
        }

        const result = await agent.execute(testMessage, testContext);

        testResults.push({
          agent: agentType,
          success: result.toolsUsed.length > 0,
          toolsUsed: result.toolsUsed,
          confidence: result.confidence,
          responseLength: result.response.length,
          error: null
        });

        console.log(`  ✅ Success! Used tools: ${result.toolsUsed.join(', ')}`);
        console.log(`  📈 Confidence: ${Math.round(result.confidence * 100)}%`);
        console.log(`  📝 Response: "${result.response.substring(0, 100)}..."\n`);

      } catch (error) {
        testResults.push({
          agent: agentType,
          success: false,
          toolsUsed: [],
          confidence: 0,
          responseLength: 0,
          error: error.message
        });

        console.log(`  ❌ Error: ${error.message}\n`);
      }
    }

    // Test Enhanced Orchestrator
    console.log('🎭 Testing Enhanced Orchestrator...');

    try {
      const { EnhancedOrchestrator } = require('./server/dist/orchestration/EnhancedOrchestrator');
      const orchestrator = new EnhancedOrchestrator();

      const orchestratorResult = await orchestrator.processMessage({
        memberId: testContext.memberId,
        sessionId: testContext.sessionId,
        groupId: testContext.groupId,
        content: 'I want to find a support group and track my progress',
        messageType: 'member'
      });

      console.log(`  ✅ Orchestrator Success!`);
      console.log(`  🤖 Agents used: ${orchestratorResult.agentsUsed.join(', ')}`);
      console.log(`  🔧 Tools used: ${orchestratorResult.toolsUsed.join(', ')}`);
      console.log(`  📈 Confidence: ${Math.round(orchestratorResult.confidence * 100)}%`);

      testResults.push({
        agent: 'orchestrator',
        success: orchestratorResult.success,
        toolsUsed: orchestratorResult.toolsUsed,
        confidence: orchestratorResult.confidence,
        responseLength: orchestratorResult.response.length,
        error: null
      });

    } catch (error) {
      console.log(`  ❌ Orchestrator Error: ${error.message}`);
      testResults.push({
        agent: 'orchestrator',
        success: false,
        toolsUsed: [],
        confidence: 0,
        responseLength: 0,
        error: error.message
      });
    }

    // Summary
    console.log('\n📋 Test Summary:');
    console.log('================');

    const successfulTests = testResults.filter(r => r.success);
    const failedTests = testResults.filter(r => !r.success);

    console.log(`✅ Successful: ${successfulTests.length}`);
    console.log(`❌ Failed: ${failedTests.length}`);
    console.log(`📊 Success Rate: ${Math.round((successfulTests.length / testResults.length) * 100)}%`);

    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  • ${test.agent}: ${test.error}`);
      });
    }

    if (successfulTests.length > 0) {
      console.log('\n✅ Tool Usage Summary:');
      const allTools = successfulTests.flatMap(t => t.toolsUsed);
      const toolCounts = allTools.reduce((counts, tool) => {
        counts[tool] = (counts[tool] || 0) + 1;
        return counts;
      }, {});

      Object.entries(toolCounts).forEach(([tool, count]) => {
        console.log(`  • ${tool}: ${count} times`);
      });
    }

    console.log('\n🎉 Agent tools testing complete!');

    // Exit with appropriate code
    process.exit(failedTests.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
testAgentTools();