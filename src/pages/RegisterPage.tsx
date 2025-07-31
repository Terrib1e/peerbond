import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, User, Stethoscope, Shield } from 'lucide-react';
import MemberOnboarding from '@/components/onboarding/MemberOnboarding';
import TherapistOnboarding from '@/components/onboarding/TherapistOnboarding';
import AdminOnboarding from '@/components/onboarding/AdminOnboarding';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['member', 'therapist', 'admin'], {
    required_error: 'Please select your role',
  }),
  recoveryGoals: z.array(z.string()).optional(),
  wellnessGoals: z.array(z.string()).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const { register: registerUser, isLoading, member } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      experienceLevel: 'beginner',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
      setRegisteredUser({ ...(member || {}), role: data.role });
      setShowOnboarding(true);
    } catch (error) {
      setError('root', { message: 'Registration failed. Please try again.' });
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);

    // Navigate based on role
    switch (registeredUser?.role) {
      case 'therapist':
        navigate('/therapist');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate('/app');
    }
  };

  // Show onboarding flow if member just registered
  if (showOnboarding && registeredUser) {
    switch (registeredUser.role) {
      case 'member':
        return (
          <MemberOnboarding
            onComplete={handleOnboardingComplete}
            memberId={registeredUser.id}
          />
        );
      case 'therapist':
        return (
          <TherapistOnboarding
            onComplete={handleOnboardingComplete}
            memberId={registeredUser.id}
          />
        );
      case 'admin':
        return (
          <AdminOnboarding
            onComplete={handleOnboardingComplete}
            memberId={registeredUser.id}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join PeerBond
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account to get started
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I am joining as a:
              </label>
              <div className="grid grid-cols-1 gap-3">
                <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                  <input
                    {...register('role')}
                    type="radio"
                    value="member"
                    className="sr-only"
                  />
                  <div className="flex items-center w-full">
                    <User className="w-5 h-5 text-blue-600 mr-3" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Member</span>
                      <p className="text-sm text-gray-600">Join support groups and connect with peers</p>
                    </div>
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500"></div>
                  </div>
                </label>

                <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-green-50 has-[:checked]:border-green-500">
                  <input
                    {...register('role')}
                    type="radio"
                    value="therapist"
                    className="sr-only"
                  />
                  <div className="flex items-center w-full">
                    <Stethoscope className="w-5 h-5 text-green-600 mr-3" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Licensed Therapist</span>
                      <p className="text-sm text-gray-600">Provide professional guidance and oversight</p>
                    </div>
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full has-[:checked]:border-green-500 has-[:checked]:bg-green-500"></div>
                  </div>
                </label>

                <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-red-50 has-[:checked]:border-red-500">
                  <input
                    {...register('role')}
                    type="radio"
                    value="admin"
                    className="sr-only"
                  />
                  <div className="flex items-center w-full">
                    <Shield className="w-5 h-5 text-red-600 mr-3" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Administrator</span>
                      <p className="text-sm text-gray-600">Manage platform operations and compliance</p>
                    </div>
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full has-[:checked]:border-red-500 has-[:checked]:bg-red-500"></div>
                  </div>
                </label>
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-error-600">{errors.role.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="input mt-1"
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-error-600">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  {...register('lastName')}
                  type="text"
                  className="input mt-1"
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-error-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                className="input mt-1"
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Create a secure password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative mt-1">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-error-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {selectedRole === 'member' && (
              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700">
                  Experience Level
                </label>
                <select
                  {...register('experienceLevel')}
                  className="input mt-1"
                >
                  <option value="beginner">Beginner - New to support groups</option>
                  <option value="intermediate">Intermediate - Some experience</option>
                  <option value="advanced">Advanced - Experienced participant</option>
                </select>
                {errors.experienceLevel && (
                  <p className="mt-1 text-sm text-error-600">{errors.experienceLevel.message}</p>
                )}
              </div>
            )}
          </div>

          {errors.root && (
            <div className="text-sm text-error-600 text-center">
              {errors.root.message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;