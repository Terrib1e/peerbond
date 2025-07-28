#!/usr/bin/env ts-node

/**
 * Basic usage example for PeerBond AI System
 * 
 * This demonstrates:
 * - System initialization
 * - Agent conversations
 * - Tool execution with security
 * - Audit logging
 */

import { 
  initializePeerBond, 
  createDevConfig,
  AgentRegistry,
  ToolRegistry,
  auditService
} from '../src/lib';

async function main() {
  console.log('🚀 PeerBond AI System Demo\n');

  // Initialize the system
  const config = createDevConfig();
  initializePeerBond(config);

  console.log('\n📋 Available Tools:');
  ToolRegistry.getAll().forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });

  console.log('\n🤖 Available Agents:');
  AgentRegistry.getAll().forEach(agent => {
    console.log(`  - ${agent.name}: ${agent.description}`);
  });

  // Demo 1: Maya (Facilitator Agent) helping with group support
  console.log('\n\n=== Demo 1: Group Facilitation ===');
  
  const maya = AgentRegistry.getInstance('facilitator-maya');
  if (maya) {
    const session = await maya.createSession('user_demo', {
      groupType: 'anxiety_support',
      sessionNumber: 1
    });

    console.log('Creating group session...');
    const response = await maya.facilitateCheckIn(session.id, ['Alice', 'Bob', 'Carol']);
    console.log('Maya:', response);

    // Simulate a user sharing
    console.log('\nUser shares a concern...');
    const supportResponse = await maya.provideCopingStrategy(
      session.id,
      'work stress and anxiety',
      'overwhelmed and worried'
    );
    console.log('Maya:', supportResponse);
  }

  // Demo 2: Sentiment Analysis for Crisis Detection
  console.log('\n\n=== Demo 2: Crisis Detection ===');
  
  const sentimentAgent = AgentRegistry.getInstance('sentiment-analyzer');
  if (sentimentAgent) {
    // Test concerning message
    const concerningText = "I feel hopeless and like nothing matters anymore. I can't see any point in continuing.";
    
    console.log('Analyzing concerning message...');
    const analysis = await sentimentAgent.analyzeSentiment(concerningText, 'user_at_risk');
    
    console.log('Analysis Results:');
    console.log(`  Sentiment: ${analysis.sentiment}`);
    console.log(`  Mood: ${analysis.mood}`);
    console.log(`  Risk Level: ${analysis.riskLevel}`);
    console.log(`  Indicators: ${analysis.indicators.join(', ')}`);
    console.log(`  Needs Intervention: ${analysis.needsIntervention}`);
  }

  // Demo 3: Direct Tool Usage with Security
  console.log('\n\n=== Demo 3: Secure Tool Execution ===');
  
  const toolContext = {
    userId: 'user_demo',
    sessionId: 'session_demo',
    agentId: 'demo_agent',
    timestamp: new Date()
  };

  // Suggest groups for a user
  console.log('Suggesting support groups...');
  const groupResult = await ToolRegistry.execute(
    'suggestGroup',
    { 
      userId: 'user_demo',
      goals: ['anxiety', 'social support'],
      language: 'en'
    },
    toolContext
  );

  if (groupResult.success) {
    console.log('Suggested Groups:');
    groupResult.data?.forEach((group: any, index: number) => {
      console.log(`  ${index + 1}. ${group.name} (Match: ${(group.matchScore * 100).toFixed(0)}%)`);
      console.log(`     ${group.description}`);
      console.log(`     Schedule: ${group.meetingSchedule}`);
    });
  }

  // Demo 4: Testing Framework
  console.log('\n\n=== Demo 4: Running Tool Tests ===');
  
  const { runAllToolTests } = await import('../src/lib/tools/testing');
  const testReport = await runAllToolTests();
  
  console.log(`Test Results: ${testReport.totalPassed}/${testReport.totalTests} passed`);

  // Demo 5: Audit Report
  console.log('\n\n=== Demo 5: Security Audit ===');
  
  const auditLogs = await auditService.query({
    action: { $regex: /tool:/ } as any
  }, { limit: 5 });

  console.log('Recent Tool Executions:');
  auditLogs.forEach(log => {
    console.log(`  ${log.timestamp.toISOString()} - ${log.action} by ${log.agentId} (${log.result})`);
  });

  console.log('\n✅ Demo completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Configure real API keys in environment variables');
  console.log('2. Set up database storage for sessions and audit logs');
  console.log('3. Integrate with your frontend application');
  console.log('4. Add custom tools for your specific use cases');
  console.log('5. Configure HIPAA-compliant hosting and monitoring');
}

// Error handling
main().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});