import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlassTooltip from "@/components/GlassTooltip.js";

const PARAMS = [
  { key: "ph", label: "pH", preField: "ph", postField: "ph_final", scale: 1, color: "#2563EB" },
  { key: "alkalinity", label: "Alkalinity", preField: "alkalinity", postField: "alk_final", scale: 1e6, unit: "umol/L", color: "#059669" },
  { key: "ca", label: "Ca", preField: "ca", postField: "ca_final", scale: 1e6, unit: "umol/L", color: "#7C3AED" },
  { key: "mg", label: "Mg", preField: "mg", postField: null, unit: "umol/L", color: "#D97706" },
  { key: "pco2", label: "pCO2", preField: "pco2", postField: "pco2_final", scale: 1, unit: "uatm", color: "#DC2626" },
  { key: "si", label: "SI Calcite", preField: "si_calcite", postField: "_si_final", scale: 1, color: "#0891B2" },
  { key: "rock", label: "Rock Added", preField: null, postField: "rock_addition", scale: 1, unit: "mol/kg", color: "#4F46E5" },
];

const FEEDSTOCKS = ["basalt", "dolomite", "calcite"];
const OMEGAS = [5, 10, 15];
const FS_COLORS = { basalt: "#DC2626", dolomite: "#2563EB", calcite: "#059669" };
const OMEGA_COLORS = { 5: "#2563EB", 10: "#10B981", 15: "#8B5CF6" };

function computeAlignedHistogram(valuesArrays, numBins = 25) {
  const allVals = valuesArrays.flat().filter((v) => v != null && isFinite(v));
  if (!allVals.length) return null;
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  if (min === max) return null;
  const binWidth = (max - min) / numBins;
  const result = Array.from({ length: numBins }, (_, i) => {
    const lo = min + (i + 0.5) * binWidth;
    return { range: lo < 100 ? lo.toFixed(1) : lo.toPrecision(3) };
  });
  valuesArrays.forEach((vals, idx) => {
    const key = `s${idx}`;
    result.forEach((r) => (r[key] = 0));
    vals.filter((v) => v != null && isFinite(v)).forEach((v) => {
      const i = Math.min(Math.floor((v - min) / binWidth), numBins - 1);
      result[i][key]++;
    });
  });
  return result;
}

function computeStats(vals) {
  const f = vals.filter(v => v != null && isFinite(v));
  if (!f.length) return null;
  const sorted = [...f].sort((a, b) => a - b);
  const mean = f.reduce((a, b) => a + b, 0) / f.length;
  const median = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  return { mean, median, min: sorted[0], max: sorted[sorted.length - 1], n: f.length };
}

function fmtStat(n) {
  if (n == null) return "-";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0);
  if (Math.abs(n) < 0.01) return n.toExponential(1);
  return n.toFixed(2);
}

function HistPanel({ title, data, bars, accentColor, stats, height = 200 }) {
  if (!data || !data.length) {
    return (
      <div className="bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-4 flex items-center justify-center h-20">
        <p className="text-[10px] text-gray-300">No data available</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden transition-all hover:shadow-sm">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accentColor || "#94a3b8" }} />
          <p className="text-xs font-semibold text-gray-700">{title}</p>
        </div>
        {stats && (
          <div className="flex gap-3">
            <span className="text-[9px] font-mono text-gray-400">mean <span className="text-gray-600 font-semibold">{fmtStat(stats.mean)}</span></span>
            <span className="text-[9px] font-mono text-gray-400">med <span className="text-gray-600 font-semibold">{fmtStat(stats.median)}</span></span>
          </div>
        )}
      </div>
      <div className="px-2 pb-2">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 7, fill: "#9ca3af" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip content={<GlassTooltip />} />
            <Legend wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
            {bars.map((b) => (
              <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function getVals(samples, field, scale) {
  if (!field) return [];
  return samples.map((d) => { const raw = d[field]; return raw != null ? raw * (scale || 1) : null; }).filter((v) => v != null && isFinite(v));
}

export default function DistributionPanel({ data, feedstock, omega, sampleCount }) {
  const enriched = useMemo(() =>
    data.map((d) => {
      const copy = { ...d };
      if (d.omega_final && d.omega_final > 0) copy._si_final = Math.log10(d.omega_final);
      return copy;
    }), [data]);

  const grouped = useMemo(() => {
    const g = {};
    enriched.forEach((d) => { const key = `${d.feedstock}_${d.omega_threshold}`; if (!g[key]) g[key] = []; g[key].push(d); });
    return g;
  }, [enriched]);

  const selectedSamples = grouped[`${feedstock}_${omega}`] || [];

  function buildPrePost(param) {
    if (!selectedSamples.length) return { data: null, bars: [], stats: null };
    const pre = getVals(selectedSamples, param.preField, 1);
    const post = getVals(selectedSamples, param.postField, param.scale);
    const arrays = []; const bars = [];
    if (pre.length) { arrays.push(pre); bars.push({ key: `s${arrays.length - 1}`, name: "Pre", color: "#CBD5E1" }); }
    if (post.length) { arrays.push(post); bars.push({ key: `s${arrays.length - 1}`, name: "Post", color: param.color || FS_COLORS[feedstock] || "#059669" }); }
    bars.forEach((b, i) => (b.key = `s${i}`));
    const stats = computeStats(post.length ? post : pre);
    return { data: arrays.length ? computeAlignedHistogram(arrays) : null, bars, stats };
  }

  function buildFeedstockComparison(param) {
    const arrays = []; const bars = [];
    FEEDSTOCKS.forEach((fs) => {
      const samples = grouped[`${fs}_${omega}`] || [];
      if (!samples.length) return;
      const field = param.postField || param.preField;
      const scale = param.postField && param.scale ? param.scale : 1;
      const vals = getVals(samples, field, scale);
      if (vals.length) {
        bars.push({ key: `s${arrays.length}`, name: fs.charAt(0).toUpperCase() + fs.slice(1), color: FS_COLORS[fs] });
        arrays.push(vals);
      }
    });
    return { data: arrays.length ? computeAlignedHistogram(arrays) : null, bars };
  }

  function buildOmegaComparison(param) {
    const arrays = []; const bars = [];
    OMEGAS.forEach((o) => {
      const samples = grouped[`${feedstock}_${o}`] || [];
      if (!samples.length) return;
      const field = param.postField || param.preField;
      const scale = param.postField && param.scale ? param.scale : 1;
      const vals = getVals(samples, field, scale);
      if (vals.length) {
        bars.push({ key: `s${arrays.length}`, name: `\u03A9=${o}`, color: OMEGA_COLORS[o] });
        arrays.push(vals);
      }
    });
    return { data: arrays.length ? computeAlignedHistogram(arrays) : null, bars };
  }

  return (
    <div className="space-y-5" data-testid="distribution-section">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>
            Geochemical Parameter Distributions
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Showing <span className="font-semibold text-gray-600 capitalize">{feedstock}</span> at <span className="font-semibold text-gray-600">&Omega;={omega}</span>
            {sampleCount > 0 && <span className="ml-1">&middot; {sampleCount.toLocaleString()} samples</span>}
          </p>
        </div>
      </div>

      <Tabs defaultValue="prepost" className="space-y-4">
        <TabsList className="bg-gray-100/80 p-0.5 rounded-lg inline-flex">
          <TabsTrigger value="prepost" className="rounded-md px-3 py-1.5 text-[11px]" data-testid="tab-prepost">Pre vs Post</TabsTrigger>
          <TabsTrigger value="feedstock" className="rounded-md px-3 py-1.5 text-[11px]" data-testid="tab-fs-comp">Feedstock Comparison</TabsTrigger>
          <TabsTrigger value="omega" className="rounded-md px-3 py-1.5 text-[11px]" data-testid="tab-omega-comp">Omega Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="prepost">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PARAMS.map((p) => {
              const { data: hd, bars, stats } = buildPrePost(p);
              return <HistPanel key={p.key} title={`${p.label}${p.unit ? ` (${p.unit})` : ''}`} data={hd} bars={bars} stats={stats} accentColor={p.color} />;
            })}
          </div>
        </TabsContent>

        <TabsContent value="feedstock">
          <p className="text-[10px] text-gray-400 mb-3">Comparing feedstocks (post-application) at &Omega;={omega}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PARAMS.map((p) => {
              const { data: hd, bars } = buildFeedstockComparison(p);
              return <HistPanel key={p.key} title={`${p.label}${p.unit ? ` (${p.unit})` : ''}`} data={hd} bars={bars} accentColor={p.color} />;
            })}
          </div>
        </TabsContent>

        <TabsContent value="omega">
          <p className="text-[10px] text-gray-400 mb-3">Comparing omega thresholds for <span className="capitalize font-semibold">{feedstock}</span></p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PARAMS.map((p) => {
              const { data: hd, bars } = buildOmegaComparison(p);
              return <HistPanel key={p.key} title={`${p.label}${p.unit ? ` (${p.unit})` : ''}`} data={hd} bars={bars} accentColor={p.color} />;
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
