import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Shield,
  Lock,
  Users,
  AlertTriangle,
  BookOpen,
  Settings,
  ChevronRight,
  ChevronLeft,
  Check,
  Eye,
  Phone,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

const securitySchema = z.object({
  mfaEnabled: z.boolean().refine(val => val === true, 'Multi-factor authentication must be enabled'),
  strongPassword: z.boolean().refine(val => val === true, 'Strong password requirements must be met'),
  securityQuestion1: z.string().min(1, 'Security question is required'),
  securityAnswer1: z.string().min(1, 'Security answer is required'),
  securityQuestion2: z.string().min(1, 'Security question is required'),
  securityAnswer2: z.string().min(1, 'Security answer is required'),
});

const permissionsSchema = z.object({
  userManagement: z.boolean(),
  therapistApproval: z.boolean(),
  systemConfiguration: z.boolean(),
  auditAccess: z.boolean(),
  crisisManagement: z.boolean(),
  dataExport: z.boolean(),
  platformSettings: z.boolean(),
  complianceReporting: z.boolean(),
});

const trainingSchema = z.object({
  completedHIPAATraining: z.boolean().refine(val => val === true, 'HIPAA training must be completed'),
  completedSecurityTraining: z.boolean().refine(val => val === true, 'Security training must be completed'),
  completedPlatformTraining: z.boolean().refine(val => val === true, 'Platform training must be completed'),
  completedCrisisProtocol: z.boolean().refine(val => val === true, 'Crisis protocol training must be completed'),
  agreedToResponsibilities: z.boolean().refine(val => val === true, 'Must agree to admin responsibilities'),
});

type SecurityFormData = z.infer<typeof securitySchema>;
type PermissionsFormData = z.infer<typeof permissionsSchema>;
type TrainingFormData = z.infer<typeof trainingSchema>;

interface AdminOnboardingProps {
  onComplete: () => void;
  userId: string;
}

export default function AdminOnboarding({ onComplete, userId }: AdminOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>({});

  const totalSteps = 6;

  const securityQuestions = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your elementary school?",
    "What was your childhood nickname?",
    "What is the name of your favorite childhood friend?",
    "What was the first concert you attended?",
    "What was the make of your first car?"
  ];

  const steps = [
    { number: 1, title: 'Welcome', icon: Shield },
    { number: 2, title: 'Security', icon: Lock },
    { number: 3, title: 'Permissions', icon: Settings },
    { number: 4, title: 'Training', icon: BookOpen },
    { number: 5, title: 'Emergency', icon: Phone },
    { number: 6, title: 'Complete', icon: Check }
  ];

  const securityForm = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      mfaEnabled: false,
      strongPassword: false
    }
  });

  const permissionsForm = useForm<PermissionsFormData>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: {
      userManagement: false,
      therapistApproval: false,
      systemConfiguration: false,
      auditAccess: false,
      crisisManagement: false,
      dataExport: false,
      platformSettings: false,
      complianceReporting: false
    }
  });

  const trainingForm = useForm<TrainingFormData>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      completedHIPAATraining: false,
      completedSecurityTraining: false,
      completedPlatformTraining: false,
      completedCrisisProtocol: false,
      agreedToResponsibilities: false
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
      await api.post('/admin/onboarding/complete', {
        userId,
        ...data
      });
      toast.success('Admin onboarding completed successfully.');
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
              isActive ? 'bg-red-500 border-red-500 text-white' :
              'bg-white border-gray-300 text-gray-400'
            }`}>
              {isCompleted ? <Check size={20} /> : <Icon size={20} />}
            </div>
            <div className="ml-2 mr-4">
              <p className={`text-sm font-medium ${
                isActive ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
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
                <h2 className="text-3xl font-bold text-gray-900">Admin Portal Setup</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Welcome to the PeerBond Admin Portal. As an administrator, you'll have significant responsibilities and access to sensitive information. Let's ensure your account is properly secured and configured.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center p-6 bg-red-50 rounded-lg">
                    <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900">Security Control</h3>
                    <p className="text-sm text-gray-600">Enhanced security features and access controls</p>
                  </div>
                  
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900">User Management</h3>
                    <p className="text-sm text-gray-600">Manage therapists, clients, and platform users</p>
                  </div>
                  
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <Activity className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900">System Monitoring</h3>
                    <p className="text-sm text-gray-600">Monitor platform health and compliance</p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-1 mr-3" />
                    <div className="text-left">
                      <h3 className="font-medium text-red-900">Important Notice</h3>
                      <p className="text-sm text-red-700 mt-1">
                        Admin access includes sensitive patient data and system controls. All activities are logged and monitored for compliance.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setCurrentStep(2)} className="mt-8 bg-red-600 hover:bg-red-700">
                  Begin Security Setup <ChevronRight className="ml-2" size={16} />
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <form onSubmit={securityForm.handleSubmit(handleStepSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Security Configuration</h2>
                  <p className="text-gray-600">Enhanced security is required for administrative access</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Lock className="w-5 h-5 text-yellow-600 mt-1 mr-3" />
                      <div className="flex-1">
                        <h3 className="font-medium text-yellow-900">Multi-Factor Authentication</h3>
                        <p className="text-sm text-yellow-700 mb-3">
                          MFA is required for all admin accounts. Please set up an authenticator app.
                        </p>
                        <Button variant="outline" size="sm" className="mb-3">
                          <Shield className="w-4 h-4 mr-2" />
                          Configure MFA Now
                        </Button>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...securityForm.register('mfaEnabled')}
                            className="mr-3"
                          />
                          <span className="text-sm font-medium">MFA has been successfully configured</span>
                        </label>
                        {securityForm.formState.errors.mfaEnabled && (
                          <p className="mt-1 text-sm text-red-600">{securityForm.formState.errors.mfaEnabled.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Eye className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                      <div className="flex-1">
                        <h3 className="font-medium text-blue-900">Password Requirements</h3>
                        <p className="text-sm text-blue-700 mb-3">
                          Admin passwords must meet enhanced security requirements:
                        </p>
                        <ul className="text-sm text-blue-700 mb-3 ml-4 space-y-1">
                          <li>• Minimum 12 characters</li>
                          <li>• Mix of uppercase, lowercase, numbers, symbols</li>
                          <li>• No dictionary words or personal information</li>
                          <li>• Changed every 90 days</li>
                        </ul>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...securityForm.register('strongPassword')}
                            className="mr-3"
                          />
                          <span className="text-sm font-medium">My password meets all requirements</span>
                        </label>
                        {securityForm.formState.errors.strongPassword && (
                          <p className="mt-1 text-sm text-red-600">{securityForm.formState.errors.strongPassword.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Security Question 1 *
                    </label>
                    <select
                      {...securityForm.register('securityQuestion1')}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent mb-3"
                    >
                      <option value="">Select a question...</option>
                      {securityQuestions.map((question, index) => (
                        <option key={index} value={question}>{question}</option>
                      ))}
                    </select>
                    <Input
                      {...securityForm.register('securityAnswer1')}
                      placeholder="Your answer"
                      type="password"
                    />
                    {securityForm.formState.errors.securityQuestion1 && (
                      <p className="mt-1 text-sm text-red-600">{securityForm.formState.errors.securityQuestion1.message}</p>
                    )}
                    {securityForm.formState.errors.securityAnswer1 && (
                      <p className="mt-1 text-sm text-red-600">{securityForm.formState.errors.securityAnswer1.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Security Question 2 *
                    </label>
                    <select
                      {...securityForm.register('securityQuestion2')}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent mb-3"
                    >
                      <option value="">Select a question...</option>
                      {securityQuestions.map((question, index) => (
                        <option key={index} value={question}>{question}</option>
                      ))}
                    </select>
                    <Input
                      {...securityForm.register('securityAnswer2')}
                      placeholder="Your answer"
                      type="password"
                    />
                    {securityForm.formState.errors.securityQuestion2 && (
                      <p className="mt-1 text-sm text-red-600">{securityForm.formState.errors.securityQuestion2.message}</p>
                    )}
                    {securityForm.formState.errors.securityAnswer2 && (
                      <p className="mt-1 text-sm text-red-600">{securityForm.formState.errors.securityAnswer2.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                    <ChevronLeft className="mr-2" size={16} /> Back
                  </Button>
                  <Button type="submit" className="bg-red-600 hover:bg-red-700">
                    Continue <ChevronRight className="ml-2" size={16} />
                  </Button>
                </div>
              </form>
            )}

            {currentStep === 3 && (
              <form onSubmit={permissionsForm.handleSubmit(handleStepSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Permission Assignment</h2>
                  <p className="text-gray-600">Configure your administrative permissions and access levels</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">User Management</h3>
                    
                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        {...permissionsForm.register('userManagement')}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <span className="font-medium">User Account Management</span>
                        <p className="text-sm text-gray-600">Create, modify, and deactivate user accounts</p>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        {...permissionsForm.register('therapistApproval')}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <span className="font-medium">Therapist Approval</span>
                        <p className="text-sm text-gray-600">Review and approve therapist applications</p>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        {...permissionsForm.register('crisisManagement')}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <span className="font-medium">Crisis Management</span>
                        <p className="text-sm text-gray-600">Access crisis alerts and emergency protocols</p>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        {...permissionsForm.register('auditAccess')}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <span className="font-medium">Audit Log Access</span>
                        <p className="text-sm text-gray-600">View and analyze system audit logs</p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">System Administration</h3>
                    
                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        {...permissionsForm.register('systemConfiguration')}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <span className="font-medium">System Configuration</span>
                        <p className="text-sm text-gray-600">Modify system settings and configurations</p>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        {...permissionsForm.register('platformSettings')}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <span className="font-medium">Platform Settings</span>
                        <p className="text-sm text-gray-600">Configure platform-wide settings and features</p>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        {...permissionsForm.register('dataExport')}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <span className="font-medium">Data Export</span>
                        <p className="text-sm text-gray-600">Export data for compliance and analysis</p>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        {...permissionsForm.register('complianceReporting')}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <span className="font-medium">Compliance Reporting</span>
                        <p className="text-sm text-gray-600">Generate compliance and regulatory reports</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-1 mr-3" />
                    <div>
                      <h3 className="font-medium text-red-900">Permission Notice</h3>
                      <p className="text-sm text-red-700 mt-1">
                        These permissions grant significant access to sensitive data and system functions. All activities are logged and monitored for security and compliance purposes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                    <ChevronLeft className="mr-2" size={16} /> Back
                  </Button>
                  <Button type="submit" className="bg-red-600 hover:bg-red-700">
                    Continue <ChevronRight className="ml-2" size={16} />
                  </Button>
                </div>
              </form>
            )}

            {currentStep === 4 && (
              <form onSubmit={trainingForm.handleSubmit(handleStepSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Required Training</h2>
                  <p className="text-gray-600">Complete all mandatory training modules before gaining admin access</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start">
                      <Shield className="w-6 h-6 text-blue-600 mt-1 mr-4" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 mb-2">HIPAA Admin Training</h3>
                        <p className="text-sm text-blue-700 mb-4">
                          Extended HIPAA training for administrators covering data access, breach protocols, and compliance requirements.
                        </p>
                        <Button variant="outline" size="sm" className="mb-3">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Start HIPAA Admin Training (30 min)
                        </Button>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...trainingForm.register('completedHIPAATraining')}
                            className="mr-3"
                          />
                          <span className="text-sm font-medium">I have completed the HIPAA admin training</span>
                        </label>
                        {trainingForm.formState.errors.completedHIPAATraining && (
                          <p className="mt-1 text-sm text-red-600">{trainingForm.formState.errors.completedHIPAATraining.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start">
                      <Lock className="w-6 h-6 text-red-600 mt-1 mr-4" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-red-900 mb-2">Security Training</h3>
                        <p className="text-sm text-red-700 mb-4">
                          Comprehensive security training covering threat detection, incident response, and security best practices.
                        </p>
                        <Button variant="outline" size="sm" className="mb-3">
                          <Shield className="w-4 h-4 mr-2" />
                          Start Security Training (25 min)
                        </Button>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...trainingForm.register('completedSecurityTraining')}
                            className="mr-3"
                          />
                          <span className="text-sm font-medium">I have completed the security training</span>
                        </label>
                        {trainingForm.formState.errors.completedSecurityTraining && (
                          <p className="mt-1 text-sm text-red-600">{trainingForm.formState.errors.completedSecurityTraining.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-start">
                      <Settings className="w-6 h-6 text-green-600 mt-1 mr-4" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-900 mb-2">Platform Administration</h3>
                        <p className="text-sm text-green-700 mb-4">
                          Learn PeerBond's admin interface, user management tools, and system monitoring capabilities.
                        </p>
                        <Button variant="outline" size="sm" className="mb-3">
                          <Users className="w-4 h-4 mr-2" />
                          Start Platform Training (35 min)
                        </Button>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...trainingForm.register('completedPlatformTraining')}
                            className="mr-3"
                          />
                          <span className="text-sm font-medium">I have completed the platform training</span>
                        </label>
                        {trainingForm.formState.errors.completedPlatformTraining && (
                          <p className="mt-1 text-sm text-red-600">{trainingForm.formState.errors.completedPlatformTraining.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <div className="flex items-start">
                      <AlertTriangle className="w-6 h-6 text-orange-600 mt-1 mr-4" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-orange-900 mb-2">Crisis Response Protocol</h3>
                        <p className="text-sm text-orange-700 mb-4">
                          Critical training on crisis escalation procedures, emergency contacts, and administrative response protocols.
                        </p>
                        <Button variant="outline" size="sm" className="mb-3">
                          <Phone className="w-4 h-4 mr-2" />
                          Start Crisis Protocol Training (20 min)
                        </Button>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...trainingForm.register('completedCrisisProtocol')}
                            className="mr-3"
                          />
                          <span className="text-sm font-medium">I have completed the crisis protocol training</span>
                        </label>
                        {trainingForm.formState.errors.completedCrisisProtocol && (
                          <p className="mt-1 text-sm text-red-600">{trainingForm.formState.errors.completedCrisisProtocol.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      {...trainingForm.register('agreedToResponsibilities')}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <span className="font-medium">I agree to the Administrative Responsibilities</span>
                      <p className="text-sm text-gray-600">
                        I understand my responsibilities as an admin and will follow all policies, procedures, and legal requirements.
                      </p>
                    </div>
                  </label>
                  {trainingForm.formState.errors.agreedToResponsibilities && (
                    <p className="mt-1 text-sm text-red-600">{trainingForm.formState.errors.agreedToResponsibilities.message}</p>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                    <ChevronLeft className="mr-2" size={16} /> Back
                  </Button>
                  <Button type="submit" className="bg-red-600 hover:bg-red-700">
                    Continue <ChevronRight className="ml-2" size={16} />
                  </Button>
                </div>
              </form>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Emergency Procedures</h2>
                  <p className="text-gray-600">Familiarize yourself with critical emergency contacts and procedures</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-red-600" />
                        Crisis Hotlines
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <p className="font-medium">National Suicide Prevention Lifeline</p>
                        <p className="text-lg font-bold text-red-600">988</p>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="font-medium">Crisis Text Line</p>
                        <p className="text-lg font-bold text-blue-600">Text HOME to 741741</p>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <p className="font-medium">Emergency Services</p>
                        <p className="text-lg font-bold text-green-600">911</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        PeerBond Contacts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="font-medium">Clinical Director</p>
                        <p className="text-sm text-gray-600">Dr. Sarah Johnson</p>
                        <p className="font-bold">+1 (555) 123-4567</p>
                      </div>
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                        <p className="font-medium">IT Security</p>
                        <p className="text-sm text-gray-600">24/7 Security Hotline</p>
                        <p className="font-bold">+1 (555) 987-6543</p>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                        <p className="font-medium">Admin Support</p>
                        <p className="text-sm text-gray-600">admin-support@peerbond.com</p>
                        <p className="font-bold">Response within 1 hour</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      Crisis Escalation Procedure
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start">
                        <span className="bg-red-100 text-red-800 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3 mt-0.5">1</span>
                        <div>
                          <p className="font-medium">Immediate Assessment</p>
                          <p className="text-gray-600">Review crisis alert details and assess immediate danger level</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-orange-100 text-orange-800 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3 mt-0.5">2</span>
                        <div>
                          <p className="font-medium">Contact Primary Therapist</p>
                          <p className="text-gray-600">Immediately notify the client's assigned therapist if available</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-yellow-100 text-yellow-800 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3 mt-0.5">3</span>
                        <div>
                          <p className="font-medium">Emergency Services</p>
                          <p className="text-gray-600">If immediate danger: call 911 or direct client to emergency services</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-blue-100 text-blue-800 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3 mt-0.5">4</span>
                        <div>
                          <p className="font-medium">Document & Follow-up</p>
                          <p className="text-gray-600">Log all actions taken and coordinate follow-up care</p>
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(4)}>
                    <ChevronLeft className="mr-2" size={16} /> Back
                  </Button>
                  <Button onClick={() => setCurrentStep(6)} className="bg-red-600 hover:bg-red-700">
                    Continue <ChevronRight className="ml-2" size={16} />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-red-600" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900">Admin Setup Complete!</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Your administrative account has been configured with enhanced security and all required training. You now have access to the PeerBond Admin Portal.
                </p>

                <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
                  <h3 className="font-semibold text-gray-900 mb-3">Your Admin Capabilities</h3>
                  <ul className="text-sm text-gray-600 space-y-2 text-left">
                    <li>• Full user and therapist management</li>
                    <li>• System monitoring and configuration</li>
                    <li>• Crisis alert management</li>
                    <li>• Compliance reporting and audit access</li>
                    <li>• Platform security administration</li>
                  </ul>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-1 mr-3" />
                    <div className="text-left">
                      <h3 className="font-medium text-red-900">Security Reminder</h3>
                      <p className="text-sm text-red-700 mt-1">
                        Your admin activities are continuously monitored. Always follow security protocols and report any suspicious activity immediately.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => completeOnboarding(onboardingData)}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? 'Activating Admin Access...' : 'Access Admin Portal'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}