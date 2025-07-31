#!/usr/bin/env ts-node

/**
 * Demo showing how to fix the AI router issue
 * This replaces the analysis-only response with actual execution
 */

import {
  initializePeerBond,
  createDevConfig,
  AgentRegistry,
  ToolRegistry
} from '../src/lib';
import { agentRouter } from '../src/lib/agents/router';

async function demonstrateRouterFix() {
  console.log('🔧 AI Router Fix Demonstration\n');

  // Initialize the system
  const config = createDevConfig();
  // You would set real API keys here:
  // config.providers.openai!.apiKey = 'your-real-openai-key';
  initializePeerBond(config);

  console.log('✅ PeerBond system initialized\n');

  // Test the router with the exact query that was causing issues
  const testMessage = "what groups are available to me?";
  const context = {
    memberId: 'member_demo',
    sessionId: 'session_demo',
    agentId: 'router'
  };

  console.log(`🤖 Testing message: "${testMessage}"\n`);

  try {
    // Step 1: Show what the old router would return (analysis only)
    console.log('❌ OLD BEHAVIOR (Analysis only):');
    const decision = await agentRouter.analyzeIntent(testMessage, context);
    console.log(`   Primary Agent: ${decision.primaryAgent}`);
    console.log(`   Recommended Tools: ${decision.tools.join(', ')}`);
    console.log(`   Reasoning: ${decision.reasoning}`);
    console.log(`   Confidence: ${decision.confidence}\n`);

    // Step 2: Show the new router that actually executes
    console.log('✅ NEW BEHAVIOR (Actual execution):');
    const execution = await agentRouter.routeAndExecute(testMessage, context);

    console.log(`   Success: ${execution.success}`);
    console.log(`   Agent Used: ${execution.agentUsed}`);
    console.log(`   Tools Executed: ${execution.toolsExecuted.join(', ')}`);
    console.log(`   Confidence: ${execution.confidence}`);
    console.log('\n📝 Actual Response:');
    console.log(execution.response);

  } catch (error) {
    console.error('❌ Error during demonstration:', error);
  }

  // Test a few more scenarios
  console.log('\n\n🧪 Testing Additional Scenarios:');

  const testCases = [
    {
      message: "I'm looking for an anxiety support group",
      expected: "matching agent with suggestGroup tool"
    },
    {
      message: "I'm feeling really depressed today",
      expected: "facilitator agent with mood tracking"
    },
    {
      message: "Can you help me find a group?",
      expected: "matching agent with group search"
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: "${testCase.message}"`);
    console.log(`   Expected: ${testCase.expected}`);

    try {
      const result = await agentRouter.routeAndExecute(testCase.message, {
        ...context,
        sessionId: `session_${Date.now()}`
      });

      console.log(`   ✅ Agent: ${result.agentUsed}, Tools: ${result.toolsExecuted.join(', ')}`);
      console.log(`   📄 Response: ${result.response.substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n🎉 Router fix demonstration completed!');
  console.log('\n💡 Key Changes Made:');
  console.log('1. Created AgentRouter class that executes actions, not just analysis');
  console.log('2. Added listAllGroups tool for comprehensive group listing');
  console.log('3. Implemented proper tool argument generation');
  console.log('4. Created tool result formatting for better member experience');
  console.log('5. Added proper error handling and fallbacks');

  console.log('\n🔧 How to integrate into your existing system:');
  console.log('1. Replace the aiRouterAgent method calls with agentRouter.routeAndExecute()');
  console.log('2. Update your agent handlers to use the new router');
  console.log('3. Ensure tools are properly registered with the ToolRegistry');
  console.log('4. Configure proper API keys for production use');
}

// Run the demonstration
demonstrateRouterFix().catch(console.error);