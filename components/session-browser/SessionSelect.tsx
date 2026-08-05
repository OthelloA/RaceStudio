import type { Session } from "@/lib/domain/types";

export function SessionSelect({
  sessions,
  value,
  onChange,
  disabled,
}: {
  sessions: Session[];
  value: number | null;
  onChange: (sessionKey: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-500">Session</span>
      <select
        className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {sessions.map((session) => (
          <option key={session.key} value={session.key}>
            {session.name}
          </option>
        ))}
      </select>
    </label>
  );
}
