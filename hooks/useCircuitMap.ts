import { useQuery } from "@tanstack/react-query";

export interface CircuitFeature {
  type: "Feature";
  properties: {
    id: string;
    Location: string;
    Name: string;
    length?: number;
    altitude?: number;
  };
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
}

interface CircuitCollection {
  type: "FeatureCollection";
  features: CircuitFeature[];
}

const CIRCUIT_ALIASES: Record<string, string[]> = {
  "spa-francorchamps": ["spa", "spa francorchamps", "circuit de spa francorchamps"],
  "red bull ring": ["spielberg"],
  "autodromo nazionale monza": ["monza"],
  "autodromo enzo e dino ferrari": ["imola"],
  "yas marina circuit": ["yas marina"],
  "marina bay street circuit": ["singapore"],
  "circuit gilles-villeneuve": ["montreal", "gilles villeneuve"],
  "autódromo josé carlos pace - interlagos": ["interlagos", "sao paulo", "são paulo"],
  "circuit of the americas": ["cota", "austin"],
  "miami international autodrome": ["miami"],
  "las vegas street circuit": ["las vegas"],
  "baku city circuit": ["baku"],
  "jeddah corniche circuit": ["jeddah"],
  "lusail international circuit": ["losail", "lusail"],
  "bahrain international circuit": ["bahrain", "sakhir"],
  "circuit zandvoort": ["zandvoort"],
  "silverstone circuit": ["silverstone"],
  "suzuka international racing course": ["suzuka"],
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function candidates(feature: CircuitFeature): string[] {
  const name = normalizeName(feature.properties.Name);
  const location = normalizeName(feature.properties.Location);
  return [name, location, ...(CIRCUIT_ALIASES[name] ?? []).map(normalizeName)];
}

export function findCircuit(
  features: CircuitFeature[],
  circuitName: string,
  countryName: string
): CircuitFeature | null {
  const circuit = normalizeName(circuitName);
  const country = normalizeName(countryName);

  return (
    features.find((feature) =>
      candidates(feature).some(
        (candidate) =>
          candidate === circuit ||
          circuit.includes(candidate) ||
          candidate.includes(circuit)
      )
    ) ??
    features.find((feature) =>
      candidates(feature).some(
        (candidate) =>
          country.includes(candidate) || candidate.includes(country)
      )
    ) ??
    null
  );
}

async function fetchCircuitCollection(): Promise<CircuitCollection> {
  const res = await fetch("/circuits/f1-circuits.geojson");
  if (!res.ok) throw new Error("Failed to load circuit maps");
  return (await res.json()) as CircuitCollection;
}

export function useCircuitMaps() {
  return useQuery({
    queryKey: ["circuit-maps"],
    queryFn: fetchCircuitCollection,
    staleTime: Infinity,
  });
}

export function useCircuitMap(circuitName: string, countryName: string) {
  return useQuery({
    queryKey: ["circuit-map", circuitName, countryName],
    queryFn: async (): Promise<CircuitFeature | null> => {
      const collection = await fetchCircuitCollection();
      return findCircuit(collection.features, circuitName, countryName);
    },
    staleTime: Infinity,
  });
}
