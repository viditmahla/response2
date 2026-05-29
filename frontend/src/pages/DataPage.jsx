import { useState, useEffect, useRef } from "react";
import {
  Upload, Database, FileSpreadsheet, CheckCircle2,
  AlertCircle, CloudUpload, Loader2, Trash2
} from "lucide-react";
import { fetchFeedstocks, uploadFeedstock, fetchUploadStatus } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const OMEGA_OPTIONS = [5, 10, 15, 20, 25];

const CATEGORIES = [
  {
    key: "baseline",
    label: "Baseline",
    subtitle: "Standard ERW reference dataset",
    description: "Upload your base calcite ERW results. This is the primary dataset used across Analytics, Map, Simulator and Graph views.",
    color: "emerald",
    icon: "🌿",
    defaultName: "calcite",
  },
  {
    key: "feedstock_3x3",
    label: "3×3 Feedstock",
    subtitle: "Multi-feedstock grid dataset",
    description: "Upload a dataset covering multiple feedstock types (e.g. wollastonite, basalt) across omega thresholds.",
    color: "blue",
    icon: "⚗️",
    defaultName: "",
  },
  {
    key: "omega",
    label: "Omega Variants",
    subtitle: "Omega threshold variation data",
    description: "Upload datasets with different omega threshold scenarios to compare CDR sensitivity.",
    color: "violet",
    icon: "Ω",
    defaultName: "",
  },
];

const COLOR = {
  emerald: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    btn: "bg-emerald-600 hover:bg-emerald-700",
    icon: "text-emerald-600",
    ring: "focus:ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
  blue: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    btn: "bg-blue-600 hover:bg-blue-700",
    icon: "text-blue-600",
    ring: "focus:ring-blue-500/30",
    dot: "bg-blue-500",
  },
  violet: {
    border: "border-violet-200",
    bg: "bg-violet-50",
    badge: "bg-violet-100 text-violet-800",
    btn: "bg-violet-600 hover:bg-violet-700",
    icon: "text-violet-600",
    ring: "focus:ring-violet-500/30",
    dot: "bg-violet-500",
  },
};

function UploadCard({ cat, status, onUploaded }) {
  const [name, setName]         = useState(cat.defaultName);
  const [omega, setOmega]       = useState("5");
  const [file, setFile]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const c = COLOR[cat.color];
  const count = status?.[cat.key] ?? 0;
  const loaded = count > 0;

  const handleUpload = async () => {
    if (!file)        { toast.error("Select an Excel file first");          return; }
    if (!name.trim()) { toast.error("Enter a feedstock name");              return; }
    setUploading(true);
    try {
      const res = await uploadFeedstock(file, name.trim(), parseInt(omega), cat.key);
      toast.success(`✓ ${res.samples_count} samples uploaded to ${cat.label}`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (e) {
      toast.error("Upload failed: " + (e.response?.data?.detail || e.message));
    }
    setUploading(false);
  };

  return (
    <div className={`bg-white rounded-2xl border ${loaded ? c.border : "border-gray-100"} overflow-hidden transition-all duration-300`}>
      {/* Header */}
      <div className={`px-6 py-5 flex items-start justify-between ${loaded ? c.bg : "bg-gray-50/60"}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{cat.icon}</span>
          <div>
            <h3 className="text-base font-semibold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>
              {cat.label}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{cat.subtitle}</p>
          </div>
        </div>
        {loaded ? (
          <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${c.badge}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {count.toLocaleString()} records
          </span>
        ) : (
          <span className="text-xs text-gray-400 px-3 py-1 rounded-full bg-gray-100">
            No data yet
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4">
        <p className="text-xs text-gray-400 leading-relaxed">{cat.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Feedstock name */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">
              Feedstock Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. calcite"
              className={`w-full px-3 py-2 text-sm bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 ${c.ring}`}
            />
          </div>

          {/* Omega */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">
              Omega Threshold
            </label>
            <Select value={omega} onValueChange={setOmega}>
              <SelectTrigger className="w-full h-9 text-sm rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OMEGA_OPTIONS.map(o => (
                  <SelectItem key={o} value={String(o)}>Ω = {o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">
              Excel File (.xlsx)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={e => setFile(e.target.files?.[0])}
              className="w-full text-xs text-gray-500
                file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700
                hover:file:bg-gray-200 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          {file ? (
            <span className="text-xs text-gray-500 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {file.name}
            </span>
          ) : (
            <span className="text-xs text-gray-300">No file selected</span>
          )}
          <button
            onClick={handleUpload}
            disabled={uploading || !file || !name.trim()}
            className={`flex items-center gap-2 px-5 py-2 text-white text-sm font-medium rounded-lg ${c.btn} disabled:opacity-30 transition-all active:scale-95`}
          >
            {uploading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
              : <><CloudUpload className="w-3.5 h-3.5" /> {loaded ? "Add More" : "Upload"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DataPage() {
  const [status, setStatus]       = useState(null);
  const [feedstocks, setFeedstocks] = useState([]);

  const load = async () => {
    try {
      const [s, f] = await Promise.all([fetchUploadStatus(), fetchFeedstocks()]);
      setStatus(s);
      setFeedstocks(f || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const totalLoaded = status?.total ?? 0;

  return (
    <div className="space-y-8" data-testid="data-page">
      {/* Header */}
      <div className="anim-fade-up">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          Data
        </h1>
        <p className="text-base text-gray-400 mt-2">
          Upload your ERW datasets. The rest of the app populates automatically.
        </p>
      </div>

      {/* Empty state banner */}
      {totalLoaded === 0 && status !== null && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3 anim-fade-up">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">No data uploaded yet</p>
            <p className="text-xs text-amber-700 mt-1">
              Upload at least a Baseline dataset to start seeing analytics, maps, and graphs.
            </p>
          </div>
        </div>
      )}

      {/* Summary dots */}
      {status !== null && totalLoaded > 0 && (
        <div className="flex gap-4 flex-wrap anim-fade-up">
          {CATEGORIES.map(cat => {
            const c = COLOR[cat.color];
            const n = status[cat.key] ?? 0;
            return (
              <div key={cat.key} className="flex items-center gap-2 text-sm text-gray-600">
                <span className={`w-2 h-2 rounded-full ${n > 0 ? c.dot : "bg-gray-200"}`} />
                {cat.label}: <span className="font-medium">{n.toLocaleString()}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            · Total: <span className="font-medium text-gray-700">{totalLoaded.toLocaleString()}</span> records
          </div>
        </div>
      )}

      {/* Upload cards */}
      <div className="grid grid-cols-1 gap-5 anim-fade-up delay-1">
        {CATEGORIES.map(cat => (
          <UploadCard
            key={cat.key}
            cat={cat}
            status={status}
            onUploaded={load}
          />
        ))}
      </div>

      {/* Uploaded feedstocks table */}
      {feedstocks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 anim-fade-up delay-2">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4"
            style={{ fontFamily: "var(--font-heading)" }}>
            <Database className="w-4 h-4 text-gray-400" /> Uploaded Datasets
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                {["Feedstock", "Category", "Omega Thresholds", "Samples", "Uploaded"].map(h => (
                  <TableHead key={h} className="text-[10px] font-mono uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedstocks.map((f, i) => {
                const cat = CATEGORIES.find(c => c.key === f.data_category);
                const c = cat ? COLOR[cat.color] : COLOR.emerald;
                return (
                  <TableRow key={i} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm font-medium flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-gray-300" />
                      {f.name?.charAt(0).toUpperCase() + f.name?.slice(1)}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
                        {cat?.label ?? f.data_category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(f.omega_thresholds || []).map(o => (
                          <Badge key={o} variant="secondary" className="font-mono text-[10px]">{o}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{f.sample_count?.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-gray-400">
                      {f.created_at ? new Date(f.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Format guide */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 anim-fade-up delay-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-gray-400" /> Expected Excel Format
        </h4>
        <ul className="text-xs text-gray-500 space-y-1.5 ml-5 list-disc">
          <li>File type: <span className="font-mono">.xlsx</span></li>
          <li>Required sheet: <span className="font-mono">"ERW Results"</span> — data starts at row 4</li>
          <li>Optional sheet: <span className="font-mono">"Summary Statistics"</span> — region aggregates</li>
          <li>Column order must match original format (lat col 3, lon col 4, pH col 5…)</li>
          <li>Omega threshold: 5, 10, 15, 20, or 25</li>
        </ul>
      </div>
    </div>
  );
}
