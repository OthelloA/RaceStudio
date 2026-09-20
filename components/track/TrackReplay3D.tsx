"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Billboard, Line, OrbitControls, Text } from "@react-three/drei";
import type { Driver, LocationFrame } from "@/lib/domain/types";
import { getDriverColor } from "@/lib/domain/driverColors";
import { usePlaybackStore } from "@/stores/playbackStore";
import { sampleSeries } from "@/lib/time/sessionClock";

interface CarLayerEntry {
  driver: Driver;
  series: LocationFrame[];
}

type Point3 = [number, number, number];

interface Normalizer {
  toPoint: (frame: Pick<LocationFrame, "x" | "y" | "z">) => Point3;
}

function perpendicularDistance(point: Point3, start: Point3, end: Point3): number {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq === 0) return Math.hypot(point[0] - start[0], point[2] - start[2]);

  const t = Math.max(
    0,
    Math.min(1, ((point[0] - start[0]) * dx + (point[2] - start[2]) * dz) / lengthSq)
  );
  const projectedX = start[0] + t * dx;
  const projectedZ = start[2] + t * dz;
  return Math.hypot(point[0] - projectedX, point[2] - projectedZ);
}

function simplifyTrackPoints(points: Point3[], tolerance = 0.01): Point3[] {
  if (points.length <= 3) return points;

  let maxDistance = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance <= tolerance) return [first, last];

  const left = simplifyTrackPoints(points.slice(0, maxIndex + 1), tolerance);
  const right = simplifyTrackPoints(points.slice(maxIndex), tolerance);
  return [...left.slice(0, -1), ...right];
}

function smoothTrackPoints(points: Point3[], radius = 4): Point3[] {
  if (points.length <= radius * 2 + 1) return points;

  return points.map((point, index) => {
    let count = 0;
    const sum: Point3 = [0, 0, 0];

    for (let offset = -radius; offset <= radius; offset++) {
      const sample = points[Math.min(Math.max(index + offset, 0), points.length - 1)];
      sum[0] += sample[0];
      sum[1] += sample[1];
      sum[2] += sample[2];
      count++;
    }

    // Keep the endpoints anchored so the lap does not visibly shrink/open.
    if (index === 0 || index === points.length - 1) return point;
    return [sum[0] / count, sum[1] / count, sum[2] / count];
  });
}

function capPointCount(points: Point3[], maxPoints = 900): Point3[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, index) => points[Math.round(index * step)]);
}

function buildNormalizer(points: LocationFrame[]): Normalizer {
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const minZ = Math.min(...points.map((p) => p.z));
  const maxZ = Math.max(...points.map((p) => p.z));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const horizontalScale = 12 / Math.max(maxX - minX || 1, maxY - minY || 1);
  const verticalScale = 2 / Math.max(maxZ - minZ || 1, 1);

  return {
    toPoint: (frame) => [
      (frame.x - centerX) * horizontalScale,
      (frame.z - centerZ) * verticalScale,
      (frame.y - centerY) * horizontalScale,
    ],
  };
}

function Cars({
  entries,
  normalizer,
}: {
  entries: CarLayerEntry[];
  normalizer: Normalizer;
}) {
  const currentTimeMs = usePlaybackStore((s) => s.currentTimeMs);
  const activeDriverNumbers = usePlaybackStore((s) => s.activeDriverNumbers);

  return (
    <>
      {entries.map(({ driver, series }) => {
        const frame = sampleSeries(series, currentTimeMs, {
          fields: ["x", "y", "z"],
        });
        if (!frame) return null;
        const isActive = activeDriverNumbers.includes(driver.number);
        const [x, y, z] = normalizer.toPoint(frame);

        const color = getDriverColor(driver);

        return (
          <group key={driver.number} position={[x, y + 0.08, z]}>
            {isActive && (
              <Line
                points={[
                  [0, 0, 0],
                  [0, 0.8, 0],
                ]}
                color={color}
                lineWidth={2}
              />
            )}
            <mesh>
              <sphereGeometry args={[isActive ? 0.15 : 0.075, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isActive ? 0.35 : 0.08}
                transparent
                opacity={isActive ? 1 : 0.35}
              />
            </mesh>
            {isActive && (
              <Billboard position={[0, 1.0, 0]}>
                <Text
                  fontSize={0.28}
                  color="white"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.025}
                  outlineColor="black"
                >
                  {driver.nameAcronym}
                </Text>
              </Billboard>
            )}
          </group>
        );
      })}
    </>
  );
}

export function TrackReplay3D({
  outlinePoints,
  entries,
}: {
  outlinePoints: LocationFrame[];
  entries: CarLayerEntry[];
}) {
  const normalizer = useMemo(() => buildNormalizer(outlinePoints), [outlinePoints]);
  const trackPoints = useMemo(() => {
    const normalized = outlinePoints.map((point) => normalizer.toPoint(point));
    const smoothed = smoothTrackPoints(normalized);
    const lightlySimplified = simplifyTrackPoints(smoothed);
    return capPointCount(lightlySimplified);
  }, [outlinePoints, normalizer]);

  return (
    <div className="absolute inset-0 bg-zinc-950">
      <Canvas camera={{ position: [0, 8, 10], fov: 45 }}>
        <color attach="background" args={["#09090b"]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 8, 6]} intensity={1.2} />
        <gridHelper args={[16, 16, "#3f3f46", "#27272a"]} position={[0, -0.08, 0]} />
        <Line
          points={trackPoints}
          color="#e4e4e7"
          lineWidth={8}
          transparent
          opacity={0.95}
        />
        <Line
          points={trackPoints}
          color="#71717a"
          lineWidth={2}
          transparent
          opacity={0.9}
        />
        <Cars entries={entries} normalizer={normalizer} />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={22}
          target={[0, 0, 0]}
        />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-zinc-900/70 px-2 py-1 text-[10px] text-white">
        3D prototype · drag to orbit · wheel to zoom
      </div>
    </div>
  );
}
