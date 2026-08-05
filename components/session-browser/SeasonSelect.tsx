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
        className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
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
