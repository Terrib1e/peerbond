import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Mail, ArrowLeft, Check } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await api.forgotPassword(data.email);
      setIsSubmitted(true);
    } catch (error) {
      setError('root', { 
        message: error instanceof Error ? error.message : 'Failed to send reset email. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">Check your email</h2>
            <p className="mt-2 text-sm text-gray-600">
              We've sent password reset instructions to
            </p>
            <p className="text-sm font-medium text-gray-900">
              {getValues('email')}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <Mail className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Didn't receive the email?
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the correct email address</li>
                    <li>The reset code expires in 1 hour</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <button
              onClick={() => setIsSubmitted(false)}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              Try a different email address
            </button>
            
            <div>
              <Link 
                to="/login" 
                className="flex items-center justify-center text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a reset code
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="mt-1 relative">
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="input pr-10"
                placeholder="Enter your email address"
              />
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {errors.root && (
            <div className="text-sm text-red-600 text-center">
              {errors.root.message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? 'Sending reset code...' : 'Send reset code'}
            </button>
          </div>

          <div className="text-center">
            <Link 
              to="/login" 
              className="flex items-center justify-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}