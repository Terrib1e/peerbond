import io, { Socket } from 'socket.io-client';
import { api } from './api';

class WebSocketService {
  private socket: Socket | null = null;
  private connectionPromise: Promise<Socket> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const token = api.getCurrentToken();
      if (!token) {
        this.connectionPromise = null;
        reject(new Error('No authentication token available'));
        return;
      }

      const isDevelopment = (import.meta as any).env?.DEV;
      const wsUrl = isDevelopment ? 'http://localhost:3001' : ((import.meta as any).env?.VITE_API_URL || 'http://localhost:3001');

      console.log('🔌 Attempting WebSocket connection to:', wsUrl);

      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error('❌ WebSocket connection timeout');
        this.connectionPromise = null;
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }
        reject(new Error('Connection timeout'));
      }, 5000); // 5 second timeout

      this.socket = io(wsUrl, {
        auth: {
          token
        },
        autoConnect: true,
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: false,
        timeout: 5000, // Reduced from 20000
        forceNew: true, // Force new connection
        reconnection: false, // Disable auto-reconnection for initial connection
      });

      this.socket.on('connect', () => {
        console.log('🔌 WebSocket connected successfully');
        clearTimeout(connectionTimeout);
        this.reconnectAttempts = 0;
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        clearTimeout(connectionTimeout);
        this.connectionPromise = null;
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }
        reject(new Error(`WebSocket connection failed: ${error.message || error}`));
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
        this.connectionPromise = null;

        // Auto-reconnect if disconnected unexpectedly
        if (reason === 'io server disconnect') {
          // Server initiated disconnect - don't reconnect automatically
          console.log('Server disconnected the connection');
        } else {
          // Client disconnect or network issue - attempt reconnect
          console.log('Attempting to reconnect...');
          this.reconnectAttempts = 0;
          setTimeout(() => {
            this.connect().catch(console.error);
          }, 2000);
        }
      });

      // Add error event handler
      this.socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      // Add facilitator response handlers
      this.socket.on('facilitator_response', (data) => {
        console.log('✅ Facilitator responded:', data);
      });

      this.socket.on('facilitator_error', (error) => {
        console.error('❌ Facilitator error:', error);
      });
    });

    return this.connectionPromise;
  }

  async joinGroup(groupId: string): Promise<void> {
    try {
      const socket = await this.connect();
      socket.emit('join_group', groupId);
      console.log(`Joined group: ${groupId}`);
    } catch (error) {
      console.error('Failed to join group:', error);
      // Don't throw - allow fallback mechanisms to work
    }
  }

  async leaveGroup(groupId: string): Promise<void> {
    if (this.socket?.connected) {
      this.socket.emit('leave_group', groupId);
      console.log(`Left group: ${groupId}`);
    }
  }

  async requestFacilitator(_groupId: string, _type: 'general' | 'check_in' | 'welcome' = 'general'): Promise<void> {
    // Simulate AI facilitator request
    console.log(`Requesting AI facilitator for group: ${_groupId}, type: ${_type}`);

    // In a real implementation, this would:
    // 1. Send request to AI service
    // 2. Queue the facilitator response
    // 3. Emit the response when ready
  }

  onNewMessage(callback: (message: any) => void): void {
    this.socket?.on('new_message', callback);
  }

  offNewMessage(callback?: (message: any) => void): void {
    if (callback) {
      this.socket?.off('new_message', callback);
    } else {
      this.socket?.off('new_message');
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
    }

    this.reconnectAttempts = 0;
    console.log('🔌 WebSocket disconnected manually');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Emit events to server
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Cannot emit event - WebSocket not connected:', event);
    }
  }

  // Listen for events from server
  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      // Try to initialize and then set up the listener
      this.connect().then(() => {
        if (this.socket) {
          this.socket.on(event, callback);
        }
      }).catch(error => {
        console.warn('⚠️ Cannot listen for event - WebSocket initialization failed:', event, error.message);
      });
    }
  }

  // Remove event listeners
  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  // Get connection status for debugging
  getConnectionStatus(): { connected: boolean; attempts: number; maxAttempts: number } {
    return {
      connected: this.isConnected(),
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    };
  }
}

export const wsService = new WebSocketService();