import { useState, useEffect } from "react";
import { fetchDashboardOverview, fetchBasinStats, fetchTopRivers, fetchStatesCdr } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import ChartCard from "@/components/ChartCard";
import GlassTooltip from "@/components/GlassTooltip.js";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SectionHeader from "@/components/SectionHeader";

const C = ["#2563EB","#10B981","#8B5CF6","#F59E0B","#EC4899","#6366F1","#14B8A6","#F97316","#06B6D4","#84CC16","#EF4444"];
const fmt = (n) => { if (n == null) return "—"; if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1)+"M"; if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1)+"K"; return typeof n === "number" ? n.toFixed(1) : n; };

export default function MorePage() {
  const [overview, setOverview] = useState(null);
  const [basins, setBasins] = useState([]);
  const [rivers, setRivers] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardOverview(), fetchBasinStats(), fetchTopRivers("calcite", 5, 20), fetchStatesCdr()])
      .then(([o, b, r, s]) => { setOverview(o); setBasins(b); setRivers(r); setStates(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-6"><Skeleton className="h-12 w-48" /><div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div></div>;

  const pieData = basins.filter(b => b.total_cdr > 0).map(b => ({ name: b.basin, value: b.total_cdr }));

  return (
    <div className="space-y-10" data-testid="more-page">
      <div className="anim-fade-up">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>More Insights</h1>
        <p className="text-base text-gray-400 mt-2">Additional analysis and breakdowns</p>
      </div>

      {/* CDR Distribution */}
      <div className="anim-fade-up delay-1">
        <SectionHeader number="A" title="CDR Distribution" description="How CDR potential is distributed across regions" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="CDR Share by Basin" testId="more-pie">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={60} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                </Pie>
                <Tooltip content={<GlassTooltip formatter={v => fmt(v) + " t/yr"} />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="CDR by State (Top 15)" testId="more-state-cdr">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={states.filter(s => s.total_cdr > 0).slice(0, 15)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 9, fill: "#9ca3af" }} tickFormatter={fmt} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 9, fill: "#9ca3af" }} width={70} />
                <Tooltip content={<GlassTooltip formatter={fmt} />} />
                <Bar dataKey="total_cdr" name="Total CDR" fill="#10B981" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Extended Rivers Table */}
      <div className="anim-fade-up delay-2">
        <SectionHeader number="B" title="River Rankings" description="Top 20 rivers by CDR potential" />
        <ChartCard title="" testId="more-rivers">
          <Table>
            <TableHeader>
              <TableRow>
                {["#","River","Region","State","Total CDR (t/yr)","Avg CDR","Samples"].map(h => (
                  <TableHead key={h} className="text-[10px] font-mono uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rivers.map((r, i) => (
                <TableRow key={i} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="font-mono text-[11px] text-gray-400">{i+1}</TableCell>
                  <TableCell className="text-sm font-medium">{r.river}</TableCell>
                  <TableCell className="text-xs text-gray-500">{r.region}</TableCell>
                  <TableCell className="text-xs text-gray-500">{r.state}</TableCell>
                  <TableCell className="font-mono text-sm">{fmt(r.total_cdr)}</TableCell>
                  <TableCell className="font-mono text-sm">{fmt(r.avg_cdr)}</TableCell>
                  <TableCell className="font-mono text-sm">{r.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartCard>
      </div>

      {/* Key metrics */}
      <div className="anim-fade-up delay-3">
        <SectionHeader number="C" title="Key Figures" description="At a glance summary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Total CDR", v: fmt(overview?.total_cdr_t_yr), u: "t CO₂/yr" },
            { l: "Basins", v: basins.length },
            { l: "States", v: states.length },
            { l: "Rivers", v: `${rivers.length}+` },
          ].map((m, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 text-center">
              <p className="text-[11px] font-mono uppercase tracking-wider text-gray-400">{m.l}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2 font-mono">{m.v}</p>
              {m.u && <p className="text-[11px] text-gray-400 mt-1">{m.u}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
