import React, { useMemo } from "react";
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import GlassTooltip from "@/components/GlassTooltip.js";

const FEEDSTOCKS = ["basalt", "dolomite", "calcite"];
const FS_COLORS = { basalt: "#DC2626", dolomite: "#2563EB", calcite: "#059669" };
const OMEGA_RANGE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 25];

export default function OmegaFractionChart({ data }) {
  const chartData = useMemo(() => {
    const grouped = {};
    data.forEach((d) => { if (!grouped[d.feedstock]) grouped[d.feedstock] = []; grouped[d.feedstock].push(d); });
    return OMEGA_RANGE.map((omega) => {
      const entry = { omega };
      FEEDSTOCKS.forEach((fs) => {
        const samples = grouped[fs] || [];
        if (!samples.length) { entry[fs] = null; return; }
        const reaching = samples.filter((d) => d.omega_final != null && d.omega_final >= omega).length;
        entry[fs] = +(reaching / samples.length).toFixed(4);
      });
      return entry;
    });
  }, [data]);

  const availableFeedstocks = useMemo(() => {
    const fs = new Set(data.map((d) => d.feedstock));
    return FEEDSTOCKS.filter((f) => fs.has(f));
  }, [data]);

  return (
    <div className="space-y-5" data-testid="omega-fraction-section">
      <div>
        <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>
          Fraction of Samples Reaching Omega Threshold
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Efficiency of different feedstocks in reaching increasing omega saturation values</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 transition-all hover:shadow-sm">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <defs>
              {FEEDSTOCKS.map(fs => (
                <linearGradient key={fs} id={`grad-${fs}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={FS_COLORS[fs]} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={FS_COLORS[fs]} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="omega" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
              label={{ value: "Omega (\u03A9) Value", position: "insideBottom", offset: -5, style: { fontSize: 11, fill: "#6b7280", fontFamily: "var(--font-mono)" } }} />
            <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
              label={{ value: "Fraction Reaching \u03A9", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "#6b7280", fontFamily: "var(--font-mono)" } }} />
            <Tooltip content={<GlassTooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <ReferenceLine y={0.5} stroke="#e5e7eb" strokeDasharray="3 3" label={{ value: "50%", position: "right", style: { fontSize: 9, fill: "#9ca3af" } }} />
            {availableFeedstocks.map((fs) => (
              <Area key={fs} type="monotone" dataKey={fs} name={fs.charAt(0).toUpperCase() + fs.slice(1)}
                stroke={FS_COLORS[fs]} fill={`url(#grad-${fs})`} strokeWidth={2.5}
                dot={{ r: 3, fill: FS_COLORS[fs], strokeWidth: 0 }} activeDot={{ r: 5, fill: FS_COLORS[fs], stroke: "#fff", strokeWidth: 2 }} connectNulls={false} />
            ))}
            {FEEDSTOCKS.filter((f) => !availableFeedstocks.includes(f)).map((fs) => (
              <Line key={`ghost-${fs}`} type="monotone" dataKey={fs} name={`${fs.charAt(0).toUpperCase() + fs.slice(1)} (no data)`}
                stroke={FS_COLORS[fs]} strokeDasharray="5 5" strokeOpacity={0.25} strokeWidth={1.5} dot={false} connectNulls={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        {availableFeedstocks.length < FEEDSTOCKS.length && (
          <p className="text-[10px] text-gray-400 text-center mt-3">Dashed lines indicate feedstocks without data. Upload via the Data page to populate.</p>
        )}
      </div>
    </div>
  );
}
