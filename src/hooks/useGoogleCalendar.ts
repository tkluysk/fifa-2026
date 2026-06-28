import { useState, useCallback, useEffect } from "react";
import { syncToGoogleCalendar, type SyncOptions } from "../gcalSync";

const LS_TOKEN   = "gcal-access-token";
const LS_EXPIRY  = "gcal-token-expiry";
const SCOPES     = "https://www.googleapis.com/auth/calendar";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

function loadToken(): string | null {
  try {
    const token = localStorage.getItem(LS_TOKEN);
    const expiry = parseInt(localStorage.getItem(LS_EXPIRY) ?? "0", 10);
    if (token && expiry > Date.now()) return token;
  } catch { /* ignore */ }
  return null;
}

function saveToken(token: string, expiresIn: number) {
  localStorage.setItem(LS_TOKEN, token);
  localStorage.setItem(LS_EXPIRY, String(Date.now() + expiresIn * 1000 - 60_000));
}

function clearToken() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_EXPIRY);
}

export type GCalStatus = "idle" | "connected" | "syncing" | "done" | "error";

export function useGoogleCalendar() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const hasClientId = !!clientId;

  const [status, setStatus] = useState<GCalStatus>(() =>
    loadToken() ? "connected" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Re-check token validity on mount
  useEffect(() => {
    if (!loadToken() && status === "connected") setStatus("idle");
  }, []);

  const requestToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        reject(new Error("Google Identity Services not loaded"));
        return;
      }
      const existing = loadToken();
      if (existing) { resolve(existing); return; }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId!,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.error || !resp.access_token) {
            reject(new Error(resp.error ?? "No token returned"));
            return;
          }
          saveToken(resp.access_token, resp.expires_in ?? 3600);
          setStatus("connected");
          resolve(resp.access_token);
        },
      });
      client.requestAccessToken();
    });
  }, [clientId]);

  const sync = useCallback(async (opts: Omit<SyncOptions, "token">) => {
    setError(null);
    setStatus("syncing");
    try {
      let token = loadToken();
      if (!token) {
        token = await requestToken();
      }
      await syncToGoogleCalendar({ ...opts, token });
      setStatus("done");
      setLastSync(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Token expired mid-sync — clear and ask user to retry
      if (msg.includes("401")) {
        clearToken();
        setStatus("idle");
        setError("Session expired — click to reconnect");
      } else {
        setStatus("error");
        setError(msg);
      }
    }
  }, [requestToken]);


  return { hasClientId, status, error, lastSync, sync };
}
