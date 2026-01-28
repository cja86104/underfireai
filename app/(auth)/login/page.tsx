import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your UnderFireAI account to continue your interview prep.',
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
