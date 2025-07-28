import { Tool, ToolContext, ToolResult } from '../types';
import { ToolRegistry } from '../registry';
import { z } from 'zod';

export interface TestCase<TArgs = any, TResult = any> {
  name: string;
  tool: string;
  args: TArgs;
  context?: Partial<ToolContext>;
  expectedResult?: Partial<ToolResult<TResult>>;
  shouldFail?: boolean;
  skipValidation?: boolean;
}

export interface TestSuite {
  name: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  cases: TestCase[];
}

export class ToolTestRunner {
  private results: Map<string, TestResult[]> = new Map();

  async runSuite(suite: TestSuite): Promise<TestSuiteResult> {
    console.log(`Running test suite: ${suite.name}`);
    
    if (suite.setup) {
      await suite.setup();
    }

    const results: TestResult[] = [];
    
    for (const testCase of suite.cases) {
      const result = await this.runTest(testCase);
      results.push(result);
    }

    if (suite.teardown) {
      await suite.teardown();
    }

    const suiteResult: TestSuiteResult = {
      suiteName: suite.name,
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      results
    };

    this.results.set(suite.name, results);
    
    return suiteResult;
  }

  private async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const context: ToolContext = {
      userId: 'test_user',
      sessionId: 'test_session',
      agentId: 'test_agent',
      timestamp: new Date(),
      ...testCase.context
    };

    try {
      const tool = ToolRegistry.get(testCase.tool);
      if (!tool) {
        throw new Error(`Tool ${testCase.tool} not found`);
      }

      // Test schema validation
      if (!testCase.skipValidation) {
        await this.testSchemaValidation(tool, testCase.args);
      }

      // Execute tool
      const result = await ToolRegistry.execute(testCase.tool, testCase.args, context);
      
      // Check expectations
      if (testCase.shouldFail && result.success) {
        throw new Error('Expected test to fail but it succeeded');
      }
      
      if (!testCase.shouldFail && !result.success) {
        throw new Error(`Test failed: ${result.error}`);
      }

      if (testCase.expectedResult) {
        this.assertResult(result, testCase.expectedResult);
      }

      const duration = Date.now() - startTime;
      
      return {
        testName: testCase.name,
        toolName: testCase.tool,
        passed: true,
        duration,
        result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        testName: testCase.name,
        toolName: testCase.tool,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testSchemaValidation(tool: Tool, args: any) {
    try {
      await tool.schema.parseAsync(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Schema validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  private assertResult(actual: ToolResult, expected: Partial<ToolResult>) {
    if (expected.success !== undefined && actual.success !== expected.success) {
      throw new Error(`Expected success to be ${expected.success} but got ${actual.success}`);
    }

    if (expected.error !== undefined && actual.error !== expected.error) {
      throw new Error(`Expected error "${expected.error}" but got "${actual.error}"`);
    }

    if (expected.data !== undefined) {
      // Deep equality check would go here
      // For now, just check if data exists
      if (!actual.data) {
        throw new Error('Expected data but got none');
      }
    }
  }

  generateReport(): TestReport {
    const allResults = Array.from(this.results.values()).flat();
    
    return {
      totalSuites: this.results.size,
      totalTests: allResults.length,
      totalPassed: allResults.filter(r => r.passed).length,
      totalFailed: allResults.filter(r => !r.passed).length,
      totalDuration: allResults.reduce((sum, r) => sum + r.duration, 0),
      suites: Array.from(this.results.entries()).map(([name, results]) => ({
        suiteName: name,
        totalTests: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        duration: results.reduce((sum, r) => sum + r.duration, 0),
        results
      }))
    };
  }
}

interface TestResult {
  testName: string;
  toolName: string;
  passed: boolean;
  duration: number;
  result?: ToolResult;
  error?: string;
}

interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

interface TestReport {
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  suites: TestSuiteResult[];
}