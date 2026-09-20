const FIRST_COVERED_YEAR = 2023;

function availableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= FIRST_COVERED_YEAR; y--) years.push(y);
  return years;
}

export function SeasonSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (year: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-500">Season</span>
      <select
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-zinc-100 focus:border-red-400 focus:outline-none"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {availableYears().map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
