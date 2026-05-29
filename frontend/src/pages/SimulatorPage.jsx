import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import ChartCard from "@/components/ChartCard";
import GlassTooltip from "@/components/GlassTooltip.js";
import {
  fetchDashboardOverview, fetchRegionsCdr, fetchTopRivers, fetchSummary,
  fetchFeedstocks, fetchSimulatorData,
} from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Beaker, CheckCircle, Mountain, Zap, Droplets, BarChart3, Activity, GitBranch } from "lucide-react";
import DistributionPanel from "@/components/simulator/DistributionPanel";
import OmegaFractionChart from "@/components/simulator/OmegaFractionChart";
import CDRControlsPanel from "@/components/simulator/CDRControlsPanel";

const OMEGA_OPTIONS = [5, 10, 15, 20, 25];
const BASIN_COLORS = [
  "#2563EB", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899",
  "#6366F1", "#14B8A6", "#F97316", "#06B6D4", "#84CC16", "#EF4444",
];

const fmt = (n) => {
  if (n == null) return "\u2014";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return typeof n === "number" ? n.toFixed(2) : n;
};

function KPI({ label, value, unit, icon: Icon, color, accent }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-gray-100 p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${accent ? 'bg-gray-900 text-white' : 'bg-white'}`}
      data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}>
      {accent && <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{ background: color, filter: "blur(20px)", transform: "translate(30%, -30%)" }} />}
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className={`text-[10px] font-mono uppercase tracking-wider ${accent ? 'text-gray-400' : 'text-gray-400'}`}>{label}</p>
          <p className={`text-xl font-bold mt-1 font-mono tracking-tight ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          {unit && <p className={`text-[10px] mt-0.5 ${accent ? 'text-gray-500' : 'text-gray-400'}`}>{unit}</p>}
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent ? 'rgba(255,255,255,0.1)' : `${color}12` }}>
          <Icon className="w-4 h-4" style={{ color: accent ? '#fff' : color }} />
        </div>
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  const [feedstock, setFeedstock] = useState("calcite");
  const [omega, setOmega] = useState(5);
  const [feedstocks, setFeedstocks] = useState([]);
  const [overview, setOverview] = useState(null);
  const [regions, setRegions] = useState([]);
  const [topRivers, setTopRivers] = useState([]);
  const [summary, setSummary] = useState([]);
  const [simData, setSimData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchFeedstocks(), fetchSimulatorData()])
      .then(([fs, sd]) => { setFeedstocks(fs || []); setSimData(sd); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDashboardOverview(feedstock, omega),
      fetchRegionsCdr(feedstock, omega),
      fetchTopRivers(feedstock, omega, 10),
      fetchSummary(feedstock, omega),
    ])
      .then(([ov, reg, riv, sum]) => {
        setOverview(ov); setRegions(reg); setTopRivers(riv); setSummary(sum); setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedstock, omega]);

  const availableOmegas = feedstocks.find((f) => f.name === feedstock)?.omega_thresholds || [5];

  const simSampleCount = useMemo(() => simData.filter(d => d.feedstock === feedstock && d.omega_threshold === omega).length, [simData, feedstock, omega]);

  if (loading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );

  return (
    <div className="space-y-6" data-testid="simulator-page">
      {/* Header + Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="anim-fade-up">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>ERW Simulator</h1>
          <p className="text-sm text-gray-400 mt-1">Enhanced Rock Weathering &middot; CDR potential analysis</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap anim-fade-up delay-1">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Feedstock</span>
            <Select value={feedstock} onValueChange={setFeedstock}>
              <SelectTrigger className="w-32 h-8 text-sm rounded-lg border-0 bg-gray-50" data-testid="feedstock-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {feedstocks.map((f) => <SelectItem key={f.name} value={f.name}>{f.name.charAt(0).toUpperCase() + f.name.slice(1)}</SelectItem>)}
                {!feedstocks.length && <SelectItem value="calcite">Calcite</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">&Omega;</span>
            <div className="flex gap-1">
              {OMEGA_OPTIONS.map((o) => {
                const avail = availableOmegas.includes(o);
                return (
                  <button key={o} onClick={() => avail && setOmega(o)} disabled={!avail} data-testid={`omega-${o}`}
                    className={`w-8 h-8 text-xs font-mono rounded-lg transition-all ${omega === o ? "bg-gray-900 text-white shadow-sm" : avail ? "bg-gray-50 text-gray-600 hover:bg-gray-100" : "bg-gray-50 text-gray-300 cursor-not-allowed"}`}>
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row - always visible */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 anim-fade-up delay-1" data-testid="kpi-row">
        <KPI label="Total CDR" value={fmt(overview?.total_cdr_t_yr)} unit="t CO2/yr" icon={TrendingUp} color="#2563EB" accent />
        <KPI label="Avg CDR" value={fmt(overview?.avg_cdr_t_yr)} unit="per sample" icon={Zap} color="#10B981" />
        <KPI label="Samples" value={overview?.total_samples?.toLocaleString()} icon={Beaker} color="#8B5CF6" />
        <KPI label="Success Rate" value={`${overview?.success_rate?.toFixed(1)}%`} icon={CheckCircle} color="#F59E0B" />
        <KPI label="Avg Rock Add" value={overview?.avg_rock_addition?.toFixed(4)} unit="mol/kg" icon={Mountain} color="#EC4899" />
        <KPI label="Avg pH" value={overview?.avg_ph?.toFixed(2)} icon={Droplets} color="#6366F1" />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="distributions" className="space-y-5">
        <TabsList className="bg-white border border-gray-100 p-1 rounded-xl inline-flex shadow-sm" data-testid="sim-tabs">
          <TabsTrigger value="distributions" data-testid="tab-distributions"
            className="rounded-lg px-4 py-2.5 text-[11px] font-medium gap-1.5 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
            <BarChart3 className="w-3.5 h-3.5" /> Distributions
          </TabsTrigger>
          <TabsTrigger value="omega-fraction" data-testid="tab-omega-fraction"
            className="rounded-lg px-4 py-2.5 text-[11px] font-medium gap-1.5 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
            <Activity className="w-3.5 h-3.5" /> Omega Fraction
          </TabsTrigger>
          <TabsTrigger value="cdr-controls" data-testid="tab-cdr-controls"
            className="rounded-lg px-4 py-2.5 text-[11px] font-medium gap-1.5 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
            <GitBranch className="w-3.5 h-3.5" /> CDR Controls
          </TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis"
            className="rounded-lg px-4 py-2.5 text-[11px] font-medium gap-1.5 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
            <Beaker className="w-3.5 h-3.5" /> Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distributions" className="anim-fade-up">
          <DistributionPanel data={simData} feedstock={feedstock} omega={omega} sampleCount={simSampleCount} />
        </TabsContent>

        <TabsContent value="omega-fraction" className="anim-fade-up">
          <OmegaFractionChart data={simData} />
        </TabsContent>

        <TabsContent value="cdr-controls" className="anim-fade-up">
          <CDRControlsPanel data={simData} feedstock={feedstock} />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-5 anim-fade-up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="CDR by Region" subtitle="Total CO2 removal potential per basin" testId="sim-cdr-region">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={regions.filter((r) => r.total_cdr > 0)} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="region" tick={{ fontSize: 8, fill: "#9ca3af" }} angle={-40} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickFormatter={fmt} />
                  <Tooltip content={<GlassTooltip formatter={fmt} />} />
                  <Bar dataKey="total_cdr" name="Total CDR (t/yr)" radius={[4, 4, 0, 0]}>
                    {regions.map((_, i) => <Cell key={i} fill={BASIN_COLORS[i % BASIN_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 Rivers" subtitle="Ranked by total CDR potential" testId="sim-top-rivers">
              <div className="overflow-y-auto max-h-[320px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] font-mono uppercase">#</TableHead>
                      <TableHead className="text-[10px] font-mono uppercase">River</TableHead>
                      <TableHead className="text-[10px] font-mono uppercase">Region</TableHead>
                      <TableHead className="text-[10px] font-mono uppercase text-right">CDR (t/yr)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topRivers.map((r, i) => (
                      <TableRow key={i} className="hover:bg-gray-50/50">
                        <TableCell className="font-mono text-[11px] text-gray-400">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{r.river}</TableCell>
                        <TableCell className="text-xs text-gray-500">{r.region}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(r.total_cdr)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ChartCard>
          </div>

          {summary.length > 0 && (
            <ChartCard title="Summary Statistics" testId="sim-summary">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["Region", "Samples", "CDR Total", "CDR Mean", "Rock Add", "Omega Mean", "Success %"].map((h) => (
                        <TableHead key={h} className="text-[10px] font-mono uppercase tracking-wider">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.map((s, i) => (
                      <TableRow key={i} className={`hover:bg-gray-50/50 ${s.region === "TOTAL / OVERALL" ? "font-semibold bg-gray-50" : ""}`}>
                        <TableCell className="text-sm">{s.region}</TableCell>
                        <TableCell className="font-mono text-sm">{s.n_samples}</TableCell>
                        <TableCell className="font-mono text-sm">{fmt(s.cdr_total)}</TableCell>
                        <TableCell className="font-mono text-sm">{fmt(s.cdr_mean)}</TableCell>
                        <TableCell className="font-mono text-sm">{s.add_mean?.toFixed(4)}</TableCell>
                        <TableCell className="font-mono text-sm">{s.omega_mean?.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-sm">{s.success_pct?.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ChartCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
