"use client";
import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import type { CountryScore } from "@/lib/types";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO 3166-1 numeric → alpha-2 mapping (major countries)
const NUM_TO_A2: Record<string, string> = {
  "4":"AF","8":"AL","12":"DZ","24":"AO","32":"AR","36":"AU","40":"AT","50":"BD","56":"BE",
  "64":"BT","68":"BO","76":"BR","100":"BG","104":"MM","116":"KH","120":"CM","124":"CA",
  "144":"LK","152":"CL","156":"CN","170":"CO","180":"CD","188":"CR","191":"HR","196":"CY",
  "203":"CZ","208":"DK","214":"DO","218":"EC","231":"ET","246":"FI","250":"FR","268":"GE",
  "276":"DE","288":"GH","300":"GR","320":"GT","324":"GN","332":"HT","340":"HN","348":"HU",
  "356":"IN","360":"ID","364":"IR","368":"IQ","372":"IE","376":"IL","380":"IT","388":"JM",
  "392":"JP","400":"JO","404":"KE","408":"KP","410":"KR","414":"KW","418":"LA","422":"LB",
  "428":"LV","430":"LR","434":"LY","440":"LT","458":"MY","470":"MT","484":"MX","496":"MN",
  "499":"ME","504":"MA","508":"MZ","516":"NA","524":"NP","528":"NL","566":"NG","578":"NO",
  "586":"PK","591":"PA","600":"PY","604":"PE","608":"PH","616":"PL","620":"PT","630":"PR",
  "634":"QA","642":"RO","643":"RU","682":"SA","686":"SN","688":"RS","694":"SL","703":"SK",
  "704":"VN","705":"SI","706":"SO","710":"ZA","716":"ZW","724":"ES","729":"SD","752":"SE",
  "756":"CH","760":"SY","764":"TH","784":"AE","788":"TN","792":"TR","800":"UG","804":"UA",
  "807":"MK","818":"EG","826":"GB","840":"US","858":"UY","860":"UZ","862":"VE","887":"YE",
  "894":"ZM",
};

function scoreToColor(score: number | undefined): string {
  if (!score) return "#1e293b";
  if (score < 20) return "#7f1d1d";
  if (score < 40) return "#991b1b";
  if (score < 55) return "#c2410c";
  if (score < 70) return "#b45309";
  if (score < 85) return "#4d7c0f";
  return "#15803d";
}

type Tooltip = { x: number; y: number; data: CountryScore } | null;

export default function WorldMap({ data }: { data: CountryScore[] }) {
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const scoreMap = new Map(data.map((d) => [d.country, d]));

  return (
    <div className="relative w-full">
      <ComposableMap
        projectionConfig={{ scale: 140, center: [10, 10] }}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const a2 = NUM_TO_A2[String(parseInt(geo.id as string))] ?? null;
              const entry = a2 ? scoreMap.get(a2) : undefined;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={scoreToColor(entry?.score)}
                  stroke="#0f172a"
                  strokeWidth={0.4}
                  style={{
                    default: { outline: "none", transition: "fill 0.2s" },
                    hover: { fill: "#3b82f6", outline: "none", cursor: "pointer" },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={(e) => {
                    if (entry) {
                      setTooltip({ x: e.clientX, y: e.clientY, data: entry });
                    }
                  }}
                  onMouseMove={(e) => {
                    if (entry) setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null);
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 60 }}
        >
          <div className="font-semibold text-white">{tooltip.data.country}</div>
          <div className="text-gray-400 text-xs mt-0.5">
            {tooltip.data.designs} design{tooltip.data.designs !== 1 ? "s" : ""} ·{" "}
            {tooltip.data.makers} maker{tooltip.data.makers !== 1 ? "s" : ""} · avg complexity {tooltip.data.avg_complexity}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${tooltip.data.score}%`, maxWidth: 120, background: scoreToColor(tooltip.data.score) }}
            />
            <span className="text-white text-xs font-medium">{tooltip.data.score}/100</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-center text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-[#1e293b]" /> No data
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-[#991b1b]" /> Emerging
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-[#b45309]" /> Growing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-[#15803d]" /> Thriving
        </span>
      </div>
    </div>
  );
}
