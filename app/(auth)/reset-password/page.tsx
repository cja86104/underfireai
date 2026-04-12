'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flame, Loader2, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getClient } from '@/lib/client';

export default function ResetPasswordPage(): React.JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const checkSession = async (): Promise<void> => {
      const supabase = getClient();
      // getUser() validates the token server-side — getSession() only reads
      // from local storage and is not safe for security-sensitive checks.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Invalid or expired reset link. Please request a new one.');
        router.push('/login');
      }
    };
    void checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getClient();
      const { error } = await supabase.auth.updateUser({ password: formData.password });
      if (error) throw error;

      setIsSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-[#D4A574]/10 to-transparent blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="rounded-2xl border border-green-200 bg-green-50 shadow-xl p-10">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#3D3229] mb-2">Password Updated</h1>
            <p className="text-[#6B5744]">
              Your password has been successfully updated. Redirecting you to the dashboard…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4 relative overflow-hidden">
      {/* Warm background gradients */}
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
                <Flame className="h-7 w-7 text-white" />
              </div>
            </div>
            <span className="text-2xl font-bold text-[#3D3229]">UnderFireAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#3D3229]">Reset Your Password</h1>
          <p className="text-[#6B5744] mt-2">Enter your new password below</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-[#3D3229]/10 bg-white shadow-xl shadow-[#8B5A2B]/5 p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#3D3229] mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B7355]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password"
                  required
                  minLength={8}
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
              <p className="text-xs text-[#8B7355] mt-1">Minimum 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#3D3229] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B7355]" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-[#3D3229]/15 bg-[#FAF8F5] pl-10 pr-12 py-2.5 text-[#3D3229] placeholder:text-[#8B7355] focus:border-[#8B5A2B] focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7355] hover:text-[#6B5744] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] py-3 text-sm font-semibold text-white hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-lg shadow-[#8B5A2B]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-[#8B7355] hover:text-[#6B5744] transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
