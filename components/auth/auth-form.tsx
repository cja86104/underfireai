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
