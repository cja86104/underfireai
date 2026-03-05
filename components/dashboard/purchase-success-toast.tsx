'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

interface PurchaseSuccessToastProps {
  /** Product key from Stripe checkout metadata, e.g. "starter_6" */
  product: string;
  /** Human-readable label, e.g. "Starter Pack" */
  productLabel: string;
  /** Number of interviews granted */
  interviewsGranted: number;
}

/**
 * Fires a success toast once on mount when the user lands on the dashboard
 * after a completed Stripe checkout. Rendered by the server component with
 * the purchase details already resolved — no client-side Stripe calls needed.
 */
export function PurchaseSuccessToast({
  product,
  productLabel,
  interviewsGranted,
}: PurchaseSuccessToastProps): null {
  useEffect(() => {
    const interviewWord = interviewsGranted === 1 ? 'interview' : 'interviews';

    toast.success(`${productLabel} activated!`, {
      description: `${interviewsGranted} ${interviewWord} added to your account. You're ready to practice.`,
      duration: 6000,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intentionally unused — suppresses the "product is defined but never used" lint warning.
  void product;

  return null;
}
