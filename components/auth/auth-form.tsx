'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Flame, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithEmail, signUpWithEmail, signInWithOAuth } from '@/lib/client';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  const isLogin = mode === 'login';

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await signInWithEmail(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        if (formData.password.length < 8) {
          toast.error('Password must be at least 8 characters');
          setIsLoading(false);
          return;
        }
        await signUpWithEmail(formData.email, formData.password, {
          full_name: formData.fullName,
        });
        toast.success('Account created! Check your email to verify.');
      }
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github'): Promise<void> => {
    setIsLoading(true);
    try {
      await signInWithOAuth(provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4 relative overflow-hidden">
      {/* Warm background gradients — matches landing page */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-[#D4A574]/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#8B5A2B]/8 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A] rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative p-3 rounded-xl bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A]">
                <Flame className="h-7 w-7 text-[#3D3229] dark:text-white" />
              </div>
            </div>
            <span className="text-2xl font-bold text-[#3D3229]">UnderFireAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#3D3229]">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-[#6B5744] mt-2">
            {isLogin
              ? 'Sign in to continue your interview prep'
              : 'Start training under fire today'}
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-[#3D3229]/10 bg-white shadow-xl shadow-[#8B5A2B]/5 p-7">
          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#3D3229]/15 bg-[#FAF8F5] px-4 py-2.5 text-sm font-medium text-[#3D3229] hover:bg-[#FFF3E5] hover:border-[#8B5A2B]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#3D3229]/15 bg-[#FAF8F5] px-4 py-2.5 text-sm font-medium text-[#3D3229] hover:bg-[#FFF3E5] hover:border-[#8B5A2B]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5 text-[#3D3229]" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#3D3229]/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-[#8B7355]">or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-[#3D3229] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8B7355]" />
                  <input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="John Doe"
                    required={!isLogin}
                    className="w-full rounded-xl border border-[#3D3229]/15 bg-[#FAF8F5] pl-10 pr-4 py-2.5 text-[#3D3229] placeholder:text-[#8B7355] focus:border-[#8B5A2B] focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]/30 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#3D3229] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8B7355]" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-[#3D3229]/15 bg-[#FAF8F5] pl-10 pr-4 py-2.5 text-[#3D3229] placeholder:text-[#8B7355] focus:border-[#8B5A2B] focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#3D3229] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8B7355]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isLogin ? '••••••••' : 'Min 8 characters'}
                  required
                  minLength={isLogin ? undefined : 8}
                  className="w-full rounded-xl border border-[#3D3229]/15 bg-[#FAF8F5] pl-10 pr-12 py-2.5 text-[#3D3229] placeholder:text-[#8B7355] focus:border-[#8B5A2B] focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7355] hover:text-[#6B5744] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#8B5A2B] hover:text-[#5D3A1A] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] px-4 py-3 text-sm font-semibold text-[#3D3229] dark:text-white hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-lg shadow-[#8B5A2B]/20 hover:shadow-[#8B5A2B]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle Link */}
          <p className="mt-6 text-center text-sm text-[#6B5744]">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Link
              href={isLogin ? '/register' : '/login'}
              className="text-[#8B5A2B] hover:text-[#5D3A1A] font-semibold transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </div>

        {/* Terms */}
        {!isLogin && (
          <p className="mt-5 text-center text-xs text-[#8B7355]">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-[#6B5744] hover:text-[#3D3229] transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[#6B5744] hover:text-[#3D3229] transition-colors">
              Privacy Policy
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
