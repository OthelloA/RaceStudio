import { fetchOpenF1 } from "./client";
import { normalizeSession } from "./normalize";
import type { OpenF1Session } from "./types";
import type { Session } from "@/lib/domain/types";

export async function getSession(sessionKey: number): Promise<Session> {
  const raw = await fetchOpenF1<OpenF1Session[]>("/sessions", {
    session_key: sessionKey,
  });

  if (raw.length === 0) {
    throw new Error(`No session found for session_key=${sessionKey}`);
  }

  return normalizeSession(raw[0]);
}
