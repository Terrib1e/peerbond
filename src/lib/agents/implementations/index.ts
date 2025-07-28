export { FacilitatorAgent } from './facilitator';
export { SentimentAgent } from './sentiment';
export { MatchingAgent } from './matching';

import { FacilitatorAgent } from './facilitator';
import { SentimentAgent } from './sentiment';
import { MatchingAgent } from './matching';

export const ALL_AGENTS = [
  new FacilitatorAgent(),
  new SentimentAgent(),
  new MatchingAgent()
];