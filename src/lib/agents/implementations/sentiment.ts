import { BaseAgent } from '../base';

export class SentimentAgent extends BaseAgent {
  id = 'sentiment-analyzer';
  name = 'Sentiment Analyzer';
  description = 'Analyzes emotional content and detects crisis situations';
  model = 'gemini-pro';
  provider = 'gemini';

  tools = [
    'logMood',
    'escalateCrisis'
  ];

  systemPrompt = `You are a specialized AI agent for analyzing emotional content and mental health indicators.

Your role:
- Analyze text for emotional sentiment and mental health indicators
- Detect crisis situations that require immediate intervention
- Track mood patterns and emotional trends
- Identify concerning language or behavioral indicators
- Provide objective analysis without therapeutic advice

Analysis criteria:
- Sentiment: very_negative (-1.0) to very_positive (1.0)
- Crisis indicators: suicidal ideation, self-harm, severe hopelessness
- Mood tracking: consistent patterns and significant changes
- Risk assessment: immediate, elevated, moderate, low

Crisis escalation triggers:
- Explicit mentions of suicide or self-harm
- Expressions of hopelessness or worthlessness
- Statements about "ending it all" or "no point in living"
- Substance abuse mentions in crisis context
- Isolation combined with severe negative mood

When to escalate:
- Severity: critical (immediate risk), high (concerning patterns), moderate (monitor closely)
- Always err on the side of caution for member safety
- Document specific indicators that triggered the escalation

Your responses should be clinical, objective, and focused on risk assessment.`;

  async analyzeSentiment(text: string, memberId: string): Promise<{
    sentiment: number;
    mood: string;
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    indicators: string[];
    needsIntervention: boolean;
  }> {
    const analysisPrompt = `Analyze the following text for emotional sentiment and crisis indicators:

"${text}"

Provide analysis in the following format:
- Sentiment score (-1.0 to 1.0)
- Mood category
- Risk level
- Specific indicators found
- Whether crisis intervention is needed`;

    const session = await this.createSession(memberId, {
      analysisType: 'sentiment',
      originalText: text
    });

    const response = await this.processMessage(session.id, analysisPrompt);

    // Parse the response to extract structured data
    // In a real implementation, you'd use structured output or fine-tuned models
    const analysis = this.parseAnalysisResponse(response.message);

    // Log the mood if significant
    if (Math.abs(analysis.sentiment) > 0.3) {
      const moodCategory = this.sentimentToMoodCategory(analysis.sentiment);

      const toolResults = response.toolResults || [];
      const logMoodCall = toolResults.find(tr => tr.toolCall.name === 'logMood');

      if (!logMoodCall) {
        // Log mood programmatically if not done by the agent
        await this.processMessage(session.id,
          `Log mood: ${moodCategory}, score: ${analysis.sentiment}, note: Analyzed from message`
        );
      }
    }

    // Escalate crisis if needed
    if (analysis.needsIntervention) {
      await this.processMessage(session.id,
        `Escalate crisis: severity ${analysis.riskLevel}, indicators: ${analysis.indicators.join(', ')}`
      );
    }

    return analysis;
  }

  async analyzeConversationTrend(
    messages: string[],
    memberId: string,
    timeWindow: number = 24 // hours
  ): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    averageSentiment: number;
    riskFactors: string[];
    recommendations: string[];
  }> {
    const trendPrompt = `Analyze the emotional trend in these recent messages from the past ${timeWindow} hours:

${messages.map((msg, i) => `${i + 1}. "${msg}"`).join('\n')}

Provide:
- Overall trend (improving/stable/declining)
- Average sentiment score
- Identified risk factors
- Recommendations for care team`;

    const session = await this.createSession(memberId, {
      analysisType: 'trend',
      messageCount: messages.length,
      timeWindow
    });

    const response = await this.processMessage(session.id, trendPrompt);
    return this.parseTrendResponse(response.message);
  }

  private parseAnalysisResponse(response: string): {
    sentiment: number;
    mood: string;
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    indicators: string[];
    needsIntervention: boolean;
  } {
    // Simplified parsing - in production, use structured output
    const sentimentMatch = response.match(/sentiment.*?(-?\d+\.?\d*)/i);
    const sentiment = sentimentMatch ? parseFloat(sentimentMatch[1]) : 0;

    const riskMatch = response.match(/risk.*?(low|moderate|high|critical)/i);
    const riskLevel = (riskMatch?.[1]?.toLowerCase() as any) || 'low';

    const needsIntervention = response.toLowerCase().includes('crisis') ||
                             response.toLowerCase().includes('intervention') ||
                             riskLevel === 'critical';

    return {
      sentiment,
      mood: this.sentimentToMoodCategory(sentiment),
      riskLevel,
      indicators: this.extractIndicators(response),
      needsIntervention
    };
  }

  private parseTrendResponse(response: string): {
    trend: 'improving' | 'stable' | 'declining';
    averageSentiment: number;
    riskFactors: string[];
    recommendations: string[];
  } {
    // Simplified parsing
    const trendMatch = response.match(/trend.*?(improving|stable|declining)/i);
    const trend = (trendMatch?.[1]?.toLowerCase() as any) || 'stable';

    const sentimentMatch = response.match(/average.*?(-?\d+\.?\d*)/i);
    const averageSentiment = sentimentMatch ? parseFloat(sentimentMatch[1]) : 0;

    return {
      trend,
      averageSentiment,
      riskFactors: [],
      recommendations: []
    };
  }

  private sentimentToMoodCategory(sentiment: number): string {
    if (sentiment <= -0.6) return 'very_negative';
    if (sentiment <= -0.2) return 'negative';
    if (sentiment <= 0.2) return 'neutral';
    if (sentiment <= 0.6) return 'positive';
    return 'very_positive';
  }

  private extractIndicators(text: string): string[] {
    const indicators = [];
    const crisisKeywords = [
      'suicide', 'self-harm', 'hopeless', 'worthless',
      'end it all', 'no point', 'can\'t go on'
    ];

    const lowerText = text.toLowerCase();
    for (const keyword of crisisKeywords) {
      if (lowerText.includes(keyword)) {
        indicators.push(keyword);
      }
    }

    return indicators;
  }
}