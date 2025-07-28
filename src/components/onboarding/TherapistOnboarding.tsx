import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Shield,
  Upload,
  Award,
  BookOpen,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  FileText,
  Clock,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

const credentialsSchema = z.object({
  licenseNumber: z.string().min(5, 'License number is required'),
  licenseState: z.string().min(2, 'License state is required'),
  licenseExpiration: z.string().min(1, 'License expiration date is required'),
  specializations: z.array(z.string()).min(1, 'Please select at least one specialization'),
  yearsExperience: z.number().min(0, 'Years of experience is required'),
  education: z.string().min(1, 'Education background is required'),
  certifications: z.array(z.string()).optional(),
});

const profileSchema = z.object({
  bio: z.string().min(50, 'Bio must be at least 50 characters'),
  approachStyle: z.string().min(1, 'Please select your therapeutic approach'),
  languagesSpoken: z.array(z.string()).min(1, 'Please select at least one language'),
  availabilityHours: z.string().min(1, 'Please specify your availability'),
  emergencyAvailable: z.boolean(),
  groupSizePreference: z.string().min(1, 'Please select group size preference'),
});

const platformSchema = z.object({
  completedHIPAATraining: z.boolean().refine(val => val === true, 'HIPAA training must be completed'),
  completedPlatformTraining: z.boolean().refine(val => val === true, 'Platform training must be completed'),
  agreedToGuidelines: z.boolean().refine(val => val === true, 'Must agree to professional guidelines'),
  agreedToSupervision: z.boolean().refine(val => val === true, 'Must agree to supervision requirements'),
});

type CredentialsFormData = z.infer<typeof credentialsSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;
type PlatformFormData = z.infer<typeof platformSchema>;

interface TherapistOnboardingProps {
  onComplete: () => void;
  userId: string;
}

export default function TherapistOnboarding({ onComplete, userId }: TherapistOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [uploadedFiles, setUploadedFiles] = useState<any>({});

  const totalSteps = 6;

  const specializationOptions = [
    'Addiction & Substance Abuse',
    'Anxiety Disorders',
    'Depression',
    'Trauma & PTSD',
    'Eating Disorders',
    'Relationship Counseling',
    'Family Therapy',
    'Group Therapy',
    'Cognitive Behavioral Therapy (CBT)',
    'Dialectical Behavior Therapy (DBT)',
    'EMDR',
    'Mindfulness-Based Therapy',
    'Crisis Intervention',
    'Grief & Loss'
  ];

  const languageOptions = [
    'English',
    'Spanish',
    'French',
    'German',
    'Mandarin',
    'Arabic',
    'Portuguese',
    'Russian',
    'Japanese',
    'Korean'
  ];

  const steps = [
    { number: 1, title: 'Welcome', icon: User },
    { number: 2, title: 'Credentials', icon: Award },
    { number: 3, title: 'Documents', icon: Upload },
    { number: 4, title: 'Profile', icon: FileText },
    { number: 5, title: 'Training', icon: BookOpen },
    { number: 6, title: 'Complete', icon: Check }
  ];

  const credentialsForm = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      specializations: [],
      certifications: [],
      yearsExperience: 0
    }
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      languagesSpoken: [],
      emergencyAvailable: false
    }
  });

  const platformForm = useForm<PlatformFormData>({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      completedHIPAATraining: false,
      completedPlatformTraining: false,
      agreedToGuidelines: false,
      agreedToSupervision: false
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
      await api.post('/therapist/onboarding/complete', {
        userId,
        ...data,
        uploadedFiles
      });
      toast.success('Your therapist profile has been submitted for review.');
      onComplete();
    } catch (error) {
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (fileType: string, file: File) => {
    setUploadedFiles((prev: any) => ({ ...prev, [fileType]: file }));
    toast.success(`${fileType} uploaded successfully`);
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
                <h2 className="text-3xl font-bold text-gray-900">Welcome, Mental Health Professional</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Thank you for joining PeerBond. Let's set up your professional profile and verify your credentials to ensure the highest quality care for our community.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900">Client Management</h3>
                    <p className="text-sm text-gray-600">Oversee client progress and group dynamics</p>
                  </div>
                  
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <Brain className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900">AI Collaboration</h3>
                    <p className="text-sm text-gray-600">Work alongside AI facilitators for enhanced care</p>
                  </div>
                  
                  <div className="text-center p-6 bg-purple-50 rounded-lg">
                    <Shield className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900">HIPAA Compliant</h3>
                    <p className="text-sm text-gray-600">Secure, encrypted platform for patient privacy</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-1 mr-3" />
                    <div className="text-left">
                      <h3 className="font-medium text-yellow-900">Verification Process</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your credentials will be reviewed by our licensing team within 3-5 business days. You'll receive an email once approved.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setCurrentStep(2)} className="mt-8">
                  Begin Setup <ChevronRight className="ml-2" size={16} />
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <form onSubmit={credentialsForm.handleSubmit(handleStepSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Professional Credentials</h2>
                  <p className="text-gray-600">Please provide your licensing and education information</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number *
                    </label>
                    <Input
                      {...credentialsForm.register('licenseNumber')}
                      placeholder="Enter your license number"
                    />
                    {credentialsForm.formState.errors.licenseNumber && (
                      <p className="mt-1 text-sm text-red-600">{credentialsForm.formState.errors.licenseNumber.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License State *
                    </label>
                    <select
                      {...credentialsForm.register('licenseState')}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select state...</option>
                      <option value="CA">California</option>
                      <option value="NY">New York</option>
                      <option value="TX">Texas</option>
                      <option value="FL">Florida</option>
                      {/* Add more states */}
                    </select>
                    {credentialsForm.formState.errors.licenseState && (
                      <p className="mt-1 text-sm text-red-600">{credentialsForm.formState.errors.licenseState.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Expiration Date *
                    </label>
                    <Input
                      type="date"
                      {...credentialsForm.register('licenseExpiration')}
                    />
                    {credentialsForm.formState.errors.licenseExpiration && (
                      <p className="mt-1 text-sm text-red-600">{credentialsForm.formState.errors.licenseExpiration.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      {...credentialsForm.register('yearsExperience', { valueAsNumber: true })}
                      placeholder="0"
                    />
                    {credentialsForm.formState.errors.yearsExperience && (
                      <p className="mt-1 text-sm text-red-600">{credentialsForm.formState.errors.yearsExperience.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Education Background *
                  </label>
                  <textarea
                    {...credentialsForm.register('education')}
                    placeholder="Describe your educational background (degree, university, graduation year)..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  {credentialsForm.formState.errors.education && (
                    <p className="mt-1 text-sm text-red-600">{credentialsForm.formState.errors.education.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Specializations * (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {specializationOptions.map((specialization) => (
                      <label key={specialization} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          value={specialization}
                          {...credentialsForm.register('specializations')}
                          className="mr-3"
                        />
                        <span className="text-sm">{specialization}</span>
                      </label>
                    ))}
                  </div>
                  {credentialsForm.formState.errors.specializations && (
                    <p className="mt-2 text-sm text-red-600">{credentialsForm.formState.errors.specializations.message}</p>
                  )}
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
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Document Upload</h2>
                  <p className="text-gray-600">Please upload the required verification documents</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Professional License</h3>
                    <p className="text-sm text-gray-600 mb-4">Upload a clear copy of your current license</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('license', e.target.files[0])}
                      className="hidden"
                      id="license-upload"
                    />
                    <label htmlFor="license-upload">
                      <span className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                        {uploadedFiles.license ? 'Replace File' : 'Upload License'}
                      </span>
                    </label>
                    {uploadedFiles.license && (
                      <p className="text-sm text-green-600 mt-2">✓ {uploadedFiles.license.name}</p>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">CV/Resume</h3>
                    <p className="text-sm text-gray-600 mb-4">Upload your current resume or CV</p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('resume', e.target.files[0])}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload">
                      <span className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                        {uploadedFiles.resume ? 'Replace File' : 'Upload Resume'}
                      </span>
                    </label>
                    {uploadedFiles.resume && (
                      <p className="text-sm text-green-600 mt-2">✓ {uploadedFiles.resume.name}</p>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Malpractice Insurance</h3>
                    <p className="text-sm text-gray-600 mb-4">Current malpractice insurance certificate</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('insurance', e.target.files[0])}
                      className="hidden"
                      id="insurance-upload"
                    />
                    <label htmlFor="insurance-upload">
                      <span className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                        {uploadedFiles.insurance ? 'Replace File' : 'Upload Certificate'}
                      </span>
                    </label>
                    {uploadedFiles.insurance && (
                      <p className="text-sm text-green-600 mt-2">✓ {uploadedFiles.insurance.name}</p>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Additional Certifications</h3>
                    <p className="text-sm text-gray-600 mb-4">Any additional relevant certifications (optional)</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={(e) => e.target.files && handleFileUpload('certifications', e.target.files[0])}
                      className="hidden"
                      id="certifications-upload"
                    />
                    <label htmlFor="certifications-upload">
                      <span className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                        Upload Certificates
                      </span>
                    </label>
                    {uploadedFiles.certifications && (
                      <p className="text-sm text-green-600 mt-2">✓ {uploadedFiles.certifications.length} file(s)</p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                    <div>
                      <h3 className="font-medium text-blue-900">Document Requirements</h3>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• All documents must be current and clearly legible</li>
                        <li>• Accepted formats: PDF, JPG, PNG</li>
                        <li>• Maximum file size: 10MB per document</li>
                        <li>• Documents will be reviewed within 3-5 business days</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                    <ChevronLeft className="mr-2" size={16} /> Back
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(4)}
                    disabled={!uploadedFiles.license || !uploadedFiles.resume}
                  >
                    Continue <ChevronRight className="ml-2" size={16} />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <form onSubmit={profileForm.handleSubmit(handleStepSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Professional Profile</h2>
                  <p className="text-gray-600">Create your professional profile for clients and colleagues</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Professional Bio *
                  </label>
                  <textarea
                    {...profileForm.register('bio')}
                    placeholder="Describe your background, approach to therapy, and what clients can expect when working with you..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={6}
                  />
                  {profileForm.formState.errors.bio && (
                    <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.bio.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Therapeutic Approach *
                    </label>
                    <select
                      {...profileForm.register('approachStyle')}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select approach...</option>
                      <option value="cognitive-behavioral">Cognitive Behavioral (CBT)</option>
                      <option value="psychodynamic">Psychodynamic</option>
                      <option value="humanistic">Humanistic</option>
                      <option value="solution-focused">Solution-Focused</option>
                      <option value="dialectical-behavioral">Dialectical Behavioral (DBT)</option>
                      <option value="mindfulness-based">Mindfulness-Based</option>
                      <option value="integrative">Integrative</option>
                    </select>
                    {profileForm.formState.errors.approachStyle && (
                      <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.approachStyle.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Size Preference *
                    </label>
                    <select
                      {...profileForm.register('groupSizePreference')}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select preference...</option>
                      <option value="small">Small Groups (3-4 members)</option>
                      <option value="medium">Medium Groups (5-6 members)</option>
                      <option value="large">Large Groups (7-8 members)</option>
                      <option value="flexible">Flexible</option>
                    </select>
                    {profileForm.formState.errors.groupSizePreference && (
                      <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.groupSizePreference.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Languages Spoken * (Select all that apply)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {languageOptions.map((language) => (
                      <label key={language} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          value={language}
                          {...profileForm.register('languagesSpoken')}
                          className="mr-3"
                        />
                        <span className="text-sm">{language}</span>
                      </label>
                    ))}
                  </div>
                  {profileForm.formState.errors.languagesSpoken && (
                    <p className="mt-2 text-sm text-red-600">{profileForm.formState.errors.languagesSpoken.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability Hours *
                  </label>
                  <textarea
                    {...profileForm.register('availabilityHours')}
                    placeholder="Describe your typical availability (e.g., Mon-Fri 9am-5pm EST, evenings available for crisis)"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  {profileForm.formState.errors.availabilityHours && (
                    <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.availabilityHours.message}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      {...profileForm.register('emergencyAvailable')}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium">Available for Emergency Consultations</span>
                      <p className="text-sm text-gray-600">
                        I am available to provide emergency consultation for crisis situations
                      </p>
                    </div>
                  </label>
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
              <form onSubmit={platformForm.handleSubmit(handleStepSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Platform Training & Compliance</h2>
                  <p className="text-gray-600">Complete required training modules and agreements</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start">
                      <Shield className="w-6 h-6 text-blue-600 mt-1 mr-4" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 mb-2">HIPAA Training Module</h3>
                        <p className="text-sm text-blue-700 mb-4">
                          Complete our HIPAA training to ensure patient privacy compliance on our platform.
                        </p>
                        <Button variant="outline" size="sm" className="mb-3">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Start HIPAA Training (15 min)
                        </Button>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...platformForm.register('completedHIPAATraining')}
                            className="mr-3"
                          />
                          <span className="text-sm font-medium">I have completed the HIPAA training module</span>
                        </label>
                        {platformForm.formState.errors.completedHIPAATraining && (
                          <p className="mt-1 text-sm text-red-600">{platformForm.formState.errors.completedHIPAATraining.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-start">
                      <Users className="w-6 h-6 text-green-600 mt-1 mr-4" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-900 mb-2">Platform Training</h3>
                        <p className="text-sm text-green-700 mb-4">
                          Learn how to use PeerBond's therapist tools, AI collaboration features, and client management system.
                        </p>
                        <Button variant="outline" size="sm" className="mb-3">
                          <Clock className="w-4 h-4 mr-2" />
                          Start Platform Training (20 min)
                        </Button>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...platformForm.register('completedPlatformTraining')}
                            className="mr-3"
                          />
                          <span className="text-sm font-medium">I have completed the platform training</span>
                        </label>
                        {platformForm.formState.errors.completedPlatformTraining && (
                          <p className="mt-1 text-sm text-red-600">{platformForm.formState.errors.completedPlatformTraining.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      {...platformForm.register('agreedToGuidelines')}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <span className="font-medium">I agree to the Professional Guidelines</span>
                      <p className="text-sm text-gray-600">
                        I will maintain professional standards, respond to crisis alerts promptly, and follow all platform guidelines.
                      </p>
                    </div>
                  </label>
                  {platformForm.formState.errors.agreedToGuidelines && (
                    <p className="mt-1 text-sm text-red-600">{platformForm.formState.errors.agreedToGuidelines.message}</p>
                  )}

                  <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      {...platformForm.register('agreedToSupervision')}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <span className="font-medium">I agree to Supervision Requirements</span>
                      <p className="text-sm text-gray-600">
                        I understand that my activities may be monitored for quality assurance and will participate in supervision as required.
                      </p>
                    </div>
                  </label>
                  {platformForm.formState.errors.agreedToSupervision && (
                    <p className="mt-1 text-sm text-red-600">{platformForm.formState.errors.agreedToSupervision.message}</p>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(4)}>
                    <ChevronLeft className="mr-2" size={16} /> Back
                  </Button>
                  <Button type="submit">
                    Continue <ChevronRight className="ml-2" size={16} />
                  </Button>
                </div>
              </form>
            )}

            {currentStep === 6 && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900">Application Submitted!</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Thank you for completing your therapist onboarding. Your application is now under review by our licensing team.
                </p>

                <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
                  <h3 className="font-semibold text-gray-900 mb-3">What Happens Next?</h3>
                  <ul className="text-sm text-gray-600 space-y-2 text-left">
                    <li>• Credential verification (3-5 business days)</li>
                    <li>• Background check completion</li>
                    <li>• Platform access activation</li>
                    <li>• Introduction to your first client groups</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                    <div className="text-left">
                      <h3 className="font-medium text-blue-900">Stay Connected</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        You'll receive email updates about your application status. Questions? Contact our support team at therapist-support@peerbond.com
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => completeOnboarding(onboardingData)}
                  disabled={isSubmitting}
                  className="px-8 py-3"
                >
                  {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}