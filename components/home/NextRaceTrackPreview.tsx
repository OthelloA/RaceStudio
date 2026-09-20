"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as d3 from "d3";
import { useCircuitMap, type CircuitFeature } from "@/hooks/useCircuitMap";

function projectCircuit(feature: CircuitFeature, width: number, height: number) {
  const coords = feature.geometry.coordinates;
  const xExtent = d3.extent(coords, (point) => point[0]) as [number, number];
  const yExtent = d3.extent(coords, (point) => point[1]) as [number, number];
  const padding = 24;
  const dataWidth = xExtent[1] - xExtent[0] || 1;
  const dataHeight = yExtent[1] - yExtent[0] || 1;
  const scale = Math.min((width - padding * 2) / dataWidth, (height - padding * 2) / dataHeight);
  const renderedWidth = dataWidth * scale;
  const renderedHeight = dataHeight * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;

  return coords.map(([lon, lat]) => ({
    x: offsetX + (lon - xExtent[0]) * scale,
    y: height - (offsetY + (lat - yExtent[0]) * scale),
  }));
}

function normalize3D(feature: CircuitFeature): Array<[number, number, number]> {
  const coords = feature.geometry.coordinates;
  const minX = Math.min(...coords.map((point) => point[0]));
  const maxX = Math.max(...coords.map((point) => point[0]));
  const minY = Math.min(...coords.map((point) => point[1]));
  const maxY = Math.max(...coords.map((point) => point[1]));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const scale = 10 / Math.max(maxX - minX || 1, maxY - minY || 1);

  return coords.map(([lon, lat]) => [
    (lon - centerX) * scale,
    0,
    -(lat - centerY) * scale,
  ]);
}

function Preview2D({ feature }: { feature: CircuitFeature }) {
  const width = 520;
  const height = 260;
  const pathD = useMemo(() => {
    const points = projectCircuit(feature, width, height);
    const line = d3
      .line<{ x: number; y: number }>()
      .curve(d3.curveCatmullRom.alpha(0.5))
      .x((point) => point.x)
      .y((point) => point.y);
    return line(points) ?? "";
  }, [feature]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <defs>
        <pattern id="next-race-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#next-race-grid)" />
      <path d={pathD} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathD} fill="none" stroke="#d4d4d8" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathD} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 8" />
    </svg>
  );
}

function Preview3D({ feature }: { feature: CircuitFeature }) {
  const points = useMemo(() => normalize3D(feature), [feature]);

  return (
    <Canvas camera={{ position: [0, 7, 9], fov: 45 }}>
      <color attach="background" args={["#09090b"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 8, 4]} intensity={1.2} />
      <gridHelper args={[14, 14, "#3f3f46", "#27272a"]} position={[0, -0.05, 0]} />
      <Line points={points} color="#e4e4e7" lineWidth={8} />
      <Line points={points} color="#ef4444" lineWidth={2} />
      <OrbitControls enableDamping dampingFactor={0.08} minDistance={5} maxDistance={18} />
    </Canvas>
  );
}

export function NextRaceTrackPreview({
  circuitName,
  countryName,
}: {
  circuitName: string;
  countryName: string;
}) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const { data: feature, isLoading } = useCircuitMap(circuitName, countryName);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-500">Circuit preview</div>
          <div className="truncate text-sm text-zinc-300">{feature?.properties.Name ?? circuitName}</div>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setMode("2d")}
            className={`px-3 py-1.5 ${mode === "2d" ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10"}`}
          >
            2D
          </button>
          <button
            type="button"
            onClick={() => setMode("3d")}
            className={`border-l border-white/10 px-3 py-1.5 ${mode === "3d" ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10"}`}
          >
            3D
          </button>
        </div>
      </div>
      <div className="h-64">
        {isLoading && <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading circuit…</div>}
        {!isLoading && !feature && <div className="flex h-full items-center justify-center text-sm text-zinc-500">No circuit preview available.</div>}
        {feature && (mode === "2d" ? <Preview2D feature={feature} /> : <Preview3D feature={feature} />)}
      </div>
    </div>
  );
}
