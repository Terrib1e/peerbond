#!/usr/bin/env ts-node

/**
 * Example of creating and registering a custom tool
 */

import { z } from 'zod';
import { BaseTool, ToolRegistry, ToolContext, initializePeerBond, createDevConfig } from '../src/lib';

// Define the schema for our custom tool
const ScheduleSessionSchema = z.object({
  userId: z.string().describe('The user requesting a session'),
  preferredDate: z.string().describe('Preferred date in YYYY-MM-DD format'),
  preferredTime: z.string().describe('Preferred time in HH:MM format'),
  sessionType: z.enum(['individual', 'group', 'crisis']).describe('Type of therapy session'),
  therapistId: z.string().optional().describe('Specific therapist ID if requested'),
  notes: z.string().max(500).optional().describe('Additional notes or requirements')
});

type ScheduleSessionArgs = z.infer<typeof ScheduleSessionSchema>;

interface SessionBooking {
  bookingId: string;
  scheduledDate: Date;
  therapistId: string;
  therapistName: string;
  sessionType: string;
  status: 'confirmed' | 'pending' | 'waitlist';
  joinUrl?: string;
}

// Create our custom tool class
class ScheduleSessionTool extends BaseTool<ScheduleSessionArgs, SessionBooking> {
  name = 'scheduleSession';
  description = 'Books a therapy session for a user with an available therapist';
  schema = ScheduleSessionSchema;
  permissions = ['session:create', 'therapist:read'];
  rateLimit = { requests: 5, window: 3600 }; // 5 bookings per hour

  protected async run(args: ScheduleSessionArgs, context: ToolContext): Promise<SessionBooking> {
    // In a real implementation, this would:
    // 1. Check therapist availability
    // 2. Validate insurance/payment
    // 3. Send calendar invites
    // 4. Create secure meeting room
    // 5. Send confirmation emails

    console.log(`Processing session request for user ${args.userId}`);
    
    // Mock implementation
    const availableTherapists = [
      { id: 'ther_001', name: 'Dr. Sarah Johnson', specialty: 'anxiety' },
      { id: 'ther_002', name: 'Dr. Michael Chen', specialty: 'depression' },
      { id: 'ther_003', name: 'Dr. Emma Rodriguez', specialty: 'trauma' }
    ];

    // Select therapist (simplified selection logic)
    const therapist = args.therapistId 
      ? availableTherapists.find(t => t.id === args.therapistId)
      : availableTherapists[Math.floor(Math.random() * availableTherapists.length)];

    if (!therapist) {
      throw new Error('No available therapist found');
    }

    const scheduledDate = new Date(`${args.preferredDate}T${args.preferredTime}:00`);
    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create secure meeting room for telehealth
    const joinUrl = args.sessionType !== 'crisis' 
      ? `https://secure.peerbond.app/session/${bookingId}`
      : undefined;

    const booking: SessionBooking = {
      bookingId,
      scheduledDate,
      therapistId: therapist.id,
      therapistName: therapist.name,
      sessionType: args.sessionType,
      status: 'confirmed',
      joinUrl
    };

    // In real implementation, save to database and send notifications
    console.log(`Session booked: ${booking.bookingId} with ${therapist.name}`);

    return booking;
  }

  async validate(args: ScheduleSessionArgs, context: ToolContext): Promise<boolean> {
    // Validate the requested date/time
    const requestedDate = new Date(`${args.preferredDate}T${args.preferredTime}:00`);
    const now = new Date();

    // Can't book sessions in the past
    if (requestedDate < now) {
      throw new Error('Cannot schedule sessions in the past');
    }

    // Can't book more than 90 days in advance
    const maxAdvanceDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    if (requestedDate > maxAdvanceDate) {
      throw new Error('Cannot schedule sessions more than 90 days in advance');
    }

    // Validate business hours (9 AM to 6 PM)
    const hour = requestedDate.getHours();
    if (hour < 9 || hour >= 18) {
      throw new Error('Sessions can only be scheduled between 9 AM and 6 PM');
    }

    return true;
  }
}

// Demonstration
async function demonstrateCustomTool() {
  console.log('🛠️  Custom Tool Demonstration\n');

  // Initialize the system
  initializePeerBond(createDevConfig());

  // Register our custom tool
  const scheduleSessionTool = new ScheduleSessionTool();
  ToolRegistry.register(scheduleSessionTool);

  console.log('✅ Custom tool registered successfully');
  console.log('Available tools:', ToolRegistry.getAll().map(t => t.name));

  // Test the tool
  const toolContext = {
    userId: 'user_demo',
    sessionId: 'session_demo',
    agentId: 'demo_agent',
    timestamp: new Date()
  };

  console.log('\n📅 Booking a therapy session...');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split('T')[0];

  try {
    const result = await ToolRegistry.execute(
      'scheduleSession',
      {
        userId: 'user_123',
        preferredDate: dateString,
        preferredTime: '14:00',
        sessionType: 'individual',
        notes: 'First session, anxiety and stress management'
      },
      toolContext
    );

    if (result.success) {
      const booking = result.data as SessionBooking;
      console.log('\n✅ Session booked successfully!');
      console.log(`   Booking ID: ${booking.bookingId}`);
      console.log(`   Date/Time: ${booking.scheduledDate.toLocaleString()}`);
      console.log(`   Therapist: ${booking.therapistName}`);
      console.log(`   Type: ${booking.sessionType}`);
      console.log(`   Status: ${booking.status}`);
      if (booking.joinUrl) {
        console.log(`   Join URL: ${booking.joinUrl}`);
      }
    } else {
      console.error('❌ Booking failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Tool execution failed:', error);
  }

  // Test validation errors
  console.log('\n🧪 Testing validation...');
  
  try {
    await ToolRegistry.execute(
      'scheduleSession',
      {
        userId: 'user_123',
        preferredDate: '2023-01-01', // Past date
        preferredTime: '14:00',
        sessionType: 'individual'
      },
      toolContext
    );
  } catch (error) {
    console.log('✅ Validation correctly caught past date');
  }

  console.log('\n🎉 Custom tool demonstration completed!');
}

// Run the demonstration
demonstrateCustomTool().catch(console.error);