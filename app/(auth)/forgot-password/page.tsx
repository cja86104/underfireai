'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flame, Loader2, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { resetPassword } from '@/lib/client';

export default function ForgotPasswordPage(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await resetPassword(email);
      setIsSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
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
            <h1 className="text-2xl font-bold text-[#3D3229] mb-2">Check your email</h1>
            <p className="text-[#6B5744]">
              We sent a password reset link to <span className="font-semibold">{email}</span>.
              Click the link in the email to reset your password.
            </p>
            <p className="text-sm text-[#8B7355] mt-4">
              Didn&apos;t receive it? Check your spam folder or{' '}
              <button
                onClick={() => setIsSuccess(false)}
                className="text-[#8B5A2B] hover:text-[#5D3A1A] font-medium transition-colors"
              >
                try again
              </button>
              .
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm text-[#8B7355] hover:text-[#6B5744] transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
                <Flame className="h-7 w-7 text-white" />
              </div>
            </div>
            <span className="text-2xl font-bold text-[#3D3229]">UnderFireAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#3D3229]">Forgot your password?</h1>
          <p className="text-[#6B5744] mt-2">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-[#3D3229]/10 bg-white shadow-xl shadow-[#8B5A2B]/5 p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#3D3229] mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B7355]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-[#3D3229]/15 bg-[#FAF8F5] pl-10 pr-4 py-2.5 text-[#3D3229] placeholder:text-[#8B7355] focus:border-[#8B5A2B] focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]/30 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] py-3 text-sm font-semibold text-white hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-lg shadow-[#8B5A2B]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                'Send reset link'
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
