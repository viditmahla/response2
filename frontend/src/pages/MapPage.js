import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Polygon, Tooltip as LTooltip, Popup, useMap } from "react-leaflet";
import { fetchMapData, fetchBasinStats } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Droplets, Layers, ChevronRight, ChevronLeft, X } from "lucide-react";

const BASIN_COLORS = [
  "#2563EB", "#059669", "#7C3AED", "#D97706", "#DC2626",
  "#0891B2", "#C026D3", "#4F46E5", "#EA580C", "#84CC16", "#EC4899",
];

function lerp(a, b, t) { return a + (b - a) * t; }

function getGradientColor(val, min, max, lowRGB, highRGB) {
  if (val == null || max === min) return "rgba(148,163,184,0.5)";
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
  return `rgb(${Math.round(lerp(lowRGB[0], highRGB[0], t))},${Math.round(lerp(lowRGB[1], highRGB[1], t))},${Math.round(lerp(lowRGB[2], highRGB[2], t))})`;
}

function fmt(n) {
  if (n == null) return "-";
  if (typeof n !== "number") return n;
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}

function convexHull(points) {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 2) return pts;
  const cross = (O, A, B) => (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
    upper.push(pts[i]);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.2 }); }, [map, center, zoom]);
  return null;
}

function StatCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 min-w-[160px]">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-mono truncate">{label}</p>
        <p className="text-base font-semibold text-gray-900 leading-tight">{value}{unit && <span className="text-[10px] text-gray-400 ml-0.5 font-normal">{unit}</span>}</p>
      </div>
    </div>
  );
}

export default function MapPage() {
  const [mapData, setMapData] = useState([]);
  const [basins, setBasins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colorBy, setColorBy] = useState("region");
  const [selectedBasin, setSelectedBasin] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [flyTarget, setFlyTarget] = useState({ center: [22, 82], zoom: 5 });

  useEffect(() => {
    Promise.all([fetchMapData(), fetchBasinStats()])
      .then(([m, b]) => { setMapData(m); setBasins(b); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const basinColorMap = useMemo(() => {
    const m = {};
    basins.forEach((b, i) => { m[b.basin] = BASIN_COLORS[i % BASIN_COLORS.length]; });
    return m;
  }, [basins]);

  const ranges = useMemo(() => {
    const ta = mapData.map(d => d.alkalinity).filter(v => v != null);
    const ph = mapData.map(d => d.ph).filter(v => v != null);
    const cdr = mapData.map(d => d.cdr_t_yr).filter(v => v != null && v > 0);
    return {
      ta: { min: ta.length ? Math.min(...ta) : 0, max: ta.length ? Math.max(...ta) : 1 },
      ph: { min: ph.length ? Math.min(...ph) : 6, max: ph.length ? Math.max(...ph) : 9 },
      cdr: { min: cdr.length ? Math.min(...cdr) : 0, max: cdr.length ? Math.max(...cdr) : 1 },
    };
  }, [mapData]);

  const filteredData = useMemo(() => selectedBasin ? mapData.filter(d => d.region === selectedBasin) : mapData, [mapData, selectedBasin]);

  const basinPolygons = useMemo(() => {
    const groups = {};
    mapData.forEach(d => {
      if (!d.latitude || !d.longitude || !d.region) return;
      if (!groups[d.region]) groups[d.region] = [];
      groups[d.region].push([d.latitude, d.longitude]);
    });
    return Object.entries(groups)
      .filter(([, pts]) => pts.length >= 3)
      .map(([name, pts]) => ({
        name,
        hull: convexHull(pts),
        color: basinColorMap[name] || "#94a3b8",
      }));
  }, [mapData, basinColorMap]);

  const getMarkerColor = useCallback((d) => {
    if (colorBy === "region") return basinColorMap[d.region] || "#94a3b8";
    if (colorBy === "alkalinity") return getGradientColor(d.alkalinity, ranges.ta.min, ranges.ta.max, [219, 234, 254], [37, 99, 235]);
    if (colorBy === "ph") return getGradientColor(d.ph, ranges.ph.min, ranges.ph.max, [254, 226, 226], [139, 92, 246]);
    if (colorBy === "cdr") return getGradientColor(d.cdr_t_yr, ranges.cdr.min, ranges.cdr.max, [209, 250, 229], [16, 185, 129]);
    return "#94a3b8";
  }, [colorBy, basinColorMap, ranges]);

  const getMarkerOpacity = useCallback((d) => {
    if (!selectedBasin) return 0.85;
    return d.region === selectedBasin ? 0.95 : 0.15;
  }, [selectedBasin]);

  const handleBasinClick = (basinName) => {
    if (selectedBasin === basinName) {
      setSelectedBasin(null);
      setFlyTarget({ center: [22, 82], zoom: 5 });
    } else {
      setSelectedBasin(basinName);
      const pts = mapData.filter(d => d.region === basinName && d.latitude && d.longitude);
      if (pts.length) {
        const avgLat = pts.reduce((s, d) => s + d.latitude, 0) / pts.length;
        const avgLng = pts.reduce((s, d) => s + d.longitude, 0) / pts.length;
        setFlyTarget({ center: [avgLat, avgLng], zoom: 7 });
      }
    }
    setSelectedMarker(null);
  };

  const totalCDR = useMemo(() => filteredData.reduce((s, d) => s + (d.cdr_t_yr || 0), 0), [filteredData]);
  const avgPH = useMemo(() => { const v = filteredData.filter(d => d.ph != null); return v.length ? v.reduce((s, d) => s + d.ph, 0) / v.length : 0; }, [filteredData]);
  const uniqueRivers = useMemo(() => new Set(filteredData.map(d => d.river_name).filter(Boolean)).size, [filteredData]);

  if (loading) return (
    <div className="space-y-4" data-testid="map-loading">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-[600px] rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-5" data-testid="map-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 anim-fade-up">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>Spatial CDR</h1>
          <p className="text-sm text-gray-400 mt-1">
            {filteredData.length} sampling locations
            {selectedBasin && (
              <span className="ml-1"> in <span className="font-semibold" style={{ color: basinColorMap[selectedBasin] }}>{selectedBasin}</span>
                <button onClick={() => { setSelectedBasin(null); setSelectedMarker(null); setFlyTarget({ center: [22, 82], zoom: 5 }); }} className="ml-2 text-gray-300 hover:text-gray-500" data-testid="clear-basin-filter"><X className="w-3 h-3 inline" /></button>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Color by</span>
          <Select value={colorBy} onValueChange={setColorBy}>
            <SelectTrigger className="w-44 h-9 text-sm rounded-lg" data-testid="map-color-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="region">Basin / Region</SelectItem>
              <SelectItem value="alkalinity">Total Alkalinity</SelectItem>
              <SelectItem value="ph">pH</SelectItem>
              <SelectItem value="cdr">CDR Potential</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex gap-3 overflow-x-auto pb-1 anim-fade-up delay-1" data-testid="map-stats-row">
        <StatCard icon={MapPin} label="Locations" value={filteredData.length} color="#2563EB" />
        <StatCard icon={Droplets} label="Rivers" value={uniqueRivers} color="#059669" />
        <StatCard icon={Layers} label="Total CDR" value={fmt(totalCDR)} unit="t/yr" color="#7C3AED" />
        <StatCard icon={Droplets} label="Avg pH" value={avgPH.toFixed(2)} color="#D97706" />
      </div>

      {/* Map + Sidebar */}
      <div className="flex gap-4 anim-fade-up delay-2">
        {/* Basin Sidebar */}
        <div className={`transition-all duration-300 flex-shrink-0 ${sidebarOpen ? "w-[220px]" : "w-0"} overflow-hidden`} data-testid="basin-sidebar">
          <div className="bg-white rounded-xl border border-gray-100 p-3 h-full">
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-3">Basins</p>
            <div className="space-y-1 max-h-[540px] overflow-y-auto pr-1">
              {basins.map((b, i) => {
                const isActive = selectedBasin === b.basin;
                const color = BASIN_COLORS[i % BASIN_COLORS.length];
                return (
                  <button key={b.basin} onClick={() => handleBasinClick(b.basin)}
                    data-testid={`basin-btn-${b.basin.toLowerCase().replace(/\s/g, "-")}`}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all duration-200 group ${isActive ? "bg-gray-900 text-white" : "hover:bg-gray-50 text-gray-600"}`}>
                    <span className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1 transition-all" style={{ backgroundColor: color, ringColor: isActive ? color : "transparent" }} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium truncate ${isActive ? "text-white" : "text-gray-700"}`}>{b.basin}</p>
                      <p className={`text-[10px] font-mono ${isActive ? "text-gray-300" : "text-gray-400"}`}>{b.count} pts &middot; {b.total_cdr ? fmt(b.total_cdr) + " t" : "\u2014"}</p>
                    </div>
                    <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${isActive ? "text-white rotate-90" : "text-gray-300 group-hover:text-gray-500"}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="absolute top-3 left-3 z-[1000] w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors" data-testid="sidebar-toggle">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          </button>

          <div className="rounded-xl border border-gray-100 overflow-hidden" data-testid="india-map-container" style={{ height: 600 }}>
            <MapContainer center={[22, 82]} zoom={5} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }} zoomControl={true}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                maxZoom={19}
              />
              <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />

              {/* Basin boundary polygons */}
              {basinPolygons.map((bp) => (
                <Polygon key={bp.name} positions={bp.hull}
                  pathOptions={{
                    color: bp.color, fillColor: bp.color,
                    fillOpacity: selectedBasin === bp.name ? 0.15 : 0.05,
                    weight: selectedBasin === bp.name ? 2.5 : 1,
                    opacity: selectedBasin && selectedBasin !== bp.name ? 0.2 : 0.6,
                    dashArray: selectedBasin === bp.name ? "" : "4 4",
                  }}>
                  <LTooltip sticky>
                    <span className="text-xs font-semibold">{bp.name}</span>
                  </LTooltip>
                </Polygon>
              ))}

              {/* Data markers */}
              {filteredData.map((d, i) => (
                <CircleMarker key={i} center={[d.latitude, d.longitude]} radius={4}
                  pathOptions={{ color: "#fff", fillColor: getMarkerColor(d), fillOpacity: getMarkerOpacity(d), weight: 1 }}
                  eventHandlers={{
                    click: () => setSelectedMarker(selectedMarker === d ? null : d),
                  }}>
                  <LTooltip>
                    <div style={{ minWidth: 160 }}>
                      <p style={{ fontWeight: 600, fontSize: 12, margin: 0 }}>{d.river_name || "Unknown River"}</p>
                      <p style={{ fontSize: 10, color: "#6b7280", margin: "2px 0 4px" }}>{d.state} &mdash; {d.region}</p>
                      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 4, fontSize: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#9ca3af" }}>TA</span><span style={{ fontWeight: 600 }}>{fmt(d.alkalinity)} umol/L</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#9ca3af" }}>pH</span><span style={{ fontWeight: 600 }}>{d.ph ? d.ph.toFixed(2) : "-"}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#9ca3af" }}>CDR</span><span style={{ fontWeight: 600 }}>{fmt(d.cdr_t_yr)} t/yr</span></div>
                      </div>
                    </div>
                  </LTooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Legend - floating bottom */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm px-4 py-2" data-testid="map-legend">
            {colorBy === "region" ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {basins.slice(0, 8).map((b, i) => (
                  <button key={b.basin} onClick={() => handleBasinClick(b.basin)} className={`flex items-center gap-1.5 transition-opacity ${selectedBasin && selectedBasin !== b.basin ? "opacity-30" : "opacity-100"}`}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BASIN_COLORS[i % BASIN_COLORS.length] }} />
                    <span className="text-[10px] text-gray-500 font-medium">{b.basin}</span>
                  </button>
                ))}
                {basins.length > 8 && <span className="text-[10px] text-gray-400">+{basins.length - 8} more</span>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-mono">{colorBy === "alkalinity" ? "Low TA" : colorBy === "ph" ? "Low pH" : "Low CDR"}</span>
                <div className="w-32 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${colorBy === "alkalinity" ? "#DBEAFE, #2563EB" : colorBy === "ph" ? "#FEE2E2, #8B5CF6" : "#D1FAE5, #10B981"})` }} />
                <span className="text-[10px] text-gray-400 font-mono">{colorBy === "alkalinity" ? "High TA" : colorBy === "ph" ? "High pH" : "High CDR"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Marker Detail */}
      {selectedMarker && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 anim-fade-up" data-testid="selected-marker-detail">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedMarker.river_name || "Unknown River"}</h3>
              <p className="text-xs text-gray-400">{selectedMarker.state} &mdash; {selectedMarker.region} &middot; Sample #{selectedMarker.sample_no}</p>
            </div>
            <button onClick={() => setSelectedMarker(null)} className="text-gray-300 hover:text-gray-500" data-testid="close-marker-detail"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { label: "Total Alkalinity", val: fmt(selectedMarker.alkalinity), unit: "umol/L" },
              { label: "pH", val: selectedMarker.ph?.toFixed(2) || "-" },
              { label: "CDR", val: fmt(selectedMarker.cdr_t_yr), unit: "t/yr" },
              { label: "SI Calcite", val: selectedMarker.si_calcite?.toFixed(3) || "-" },
              { label: "DIC", val: fmt(selectedMarker.dic), unit: "umol/L" },
              { label: "Ca", val: fmt(selectedMarker.ca), unit: "umol/L" },
              { label: "Mg", val: fmt(selectedMarker.mg), unit: "umol/L" },
              { label: "HCO3", val: fmt(selectedMarker.hco3), unit: "umol/L" },
              { label: "Rock Addition", val: selectedMarker.rock_addition?.toFixed(5) || "-", unit: "mol/kg" },
              { label: "Coordinates", val: `${selectedMarker.latitude?.toFixed(2)}, ${selectedMarker.longitude?.toFixed(2)}` },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-[9px] font-mono uppercase tracking-wider text-gray-400">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800">{item.val}{item.unit && <span className="text-[9px] text-gray-400 ml-0.5 font-normal">{item.unit}</span>}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
