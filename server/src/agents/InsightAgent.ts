/**
 * Insight Agent - Analyzes member progress and provides journey insights
 * Tracks patterns, celebrates growth, and offers personalized recommendations
 */

import { BaseAgent, AgentExecutionResult } from './BaseAgent';
import { ToolContext, ToolResult } from '../tools/schemas';
import { logger } from '../utils/logger';

export class InsightAgent extends BaseAgent {
  constructor() {
    super({
      id: 'insight',
      name: 'Insight Agent',
      description: 'Analyzes member progress and provides journey insights and growth tracking',
      availableTools: ['analyzeMemberProgress', 'generateProgressInsights', 'identifyPatterns']
    });
  }

  protected async processMessage(
    message: string,
    context: ToolContext
  ): Promise<AgentExecutionResult> {
    const toolsUsed: string[] = [];
    const toolResults: ToolResult[] = [];
    let response = '';
    let confidence = 0;

    try {
      // Determine the type of insight requested
      const insightType = this.determineInsightType(message);
      const timeframe = this.extractTimeframe(message);
      const focusAreas = this.extractFocusAreas(message);

      logger.info(`[${this.name}] Processing insight request:`, { 
        insightType, 
        timeframe,
        focusAreas 
      });

      // Step 1: Analyze member progress
      const progressParams = {
        memberId: context.memberId,
        timeframe,
        metrics: ['mood', 'engagement', 'goal_progress', 'social_connection'],
        includeComparisons: true
      };

      const progressResult = await this.executeTool('analyzeMemberProgress', progressParams, context);
      toolsUsed.push('analyzeMemberProgress');
      toolResults.push(progressResult);

      let overallProgress = null;
      let metricAnalysis = [];
      let milestones = [];

      if (progressResult.success && progressResult.data) {
        overallProgress = progressResult.data.overallProgress;
        metricAnalysis = progressResult.data.metricAnalysis || [];
        milestones = progressResult.data.milestones || [];
      }

      // Step 2: Generate detailed insights based on request type
      if (insightType !== 'quick_check') {
        const insightParams = {
          memberId: context.memberId,
          groupId: context.groupId,
          focusAreas: focusAreas.length > 0 ? focusAreas : ['emotional_regulation', 'social_skills', 'resilience'],
          insightType: insightType === 'journey_review' ? 'overall_journey' : 'personal_growth',
          audienceType: 'self_reflection'
        };

        const insightResult = await this.executeTool('generateProgressInsights', insightParams, context);
        toolsUsed.push('generateProgressInsights');
        toolResults.push(insightResult);

        if (insightResult.success && insightResult.data) {
          response = this.buildComprehensiveInsightResponse({
            overallProgress,
            metricAnalysis,
            milestones,
            primaryInsights: insightResult.data.primaryInsights || [],
            strengthsIdentified: insightResult.data.strengthsIdentified || [],
            growthOpportunities: insightResult.data.growthOpportunities || [],
            celebrationPoints: insightResult.data.celebrationPoints || [],
            nextSteps: insightResult.data.nextSteps || []
          });
          confidence = Math.max(insightResult.confidence || 0.85, 0.8);
        }
      }

      // Step 3: Identify patterns if requested or if concerning trends detected
      if (insightType === 'pattern_analysis' || this.shouldAnalyzePatterns(overallProgress)) {
        const patternParams = {
          memberId: context.memberId,
          dataTypes: ['messages', 'mood_logs', 'participation'],
          patternTypes: ['temporal', 'emotional', 'behavioral'],
          lookbackPeriod: timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 14,
          minimumConfidence: 0.7
        };

        const patternResult = await this.executeTool('identifyPatterns', patternParams, context);
        toolsUsed.push('identifyPatterns');
        toolResults.push(patternResult);

        if (patternResult.success && patternResult.data) {
          const patterns = patternResult.data.patterns || [];
          if (patterns.length > 0) {
            response += '\n\n' + this.buildPatternInsights(patterns);
          }
        }
      }

      // If no comprehensive response built yet, build a quick progress check
      if (!response) {
        response = this.buildQuickProgressResponse({
          overallProgress,
          metricAnalysis,
          milestones,
          timeframe
        });
        confidence = 0.8;
      }

      // Add encouraging closing
      response += this.addEncouragingClosing(overallProgress);

      return {
        response,
        confidence,
        toolsUsed,
        toolResults,
        metadata: {
          insightType,
          timeframe,
          focusAreas,
          progressDirection: overallProgress?.direction || 'unknown',
          milestonesAchieved: milestones.length
        }
      };

    } catch (error) {
      logger.error(`[${this.name}] Error in processMessage:`, error);
      return {
        response: this.getErrorResponse(),
        confidence: 0.6,
        toolsUsed,
        toolResults,
        metadata: { error: error.message }
      };
    }
  }

  private determineInsightType(message: string): 'quick_check' | 'journey_review' | 'pattern_analysis' | 'growth_focus' {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('pattern') || lowerMessage.includes('trend')) {
      return 'pattern_analysis';
    }
    if (lowerMessage.includes('journey') || lowerMessage.includes('overall') || lowerMessage.includes('since')) {
      return 'journey_review';
    }
    if (lowerMessage.includes('growth') || lowerMessage.includes('improve')) {
      return 'growth_focus';
    }

    return 'quick_check';
  }

  private extractTimeframe(message: string): 'week' | 'month' | 'quarter' | 'year' {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('week') || lowerMessage.includes('7 days')) {
      return 'week';
    }
    if (lowerMessage.includes('month') || lowerMessage.includes('30 days')) {
      return 'month';
    }
    if (lowerMessage.includes('quarter') || lowerMessage.includes('3 months')) {
      return 'quarter';
    }
    if (lowerMessage.includes('year')) {
      return 'year';
    }

    return 'month'; // default
  }

  private extractFocusAreas(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const focusAreas: string[] = [];

    const areaKeywords = {
      'emotional_regulation': ['emotion', 'feeling', 'mood', 'regulate'],
      'social_skills': ['social', 'connect', 'relationship', 'communicate'],
      'coping_strategies': ['cope', 'coping', 'manage', 'handle'],
      'goal_achievement': ['goal', 'achieve', 'accomplish', 'complete'],
      'resilience': ['resilient', 'bounce', 'recover', 'strong']
    };

    Object.entries(areaKeywords).forEach(([area, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        focusAreas.push(area);
      }
    });

    return focusAreas;
  }

  private shouldAnalyzePatterns(overallProgress: any): boolean {
    if (!overallProgress) return false;
    
    // Analyze patterns if progress is declining or mixed
    return overallProgress.direction === 'declining' || overallProgress.direction === 'mixed';
  }

  private buildComprehensiveInsightResponse(data: {
    overallProgress: any;
    metricAnalysis: any[];
    milestones: any[];
    primaryInsights: any[];
    strengthsIdentified: string[];
    growthOpportunities: string[];
    celebrationPoints: string[];
    nextSteps: string[];
  }): string {
    let response = '🌟 **Your Personal Growth Journey Analysis**\n\n';

    // Overall progress summary
    if (data.overallProgress) {
      const directionEmoji = {
        'improving': '📈',
        'stable': '➡️',
        'declining': '📉',
        'mixed': '〰️'
      };
      
      response += `**Overall Progress**: ${directionEmoji[data.overallProgress.direction] || ''} ${this.formatDirection(data.overallProgress.direction)}\n`;
      
      if (data.overallProgress.keyFindings && data.overallProgress.keyFindings.length > 0) {
        response += `\nKey observations:\n`;
        data.overallProgress.keyFindings.forEach(finding => {
          response += `• ${finding}\n`;
        });
      }
      response += '\n';
    }

    // Celebration points
    if (data.celebrationPoints.length > 0) {
      response += '🎉 **Wins to Celebrate**:\n';
      data.celebrationPoints.slice(0, 3).forEach(point => {
        response += `• ${point}\n`;
      });
      response += '\n';
    }

    // Milestones
    if (data.milestones.length > 0) {
      response += '🏆 **Recent Milestones**:\n';
      data.milestones.slice(0, 3).forEach(milestone => {
        response += `• ${milestone.achievement}`;
        if (milestone.significance === 'major') response += ' ⭐';
        response += '\n';
      });
      response += '\n';
    }

    // Strengths
    if (data.strengthsIdentified.length > 0) {
      response += '💪 **Your Strengths**:\n';
      data.strengthsIdentified.slice(0, 4).forEach(strength => {
        response += `• ${strength}\n`;
      });
      response += '\n';
    }

    // Primary insights
    if (data.primaryInsights.length > 0) {
      response += '💡 **Key Insights**:\n';
      data.primaryInsights.slice(0, 2).forEach(insight => {
        response += `• **${insight.category}**: ${insight.insight}\n`;
      });
      response += '\n';
    }

    // Growth opportunities
    if (data.growthOpportunities.length > 0) {
      response += '🌱 **Growth Opportunities**:\n';
      data.growthOpportunities.slice(0, 3).forEach(opportunity => {
        response += `• ${opportunity}\n`;
      });
      response += '\n';
    }

    // Next steps
    if (data.nextSteps.length > 0) {
      response += '👉 **Recommended Next Steps**:\n';
      data.nextSteps.slice(0, 3).forEach((step, index) => {
        response += `${index + 1}. ${step}\n`;
      });
    }

    return response;
  }

  private buildQuickProgressResponse(data: {
    overallProgress: any;
    metricAnalysis: any[];
    milestones: any[];
    timeframe: string;
  }): string {
    let response = `📊 **Your Progress Update** (${this.formatTimeframe(data.timeframe)})\n\n`;

    if (data.overallProgress) {
      const direction = data.overallProgress.direction;
      if (direction === 'improving') {
        response += `Great news! You're showing positive progress across multiple areas. `;
      } else if (direction === 'stable') {
        response += `You're maintaining steady progress, which shows consistency. `;
      } else if (direction === 'declining') {
        response += `I notice things have been more challenging lately. That's okay - progress isn't always linear. `;
      } else {
        response += `Your progress shows some ups and downs, which is completely normal. `;
      }
    }

    // Highlight key metrics
    if (data.metricAnalysis.length > 0) {
      response += `\n\nHere's what stands out:\n`;
      data.metricAnalysis.slice(0, 2).forEach(metric => {
        const trendEmoji = {
          'increasing': '⬆️',
          'stable': '➡️',
          'decreasing': '⬇️'
        };
        response += `• **${this.formatMetricName(metric.metric)}**: ${trendEmoji[metric.trend] || ''} ${metric.trend}\n`;
        if (metric.insights && metric.insights.length > 0) {
          response += `  - ${metric.insights[0]}\n`;
        }
      });
    }

    // Recent achievements
    if (data.milestones.length > 0) {
      response += `\n🎯 Recent achievement: ${data.milestones[0].achievement}\n`;
    }

    response += `\nWould you like me to dive deeper into any specific area of your progress?`;

    return response;
  }

  private buildPatternInsights(patterns: any[]): string {
    let response = '🔍 **Patterns I\'ve Noticed**:\n\n';

    patterns.slice(0, 2).forEach(pattern => {
      response += `• **${this.formatPatternType(pattern.type)} Pattern**: ${pattern.description}\n`;
      
      if (pattern.triggers && pattern.triggers.length > 0) {
        response += `  Common triggers: ${pattern.triggers.slice(0, 2).join(', ')}\n`;
      }
      
      if (pattern.suggestions && pattern.suggestions.length > 0) {
        response += `  Suggestion: ${pattern.suggestions[0]}\n`;
      }
      
      response += '\n';
    });

    return response;
  }

  private formatDirection(direction: string): string {
    const directionMap = {
      'improving': 'Showing improvement',
      'stable': 'Remaining stable',
      'declining': 'Facing some challenges',
      'mixed': 'Mixed results'
    };
    
    return directionMap[direction] || direction;
  }

  private formatTimeframe(timeframe: string): string {
    const timeframeMap = {
      'week': 'Past Week',
      'month': 'Past Month',
      'quarter': 'Past 3 Months',
      'year': 'Past Year'
    };
    
    return timeframeMap[timeframe] || timeframe;
  }

  private formatMetricName(metric: string): string {
    const metricMap = {
      'mood': 'Emotional Wellbeing',
      'engagement': 'Engagement Level',
      'goal_progress': 'Goal Progress',
      'social_connection': 'Social Connection'
    };
    
    return metricMap[metric] || metric;
  }

  private formatPatternType(type: string): string {
    const typeMap = {
      'temporal': 'Time-based',
      'emotional': 'Emotional',
      'behavioral': 'Behavioral',
      'social': 'Social',
      'progress': 'Progress'
    };
    
    return typeMap[type] || type;
  }

  private addEncouragingClosing(overallProgress: any): string {
    const direction = overallProgress?.direction || 'stable';
    
    const closings = {
      'improving': '\n\n💪 Keep up the amazing work! Your dedication to growth is truly inspiring.',
      'stable': '\n\n🌟 Consistency is a superpower. You\'re building a strong foundation for lasting change.',
      'declining': '\n\n💙 Remember, setbacks are setups for comebacks. I\'m here to support you through this.',
      'mixed': '\n\n🌈 Growth isn\'t always linear, and that\'s perfectly okay. Every step forward counts.'
    };
    
    return closings[direction] || closings.stable;
  }

  protected getErrorResponse(): string {
    return `I'd love to share insights about your progress, but I'm experiencing some technical difficulties accessing your data.

In the meantime, here are some reflection questions that might be helpful:

• What wins (big or small) have you had recently?
• What patterns have you noticed in your mood or energy?
• What's one area where you've grown, even a little?

Your journey matters, and every bit of progress counts. Once I can access your full history, I'll be able to give you more detailed insights.`;
  }
}