import { useState } from 'react';
import { X, Target, AlertCircle, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  experienceLevel: string;
  isPremium: boolean;
  isActive: boolean;
  lastActive: string | null;
  progress: {
    trend: string;
    engagementScore: number;
    lastActive: string;
    sessionsCompleted: number;
    goalsMet: number;
    totalGoals: number;
    riskFactors: string[];
  };
  currentGroups: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

interface ClientProfileModalProps {
  client: Client;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ClientProfileModal({ client, onClose, onUpdate }: ClientProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'notes' | 'messages'>('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  const handleSaveNotes = async () => {
    setIsSubmitting(true);
    try {
      await api.put(`/therapist/clients/${client.id}`, { notes });
      toast.success('Notes saved successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      await api.post('/therapist/messages', {
        clientId: client.id,
        content: message,
        type: 'text'
      });
      toast.success('Message sent successfully');
      setMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-medium text-lg">
                  {client.firstName[0]}{client.lastName[0]}
                </span>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold">
                  {client.firstName} {client.lastName}
                </h2>
                <p className="text-sm text-gray-500">{client.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex space-x-1 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'overview'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'goals'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Goals
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'notes'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'messages'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Messages
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3">Progress Overview</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Engagement Score</span>
                      <span className="font-medium">{client.progress.engagementScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sessions Completed</span>
                      <span className="font-medium">{client.progress.sessionsCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Goals Met</span>
                      <span className="font-medium">
                        {client.progress.goalsMet}/{client.progress.totalGoals}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Active</span>
                      <span className="font-medium">{client.progress.lastActive}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3">Current Groups</h3>
                  {client.currentGroups.length === 0 ? (
                    <p className="text-sm text-gray-500">Not assigned to any groups</p>
                  ) : (
                    <div className="space-y-2">
                      {client.currentGroups.map((group) => (
                        <div key={group.id} className="flex items-center justify-between">
                          <span className="text-sm">{group.name}</span>
                          <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                            {group.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {client.progress.riskFactors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="font-medium text-red-800">Risk Factors</h3>
                      <ul className="mt-2 space-y-1">
                        {client.progress.riskFactors.map((factor, index) => (
                          <li key={index} className="text-sm text-red-700">• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Treatment Goals</h3>
                <button className="btn-primary btn-sm">Add Goal</button>
              </div>
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No goals set yet</p>
                <p className="text-sm mt-2">Click "Add Goal" to create treatment goals</p>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Therapist Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[200px]"
                placeholder="Add notes about this client..."
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Send Message</h3>
              <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto mb-4">
                <p className="text-sm text-gray-500 text-center">No previous messages</p>
              </div>
              <div className="flex space-x-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input flex-1"
                  placeholder="Type your message..."
                  rows={3}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSubmitting || !message.trim()}
                  className="btn-primary"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}