export interface GrandPrixOption {
  meetingKey: number;
  label: string;
  isUpcoming: boolean;
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
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-zinc-100 disabled:opacity-50 focus:border-red-400 focus:outline-none"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((option) => (
          <option key={option.meetingKey} value={option.meetingKey}>
            {option.label}{option.isUpcoming ? " (upcoming)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
