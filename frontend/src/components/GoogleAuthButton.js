import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCRIPT_ID = "google-identity-script";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(SCRIPT_ID);

    if (existingScript) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Google Identity Services"));
    document.body.appendChild(script);
  });
}

export default function GoogleAuthButton({ onCredential, label = "Continue with Google" }) {
  const buttonRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (!GOOGLE_CLIENT_ID || !buttonRef.current) {
        return;
      }

      try {
        await loadGoogleScript();

        if (cancelled || !window.google?.accounts?.id || !buttonRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            callbackRef.current?.(response.credential);
          },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: buttonRef.current.clientWidth,
          text: "continue_with",
        });

        setReady(true);
      } catch {
        setReady(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
        Set REACT_APP_GOOGLE_CLIENT_ID to enable Google sign-in.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={buttonRef} className="w-full overflow-hidden rounded-2xl" aria-label={label} />
      {!ready ? <div className="text-xs text-white/50">Loading Google sign-in...</div> : null}
    </div>
  );
}