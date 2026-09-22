import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

type GoogleSignInButtonProps = {
  onCredential: (idToken: string) => Promise<void> | void;
  onError?: (message: string) => void;
  disabled?: boolean;
  label?: string;
};

const GoogleSignInButton = ({
  onCredential,
  onError,
  disabled = false,
  label = 'ادامه با گوگل',
}: GoogleSignInButtonProps) => {
  const buttonHostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const callbackRef = useRef(onCredential);
  const errorRef = useRef(onError);

  useEffect(() => {
    callbackRef.current = onCredential;
    errorRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    if (!CLIENT_ID) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadGisScript();
        if (cancelled || !buttonHostRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response: { credential?: string }) => {
            if (!response?.credential) {
              errorRef.current?.('توکن گوگل دریافت نشد.');
              return;
            }
            setBusy(true);
            try {
              await callbackRef.current(response.credential);
            } catch (error) {
              errorRef.current?.((error as Error).message || 'ورود با گوگل ناموفق بود.');
            } finally {
              setBusy(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        buttonHostRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonHostRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
          locale: 'fa',
        });

        setReady(true);
      } catch (error) {
        errorRef.current?.((error as Error).message || 'بارگذاری گوگل ناموفق بود.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        ورود با گوگل هنوز پیکربندی نشده است.
      </p>
    );
  }

  return (
    <div className="relative w-full flex flex-col items-center gap-2">
      {(busy || disabled || !ready) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/70">
          {busy || !ready ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      )}
      <div
        ref={buttonHostRef}
        className={`flex w-full justify-center min-h-[44px] ${disabled || busy ? 'pointer-events-none opacity-60' : ''}`}
        aria-label={label}
      />
    </div>
  );
};

export default GoogleSignInButton;
