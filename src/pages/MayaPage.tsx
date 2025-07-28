/**
 * Maya Page - Dedicated page for Maya AI interactions
 * Provides a full-screen Maya experience with proper authentication and routing
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Heart, 
  Bot, 
  User,
  AlertCircle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import MayaHub from '@/components/ai/MayaHub';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

export default function MayaPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Extract context from URL parameters
  const groupId = searchParams.get('groupId');
  const sessionId = searchParams.get('sessionId');
  const clientId = searchParams.get('clientId');
  const mode = searchParams.get('mode') as 'compact' | 'full' | 'modal' || 'full';

  useEffect(() => {
    // Initialize page and validate access
    initializePage();
  }, [isAuthenticated, user]);

  const initializePage = async () => {
    setIsInitializing(true);
    
    try {
      // Check authentication
      if (!isAuthenticated || !user) {
        toast.error('Please sign in to access Maya');
        // In a real app, redirect to login
        return;
      }

      // Validate role-based access if needed
      if (clientId && user.role !== 'therapist' && user.role !== 'admin') {
        toast.error('You do not have permission to access client-specific Maya features');
        return;
      }

      // Log Maya page access for analytics
      console.log('Maya page accessed:', {
        userId: user.id,
        role: user.role,
        context: { groupId, sessionId, clientId, mode }
      });

    } catch (error) {
      console.error('Maya page initialization error:', error);
      toast.error('Failed to initialize Maya interface');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleGoBack = () => {
    // Navigate back based on context
    if (groupId) {
      // Go back to group chat
      window.history.back();
    } else if (user?.role === 'therapist') {
      // Go back to therapist dashboard
      window.location.href = '/therapist';
    } else if (user?.role === 'admin') {
      // Go back to admin dashboard
      window.location.href = '/admin';
    } else {
      // Go back to main dashboard
      window.location.href = '/dashboard';
    }
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connecting to Maya</h2>
          <p className="text-gray-600">Setting up your AI therapeutic companion...</p>
        </motion.div>
      </div>
    );
  }

  // Unauthenticated state
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to access Maya, your AI therapeutic companion.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              Sign In
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header Navigation */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {user.role === 'therapist' || user.role === 'admin' ? 'Maya Clinical Assistant' : 'Maya AI'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {user.role === 'therapist' || user.role === 'admin' 
                      ? 'Professional Therapeutic Support' 
                      : 'Your Therapeutic Companion'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-600 capitalize">{user.role}</div>
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-full"
        >
          <MayaHub
            user={user}
            context={{
              groupId: groupId || undefined,
              sessionId: sessionId || undefined,
              clientId: clientId || undefined
            }}
            defaultMode={mode}
            className="h-full"
          />
        </motion.div>
      </main>

      {/* Footer with helpful information */}
      <footer className="border-t bg-gray-50 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>© 2024 PeerBond</span>
              <span>•</span>
              <span>HIPAA Compliant</span>
              <span>•</span>
              <span>AI-Powered Mental Health Support</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => toast.info('Maya provides AI-powered therapeutic support but is not a replacement for professional mental health care.')}
                className="hover:text-gray-900 transition-colors"
              >
                About Maya
              </button>
              <span>•</span>
              <button 
                onClick={() => window.open('/privacy', '_blank')}
                className="hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}