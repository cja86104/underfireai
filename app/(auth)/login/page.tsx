import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your UnderFireAI account to continue your interview prep.',
};

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
