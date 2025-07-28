import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Target,
  Heart,
  Shield,
  Brain,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

const goalsSchema = z.object({
  recoveryGoals: z.array(z.string()).min(1, 'Please select at least one recovery goal'),
  wellnessGoals: z.array(z.string()).min(1, 'Please select at least one wellness goal'),
  customGoals: z.string().optional(),
});

const assessmentSchema = z.object({
  anxietyLevel: z.number().min(1).max(10),
  depressionLevel: z.number().min(1).max(10),
  stressLevel: z.number().min(1).max(10),
  supportNeeds: z.array(z.string()),
  previousExperience: z.string(),
});

const preferencesSchema = z.object({
  groupSize: z.enum(['small', 'medium', 'large']),
  sessionFrequency: z.enum(['daily', 'weekly', 'biweekly']),
  timePreference: z.enum(['morning', 'afternoon', 'evening', 'flexible']),
  communicationStyle: z.enum(['structured', 'casual', 'mixed']),
  privacyLevel: z.enum(['open', 'moderate', 'private']),
});

type GoalsFormData = z.infer<typeof goalsSchema>;
type AssessmentFormData = z.infer<typeof assessmentSchema>;
type PreferencesFormData = z.infer<typeof preferencesSchema>;

interface UserOnboardingProps {
  onComplete: () => void;
  userId: string;
}

export default function UserOnboarding({ onComplete, userId }: UserOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>({});

  const totalSteps = 6;

  const recoveryGoalOptions = [
    'Overcome addiction',
    'Manage anxiety',
    'Combat depression',
    'Improve relationships',
    'Build self-esteem',
    'Develop coping skills',
    'Process trauma',
    'Establish boundaries'
  ];

  const wellnessGoalOptions = [
    'Regular exercise',
    'Better sleep habits',
    'Mindfulness practice',
    'Healthy eating',
    'Stress management',
    'Social connections',
    'Work-life balance',
    'Creative expression'
  ];

  const supportNeedsOptions = [
    'Crisis intervention',
    'Daily check-ins',
    'Peer mentorship',
    'Professional guidance',
    '24/7 availability',
    'Family involvement',
    'Structured activities',
    'Flexible scheduling'
  ];

  const steps = [
    { number: 1, title: 'Welcome', icon: User },
    { number: 2, title: 'Goals', icon: Target },
    { number: 3, title: 'Assessment', icon: Brain },
    { number: 4, title: 'Preferences', icon: Heart },
    { number: 5, title: 'Privacy', icon: Shield },
    { number: 6, title: 'Complete', icon: Check }
  ];

  const goalsForm = useForm<GoalsFormData>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      recoveryGoals: [],
      wellnessGoals: [],
      customGoals: ''
    }
  });

  const assessmentForm = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      anxietyLevel: 5,
      depressionLevel: 5,
      stressLevel: 5,
      supportNeeds: [],
      previousExperience: 'none'
    }
  });

  const preferencesForm = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      groupSize: 'medium',
      sessionFrequency: 'weekly',
      timePreference: 'flexible',
      communicationStyle: 'mixed',
      privacyLevel: 'moderate'
    }
  });

  const handleStepSubmit = async (stepData: any) => {
    setOnboardingData((prev: any) => ({ ...prev, ...stepData }));
    
    if (currentStep < totalSteps) {
      setCurrentStep((prev: number) => prev + 1);
    } else {
      await completeOnboarding({ ...onboardingData, ...stepData });
    }
  };

  const completeOnboarding = async (data: any) => {
    setIsSubmitting(true);
    try {
      await api.post('/user/onboarding/complete', {
        userId,
        ...data
      });
      toast.success('Welcome to PeerBond! Your profile has been set up.');
      onComplete();
    } catch (error) {
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        
        return (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              isCompleted ? 'bg-green-500 border-green-500 text-white' :
              isActive ? 'bg-blue-500 border-blue-500 text-white' :
              'bg-white border-gray-300 text-gray-400'
            }`}>
              {isCompleted ? <Check size={20} /> : <Icon size={20} />}
            </div>
            <div className="ml-2 mr-4">
              <p className={`text-sm font-medium ${
                isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
              }`}>
                {step.title}
              </p>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="text-gray-300 mx-2" size={16} />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {renderStepIndicator()}

        <Card>
          <CardContent className="p-8">
            {currentStep === 1 && (
              <div className="text-center space-y-6">
                <h2 className="text-3xl font-bold text-gray-900">Welcome to PeerBond!</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  We're here to help you on your journey to wellness. Let's take a few minutes to personalize your experience and connect you with the right support community.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <MessageCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900">Peer Support</h3>
                    <p className="text-sm text-gray-600">Connect with others who understand your journey</p>
                  </div>
                  
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <Brain className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900">AI Guidance</h3>
                    <p className="text-sm text-gray-600">Get 24/7 support from our AI facilitator</p>
                  </div>
                  
                  <div className="text-center p-6 bg-purple-50 rounded-lg">
                    <Shield className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900">Safe Space</h3>
                    <p className="text-sm text-gray-600">Privacy-protected environment for healing</p>
                  </div>
                </div>

                <Button onClick={() => setCurrentStep(2)} className="mt-8">
                  Get Started <ChevronRight className="ml-2" size={16} />
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <form onSubmit={goalsForm.handleSubmit(handleStepSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Set Your Goals</h2>
                  <p className="text-gray-600">Help us understand what you want to achieve</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Recovery Goals (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {recoveryGoalOptions.map((goal) => (
                      <label key={goal} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          value={goal}
                          {...goalsForm.register('recoveryGoals')}
                          className="mr-3"
                        />
                        <span className="text-sm">{goal}</span>
                      </label>
                    ))}
                  </div>
                  {goalsForm.formState.errors.recoveryGoals && (
                    <p className="mt-2 text-sm text-red-600">{goalsForm.formState.errors.recoveryGoals.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Wellness Goals (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {wellnessGoalOptions.map((goal) => (
                      <label key={goal} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          value={goal}
                          {...goalsForm.register('wellnessGoals')}
                          className="mr-3"
                        />
                        <span className="text-sm">{goal}</span>
                      </label>
                    ))}
                  </div>
                  {goalsForm.formState.errors.wellnessGoals && (
                    <p className="mt-2 text-sm text-red-600">{goalsForm.formState.errors.wellnessGoals.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Goals (Optional)
                  </label>
                  <textarea
                    {...goalsForm.register('customGoals')}
                    placeholder="Describe any other goals you'd like to work on..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                    <ChevronLeft className="mr-2" size={16} /> Back
                  </Button>
                  <Button type="submit">
                    Continue <ChevronRight className="ml-2" size={16} />
                  </Button>
                </div>
              </form>
            )}

            {currentStep === 3 && (
              <form onSubmit={assessmentForm.handleSubmit(handleStepSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Quick Assessment</h2>
                  <p className="text-gray-600">This helps us match you with the right support</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Anxiety Level (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      {...assessmentForm.register('anxietyLevel', { valueAsNumber: true })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Depression Level (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      {...assessmentForm.register('depressionLevel', { valueAsNumber: true })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Stress Level (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      {...assessmentForm.register('stressLevel', { valueAsNumber: true })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What type of support do you need? (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {supportNeedsOptions.map((need) => (
                      <label key={need} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          value={need}
                          {...assessmentForm.register('supportNeeds')}
                          className="mr-3"
                        />
                        <span className="text-sm">{need}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Previous Experience with Support Groups
                  </label>
                  <select
                    {...assessmentForm.register('previousExperience')}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="none">No previous experience</option>
                    <option value="some">Some experience</option>
                    <option value="extensive">Extensive experience</option>
                    <option value="professional">Professional facilitation experience</option>
                  </select>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                    <ChevronLeft className="mr-2" size={16} /> Back
                  </Button>
                  <Button type="submit">
                    Continue <ChevronRight className="ml-2" size={16} />
                  </Button>
                </div>
              </form>
            )}

            {currentStep === 4 && (
              <form onSubmit={preferencesForm.handleSubmit(handleStepSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Your Preferences</h2>
                  <p className="text-gray-600">Customize your group experience</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Preferred Group Size
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          value="small"
                          {...preferencesForm.register('groupSize')}
                          className="mr-3"
                        />
                        <div>
                          <span className="font-medium">Small (3-4 people)</span>
                          <p className="text-sm text-gray-500">Intimate, focused discussions</p>
                        </div>
                      </label>
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          value="medium"
                          {...preferencesForm.register('groupSize')}
                          className="mr-3"
                        />
                        <div>
                          <span className="font-medium">Medium (5-6 people)</span>
                          <p className="text-sm text-gray-500">Balanced interaction</p>
                        </div>
                      </label>
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          value="large"
                          {...preferencesForm.register('groupSize')}
                          className="mr-3"
                        />
                        <div>
                          <span className="font-medium">Large (7-8 people)</span>
                          <p className="text-sm text-gray-500">Diverse perspectives</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Session Frequency
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          value="daily"
                          {...preferencesForm.register('sessionFrequency')}
                          className="mr-3"
                        />
                        <span>Daily check-ins</span>
                      </label>
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          value="weekly"
                          {...preferencesForm.register('sessionFrequency')}
                          className="mr-3"
                        />
                        <span>Weekly sessions</span>
                      </label>
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          value="biweekly"
                          {...preferencesForm.register('sessionFrequency')}
                          className="mr-3"
                        />
                        <span>Bi-weekly sessions</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                    <ChevronLeft className="mr-2" size={16} /> Back
                  </Button>
                  <Button type="submit">
                    Continue <ChevronRight className="ml-2" size={16} />
                  </Button>
                </div>
              </form>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Privacy & Consent</h2>
                  <p className="text-gray-600">Your safety and privacy are our top priorities</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Shield className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                      <div>
                        <h3 className="font-medium text-blue-900">Data Protection</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          All your information is encrypted and stored securely. We comply with HIPAA regulations.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-green-600 mt-1 mr-3" />
                      <div>
                        <h3 className="font-medium text-green-900">Crisis Support</h3>
                        <p className="text-sm text-green-700 mt-1">
                          Our AI monitors for crisis indicators and will alert qualified professionals when needed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer">
                      <input type="checkbox" className="mt-1 mr-3" required />
                      <div>
                        <span className="font-medium">I consent to AI monitoring for safety</span>
                        <p className="text-sm text-gray-600">
                          Allow our AI to analyze conversations for crisis indicators and provide appropriate interventions.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer">
                      <input type="checkbox" className="mt-1 mr-3" required />
                      <div>
                        <span className="font-medium">I agree to the Terms of Service and Privacy Policy</span>
                        <p className="text-sm text-gray-600">
                          I have read and understand the platform guidelines and privacy protections.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer">
                      <input type="checkbox" className="mt-1 mr-3" />
                      <div>
                        <span className="font-medium">Optional: Share anonymous data for research</span>
                        <p className="text-sm text-gray-600">
                          Help improve mental health support by contributing to anonymized research studies.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(4)}>
                    <ChevronLeft className="mr-2" size={16} /> Back
                  </Button>
                  <Button onClick={() => setCurrentStep(6)}>
                    Accept & Continue <ChevronRight className="ml-2" size={16} />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900">Welcome to Your Journey!</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Your profile is complete. We're finding the perfect support group for you based on your goals and preferences.
                </p>

                <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
                  <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
                  <ul className="text-sm text-gray-600 space-y-2 text-left">
                    <li>• You'll receive group recommendations within 24 hours</li>
                    <li>• Meet your AI facilitator Maya</li>
                    <li>• Complete your first wellness check-in</li>
                    <li>• Join your first group session</li>
                  </ul>
                </div>

                <Button
                  onClick={() => completeOnboarding(onboardingData)}
                  disabled={isSubmitting}
                  className="px-8 py-3"
                >
                  {isSubmitting ? 'Setting up your profile...' : 'Enter PeerBond'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}