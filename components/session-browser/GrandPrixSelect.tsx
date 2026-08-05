export interface GrandPrixOption {
  meetingKey: number;
  label: string;
}

export function GrandPrixSelect({
  options,
  value,
  onChange,
  disabled,
}: {
  options: GrandPrixOption[];
  value: number | null;
  onChange: (meetingKey: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-500">Grand Prix</span>
      <select
        className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((option) => (
          <option key={option.meetingKey} value={option.meetingKey}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
