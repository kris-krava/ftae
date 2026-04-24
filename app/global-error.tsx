'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Catches errors that occur in the root layout itself — when even <body>
// failed to render. Must include its own <html>/<body> because the root
// layout never mounted.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          textAlign: 'center',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#1a1a1a',
          background: '#f5f1e8',
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p
          style={{
            marginTop: '16px',
            color: '#6b6b6b',
            fontSize: '15px',
            lineHeight: '24px',
          }}
        >
          We hit a serious error. Please refresh in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '32px',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            background: '#d8470b',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
