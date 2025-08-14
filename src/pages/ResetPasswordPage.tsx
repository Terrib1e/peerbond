import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Eye, EyeOff, ArrowLeft, Check, AlertCircle } from 'lucide-react';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset code is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const tokenFromUrl = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl,
    },
  });

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!tokenFromUrl) {
        setIsVerifyingToken(false);
        setTokenValid(false);
        return;
      }

      try {
        const response = await api.verifyResetToken(tokenFromUrl);
        setMemberEmail(response.email);
        setTokenValid(true);
        setValue('token', tokenFromUrl);
      } catch (error) {
        setTokenValid(false);
        setError('token', {
          message: 'Invalid or expired reset code'
        });
      } finally {
        setIsVerifyingToken(false);
      }
    };

    verifyToken();
  }, [tokenFromUrl, setValue, setError]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      await api.resetPassword(data.token, data.password);
      setIsSuccess(true);
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Failed to reset password. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while verifying token
  if (isVerifyingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600">Verifying reset code...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">Invalid Reset Code</h2>
            <p className="mt-2 text-sm text-gray-600">
              This password reset code is invalid or has expired.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">
              <p>The reset code may have expired or been used already.</p>
              <p className="mt-2">Reset codes are valid for 1 hour after being generated.</p>
            </div>
          </div>

          <div className="text-center space-y-4">
            <Link
              to="/forgot-password"
              className="btn-primary w-full py-3"
            >
              Request New Reset Code
            </Link>

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
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">Password Updated</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been successfully reset.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="text-sm text-green-700">
              <p>You can now sign in with your new password.</p>
              <p className="mt-2">Make sure to keep your password secure and don't share it with anyone.</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="btn-primary w-full py-3"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create a new password for your account
          </p>
          {memberEmail && (
            <p className="mt-1 text-center text-sm font-medium text-gray-900">
              {memberEmail}
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                Reset Code
              </label>
              <input
                {...register('token')}
                type="text"
                className="input mt-1"
                placeholder="Enter your 6-character reset code"
                maxLength={6}
                style={{ textTransform: 'uppercase' }}
              />
              {errors.token && (
                <p className="mt-1 text-sm text-red-600">{errors.token.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="text-sm text-blue-700">
              <p className="font-medium">Password Requirements:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>At least 8 characters long</li>
                <li>Mix of letters, numbers, and symbols recommended</li>
                <li>Different from your previous password</li>
              </ul>
            </div>
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
              {isLoading ? 'Updating password...' : 'Update Password'}
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