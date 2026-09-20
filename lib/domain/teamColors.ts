export interface TeamTheme {
  id: string;
  name: string;
  badge: string;
  color: string;
  aliases: string[];
}

export const TEAM_THEMES: TeamTheme[] = [
  { id: "ferrari", name: "Ferrari", badge: "FER", color: "#E80020", aliases: ["ferrari"] },
  { id: "red-bull", name: "Red Bull", badge: "RBR", color: "#3671C6", aliases: ["red bull"] },
  { id: "mercedes", name: "Mercedes", badge: "MER", color: "#27F4D2", aliases: ["mercedes"] },
  { id: "mclaren", name: "McLaren", badge: "MCL", color: "#FF8000", aliases: ["mclaren"] },
  { id: "aston-martin", name: "Aston Martin", badge: "AMR", color: "#229971", aliases: ["aston martin"] },
  { id: "alpine", name: "Alpine", badge: "ALP", color: "#0093CC", aliases: ["alpine"] },
  { id: "williams", name: "Williams", badge: "WIL", color: "#64C4FF", aliases: ["williams"] },
  { id: "haas", name: "Haas", badge: "HAA", color: "#B6BABD", aliases: ["haas"] },
  { id: "racing-bulls", name: "Racing Bulls", badge: "VCARB", color: "#6692FF", aliases: ["racing bulls", "rb"] },
  { id: "sauber", name: "Sauber", badge: "SAU", color: "#52E252", aliases: ["kick sauber", "sauber"] },
  { id: "audi", name: "Audi", badge: "AUD", color: "#C9F500", aliases: ["audi"] },
  { id: "cadillac", name: "Cadillac", badge: "CAD", color: "#D4AF37", aliases: ["cadillac"] },
];

export function getConstructorColor(name: string): string {
  const normalized = name.toLowerCase();
  const match = TEAM_THEMES.find((theme) =>
    theme.aliases.some((alias) => normalized.includes(alias))
  );
  return match?.color ?? "#71717a";
}
