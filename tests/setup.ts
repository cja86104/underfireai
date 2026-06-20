/**
 * Vitest global setup. Imported once before any test runs (per
 * vitest.config.ts setupFiles).
 *
 * Brings in @testing-library/jest-dom matchers so component tests can
 * assert things like .toBeInTheDocument(), .toHaveClass(), etc.
 */
import '@testing-library/jest-dom/vitest';
