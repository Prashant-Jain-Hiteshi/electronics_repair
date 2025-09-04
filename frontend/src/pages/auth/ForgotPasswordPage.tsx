import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useUIStore } from '@/stores/useUIStore';
import { Button, Input } from '@/components/ui';
import { Logo } from '@/components/common';

// Form validation schema
const forgotPasswordSchema = yup.object().shape({
  email: yup.string().email('Invalid email address').required('Email is required'),
});

type ForgotPasswordFormData = yup.InferType<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const { showToast } = useUIStore();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, you would call your API here
      // await authService.forgotPassword(data.email);
      
      setIsSubmitted(true);
      showToast('Password reset link sent to your email', 'success');
    } catch (error) {
      showToast('Failed to send reset link. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Logo className="h-16 w-auto" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          <div className="mt-2 text-center text-sm text-gray-600">
            <p>
              We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
            </p>
            <p className="mt-4">
              Didn't receive the email?{' '}
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Resend
              </button>
            </p>
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo className="h-16 w-auto" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Forgot your password?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Input
                id="email"
                type="email"
                label="Email address"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
                disabled={isLoading}
              />
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                loadingText="Sending reset link..."
              >
                Send reset link
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
