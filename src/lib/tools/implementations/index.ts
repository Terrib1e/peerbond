export { SuggestGroupTool } from './suggestGroup';
export { PostMessageTool } from './postMessage';
export { LogMoodTool } from './logMood';
export { EscalateCrisisTool } from './escalateCrisis';
export { ListAllGroupsTool } from './listAllGroups';
export { JoinGroupTool } from './joinGroup';

// Export new facilitator tools
export { provideSupportiveResponse } from './provideSupportiveResponse';
export { validateFeelings } from './validateFeelings';
export { suggestCopingStrategies } from './suggestCopingStrategies';

// Export all tools as an array for easy registration
import { SuggestGroupTool } from './suggestGroup';
import { PostMessageTool } from './postMessage';
import { LogMoodTool } from './logMood';
import { EscalateCrisisTool } from './escalateCrisis';
import { ListAllGroupsTool } from './listAllGroups';
import { JoinGroupTool } from './joinGroup';

export const ALL_TOOLS = [
  new SuggestGroupTool(),
  new PostMessageTool(),
  new LogMoodTool(),
  new EscalateCrisisTool(),
  new ListAllGroupsTool(),
  new JoinGroupTool()
];

// Import the facilitator tool functions
import { provideSupportiveResponse } from './provideSupportiveResponse';
import { validateFeelings } from './validateFeelings';
import { suggestCopingStrategies } from './suggestCopingStrategies';

// Facilitator tool functions (not classes)
export const FACILITATOR_TOOLS = {
  provideSupportiveResponse,
  validateFeelings,
  suggestCopingStrategies
};