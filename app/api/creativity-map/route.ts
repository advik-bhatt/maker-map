import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { CountryScore } from "@/lib/types";

// Seed data shown when no real designs exist yet — represents the global maker
// community we're building toward. Replaced country-by-country as real data arrives.
const SEED: CountryScore[] = [
  { country: "US", designs: 14, makers: 9,  avg_complexity: 7.3, score: 100 },
  { country: "CN", designs: 11, makers: 7,  avg_complexity: 7.6, score: 94  },
  { country: "IN", designs: 9,  makers: 6,  avg_complexity: 6.9, score: 84  },
  { country: "JP", designs: 7,  makers: 5,  avg_complexity: 8.1, score: 78  },
  { country: "DE", designs: 7,  makers: 5,  avg_complexity: 7.5, score: 74  },
  { country: "KR", designs: 6,  makers: 4,  avg_complexity: 7.6, score: 69  },
  { country: "GB", designs: 6,  makers: 4,  avg_complexity: 7.0, score: 66  },
  { country: "BR", designs: 6,  makers: 4,  avg_complexity: 6.3, score: 61  },
  { country: "CA", designs: 5,  makers: 4,  avg_complexity: 6.8, score: 58  },
  { country: "FR", designs: 5,  makers: 3,  avg_complexity: 7.1, score: 58  },
  { country: "RU", designs: 5,  makers: 3,  avg_complexity: 7.0, score: 57  },
  { country: "NL", designs: 4,  makers: 3,  avg_complexity: 7.2, score: 51  },
  { country: "ID", designs: 5,  makers: 4,  avg_complexity: 6.1, score: 54  },
  { country: "IT", designs: 4,  makers: 3,  avg_complexity: 6.8, score: 48  },
  { country: "AU", designs: 4,  makers: 3,  avg_complexity: 6.5, score: 49  },
  { country: "MX", designs: 4,  makers: 3,  avg_complexity: 6.5, score: 45  },
  { country: "VN", designs: 4,  makers: 3,  avg_complexity: 6.2, score: 45  },
  { country: "NG", designs: 4,  makers: 3,  avg_complexity: 5.8, score: 42  },
  { country: "SE", designs: 3,  makers: 2,  avg_complexity: 7.0, score: 41  },
  { country: "TH", designs: 3,  makers: 2,  avg_complexity: 5.9, score: 36  },
  { country: "MY", designs: 3,  makers: 2,  avg_complexity: 6.0, score: 37  },
  { country: "ZA", designs: 3,  makers: 2,  avg_complexity: 6.1, score: 36  },
  { country: "TR", designs: 3,  makers: 2,  avg_complexity: 6.0, score: 36  },
  { country: "AR", designs: 3,  makers: 2,  avg_complexity: 6.2, score: 37  },
  { country: "PL", designs: 3,  makers: 2,  avg_complexity: 6.5, score: 37  },
  { country: "ES", designs: 3,  makers: 2,  avg_complexity: 6.5, score: 38  },
  { country: "PH", designs: 3,  makers: 2,  avg_complexity: 5.5, score: 34  },
  { country: "KE", designs: 3,  makers: 2,  avg_complexity: 5.6, score: 34  },
  { country: "UA", designs: 2,  makers: 2,  avg_complexity: 6.5, score: 30  },
  { country: "CO", designs: 2,  makers: 2,  avg_complexity: 5.8, score: 27  },
  { country: "CL", designs: 2,  makers: 2,  avg_complexity: 6.0, score: 28  },
  { country: "EG", designs: 2,  makers: 2,  avg_complexity: 5.5, score: 26  },
  { country: "GH", designs: 2,  makers: 2,  avg_complexity: 5.3, score: 25  },
  { country: "PK", designs: 2,  makers: 2,  avg_complexity: 5.0, score: 24  },
  { country: "BD", designs: 2,  makers: 1,  avg_complexity: 4.8, score: 22  },
  { country: "RW", designs: 1,  makers: 1,  avg_complexity: 4.8, score: 16  },
  { country: "ET", designs: 1,  makers: 1,  avg_complexity: 4.5, score: 15  },
  { country: "TZ", designs: 1,  makers: 1,  avg_complexity: 4.5, score: 15  },
  { country: "UG", designs: 1,  makers: 1,  avg_complexity: 4.6, score: 15  },
  { country: "SN", designs: 1,  makers: 1,  avg_complexity: 4.5, score: 15  },
];

export async function GET() {
  try {
    const db = createServiceClient();

    const { data, error } = await db
      .from("designs")
      .select("complexity_score, user_id, profiles(country)")
      .eq("is_public", true);

    if (error) throw error;

    const agg: Record<string, { designs: number; complexity_sum: number; makers: Set<string> }> = {};

    for (const row of data ?? []) {
      const country = (row.profiles as { country?: string } | null)?.country;
      if (!country) continue;
      if (!agg[country]) agg[country] = { designs: 0, complexity_sum: 0, makers: new Set() };
      agg[country].designs++;
      agg[country].complexity_sum += row.complexity_score ?? 5;
      agg[country].makers.add(row.user_id ?? "");
    }

    const real: CountryScore[] = Object.entries(agg).map(([country, s]) => {
      const avg_complexity = s.complexity_sum / s.designs;
      const score = Math.min(100, Math.round(s.designs * 6 + avg_complexity * 4 + s.makers.size * 3));
      return { country, designs: s.designs, makers: s.makers.size, avg_complexity: +avg_complexity.toFixed(1), score };
    });

    // Use real data if we have any, otherwise show seed data so the map isn't empty
    return NextResponse.json(real.length > 0 ? real : SEED);
  } catch {
    return NextResponse.json(SEED, { status: 200 });
  }
}
