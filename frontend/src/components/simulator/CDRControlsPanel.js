import React, { useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import GlassTooltip from "@/components/GlassTooltip.js";

const VARIABLES = [
  { key: "ph", label: "pH", field: "ph", color: "#2563EB" },
  { key: "alkalinity", label: "Alkalinity (umol/L)", field: "alkalinity", color: "#059669" },
  { key: "rock_addition", label: "Rock Added (mol/kg)", field: "rock_addition", color: "#7C3AED" },
];

function getOmegaColor(omega) {
  if (omega == null) return "#94a3b8";
  const t = Math.max(0, Math.min(1, omega / 20));
  return `rgb(${Math.round(59 + (168 - 59) * t)},${Math.round(130 + (85 - 130) * t)},${Math.round(246 + (247 - 246) * t)})`;
}

const fmt = (n) => {
  if (n == null) return "-";
  if (typeof n !== "number") return n;
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
};

export default function CDRControlsPanel({ data, feedstock }) {
  const samples = useMemo(() => data.filter((d) => d.feedstock === feedstock), [data, feedstock]);

  return (
    <div className="space-y-5" data-testid="cdr-controls-section">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>Controls on CDR Potential</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Relationships for <span className="font-semibold text-gray-600 capitalize">{feedstock}</span> &middot; Points colored by omega value
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-100 px-3 py-1.5">
          <span className="text-[9px] text-gray-400 font-mono">Low &Omega;</span>
          <div className="w-20 h-2 rounded-full" style={{ background: "linear-gradient(to right, rgb(59,130,246), rgb(168,85,247))" }} />
          <span className="text-[9px] text-gray-400 font-mono">High &Omega;</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {VARIABLES.map((v) => {
          const plotData = samples
            .filter((d) => d[v.field] != null && d.cdr_t_yr != null && d.cdr_t_yr > 0 && isFinite(d[v.field]))
            .map((d) => ({ x: d[v.field], y: d.cdr_t_yr, omega: d.omega_calcite, name: d.river_name || "" }));

          if (!plotData.length) {
            return (
              <div key={v.key} className="bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-8 flex items-center justify-center">
                <p className="text-xs text-gray-400">No data for {feedstock}</p>
              </div>
            );
          }

          return (
            <div key={v.key} className="bg-white rounded-xl border border-gray-100 overflow-hidden transition-all hover:shadow-sm" data-testid={`scatter-${v.key}`}>
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ backgroundColor: v.color }} />
                <p className="text-xs font-semibold text-gray-700">CDR vs {v.label.split(" ")[0]}</p>
                <span className="text-[9px] font-mono text-gray-400 ml-auto">{plotData.length} pts</span>
              </div>
              <div className="px-2 pb-2">
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 5, right: 10, left: -5, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="x" name={v.label} tick={{ fontSize: 9, fill: "#9ca3af" }} tickFormatter={fmt} axisLine={false} tickLine={false}
                      label={{ value: v.label, position: "insideBottom", offset: -10, style: { fontSize: 10, fill: "#9ca3af", fontFamily: "var(--font-mono)" } }} />
                    <YAxis dataKey="y" name="CDR (t/yr)" tick={{ fontSize: 9, fill: "#9ca3af" }} tickFormatter={fmt} axisLine={false} tickLine={false} />
                    <Tooltip content={<GlassTooltip formatter={fmt} />} cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter data={plotData} shape="circle">
                      {plotData.map((d, i) => <Cell key={i} fill={getOmegaColor(d.omega)} fillOpacity={0.55} r={3.5} />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
