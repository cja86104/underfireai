import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your UnderFireAI account and start practicing interviews today.',
};

export default function RegisterPage(): React.JSX.Element {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
