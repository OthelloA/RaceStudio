"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessions } from "@/hooks/useSessionData";
import { SeasonSelect } from "./SeasonSelect";
import { GrandPrixSelect, type GrandPrixOption } from "./GrandPrixSelect";
import { SessionSelect } from "./SessionSelect";
import { Spinner } from "@/components/ui/Spinner";

export function SessionBrowser() {
  const router = useRouter();
  // Computed once on mount rather than on every render, so filtering below
  // stays a pure function of props/state (required by the rules of React).
  const [now] = useState(() => Date.now());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [meetingKey, setMeetingKey] = useState<number | null>(null);
  const [sessionKey, setSessionKey] = useState<number | null>(null);

  const { data: sessions, isLoading, isError } = useSessions(year);

  // OpenF1 lists scheduled future sessions with no telemetry yet — exclude them.
  const pastSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((session) => Date.parse(session.startTimeUtc) <= now);
  }, [sessions, now]);

  const grandPrixOptions: GrandPrixOption[] = useMemo(() => {
    const seen = new Map<number, GrandPrixOption>();
    for (const session of pastSessions) {
      if (!seen.has(session.meetingKey)) {
        seen.set(session.meetingKey, {
          meetingKey: session.meetingKey,
          label: `${session.countryName} — ${session.circuitName}`,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.meetingKey - b.meetingKey);
  }, [pastSessions]);

  const sessionsForMeeting = useMemo(() => {
    if (meetingKey === null) return [];
    return pastSessions
      .filter((s) => s.meetingKey === meetingKey)
      .sort((a, b) => Date.parse(a.startTimeUtc) - Date.parse(b.startTimeUtc));
  }, [pastSessions, meetingKey]);

  // Adjust the selection during render when the computed option lists change
  // (new season loaded, etc.) rather than in an effect — avoids an extra
  // cascading render pass. See "adjusting state during render" in React docs.
  const [prevGrandPrixOptions, setPrevGrandPrixOptions] = useState(grandPrixOptions);
  if (grandPrixOptions !== prevGrandPrixOptions) {
    setPrevGrandPrixOptions(grandPrixOptions);
    setMeetingKey(grandPrixOptions[0]?.meetingKey ?? null);
  }

  const [prevSessionsForMeeting, setPrevSessionsForMeeting] = useState(sessionsForMeeting);
  if (sessionsForMeeting !== prevSessionsForMeeting) {
    setPrevSessionsForMeeting(sessionsForMeeting);
    setSessionKey(sessionsForMeeting[0]?.key ?? null);
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Spinner /> Loading sessions for {year}…
        </p>
      )}
      {isError && (
        <p className="text-sm text-red-600">Failed to load sessions for {year}.</p>
      )}
      {!isLoading && !isError && grandPrixOptions.length === 0 && (
        <p className="text-sm text-zinc-500">No sessions found for {year}.</p>
      )}

      <div className="flex flex-wrap gap-4">
        <SeasonSelect value={year} onChange={setYear} />
        <GrandPrixSelect
          options={grandPrixOptions}
          value={meetingKey}
          onChange={setMeetingKey}
          disabled={isLoading || grandPrixOptions.length === 0}
        />
        <SessionSelect
          sessions={sessionsForMeeting}
          value={sessionKey}
          onChange={setSessionKey}
          disabled={isLoading || sessionsForMeeting.length === 0}
        />
      </div>

      <button
        type="button"
        disabled={sessionKey === null}
        onClick={() => sessionKey !== null && router.push(`/session/${sessionKey}`)}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
      >
        View Session
      </button>
    </div>
  );
}
