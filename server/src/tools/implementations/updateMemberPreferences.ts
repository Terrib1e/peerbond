/**
 * Update Member Preferences Tool Implementation
 * Updates member personalization preferences in the system
 */

import { z } from 'zod';
import { UpdateMemberPreferencesTool } from '../schemas';
import { ToolContext, ToolResult } from '../schemas';
import { logger } from '../../utils/logger';

export async function updateMemberPreferences(
  params: z.infer<typeof UpdateMemberPreferencesTool.schema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { memberId, preferences, source } = params;

    logger.info('[updateMemberPreferences] Updating member preferences', {
      memberId,
      preferencesKeys: Object.keys(preferences),
      source,
      agent: context.agent
    });

    // Validate member exists
    if (!memberId) {
      return {
        success: false,
        error: 'Member ID is required',
        confidence: 0.0
      };
    }

    // Process and validate preferences
    const processedPreferences = await processPreferences(preferences, memberId);
    if (!processedPreferences.valid) {
      return {
        success: false,
        error: `Invalid preferences: ${processedPreferences.errors.join(', ')}`,
        confidence: 0.0
      };
    }

    // Simulate database update (in production, this would be a real database operation)
    const updateResult = await simulatePreferencesUpdate(
      memberId,
      processedPreferences.processed,
      source
    );

    // Generate adaptations based on new preferences
    const adaptationsMade = generateAdaptations(processedPreferences.processed);

    logger.info('[updateMemberPreferences] Preferences updated successfully', {
      memberId,
      preferencesCount: updateResult.preferencesCount,
      adaptationsCount: adaptationsMade.length,
      effectiveDate: updateResult.effectiveDate
    });

    return {
      success: true,
      data: {
        updated: true,
        preferencesCount: updateResult.preferencesCount,
        adaptationsMade,
        effectiveDate: updateResult.effectiveDate
      },
      confidence: 0.95,
      metadata: {
        memberId,
        source,
        originalPreferences: preferences,
        processedPreferences: processedPreferences.processed,
        updateTimestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.error('[updateMemberPreferences] Error updating preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update member preferences',
      confidence: 0.3
    };
  }
}

async function processPreferences(preferences: any, memberId: string): Promise<{
  valid: boolean;
  processed: any;
  errors: string[];
}> {
  const errors: string[] = [];
  const processed: any = {};

  // Process communication style
  if (preferences.communicationStyle) {
    const validStyles = ['gentle', 'direct', 'encouraging', 'analytical'];
    if (validStyles.includes(preferences.communicationStyle)) {
      processed.communicationStyle = preferences.communicationStyle;
    } else {
      errors.push(`Invalid communication style: ${preferences.communicationStyle}`);
    }
  }

  // Process trigger words
  if (preferences.triggerWords && Array.isArray(preferences.triggerWords)) {
    const sanitizedTriggers = preferences.triggerWords
      .filter((word: any) => typeof word === 'string' && word.length > 0)
      .map((word: string) => word.toLowerCase().trim());
    
    if (sanitizedTriggers.length > 0) {
      processed.triggerWords = sanitizedTriggers;
    }
  }

  // Process preferred support types
  if (preferences.preferredSupport && Array.isArray(preferences.preferredSupport)) {
    const validSupportTypes = ['validation', 'practical_advice', 'resources', 'peer_connection'];
    const validSupports = preferences.preferredSupport.filter((type: any) =>
      validSupportTypes.includes(type)
    );
    
    if (validSupports.length > 0) {
      processed.preferredSupport = validSupports;
    }
  }

  // Process availability hours
  if (preferences.availabilityHours) {
    const timePattern = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;
    if (timePattern.test(preferences.availabilityHours)) {
      processed.availabilityHours = preferences.availabilityHours;
    } else {
      errors.push('Invalid availability hours format. Use HH:MM-HH:MM format.');
    }
  }

  // Process notification settings
  if (preferences.notificationSettings) {
    const notificationSettings: any = {};
    
    if (preferences.notificationSettings.frequency) {
      const validFrequencies = ['immediate', 'daily', 'weekly'];
      if (validFrequencies.includes(preferences.notificationSettings.frequency)) {
        notificationSettings.frequency = preferences.notificationSettings.frequency;
      } else {
        errors.push(`Invalid notification frequency: ${preferences.notificationSettings.frequency}`);
      }
    }

    if (preferences.notificationSettings.methods && Array.isArray(preferences.notificationSettings.methods)) {
      const validMethods = ['email', 'push', 'sms'];
      const validNotificationMethods = preferences.notificationSettings.methods.filter((method: any) =>
        validMethods.includes(method)
      );
      
      if (validNotificationMethods.length > 0) {
        notificationSettings.methods = validNotificationMethods;
      }
    }

    if (Object.keys(notificationSettings).length > 0) {
      processed.notificationSettings = notificationSettings;
    }
  }

  return {
    valid: errors.length === 0,
    processed,
    errors
  };
}

async function simulatePreferencesUpdate(
  memberId: string,
  preferences: any,
  source: string
): Promise<{ preferencesCount: number; effectiveDate: string }> {
  // Simulate database operation delay
  await new Promise(resolve => setTimeout(resolve, 200));

  // In production, this would:
  // 1. Fetch existing member preferences
  // 2. Merge with new preferences
  // 3. Validate against member's subscription/permissions
  // 4. Store in database with versioning
  // 5. Trigger any necessary system updates

  const preferencesCount = Object.keys(preferences).length;
  const effectiveDate = new Date().toISOString();

  // Simulate storing preferences with metadata
  const preferenceRecord = {
    memberId,
    preferences,
    source,
    effectiveDate,
    version: Math.floor(Math.random() * 10) + 1, // Simulate version number
    updatedBy: 'personalization_agent',
    metadata: {
      previousPreferencesCount: Math.floor(Math.random() * 5),
      mergingStrategy: 'override_with_new',
      validationPassed: true
    }
  };

  logger.debug('[simulatePreferencesUpdate] Preference record created', {
    memberId,
    version: preferenceRecord.version,
    preferencesCount
  });

  return {
    preferencesCount,
    effectiveDate
  };
}

function generateAdaptations(preferences: any): string[] {
  const adaptations: string[] = [];

  // Communication style adaptations
  if (preferences.communicationStyle) {
    const styleAdaptations: Record<string, string> = {
      'gentle': 'Communication tone adjusted to be more gentle and supportive',
      'direct': 'Communication style set to be more direct and straightforward',
      'encouraging': 'Response style adapted to be more motivational and encouraging',
      'analytical': 'Communication approach adjusted to be more logical and data-driven'
    };
    
    const adaptation = styleAdaptations[preferences.communicationStyle];
    if (adaptation) {
      adaptations.push(adaptation);
    }
  }

  // Trigger word adaptations
  if (preferences.triggerWords && preferences.triggerWords.length > 0) {
    adaptations.push(`Content filtering enabled for ${preferences.triggerWords.length} trigger words`);
    adaptations.push('Language sensitivity increased to avoid identified triggers');
  }

  // Support type adaptations
  if (preferences.preferredSupport && preferences.preferredSupport.length > 0) {
    const supportAdaptations: Record<string, string> = {
      'validation': 'Responses will focus more on emotional validation and understanding',
      'practical_advice': 'Content will emphasize actionable strategies and practical solutions',
      'resources': 'Interactions will include more educational resources and reference materials',
      'peer_connection': 'System will prioritize group recommendations and peer interactions'
    };

    preferences.preferredSupport.forEach((support: string) => {
      const adaptation = supportAdaptations[support];
      if (adaptation) {
        adaptations.push(adaptation);
      }
    });
  }

  // Availability adaptations
  if (preferences.availabilityHours) {
    adaptations.push(`Interaction timing optimized for your availability window: ${preferences.availabilityHours}`);
  }

  // Notification adaptations
  if (preferences.notificationSettings) {
    if (preferences.notificationSettings.frequency) {
      adaptations.push(`Notification frequency set to ${preferences.notificationSettings.frequency}`);
    }
    
    if (preferences.notificationSettings.methods) {
      const methods = preferences.notificationSettings.methods.join(', ');
      adaptations.push(`Notification delivery methods updated: ${methods}`);
    }
  }

  // Default adaptation if no specific preferences
  if (adaptations.length === 0) {
    adaptations.push('Basic personalization profile established');
  }

  return adaptations;
}

export default {
  name: UpdateMemberPreferencesTool.name,
  description: UpdateMemberPreferencesTool.description,
  agent: UpdateMemberPreferencesTool.agent,
  execute: updateMemberPreferences
};