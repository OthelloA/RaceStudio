const TEAM_COLORS: Record<string, string> = {
  "red bull": "#3671C6",
  "ferrari": "#E80020",
  "mercedes": "#27F4D2",
  "mclaren": "#FF8000",
  "aston martin": "#229971",
  "alpine": "#0093CC",
  "williams": "#64C4FF",
  "haas": "#B6BABD",
  "racing bulls": "#6692FF",
  "rb": "#6692FF",
  "kick sauber": "#52E252",
  "sauber": "#52E252",
  "audi": "#C9F500",
  "cadillac": "#D4AF37",
};

export function getConstructorColor(name: string): string {
  const normalized = name.toLowerCase();
  const match = Object.entries(TEAM_COLORS).find(([key]) => normalized.includes(key));
  return match?.[1] ?? "#71717a";
}
