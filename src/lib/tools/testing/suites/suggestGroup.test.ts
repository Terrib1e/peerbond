import { TestSuite } from '../testRunner';

export const suggestGroupTestSuite: TestSuite = {
  name: 'SuggestGroup Tool Tests',
  cases: [
    {
      name: 'Should suggest groups for valid user',
      tool: 'suggestGroup',
      args: {
        userId: 'user_123',
        goals: ['anxiety', 'stress management'],
        language: 'en'
      },
      expectedResult: {
        success: true
      }
    },
    {
      name: 'Should work with minimal args',
      tool: 'suggestGroup',
      args: {
        userId: 'user_456'
      },
      expectedResult: {
        success: true
      }
    },
    {
      name: 'Should fail with missing userId',
      tool: 'suggestGroup',
      args: {
        goals: ['depression']
      },
      shouldFail: true
    },
    {
      name: 'Should fail with too many goals',
      tool: 'suggestGroup',
      args: {
        userId: 'user_789',
        goals: Array(15).fill('goal')
      },
      shouldFail: true
    },
    {
      name: 'Should handle non-English language',
      tool: 'suggestGroup',
      args: {
        userId: 'user_intl',
        language: 'es'
      },
      expectedResult: {
        success: true
      }
    }
  ]
};