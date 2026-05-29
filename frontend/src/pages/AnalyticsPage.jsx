import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Legend, Cell, ReferenceLine } from "recharts";
import ChartCard from "@/components/ChartCard";
import SectionHeader from "@/components/SectionHeader";
import GlassTooltip from "@/components/GlassTooltip.js";
import { fetchAnalyticsFull, fetchBasinStats, fetchNicbQuality } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const C = { blue: "#2563EB", emerald: "#10B981", violet: "#8B5CF6", amber: "#F59E0B", rose: "#EC4899", indigo: "#6366F1", teal: "#14B8A6", orange: "#F97316", cyan: "#06B6D4", lime: "#84CC16", red: "#EF4444" };
const BASIN_COLORS = [C.blue, C.emerald, C.violet, C.amber, C.rose, C.indigo, C.teal, C.orange, C.cyan, C.lime, C.red];

const fmt = (n) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1) + "K";
  return typeof n === "number" ? n.toFixed(1) : n;
};

function makeHist(data, field, bins = 20) {
  const vals = data.map(d => d[field]).filter(v => v != null && isFinite(v));
  if (!vals.length) return [];
  const min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) return [{ range: min.toFixed(1), count: vals.length }];
  const w = (max - min) / bins;
  const h = Array.from({ length: bins }, (_, i) => ({ range: (min + i * w).toFixed(1), count: 0 }));
  vals.forEach(v => { const idx = Math.min(Math.floor((v - min) / w), bins - 1); h[idx].count++; });
  return h;
}

const AXIS = { tick: { fontSize: 9, fill: "#9ca3af" }, axisLine: false, tickLine: false };
const GRID = { strokeDasharray: "3 3", stroke: "#f3f4f6" };

export default function AnalyticsPage() {
  const [data, setData] = useState([]);
  const [basins, setBasins] = useState([]);
  const [nicb, setNicb] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAnalyticsFull(), fetchBasinStats(), fetchNicbQuality()])
      .then(([d, b, n]) => { setData(d); setBasins(b); setNicb(n); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const basinColorMap = useMemo(() => {
    const m = {};
    basins.forEach((b, i) => { m[b.basin] = BASIN_COLORS[i % BASIN_COLORS.length]; });
    return m;
  }, [basins]);

  if (loading) return (
    <div className="space-y-8">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
    </div>
  );

  // Scatter helpers
  const caVsMg = data.filter(d => d.ca && d.mg).map(d => ({ x: d.ca, y: d.mg, region: d.region }));
  const caMgVsHco3 = data.filter(d => d.ca && d.mg && d.hco3).map(d => ({ x: (d.ca||0) + (d.mg||0), y: d.hco3, region: d.region }));
  const taVsDic = data.filter(d => d.alkalinity && d.dic).map(d => ({ x: d.alkalinity, y: d.dic, region: d.region }));
  const zpVsZm = data.filter(d => d.z_plus && d.z_minus).map(d => ({ x: d.z_plus, y: d.z_minus, region: d.region }));
  const phVsSi = data.filter(d => d.ph && d.si_calcite != null).map(d => ({ x: d.ph, y: d.si_calcite, region: d.region }));
  const caVsSi = data.filter(d => d.ca && d.si_calcite != null).map(d => ({ x: d.ca, y: d.si_calcite, region: d.region }));
  const pco2VsPh = data.filter(d => d.pco2 && d.ph).map(d => ({ x: d.pco2, y: d.ph, region: d.region }));
  const pco2VsDic = data.filter(d => d.pco2 && d.dic).map(d => ({ x: d.pco2, y: d.dic, region: d.region }));
  const nicbHist = makeHist(data, "nicb", 25);
  const siHist = makeHist(data, "si_calcite", 20);

  // Box plot approximation (Ca by region)
  const caByRegion = {};
  data.forEach(d => { if (d.ca && d.region) { if (!caByRegion[d.region]) caByRegion[d.region] = []; caByRegion[d.region].push(d.ca); }});
  const boxData = Object.entries(caByRegion).map(([r, vals]) => {
    const s = vals.sort((a,b) => a - b);
    const q1 = s[Math.floor(s.length * 0.25)];
    const q3 = s[Math.floor(s.length * 0.75)];
    const med = s[Math.floor(s.length * 0.5)];
    return { basin: r.length > 18 ? r.slice(0,16)+'...' : r, min: s[0], q1, median: med, q3, max: s[s.length-1], mean: vals.reduce((a,b)=>a+b,0)/vals.length };
  });

  return (
    <div className="space-y-12" data-testid="analytics-page">
      <div className="anim-fade-up">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>Analytics</h1>
        <p className="text-base text-gray-400 mt-2">Comprehensive water chemistry and ERW analysis across Indian river basins</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-gray-100/80 p-1 rounded-full inline-flex" data-testid="analytics-tabs">
          {["overview","ion-chemistry","carbonate","charge-balance","saturation","co2-dynamics"].map(t => (
            <TabsTrigger key={t} value={t} data-testid={`tab-${t}`}
              className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              {t === "co2-dynamics" ? "CO₂ Dynamics" : t === "ion-chemistry" ? "Ion Chemistry" : t === "charge-balance" ? "Charge Balance" : t.charAt(0).toUpperCase() + t.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── 1. OVERVIEW ─── */}
        <TabsContent value="overview" className="space-y-6 anim-fade-up">
          <SectionHeader number="01" title="Overview" description="Weathering signal strength and sampling coverage across basins" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Map — Sample Locations by Total Alkalinity" subtitle="Higher TA = stronger weathering signal" testId="overview-map">
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="longitude" name="Lon" {...AXIS} label={{ value: "Longitude (°E)", position: "bottom", offset: 12, fontSize: 10, fill: "#9ca3af" }} type="number" domain={['auto','auto']} />
                  <YAxis dataKey="latitude" name="Lat" {...AXIS} label={{ value: "Lat (°N)", angle: -90, position: "insideLeft", offset: 5, fontSize: 10, fill: "#9ca3af" }} type="number" domain={['auto','auto']} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (<div className="glass-tooltip">
                      <p className="text-[11px] font-semibold">{d?.river_name || 'Unknown'}</p>
                      <p className="text-[10px] text-gray-400">{d?.region}</p>
                      <p className="text-[10px] font-mono mt-1">TA: {fmt(d?.alkalinity)} umol/L</p>
                    </div>);
                  }} />
                  {data.filter(d => d.latitude && d.longitude).map((d, i) => null)}
                  <Scatter data={data.filter(d => d.latitude && d.longitude)} fillOpacity={0.6}>
                    {data.filter(d => d.latitude && d.longitude).map((d, i) => {
                      const ta = d.alkalinity || 0;
                      const intensity = Math.min(ta / 6000, 1);
                      const r = Math.round(16 + (239 - 16) * (1 - intensity));
                      const g = Math.round(185 + (68 - 185) * intensity);
                      const b = Math.round(129 + (68 - 129) * intensity);
                      return <Cell key={i} fill={`rgb(${r},${g},${b})`} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="space-y-4">
              <ChartCard title="Average Total Alkalinity by Basin" subtitle="Which basins show the strongest weathering" testId="overview-ta-basin">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={basins} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                    <YAxis {...AXIS} tickFormatter={fmt} />
                    <Tooltip content={<GlassTooltip formatter={fmt} />} />
                    <Bar dataKey="avg_ta" name="Avg TA (umol/L)" fill={C.emerald} radius={[3,3,0,0]}>
                      {basins.map((b, i) => <Cell key={i} fill={basinColorMap[b.basin]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Sample Count by Basin" subtitle="Sampling coverage context" testId="overview-count-basin">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={basins} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                    <YAxis {...AXIS} />
                    <Tooltip content={<GlassTooltip />} />
                    <Bar dataKey="count" name="Samples" fill={C.blue} radius={[3,3,0,0]} fillOpacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </TabsContent>

        {/* ─── 2. ION CHEMISTRY ─── */}
        <TabsContent value="ion-chemistry" className="space-y-6 anim-fade-up">
          <SectionHeader number="02" title="Ion Chemistry" description="Primary ERW dissolution products and weathering fingerprints" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Mean Ca²⁺ and Mg²⁺ by Basin" subtitle="Primary ERW dissolution products" testId="ion-ca-mg-basin">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={basins} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                  <YAxis {...AXIS} tickFormatter={fmt} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="avg_ca" name="Ca²⁺ (umol/L)" fill={C.blue} radius={[3,3,0,0]} />
                  <Bar dataKey="avg_mg" name="Mg²⁺ (umol/L)" fill={C.teal} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ca²⁺ vs Mg²⁺ — Weathering Fingerprint" subtitle="Silicate vs carbonate weathering" testId="ion-ca-vs-mg">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="x" name="Ca²⁺" {...AXIS} label={{ value: "Ca²⁺ (umol/L)", position: "bottom", offset: 12, fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis dataKey="y" name="Mg²⁺" {...AXIS} label={{ value: "Mg²⁺", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Scatter data={caVsMg} fillOpacity={0.5}>
                    {caVsMg.map((d, i) => <Cell key={i} fill={basinColorMap[d.region] || C.blue} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="(Ca²⁺+Mg²⁺)/(Na⁺+K⁺) Ratio by Basin" subtitle="Separates carbonate from silicate weathering" testId="ion-ratio">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={basins} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                  <YAxis {...AXIS} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="ca_mg_ratio" name="(Ca+Mg)/(Na+K)" fill={C.violet} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ca²⁺ Distribution by Region (Box Plot Approx)" subtitle="Spread and outliers" testId="ion-ca-box">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={boxData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                  <YAxis {...AXIS} tickFormatter={fmt} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="q1" name="Q1" stackId="a" fill="#dbeafe" radius={[0,0,0,0]} />
                  <Bar dataKey="median" name="Median" stackId="a" fill={C.blue} radius={[0,0,0,0]} />
                  <Bar dataKey="q3" name="Q3" stackId="a" fill="#93c5fd" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ─── 3. CARBONATE SYSTEM ─── */}
        <TabsContent value="carbonate" className="space-y-6 anim-fade-up">
          <SectionHeader number="03" title="Carbonate System" description="Bicarbonate capture, DIC, and weathering-driven alkalinity" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Mean HCO₃⁻ by Basin" subtitle="Bicarbonate = direct carbon capture product" testId="carb-hco3">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={basins} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                  <YAxis {...AXIS} tickFormatter={fmt} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Bar dataKey="avg_hco3" name="HCO₃⁻ (umol/L)" fill={C.emerald} radius={[3,3,0,0]}>
                    {basins.map((b, i) => <Cell key={i} fill={basinColorMap[b.basin]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="(Ca²⁺+Mg²⁺) vs HCO₃⁻" subtitle="Should follow ~1:2 molar ratio if weathering-driven" testId="carb-camg-hco3">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="x" name="Ca+Mg" {...AXIS} tickFormatter={fmt} label={{ value: "Ca²⁺ + Mg²⁺ (umol/L)", position: "bottom", offset: 12, fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis dataKey="y" name="HCO3" {...AXIS} tickFormatter={fmt} label={{ value: "HCO₃⁻", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Scatter data={caMgVsHco3} fillOpacity={0.45}>
                    {caMgVsHco3.map((d, i) => <Cell key={i} fill={basinColorMap[d.region] || C.emerald} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Mean DIC by Basin" subtitle="Total dissolved inorganic carbon load" testId="carb-dic">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={basins} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                  <YAxis {...AXIS} tickFormatter={fmt} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Bar dataKey="avg_dic" name="DIC (umol/L)" fill={C.amber} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="TA vs DIC" subtitle="How much alkalinity → actual carbon storage" testId="carb-ta-dic">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="x" name="TA" {...AXIS} tickFormatter={fmt} label={{ value: "Total Alkalinity", position: "bottom", offset: 12, fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis dataKey="y" name="DIC" {...AXIS} tickFormatter={fmt} label={{ value: "DIC", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Scatter data={taVsDic} fillOpacity={0.45}>
                    {taVsDic.map((d, i) => <Cell key={i} fill={basinColorMap[d.region] || C.amber} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ─── 4. CHARGE BALANCE ─── */}
        <TabsContent value="charge-balance" className="space-y-6 anim-fade-up">
          <SectionHeader number="04" title="Charge Balance" description="Data quality validation — NICB and ion balance" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="NICB % Distribution" subtitle="Flag anything beyond ±10%" testId="cb-nicb-hist">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={nicbHist} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="range" {...AXIS} interval={3} />
                  <YAxis {...AXIS} />
                  <Tooltip content={<GlassTooltip />} />
                  <ReferenceLine x="10" stroke={C.red} strokeDasharray="3 3" label={{ value: "+10%", position: "top", fontSize: 9, fill: C.red }} />
                  <ReferenceLine x="-10" stroke={C.red} strokeDasharray="3 3" label={{ value: "-10%", position: "top", fontSize: 9, fill: C.red }} />
                  <Bar dataKey="count" name="Samples" fill={C.violet} radius={[2,2,0,0]} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Z⁺ (Cations) vs Z⁻ (Anions)" subtitle="Balanced samples cluster on the 1:1 line" testId="cb-zp-zm">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="x" name="Z⁺" {...AXIS} tickFormatter={fmt} label={{ value: "Z⁺ (ueq/L)", position: "bottom", offset: 12, fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis dataKey="y" name="Z⁻" {...AXIS} tickFormatter={fmt} label={{ value: "Z⁻", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <ReferenceLine segment={[{x: 0, y: 0}, {x: 20000, y: 20000}]} stroke={C.red} strokeDasharray="4 4" />
                  <Scatter data={zpVsZm} fill={C.indigo} fillOpacity={0.4} />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="NICB Quality by Basin" subtitle="% within ±5%, ±10%, >±10%" testId="cb-quality" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={nicb} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                  <YAxis {...AXIS} label={{ value: "%", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip content={<GlassTooltip formatter={v => v + "%"} />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="pct_within_5" name="Within ±5%" stackId="a" fill={C.emerald} />
                  <Bar dataKey="pct_within_10" name="±5-10%" stackId="a" fill={C.amber} />
                  <Bar dataKey="pct_beyond_10" name=">±10%" stackId="a" fill={C.red} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ─── 5. SATURATION ─── */}
        <TabsContent value="saturation" className="space-y-6 anim-fade-up">
          <SectionHeader number="05" title="Saturation" description="Calcite saturation — risk of CaCO₃ precipitation reversing ERW gains" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Mean SI Calcite by Basin" subtitle="Positive = supersaturated, risk of precipitation" testId="sat-si-basin">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={basins} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                  <YAxis {...AXIS} />
                  <Tooltip content={<GlassTooltip />} />
                  <ReferenceLine y={0} stroke={C.red} strokeDasharray="3 3" />
                  <Bar dataKey="avg_si_calcite" name="SI Calcite" radius={[3,3,0,0]}>
                    {basins.map((b, i) => <Cell key={i} fill={b.avg_si_calcite > 0 ? C.rose : C.blue} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="SI Calcite Distribution" subtitle="Over/undersaturated sample distribution" testId="sat-si-hist">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={siHist} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="range" {...AXIS} interval={3} />
                  <YAxis {...AXIS} />
                  <Tooltip content={<GlassTooltip />} />
                  <ReferenceLine x="0" stroke={C.red} strokeDasharray="3 3" label={{ value: "SI=0", position: "top", fontSize: 9, fill: C.red }} />
                  <Bar dataKey="count" name="Samples" fill={C.rose} radius={[2,2,0,0]} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="pH vs SI Calcite" subtitle="High pH drives supersaturation" testId="sat-ph-si">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="x" name="pH" {...AXIS} label={{ value: "pH", position: "bottom", offset: 12, fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis dataKey="y" name="SI" {...AXIS} label={{ value: "SI Calcite", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
                  <ReferenceLine y={0} stroke={C.red} strokeDasharray="3 3" />
                  <Tooltip content={<GlassTooltip />} />
                  <Scatter data={phVsSi} fillOpacity={0.4}>
                    {phVsSi.map((d, i) => <Cell key={i} fill={basinColorMap[d.region] || C.rose} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ca²⁺ vs SI Calcite" subtitle="High Ca²⁺ + high SI = precipitation likely" testId="sat-ca-si">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="x" name="Ca²⁺" {...AXIS} tickFormatter={fmt} label={{ value: "Ca²⁺ (umol/L)", position: "bottom", offset: 12, fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis dataKey="y" name="SI" {...AXIS} label={{ value: "SI Calcite", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
                  <ReferenceLine y={0} stroke={C.red} strokeDasharray="3 3" />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Scatter data={caVsSi} fillOpacity={0.4}>
                    {caVsSi.map((d, i) => <Cell key={i} fill={basinColorMap[d.region] || C.indigo} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ─── 6. CO₂ DYNAMICS ─── */}
        <TabsContent value="co2-dynamics" className="space-y-6 anim-fade-up">
          <SectionHeader number="06" title="CO₂ Dynamics" description="River CO₂ source/sink status and degassing zones" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Mean pCO₂ by Basin" subtitle="Above 420 uatm = CO₂ source; below = sink" testId="co2-pco2-basin">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={basins} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                  <YAxis {...AXIS} tickFormatter={fmt} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <ReferenceLine y={420} stroke={C.red} strokeDasharray="4 4" label={{ value: "Atm ~420", position: "right", fontSize: 9, fill: C.red }} />
                  <Bar dataKey="avg_pco2" name="pCO₂ (uatm)" radius={[3,3,0,0]}>
                    {basins.map((b, i) => <Cell key={i} fill={b.avg_pco2 > 420 ? C.orange : C.cyan} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="pCO₂ vs pH" subtitle="Inverse relationship — validates data, shows degassing" testId="co2-pco2-ph">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="x" name="pCO₂" {...AXIS} tickFormatter={fmt} label={{ value: "pCO₂ (uatm)", position: "bottom", offset: 12, fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis dataKey="y" name="pH" {...AXIS} label={{ value: "pH", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Scatter data={pco2VsPh} fillOpacity={0.4}>
                    {pco2VsPh.map((d, i) => <Cell key={i} fill={basinColorMap[d.region] || C.cyan} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="pCO₂ vs DIC" subtitle="High DIC + low pCO₂ = good ERW capture signal" testId="co2-pco2-dic">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="x" name="pCO₂" {...AXIS} tickFormatter={fmt} label={{ value: "pCO₂ (uatm)", position: "bottom", offset: 12, fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis dataKey="y" name="DIC" {...AXIS} tickFormatter={fmt} label={{ value: "DIC (umol/L)", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Scatter data={pco2VsDic} fillOpacity={0.4}>
                    {pco2VsDic.map((d, i) => <Cell key={i} fill={basinColorMap[d.region] || C.teal} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Mean CO₂(aq) by Basin" subtitle="Residual dissolved CO₂ after weathering" testId="co2-aq-basin">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={basins} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="basin" {...AXIS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 8 }} />
                  <YAxis {...AXIS} tickFormatter={fmt} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Bar dataKey="avg_co2_aq" name="CO₂(aq) (umol/L)" fill={C.teal} radius={[3,3,0,0]}>
                    {basins.map((b, i) => <Cell key={i} fill={basinColorMap[b.basin]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
