import React, { useState, useMemo, Suspense, Component, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import FallbackWingMap from "./FallbackWingMap.jsx";
import { Layers, Box } from "lucide-react";

// Error Boundary for WebGL/Canvas failure
class ThreeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("[ThreeJS] WebGL error caught — falling back to 2D isometric map:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackWingMap {...this.props} />;
    }
    return this.props.children;
  }
}

const DEFAULT_FLATS = [
  { id: 1, wing: "A", number: "A-101", floor: 1, bhk: "2BHK", status: "PAID", owner: "Rajesh Kulkarni", amount: "₹7,590", position: [-2.2, 0.6, 0.8] },
  { id: 5, wing: "A", number: "A-105", floor: 1, bhk: "2BHK", status: "PENDING", owner: "Vikram Singh", amount: "₹6,958", position: [-2.2, 0.6, -0.8] },
  { id: 2, wing: "A", number: "A-204", floor: 2, bhk: "3BHK", status: "PAID", owner: "Priya Deshmukh", amount: "₹9,488", position: [-2.2, 1.8, 0.8] },
  { id: 6, wing: "A", number: "A-210", floor: 2, bhk: "3BHK", status: "PENDING", owner: "Anita Rao", amount: "₹11,000", position: [-2.2, 1.8, -0.8] },
  { id: 9, wing: "A", number: "A-301", floor: 3, bhk: "2BHK", status: "PAID", owner: "Sneha Nair", amount: "₹7,200", position: [-2.2, 3.0, 0] },

  { id: 3, wing: "B", number: "B-101", floor: 1, bhk: "1BHK", status: "OVERDUE", owner: "Amitabh Joshi", amount: "₹5,805", position: [2.2, 0.6, 0.8] },
  { id: 7, wing: "B", number: "B-105", floor: 1, bhk: "1BHK", status: "PAID", owner: "Pooja Verma", amount: "₹6,050", position: [2.2, 0.6, -0.8] },
  { id: 4, wing: "B", number: "B-201", floor: 2, bhk: "2BHK", status: "OVERDUE", owner: "Sneha Nair", amount: "₹8,387", position: [2.2, 1.8, 0.8] },
  { id: 8, wing: "B", number: "B-205", floor: 2, bhk: "2BHK", status: "PAID", owner: "Karan Mehta", amount: "₹8,850", position: [2.2, 1.8, -0.8] },
  { id: 10, wing: "B", number: "B-301", floor: 3, bhk: "3BHK", status: "PAID", owner: "Vivek Roy", amount: "₹9,200", position: [2.2, 3.0, 0] },
];

function FlatUnit({ flat, isSelected, onSelect, onHover, isHovered }) {
  const meshRef = useRef();

  let baseColor = "#F59E0B"; // Pending
  if (flat.status === "PAID") baseColor = "#14B8A6";
  if (flat.status === "OVERDUE") baseColor = "#E11D48";
  if (flat.occupancy_type === "VACANT") baseColor = "#64748B"; // Vacant unit slate

  useFrame(() => {
    if (meshRef.current && (isHovered || isSelected)) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={flat.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(flat);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(flat);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
      >
        <boxGeometry args={[1.5, 0.85, 1.2]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isHovered || isSelected ? 0.6 : 0.15}
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={isHovered || isSelected ? 0.95 : 0.75}
        />
      </mesh>
      <Text
        position={[0, 0, 0.65]}
        fontSize={0.22}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
      >
        {flat.number}
      </Text>
    </group>
  );
}

function SocietyScene({ flats, wingsList, selectedFlat, onSelectFlat, hoveredFlat, setHoveredFlat }) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <pointLight position={[-10, -5, -10]} intensity={0.5} />

      {/* Ground Podium & Common Area */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <boxGeometry args={[12, 0.2, 7]} />
        <meshStandardMaterial color="var(--3d-ground)" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Central Clubhouse & Green */}
      <group position={[0, 0.3, 0]}>
        <mesh>
          <boxGeometry args={[1.8, 0.6, 2.2]} />
          <meshStandardMaterial
            color="var(--3d-granite)"
            emissive="#14B8A6"
            emissiveIntensity={0.2}
            transparent
            opacity={0.6}
            roughness={0.1}
          />
        </mesh>
        <Text position={[0, 0.5, 0]} fontSize={0.2} color="#F59E0B" anchorX="center">
          Clubhouse & Green
        </Text>
      </group>

      {/* Tower Labels for each detected wing */}
      {wingsList.map((w, idx) => {
        const xBase =
          idx === 0
            ? -2.4
            : idx === 1
            ? 2.4
            : (idx % 2 === 0 ? -1 : 1) * (2.4 + Math.floor(idx / 2) * 2.8);
        const col = idx % 2 === 0 ? "#F59E0B" : "#14B8A6";

        return (
          <Text key={w} position={[xBase, 4.2, 0]} fontSize={0.35} color={col} anchorX="center">
            {`WING ${w}`}
          </Text>
        );
      })}

      {/* Dynamic Flats */}
      {flats.map((flat) => (
        <FlatUnit
          key={flat.id}
          flat={flat}
          isSelected={selectedFlat?.id === flat.id}
          isHovered={hoveredFlat?.id === flat.id}
          onSelect={onSelectFlat}
          onHover={setHoveredFlat}
        />
      ))}

      <OrbitControls
        enableZoom={true}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={18}
        autoRotate={!hoveredFlat}
        autoRotateSpeed={0.8}
      />
    </>
  );
}

export function SocietyTower3D({ flats = DEFAULT_FLATS, onSelectFlat, selectedFlat }) {
  const [use2D, setUse2D] = useState(false);
  const [hoveredFlat, setHoveredFlat] = useState(null);

  // Dynamically assign 3D coordinates based on wing and floor
  const { formattedFlats, wingsList } = useMemo(() => {
    const rawList = flats && flats.length > 0 ? flats : DEFAULT_FLATS;
    const wings = Array.from(new Set(rawList.map((f) => f.wing || "A"))).sort();

    const formatted = rawList.map((f, idx) => {
      const wingCode = f.wing || "A";
      const wingIdx = Math.max(0, wings.indexOf(wingCode));
      const floorNum = Number(f.floor) || 1;

      const xBase =
        wingIdx === 0
          ? -2.4
          : wingIdx === 1
          ? 2.4
          : (wingIdx % 2 === 0 ? -1 : 1) * (2.4 + Math.floor(wingIdx / 2) * 2.8);
      const yPos = 0.6 + (floorNum - 1) * 1.1;
      const zPos = idx % 2 === 0 ? 0.8 : -0.8;

      const amountStr =
        f.unpaid_amount !== undefined && Number(f.unpaid_amount) > 0
          ? `₹${Number(f.unpaid_amount).toLocaleString("en-IN")}`
          : f.latest_bill_amount !== undefined && Number(f.latest_bill_amount) > 0
          ? `₹${Number(f.latest_bill_amount).toLocaleString("en-IN")}`
          : f.amount ||
            (f.area_sqft ? `₹${(Number(f.area_sqft) * 5.5).toLocaleString("en-IN")}` : "₹7,500");

      const ownerStr =
        f.resident_name ||
        f.owner ||
        (f.occupancy_type === "VACANT" ? "Vacant Unit" : `Resident (${f.number})`);

      const statusVal =
        f.bill_status || f.status || (f.occupancy_type === "VACANT" ? "VACANT" : "PAID");

      return {
        ...f,
        wing: wingCode,
        position: f.position || [xBase, yPos, zPos],
        owner: ownerStr,
        resident_name: f.resident_name || ownerStr,
        amount: amountStr,
        numericAmount: Number(f.unpaid_amount || f.latest_bill_amount || 7590),
        status: statusVal,
      };
    });

    return { formattedFlats: formatted, wingsList: wings };
  }, [flats]);

  if (use2D) {
    return (
      <div className="relative w-full h-[450px]">
        <button
          onClick={() => setUse2D(false)}
          className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-xl bg-[#F59E0B] text-[#0B0F17] font-semibold text-xs flex items-center gap-1.5 shadow-lg transition"
        >
          <Box className="w-3.5 h-3.5" />
          Switch to 3D Twin
        </button>
        <div className="w-full h-full rounded-3xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden transition-colors duration-200">
          <FallbackWingMap
            flats={formattedFlats}
            onSelectFlat={onSelectFlat}
            selectedFlat={selectedFlat}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[450px] bg-[var(--bg-sidebar)] rounded-3xl border border-[var(--border-subtle)] overflow-hidden shadow-2xl transition-colors duration-200">
      {/* Top Bar Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-[var(--bg-card)]/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[var(--border-glass)] pointer-events-auto shadow-sm">
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            3D Society Digital Twin
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            {formattedFlats.length} units across {wingsList.length} wing(s) · Rotate & click
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setUse2D(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)]/90 hover:bg-[var(--bg-card)] border border-[var(--border-glass)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            2D Isometric
          </button>
        </div>
      </div>

      {/* Hover Information Pill */}
      {hoveredFlat && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 bg-[var(--bg-card)]/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-[var(--border-glass)] text-center shadow-xl pointer-events-none">
          <div className="text-xs font-bold text-slate-900 dark:text-white">
            Flat {hoveredFlat.number} • {hoveredFlat.owner}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            {hoveredFlat.bhk} • {hoveredFlat.status} • {hoveredFlat.amount}
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <ThreeErrorBoundary
        flats={formattedFlats}
        onSelectFlat={onSelectFlat}
        selectedFlat={selectedFlat}
      >
        <Suspense
          fallback={
            <FallbackWingMap
              flats={formattedFlats}
              onSelectFlat={onSelectFlat}
              selectedFlat={selectedFlat}
            />
          }
        >
          <Canvas camera={{ position: [0, 5, 10], fov: 45 }}>
            <SocietyScene
              flats={formattedFlats}
              wingsList={wingsList}
              selectedFlat={selectedFlat}
              onSelectFlat={onSelectFlat}
              hoveredFlat={hoveredFlat}
              setHoveredFlat={setHoveredFlat}
            />
          </Canvas>
        </Suspense>
      </ThreeErrorBoundary>

      {/* Legend Footer */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-[var(--bg-card)]/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[var(--border-glass)] pointer-events-none shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6]" /> Paid
          </span>
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Pending
          </span>
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#E11D48]" /> Overdue
          </span>
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#64748B]" /> Vacant
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          Drag to rotate • Scroll to zoom
        </span>
      </div>
    </div>
  );
}

export default SocietyTower3D;
