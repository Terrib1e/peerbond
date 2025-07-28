# PeerBond AI System

A comprehensive, HIPAA-compliant platform for mental health support using AI agents and structured tool-calling. Built for therapy groups, crisis intervention, and peer support networks.

## 🌟 Features

### Multi-Provider LLM Support
- **OpenAI GPT-4o** for conversational AI
- **Anthropic Claude** for safety-focused interactions  
- **Google Gemini** for fast sentiment analysis
- Provider abstraction with automatic failover

### Specialized AI Agents
- **Maya (Facilitator)**: Guides group therapy sessions with empathy
- **Sentiment Analyzer**: Detects crisis situations and mood patterns
- **Extensible architecture** for custom agents

### Secure Tool System
- **HIPAA-compliant** encryption and audit logging
- **Rate limiting** and authorization controls
- **PHI detection** and content filtering
- **Crisis escalation** with therapist notifications

### Built-in Tools
- `suggestGroup`: Match users to appropriate support groups
- `postMessage`: Secure group chat functionality
- `logMood`: Track emotional states and patterns
- `escalateCrisis`: Automated crisis intervention
- Easy to add custom tools

## 🚀 Quick Start

### Installation

```bash
npm install
# or
yarn install
```

### Basic Setup

```typescript
import { initializePeerBond, createDevConfig } from './src/lib';

// Initialize with your API keys
const config = createDevConfig();
config.providers.openai!.apiKey = 'your-openai-key';
config.providers.anthropic!.apiKey = 'your-anthropic-key';

initializePeerBond(config);
```

### Using an Agent

```typescript
import { AgentRegistry } from './src/lib';

// Get Maya, the group facilitator
const maya = AgentRegistry.getInstance('facilitator-maya');
const session = await maya.createSession('user_123');

// Facilitate a group check-in
const response = await maya.facilitateCheckIn(
  session.id, 
  ['Alice', 'Bob', 'Carol']
);

console.log('Maya:', response);
```

### Direct Tool Usage

```typescript
import { ToolRegistry } from './src/lib';

const result = await ToolRegistry.execute(
  'suggestGroup',
  { 
    userId: 'user_123',
    goals: ['anxiety', 'social support'] 
  },
  { 
    userId: 'user_123',
    sessionId: 'session_456',
    agentId: 'facilitator-maya',
    timestamp: new Date()
  }
);

console.log('Suggested groups:', result.data);
```

## 🏗️ Architecture

### Provider Layer
Multi-LLM support with unified interface:
```
├── providers/
│   ├── openai.ts      # GPT-4o integration
│   ├── anthropic.ts   # Claude integration
│   ├── gemini.ts      # Gemini integration
│   └── base.ts        # Abstract provider class
```

### Tools System
Structured function calling with security:
```
├── tools/
│   ├── implementations/  # Built-in tools
│   ├── middleware/      # Rate limiting, validation, logging
│   ├── testing/         # Automated test framework
│   └── registry.ts      # Tool management
```

### AI Agents
Specialized conversational agents:
```
├── agents/
│   ├── implementations/
│   │   ├── facilitator.ts  # Maya - group therapy facilitator
│   │   └── sentiment.ts    # Crisis detection & mood analysis
│   └── base.ts            # Agent framework
```

### Security & Compliance
HIPAA-ready security framework:
```
├── security/
│   ├── authorization.ts  # Role-based access control
│   ├── encryption.ts     # AES-256-GCM encryption
│   └── audit.ts         # Comprehensive audit logging
```

## 🛡️ Security Features

### Encryption
- **AES-256-GCM** encryption for sensitive data
- **PBKDF2** key derivation with high iteration counts
- **Automatic PHI detection** and encryption

### Authorization
- **Role-based access control** (RBAC)
- **Tool-level permissions** with conditions
- **Time-window restrictions** and rate limiting

### Audit Logging
- **Immutable audit trail** for all operations
- **HIPAA-compliant** retention and reporting
- **Real-time compliance monitoring**

### Crisis Detection
- **AI-powered risk assessment** with immediate escalation
- **Multi-channel therapist notifications**
- **Automated safety protocols**

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tool tests
npm run test:tools

# Or programmatically
import { runAllToolTests } from './src/lib/tools/testing';
const report = await runAllToolTests();
```

Test your custom tools:
```typescript
import { ToolTestRunner } from './src/lib/tools/testing';

const runner = new ToolTestRunner();
await runner.runSuite({
  name: 'My Custom Tool Tests',
  cases: [
    {
      name: 'Should handle valid input',
      tool: 'myCustomTool',
      args: { input: 'test' },
      expectedResult: { success: true }
    }
  ]
});
```

## 📚 Examples

### Run the Demo
```bash
npx ts-node examples/basic-usage.ts
```

### Create Custom Tools
```typescript
import { BaseTool, z } from './src/lib';

class MyCustomTool extends BaseTool {
  name = 'myTool';
  description = 'Does something helpful';
  schema = z.object({
    input: z.string()
  });
  
  protected async run(args, context) {
    // Your tool logic here
    return { result: 'success' };
  }
}

// Register it
ToolRegistry.register(new MyCustomTool());
```

See `examples/custom-tool.ts` for a complete example.

## 🔧 Configuration

### Environment Variables
```bash
# LLM API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key  
GEMINI_API_KEY=your_gemini_key

# Security
MASTER_KEY=your_master_encryption_key
```

### Production Setup
```typescript
import { createProdConfig } from './src/lib';

const config = createProdConfig();
initializePeerBond(config);
```

## 🚀 Deployment

### HIPAA Compliance Checklist
- [ ] Deploy on HIPAA-compliant infrastructure (AWS, Azure, GCP)
- [ ] Enable encryption at rest and in transit
- [ ] Set up comprehensive audit logging
- [ ] Configure secure API key management
- [ ] Implement proper access controls
- [ ] Set up monitoring and alerting
- [ ] Complete Business Associate Agreements (BAAs)

### Recommended Stack
- **Infrastructure**: AWS with HIPAA compliance
- **Database**: Encrypted PostgreSQL or DynamoDB
- **Monitoring**: OpenTelemetry + DataDog/NewRelic
- **Secrets**: AWS Secrets Manager or HashiCorp Vault

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure HIPAA compliance for any PHI handling
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: [Link to full docs]
- **Issues**: Create an issue on GitHub
- **Security**: Report vulnerabilities privately to security@peerbond.app

---

**Built with ❤️ for mental health support communities**