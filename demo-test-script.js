#!/usr/bin/env node

/**
 * Interactive Demo Script for PeerBond AI Agent System
 * Perfect for live demonstrations and interviews
 */

const readline = require('readline');
const { spawn } = require('child_process');

// Demo scenarios for quick testing
const DEMO_SCENARIOS = {
  '1': {
    name: 'Group Finding',
    agent: 'matching',
    message: 'I need help finding a support group for anxiety and depression',
    expected: ['searchGroups', 'generateGroupRecommendations']
  },
  '2': {
    name: 'Crisis Support',
    agent: 'crisis', 
    message: 'I\'m having a panic attack and need help right now',
    expected: ['provideCrisisSupport']
  },
  '3': {
    name: 'Progress Tracking',
    agent: 'insight',
    message: 'How am I doing with my progress this month? I want to see patterns',
    expected: ['analyzeUserProgress', 'identifyPatterns']
  },
  '4': {
    name: 'Emotional Support',
    agent: 'facilitator',
    message: 'I\'ve been feeling really anxious lately and struggling to cope',
    expected: ['provideSupportiveResponse', 'validateFeelings']
  },
  '5': {
    name: 'Sentiment Analysis',
    agent: 'sentiment',
    message: 'I feel overwhelmed and don\'t know what to do anymore',
    expected: ['analyzeSentiment', 'detectCrisis']
  },
  '6': {
    name: 'Multi-Agent Orchestration',
    agent: 'orchestrator',
    message: 'I want to track my progress and find others who understand my journey',
    expected: ['Multiple agents working together']
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function colorize(text, color) {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
  };
  return `${colors[color] || ''}${text}${colors.reset}`;
}

function showWelcome() {
  console.clear();
  console.log(colorize('🎯 PeerBond AI Agent System - Interactive Demo', 'bold'));
  console.log(colorize('===============================================', 'cyan'));
  console.log();
  console.log('This interactive demo showcases the intelligent agent orchestration system.');
  console.log('Each agent has specialized tools and expertise for different therapeutic needs.');
  console.log();
}

function showMenu() {
  console.log(colorize('📋 Available Demo Scenarios:', 'bold'));
  console.log();
  
  Object.entries(DEMO_SCENARIOS).forEach(([key, scenario]) => {
    console.log(`${colorize(key, 'cyan')}. ${colorize(scenario.name, 'green')}`);
    console.log(`   Agent: ${scenario.agent}`);
    console.log(`   Message: "${scenario.message.substring(0, 60)}..."`);
    console.log();
  });
  
  console.log(`${colorize('0', 'cyan')}. ${colorize('Exit Demo', 'red')}`);
  console.log();
}

async function runScenario(scenarioKey) {
  const scenario = DEMO_SCENARIOS[scenarioKey];
  if (!scenario) {
    console.log(colorize('❌ Invalid scenario selected', 'red'));
    return;
  }

  console.log(colorize(`\n🎬 Running Demo: ${scenario.name}`, 'bold'));
  console.log(colorize('================================', 'cyan'));
  console.log(`${colorize('Agent:', 'blue')} ${scenario.agent}`);
  console.log(`${colorize('Message:', 'blue')} "${scenario.message}"`);
  console.log(`${colorize('Expected Tools:', 'blue')} ${scenario.expected.join(', ')}`);
  console.log();

  // Show loading animation
  const loadingChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let loadingIndex = 0;
  const loadingInterval = setInterval(() => {
    process.stdout.write(`\r${colorize(loadingChars[loadingIndex], 'yellow')} Processing with AI agents...`);
    loadingIndex = (loadingIndex + 1) % loadingChars.length;
  }, 100);

  try {
    // Simulate API call (replace with actual API call for live demo)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    clearInterval(loadingInterval);
    process.stdout.write('\r');
    
    // Simulate successful response
    const mockResponse = {
      success: true,
      response: generateMockResponse(scenario),
      agentUsed: scenario.agent,
      toolsUsed: scenario.expected,
      confidence: 0.85 + Math.random() * 0.1,
      metadata: {
        processingTime: `${Math.floor(Math.random() * 500 + 200)}ms`,
        safetyCheck: 'passed',
        toolExecutions: scenario.expected.length
      }
    };

    displayResults(mockResponse);
    
  } catch (error) {
    clearInterval(loadingInterval);
    process.stdout.write('\r');
    console.log(colorize('❌ Demo scenario failed:', 'red'), error.message);
  }
}

function generateMockResponse(scenario) {
  const responses = {
    '1': 'Great! I\'ve found some wonderful peer support groups that match your needs. Here are my top recommendations:\n\n**1. Anxiety & Depression Support Circle**\nA safe space for managing anxiety and depression together\n• Members: 5/8\n• Compatibility: 95%\n\n**2. Mindful Recovery Group**\nFocus on mindfulness techniques for emotional wellness\n• Members: 3/6\n• Compatibility: 87%\n\nWould you like me to help you join one of these groups?',
    
    '2': '⚠️ **Important Safety Notice**\n\nI\'m here with you right now, and your safety is my top priority.\n\n**Immediate Coping Techniques:**\n• Take slow, deep breaths (4 counts in, 6 counts out)\n• Name 5 things you can see around you\n• Ground yourself by feeling your feet on the floor\n\n**Crisis Resources:**\n• National Crisis Hotline: **988** (24/7)\n• Crisis Text Line: Text **HOME** to **741741**\n• Emergency Services: **911**\n\nYou\'re not alone in this. Please reach out for support. 💙',
    
    '3': '🌟 **Your Personal Growth Journey Analysis**\n\n**Overall Progress**: 📈 Showing improvement\n\nKey observations:\n• Consistent engagement with support resources\n• Mood scores improving over time\n• Increased use of coping strategies\n\n🎉 **Wins to Celebrate**:\n• 30-day engagement streak!\n• Successfully used breathing techniques in 8/10 stressful situations\n• Built meaningful connections with 3 group members\n\n🔍 **Patterns I\'ve Noticed**:\n• **Temporal Pattern**: Mood dips on Sunday evenings\n  Common triggers: Work anxiety, End of weekend\n  Suggestion: Schedule relaxing Sunday evening activity\n\n💪 Keep up the amazing work! Your dedication to growth is truly inspiring.',
    
    '4': 'I hear that you\'re dealing with anxiety, and I want you to know that what you\'re experiencing is completely valid. Anxiety can feel so overwhelming, especially when it\'s been persistent like this.\n\nIt takes real courage to reach out and share what you\'re going through. That\'s actually a strength, even when it doesn\'t feel like it.\n\n💙 **Quick Support**: Try the 5-4-3-2-1 method - name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste. This can help anchor you in the present moment.\n\nI\'m curious - what\'s been contributing most to these anxious feelings lately? 🤗',
    
    '5': '**Emotional Analysis Summary**\n\n• **Overall Mood**: 😔 Negative\n• **Emotional Intensity**: High\n• **Key Emotions Detected**: overwhelm (85%), distress (72%), uncertainty (68%)\n\n**Wellbeing Indicators:**\n✅ Strengths: Seeking support, Self-awareness\n⚠️ Areas of concern: High stress levels, Feeling stuck\n\n**Support Suggestions:**\n• Consider trying some grounding techniques or breathing exercises\n• Connecting with your support network might be helpful\n• Remember that these feelings are temporary, even when they feel overwhelming',
    
    '6': 'Based on what you\'ve shared, I can help you with both progress tracking and connecting with others who understand your journey.\n\n**Progress Insights**: You\'ve shown remarkable consistency in your wellness journey over the past month, with particular growth in emotional awareness and peer connection.\n\n**Community Recommendations**: I\'ve found 2 groups that align perfectly with your growth-focused mindset:\n\n**1. Personal Growth Circle** - 92% compatibility\n**2. Journey Companions** - 87% compatibility\n\nThese groups focus on celebrating progress and supporting each other\'s growth. Would you like to explore joining one of them while we continue tracking your development?'
  };
  
  return responses[scenario] || responses['4'];
}

function displayResults(response) {
  console.log(colorize('📊 Demo Results:', 'bold'));
  console.log(colorize('===============', 'cyan'));
  console.log();
  
  console.log(colorize('✅ Success:', 'green'), response.success);
  console.log(colorize('🤖 Agent Used:', 'blue'), response.agentUsed);
  console.log(colorize('🔧 Tools Used:', 'blue'), response.toolsUsed.join(', '));
  console.log(colorize('📈 Confidence:', 'blue'), `${Math.round(response.confidence * 100)}%`);
  console.log();
  
  console.log(colorize('💬 AI Response:', 'bold'));
  console.log(colorize('----------------', 'cyan'));
  console.log(response.response);
  console.log();
  
  if (response.metadata) {
    console.log(colorize('📋 Metadata:', 'bold'));
    console.log(colorize('------------', 'cyan'));
    Object.entries(response.metadata).forEach(([key, value]) => {
      console.log(`${colorize(key, 'yellow')}: ${value}`);
    });
    console.log();
  }
}

async function runInteractiveDemo() {
  showWelcome();
  
  while (true) {
    showMenu();
    
    const choice = await new Promise(resolve => {
      rl.question(colorize('Select a demo scenario (0-6): ', 'bold'), resolve);
    });
    
    if (choice === '0') {
      console.log(colorize('\n👋 Thank you for exploring the PeerBond AI Agent System!', 'green'));
      console.log(colorize('Good luck with your interview! 🚀', 'bold'));
      break;
    }
    
    if (DEMO_SCENARIOS[choice]) {
      await runScenario(choice);
      
      await new Promise(resolve => {
        rl.question(colorize('\nPress Enter to continue...', 'cyan'), resolve);
      });
      
      console.clear();
      showWelcome();
    } else {
      console.log(colorize('❌ Invalid choice. Please select 0-6.', 'red'));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  rl.close();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(colorize('\n\n👋 Demo interrupted. Goodbye!', 'yellow'));
  process.exit(0);
});

// Start the interactive demo
console.log(colorize('🚀 Starting PeerBond AI Agent Demo...', 'green'));
runInteractiveDemo().catch(error => {
  console.error(colorize('💥 Demo failed:', 'red'), error);
  process.exit(1);
});