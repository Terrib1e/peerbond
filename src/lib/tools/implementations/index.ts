export { SuggestGroupTool } from './suggestGroup';
export { PostMessageTool } from './postMessage';
export { LogMoodTool } from './logMood';
export { EscalateCrisisTool } from './escalateCrisis';
export { ListAllGroupsTool } from './listAllGroups';
export { JoinGroupTool } from './joinGroup';

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