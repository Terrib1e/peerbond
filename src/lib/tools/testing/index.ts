export * from './testRunner';
export * from './suites';

import { ToolTestRunner } from './testRunner';
import { ALL_TEST_SUITES } from './suites';

export async function runAllToolTests() {
  const runner = new ToolTestRunner();
  
  console.log('Starting tool tests...\n');
  
  for (const suite of ALL_TEST_SUITES) {
    const result = await runner.runSuite(suite);
    
    console.log(`\n${suite.name}:`);
    console.log(`  Total: ${result.totalTests}`);
    console.log(`  Passed: ${result.passed}`);
    console.log(`  Failed: ${result.failed}`);
    console.log(`  Duration: ${result.duration}ms`);
    
    if (result.failed > 0) {
      console.log('\n  Failed tests:');
      result.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`    - ${r.testName}: ${r.error}`);
        });
    }
  }
  
  const report = runner.generateReport();
  
  console.log('\n=== Test Summary ===');
  console.log(`Total Suites: ${report.totalSuites}`);
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`Total Passed: ${report.totalPassed}`);
  console.log(`Total Failed: ${report.totalFailed}`);
  console.log(`Total Duration: ${report.totalDuration}ms`);
  
  return report;
}