import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Demo designs shown when the gallery has no real content yet
const DEMO_DESIGNS = [
  {
    id: "demo-1",
    title: "Solar Panel Mounting Bracket",
    prompt: "A sturdy bracket to mount a small solar panel at 30 degrees on a flat roof",
    explanation: "A parametric mounting bracket with a 30° tilt optimised for solar energy collection near the equator. Features four bolt holes for easy installation and reinforced gussets for structural rigidity under wind load.",
    complexity_score: 7,
    preview_json: {
      meshes: [
        { type: "box",      w: 4,    h: 0.25, d: 3,    x: 0,    y: -0.5, z: 0,    color: "#60a5fa" },
        { type: "box",      w: 0.25, h: 2,    d: 0.4,  x: -1.6, y: 0.6,  z: -1.1, color: "#60a5fa" },
        { type: "box",      w: 0.25, h: 2,    d: 0.4,  x:  1.6, y: 0.6,  z: -1.1, color: "#60a5fa" },
        { type: "box",      w: 4,    h: 0.2,  d: 0.25, x: 0,    y: 1.6,  z: -1.1, color: "#38bdf8" },
      ],
    },
    created_at: "2026-06-27T10:00:00Z",
    profiles: { username: "maker_lagos",    country: "NG" },
  },
  {
    id: "demo-2",
    title: "Prosthetic Finger Grip",
    prompt: "A prosthetic grip piece for a child's hand, lightweight and durable for everyday use",
    explanation: "An ergonomic prosthetic finger attachment designed for children aged 6–12. The hollow tapered cylinder minimises weight while maintaining strength, and the domed tip provides a natural grip surface for holding objects.",
    complexity_score: 8,
    preview_json: {
      meshes: [
        { type: "cylinder", rt: 0.45, rb: 0.6,  h: 2.5, x: 0, y: 0,    z: 0, color: "#a78bfa" },
        { type: "sphere",   r: 0.45,             x: 0,   y: 1.45, z: 0, color: "#a78bfa" },
        { type: "cylinder", rt: 0.18, rb: 0.22,  h: 0.7, x: 0, y: -1.6, z: 0, color: "#c4b5fd" },
      ],
    },
    created_at: "2026-06-27T09:30:00Z",
    profiles: { username: "engineer_nairobi", country: "KE" },
  },
  {
    id: "demo-3",
    title: "4-Cable Desk Organiser Clip",
    prompt: "A cable organiser clip that holds 4 wires and clips onto a desk edge up to 20mm thick",
    explanation: "A compact desk-edge cable organiser with four parallel wire channels. Snaps onto desk edges up to 20 mm thick and keeps USB, power, audio, and ethernet cables separated and labelled.",
    complexity_score: 5,
    preview_json: {
      meshes: [
        { type: "box",      w: 3.2, h: 1,    d: 0.7,  x: 0,    y: 0.5,  z: 0,   color: "#34d399" },
        { type: "cylinder", rt: 0.22, rb: 0.22, h: 1, x: -1.0, y: 0.5,  z: 0,   color: "#6ee7b7" },
        { type: "cylinder", rt: 0.22, rb: 0.22, h: 1, x: -0.34,y: 0.5,  z: 0,   color: "#6ee7b7" },
        { type: "cylinder", rt: 0.22, rb: 0.22, h: 1, x:  0.34,y: 0.5,  z: 0,   color: "#6ee7b7" },
        { type: "cylinder", rt: 0.22, rb: 0.22, h: 1, x:  1.0, y: 0.5,  z: 0,   color: "#6ee7b7" },
        { type: "box",      w: 3.2, h: 0.35, d: 1.4,  x: 0,    y: -0.2, z: 0.6, color: "#34d399" },
      ],
    },
    created_at: "2026-06-27T09:00:00Z",
    profiles: { username: "student_accra",   country: "GH" },
  },
  {
    id: "demo-4",
    title: "Adjustable Phone Stand",
    prompt: "A minimalist phone stand that holds a phone at 60 to 80 degree viewing angles with a cable slot",
    explanation: "A minimalist phone stand with a multi-angle slot system supporting 60–80° viewing angles. The wide base prevents tipping and a rear slot allows charging cables to route cleanly underneath.",
    complexity_score: 4,
    preview_json: {
      meshes: [
        { type: "box", w: 3.8, h: 0.3,  d: 3.2, x: 0, y: -0.9, z: 0,    color: "#38bdf8" },
        { type: "box", w: 3.5, h: 2.6,  d: 0.3, x: 0, y: 0.4,  z: -1.3, color: "#38bdf8" },
        { type: "box", w: 3.5, h: 0.25, d: 0.9, x: 0, y: -0.6, z: -0.9, color: "#7dd3fc" },
      ],
    },
    created_at: "2026-06-27T08:30:00Z",
    profiles: { username: "maker_mumbai",    country: "IN" },
  },
  {
    id: "demo-5",
    title: "Water Filter Housing Cap",
    prompt: "A replacement cap for a ceramic water filter candle used in rural water purification systems",
    explanation: "A replacement sealing cap for 50 mm diameter ceramic water filter candles. The stepped inner bore creates a watertight press fit without glue, making it field-replaceable with no tools.",
    complexity_score: 6,
    preview_json: {
      meshes: [
        { type: "cylinder", rt: 1.2,  rb: 1.2,  h: 0.5,  x: 0, y:  0.8,  z: 0, color: "#f0abfc" },
        { type: "cylinder", rt: 0.85, rb: 0.85, h: 1.2,  x: 0, y:  0,    z: 0, color: "#e879f9" },
        { type: "cylinder", rt: 0.7,  rb: 0.7,  h: 0.6,  x: 0, y: -0.9,  z: 0, color: "#d946ef" },
      ],
    },
    created_at: "2026-06-27T08:00:00Z",
    profiles: { username: "engineer_kigali", country: "RW" },
  },
  {
    id: "demo-6",
    title: "Seedling Tray Insert",
    prompt: "A modular seedling tray insert with 9 cells that fits inside a standard 30x20cm tray",
    explanation: "A 3×3 modular seedling insert that fits standard 30×20 cm greenhouse trays. Each 60 mm hexagonal cell has a drainage hole and tapered walls so seedlings release cleanly at transplant time.",
    complexity_score: 5,
    preview_json: {
      meshes: [
        { type: "box",      w: 4.2, h: 0.2, d: 3,    x: 0,    y: -0.9, z: 0,    color: "#4ade80" },
        { type: "cylinder", rt: 0.55, rb: 0.45, h: 1.6, x: -1.3, y: 0,   z: -0.8, color: "#86efac" },
        { type: "cylinder", rt: 0.55, rb: 0.45, h: 1.6, x:  0,   y: 0,   z: -0.8, color: "#86efac" },
        { type: "cylinder", rt: 0.55, rb: 0.45, h: 1.6, x:  1.3, y: 0,   z: -0.8, color: "#86efac" },
        { type: "cylinder", rt: 0.55, rb: 0.45, h: 1.6, x: -1.3, y: 0,   z:  0.8, color: "#86efac" },
        { type: "cylinder", rt: 0.55, rb: 0.45, h: 1.6, x:  0,   y: 0,   z:  0.8, color: "#86efac" },
        { type: "cylinder", rt: 0.55, rb: 0.45, h: 1.6, x:  1.3, y: 0,   z:  0.8, color: "#86efac" },
      ],
    },
    created_at: "2026-06-27T07:30:00Z",
    profiles: { username: "agrimaker_tz",    country: "TZ" },
  },
];

export async function GET(req: NextRequest) {
  try {
    const db = createServiceClient();
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");

    let query = db
      .from("designs")
      .select("id, prompt, title, explanation, complexity_score, preview_json, created_at, profiles(username, country)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(60);

    const { data, error } = await query;
    if (error) throw error;

    const filtered = country
      ? (data ?? []).filter((d) => (d.profiles as { country?: string } | null)?.country === country)
      : data;

    // Show demo designs when the gallery is empty
    const results = (filtered ?? []).length > 0 ? filtered : (country ? [] : DEMO_DESIGNS);

    return NextResponse.json(results ?? []);
  } catch {
    return NextResponse.json(DEMO_DESIGNS);
  }
}
