import type { Session } from "@/lib/domain/types";

export function SessionSelect({
  sessions,
  value,
  onChange,
  disabled,
  now,
}: {
  sessions: Session[];
  value: number | null;
  onChange: (sessionKey: number) => void;
  disabled?: boolean;
  now: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-500">Session</span>
      <select
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-zinc-100 disabled:opacity-50 focus:border-red-400 focus:outline-none"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {sessions.map((session) => {
          const isFuture = Date.parse(session.startTimeUtc) > now;
          return (
            <option key={session.key} value={session.key}>
              {session.name} — {new Date(session.startTimeUtc).toLocaleString()}{isFuture ? " (upcoming)" : ""}
            </option>
          );
        })}
      </select>
    </label>
  );
}
