import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { User, Settings, Crown, Target, TrendingUp } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  recoveryGoals: z.array(z.string()),
  wellnessGoals: z.array(z.string()),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'goals' | 'stats'>('profile');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      recoveryGoals: user?.recoveryGoals || [],
      wellnessGoals: user?.wellnessGoals || [],
      experienceLevel: user?.experienceLevel || 'beginner',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  const mockStats = {
    totalDays: 45,
    groupsJoined: 3,
    messagesPosted: 127,
    milestonesReached: 8,
    streakDays: 12,
    supportGiven: 34,
  };

  const availableGoals = {
    recovery: ['Sobriety', 'Harm Reduction', 'Relapse Prevention', 'Healthy Coping'],
    wellness: ['Anxiety Management', 'Depression Support', 'Stress Reduction', 'Sleep Improvement'],
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User size={32} className="text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {user?.isPremium && (
                  <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                    <Crown size={12} />
                    Premium
                  </div>
                )}
                <div className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs">
                  {user?.experienceLevel}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-outline"
          >
            <Settings size={20} />
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'profile'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'goals'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Goals
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'stats'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Stats
          </button>
        </div>

        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  {...register('firstName')}
                  disabled={!isEditing}
                  className="input"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-error-600">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  {...register('lastName')}
                  disabled={!isEditing}
                  className="input"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-error-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                {...register('email')}
                disabled={!isEditing}
                className="input"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <select
                {...register('experienceLevel')}
                disabled={!isEditing}
                className="input"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {isEditing && (
              <div className="flex gap-4">
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setIsEditing(false);
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Target size={20} />
                Recovery Goals
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {availableGoals.recovery.map((goal) => (
                  <div
                    key={goal}
                    className={`p-3 rounded-lg border ${
                      user?.recoveryGoals.includes(goal.toLowerCase().replace(' ', '_'))
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <span className="text-sm font-medium">{goal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Target size={20} />
                Wellness Goals
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {availableGoals.wellness.map((goal) => (
                  <div
                    key={goal}
                    className={`p-3 rounded-lg border ${
                      user?.wellnessGoals.includes(goal.toLowerCase().replace(' ', '_'))
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <span className="text-sm font-medium">{goal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Days Active</p>
                    <p className="text-2xl font-bold text-gray-900">{mockStats.totalDays}</p>
                  </div>
                  <TrendingUp className="text-success-600" size={24} />
                </div>
              </div>
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Groups Joined</p>
                    <p className="text-2xl font-bold text-gray-900">{mockStats.groupsJoined}</p>
                  </div>
                  <User className="text-primary-600" size={24} />
                </div>
              </div>
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Messages Posted</p>
                    <p className="text-2xl font-bold text-gray-900">{mockStats.messagesPosted}</p>
                  </div>
                  <Settings className="text-primary-600" size={24} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-4">
                <h4 className="font-medium text-gray-900 mb-2">Current Streak</h4>
                <p className="text-3xl font-bold text-success-600">{mockStats.streakDays} days</p>
                <p className="text-sm text-gray-600">Keep it going!</p>
              </div>
              <div className="card p-4">
                <h4 className="font-medium text-gray-900 mb-2">Support Given</h4>
                <p className="text-3xl font-bold text-primary-600">{mockStats.supportGiven}</p>
                <p className="text-sm text-gray-600">Messages of encouragement</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;