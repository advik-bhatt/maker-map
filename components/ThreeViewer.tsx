"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

export type Mesh3D = {
  type: "box" | "cylinder" | "sphere";
  x?: number; y?: number; z?: number;
  color?: string;
  w?: number; h?: number; d?: number;
  rt?: number; rb?: number;
  r?: number;
};

// ─── Physics constants ────────────────────────────────────────────────────────
const G = 9.8;
const FLOOR_Y = -3;
const RESTITUTION = 0.55;
const AIR_DAMPING = 0.993;
const PLA_DENSITY = 1.24; // g/cm³

// ─── Geometry helpers ─────────────────────────────────────────────────────────
function halfH(m: Mesh3D): number {
  if (m.type === "box") return (m.h ?? 1) / 2;
  if (m.type === "cylinder") return (m.h ?? 1) / 2;
  return m.r ?? 0.5;
}

function vol(m: Mesh3D): number {
  if (m.type === "box") return (m.w ?? 1) * (m.h ?? 1) * (m.d ?? 1);
  if (m.type === "cylinder") {
    const r = ((m.rt ?? 0.5) + (m.rb ?? 0.5)) / 2;
    return Math.PI * r * r * (m.h ?? 1);
  }
  const r = m.r ?? 0.5;
  return (4 / 3) * Math.PI * r * r * r;
}

function massOf(m: Mesh3D): number {
  return +(vol(m) * PLA_DENSITY).toFixed(1);
}

function makeGeo(m: Mesh3D): THREE.BufferGeometry {
  if (m.type === "box") return new THREE.BoxGeometry(m.w ?? 1, m.h ?? 1, m.d ?? 1);
  if (m.type === "cylinder") return new THREE.CylinderGeometry(m.rt ?? 0.5, m.rb ?? 0.5, m.h ?? 1, 32);
  return new THREE.SphereGeometry(m.r ?? 0.5, 32, 16);
}

// ─── Live physics snapshot (written every frame, read at 8 Hz) ────────────────
type LiveSnap = {
  index: number;
  height: number;
  speed: number;
  ke: number;
  pe: number;
  bounces: number;
  grounded: boolean;
};

// ─── Physics mesh component ───────────────────────────────────────────────────
function PhysicsMesh({
  m, index, active, selected, onSelect, onSnap,
}: {
  m: Mesh3D;
  index: number;
  active: boolean;
  selected: boolean;
  onSelect: (i: number) => void;
  onSnap: (s: LiveSnap) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pos = useRef(new THREE.Vector3(m.x ?? 0, m.y ?? 0, m.z ?? 0));
  const vel = useRef(new THREE.Vector3());
  const angVel = useRef(new THREE.Vector3());
  const grounded = useRef(false);
  const bounces = useRef(0);
  const geo = useRef(makeGeo(m));
  const hh = halfH(m);
  const partMass = massOf(m);
  const booted = useRef(false);

  useEffect(() => {
    if (active && !booted.current) {
      booted.current = true;
      vel.current.set(
        (Math.random() - 0.5) * 3,
        Math.random() * 2 + 0.5,
        (Math.random() - 0.5) * 3,
      );
      angVel.current.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
      );
      grounded.current = false;
    }
    if (!active) {
      booted.current = false;
      pos.current.set(m.x ?? 0, m.y ?? 0, m.z ?? 0);
      vel.current.set(0, 0, 0);
      angVel.current.set(0, 0, 0);
      grounded.current = false;
      bounces.current = 0;
      if (meshRef.current) {
        meshRef.current.position.copy(pos.current);
        meshRef.current.rotation.set(0, 0, 0);
      }
    }
  }, [active, m]);

  useFrame((_, dt) => {
    if (!meshRef.current || !active || grounded.current) return;

    vel.current.y -= G * dt;
    const drag = Math.pow(AIR_DAMPING, dt * 60);
    vel.current.multiplyScalar(drag);
    angVel.current.multiplyScalar(drag * 0.97);
    pos.current.addScaledVector(vel.current, dt);

    if (pos.current.y - hh < FLOOR_Y) {
      pos.current.y = FLOOR_Y + hh;
      if (Math.abs(vel.current.y) > 0.4) {
        vel.current.y *= -RESTITUTION;
        vel.current.x *= 0.78;
        vel.current.z *= 0.78;
        angVel.current.multiplyScalar(0.55);
        bounces.current++;
      } else {
        vel.current.set(vel.current.x * 0.5, 0, vel.current.z * 0.5);
        angVel.current.multiplyScalar(0.4);
        if (vel.current.length() < 0.04) {
          grounded.current = true;
          vel.current.set(0, 0, 0);
          angVel.current.set(0, 0, 0);
        }
      }
    }

    const WALL = 7;
    if (Math.abs(pos.current.x) > WALL) { vel.current.x *= -0.65; pos.current.x = Math.sign(pos.current.x) * WALL; }
    if (Math.abs(pos.current.z) > WALL) { vel.current.z *= -0.65; pos.current.z = Math.sign(pos.current.z) * WALL; }

    meshRef.current.position.copy(pos.current);
    meshRef.current.rotation.x += angVel.current.x * dt;
    meshRef.current.rotation.y += angVel.current.y * dt;
    meshRef.current.rotation.z += angVel.current.z * dt;

    const h = Math.max(0, pos.current.y - FLOOR_Y - hh);
    const spd = vel.current.length();
    onSnap({
      index, height: h, speed: spd,
      ke: 0.5 * partMass * spd * spd,
      pe: partMass * G * h,
      bounces: bounces.current,
      grounded: grounded.current,
    });
  });

  return (
    <mesh
      ref={meshRef}
      position={[pos.current.x, pos.current.y, pos.current.z]}
      geometry={geo.current}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (active) onSelect(index); }}
    >
      <meshStandardMaterial
        color={m.color ?? "#60a5fa"}
        roughness={selected ? 0.08 : 0.3}
        metalness={selected ? 0.6 : 0.1}
        emissive={selected ? new THREE.Color(m.color ?? "#60a5fa") : new THREE.Color(0)}
        emissiveIntensity={selected ? 0.35 : 0}
      />
    </mesh>
  );
}

// ─── Normal rotating view ─────────────────────────────────────────────────────
function RotatingGroup({ meshes }: { meshes: Mesh3D[] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.4; });
  return (
    <group ref={ref}>
      {meshes.map((m, i) => (
        <mesh key={i} position={[m.x ?? 0, m.y ?? 0, m.z ?? 0]} geometry={makeGeo(m)}>
          <meshStandardMaterial color={m.color ?? "#60a5fa"} roughness={0.3} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Physics education panel ──────────────────────────────────────────────────
type Concept = { title: string; body: string; formula: string };

function concept(snap: LiveSnap | null, selIdx: number | null, meshes: Mesh3D[]): Concept {
  const sel = selIdx !== null ? meshes[selIdx] : null;

  if (sel && selIdx !== null) {
    const m = massOf(sel);
    const v = vol(sel).toFixed(2);
    return {
      title: "Mass & Center of Mass",
      body: `This ${sel.type} has a volume of ${v} cm³. At PLA plastic density (ρ = 1.24 g/cm³), it weighs ≈ ${m}g. Its center of mass sits at the geometric centroid. Click again to launch it upward.`,
      formula: `m = ρV = 1.24 × ${v} = ${m} g`,
    };
  }

  if (!snap || snap.grounded) {
    return {
      title: "Newton's First Law",
      body: `An object at rest stays at rest unless acted on by a net external force. All ${meshes.length} parts are in static equilibrium — gravity (↓) is perfectly balanced by the floor's normal force (↑).`,
      formula: "ΣF = 0  →  F_gravity + F_normal = 0",
    };
  }

  if (snap.bounces >= 2) {
    const pct = Math.round(RESTITUTION * 100);
    return {
      title: "Coefficient of Restitution",
      body: `e = ${RESTITUTION} — this material conserves ${pct}% of vertical speed on each impact, losing ${100 - pct}% to heat and deformation. After ${snap.bounces} bounces, the part has lost most of its initial energy.`,
      formula: `e = v_after / v_before = ${RESTITUTION}  (PLA vs hard floor)`,
    };
  }

  if (snap.height > 0.3 || snap.speed > 0.5) {
    const total = (snap.ke + snap.pe).toFixed(1);
    return {
      title: "Conservation of Energy",
      body: `As the part falls, gravitational PE converts to KE. Total mechanical energy ≈ ${total} J. At the floor all PE becomes KE, then energy is lost to the inelastic collision.`,
      formula: `PE = ${snap.pe.toFixed(1)} J  |  KE = ${snap.ke.toFixed(1)} J  |  E_total = ${total} J`,
    };
  }

  return {
    title: "Gravity & Free Fall",
    body: `g = 9.8 m/s² acts on all parts equally, regardless of mass — Galileo proved this in 1589 by dropping two spheres of different weights from the Leaning Tower of Pisa. Every part accelerates identically.`,
    formula: `F = mg  |  a = g = 9.8 m/s²  (mass cancels out)`,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ThreeViewer({ meshes }: { meshes: Mesh3D[] }) {
  const [physicsMode, setPhysicsMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [displaySnap, setDisplaySnap] = useState<LiveSnap | null>(null);
  const snapRef = useRef<LiveSnap | null>(null);

  // Throttled panel update at 8 Hz
  useEffect(() => {
    if (!physicsMode) { setDisplaySnap(null); return; }
    const id = setInterval(() => setDisplaySnap(snapRef.current), 125);
    return () => clearInterval(id);
  }, [physicsMode]);

  const handleSnap = useCallback((s: LiveSnap) => {
    if (!snapRef.current || s.speed > (snapRef.current?.speed ?? 0) || s.index === snapRef.current?.index) {
      snapRef.current = s;
    }
  }, []);

  const handleSelect = useCallback((i: number) => {
    setSelectedIndex((prev) => (prev === i ? null : i));
  }, []);

  function togglePhysics() {
    setPhysicsMode((p) => !p);
    setSelectedIndex(null);
    snapRef.current = null;
  }

  if (meshes.length === 0) {
    return (
      <div className="w-full h-full rounded-xl bg-[#0d1117] flex items-center justify-center text-gray-600 text-sm">
        3D preview will appear here
      </div>
    );
  }

  const c = concept(displaySnap, selectedIndex, meshes);

  return (
    <div className="w-full h-full flex flex-col gap-3">
      <div className="relative flex-1 rounded-xl overflow-hidden bg-[#0d1117] min-h-0">
        <Canvas camera={{ position: [5, 4, 5], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#6366f1" />

          {physicsMode ? (
            <>
              {meshes.map((m, i) => (
                <PhysicsMesh
                  key={i}
                  m={m}
                  index={i}
                  active={physicsMode}
                  selected={selectedIndex === i}
                  onSelect={handleSelect}
                  onSnap={handleSnap}
                />
              ))}
              <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#111827" transparent opacity={0.7} />
              </mesh>
            </>
          ) : (
            <RotatingGroup meshes={meshes} />
          )}

          <OrbitControls enablePan={false} minDistance={3} maxDistance={15} />
          <Environment preset="city" />
          <gridHelper args={[20, 20, "#1f2937", "#0f172a"]} position={[0, FLOOR_Y, 0]} />
        </Canvas>

        <button
          onClick={togglePhysics}
          className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            physicsMode
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
              : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
          }`}
        >
          {physicsMode ? "⚛ Physics ON" : "⚛ Physics sim"}
        </button>

        {physicsMode && (
          <p className="absolute bottom-3 left-3 text-[11px] text-gray-600 pointer-events-none">
            {selectedIndex !== null ? "Click again to launch ↑" : "Click a part to inspect it"}
          </p>
        )}
      </div>

      {physicsMode && (
        <div className="rounded-xl bg-[#0d1117] border border-white/5 p-4 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-400 font-semibold text-xs uppercase tracking-widest">{c.title}</span>
            {selectedIndex !== null && (
              <span className="ml-auto text-gray-600 text-[11px]">
                Part {selectedIndex + 1} · {meshes[selectedIndex]?.type} · {massOf(meshes[selectedIndex])}g
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs leading-relaxed mb-2">{c.body}</p>
          <code className="block text-xs text-teal-400 bg-black/30 rounded px-3 py-1.5 font-mono">{c.formula}</code>
          {displaySnap && !displaySnap.grounded && (
            <div className="flex gap-4 mt-2.5 text-[11px] text-gray-600 font-mono">
              <span>v = {displaySnap.speed.toFixed(2)} m/s</span>
              <span>h = {displaySnap.height.toFixed(2)} m</span>
              <span>KE = {displaySnap.ke.toFixed(1)} J</span>
              <span>PE = {displaySnap.pe.toFixed(1)} J</span>
              {displaySnap.bounces > 0 && <span>bounces = {displaySnap.bounces}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
