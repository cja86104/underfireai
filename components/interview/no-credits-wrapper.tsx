'use client';

import { useState, useEffect } from 'react';
import { RecapModal } from './recap-modal';

interface NoCreditsWrapperProps {
  children: React.ReactNode;
  hasCredits: boolean;
  hasPurchased: boolean;
}

/**
 * Client wrapper that shows the recap modal when user has no credits.
 * For users who have never purchased, just shows children (they'll see locked features).
 * For users who have purchased but ran out, shows the recap modal.
 */
export function NoCreditsWrapper({
  children,
  hasCredits,
  hasPurchased,
}: NoCreditsWrapperProps): React.JSX.Element {
  const [showRecap, setShowRecap] = useState(false);

  // Show recap modal if user has purchased before but has no credits left
  useEffect(() => {
    if (hasPurchased && !hasCredits) {
      setShowRecap(true);
    }
  }, [hasPurchased, hasCredits]);

  return (
    <>
      {children}
      <RecapModal isOpen={showRecap} onClose={() => setShowRecap(false)} />
    </>
  );
}
