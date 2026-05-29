import React, { useState, useEffect, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  BarChart, Bar, LineChart, Line, AreaChart, Area, Legend
} from "recharts";
import { fetchAnalyticsFull, fetchBasinStats } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";

const FIELDS = [
  { key: "ph", label: "pH" },
  { key: "alkalinity", label: "Total Alkalinity (umol/L)" },
  { key: "ca", label: "Ca²⁺ (umol/L)" },
  { key: "mg", label: "Mg²⁺ (umol/L)" },
  { key: "na", label: "Na⁺ (umol/L)" },
  { key: "k", label: "K⁺ (umol/L)" },
  { key: "cl", label: "Cl⁻ (umol/L)" },
  { key: "so4", label: "SO₄²⁻ (umol/L)" },
  { key: "no3", label: "NO₃⁻ (umol/L)" },
  { key: "hco3", label: "HCO₃⁻ (umol/L)" },
  { key: "dic", label: "DIC (umol/L)" },
  { key: "pco2", label: "pCO₂ (uatm)" },
  { key: "co2_aq", label: "CO₂(aq) (umol/L)" },
  { key: "temp_c", label: "Temperature (°C)" },
  { key: "salinity", label: "Salinity" },
  { key: "si_calcite", label: "SI Calcite" },
  { key: "omega_calcite", label: "Omega Calcite" },
  { key: "discharge", label: "Discharge (m³/s)" },
  { key: "rock_addition", label: "Rock Addition (mol/kg)" },
  { key: "omega_final", label: "Omega Final" },
  { key: "cdr_t_yr", label: "CDR (t CO₂/yr)" },
  { key: "cdr_kt_yr", label: "CDR (kt CO₂/yr)" },
  { key: "z_plus", label: "Z⁺ Cations (ueq/L)" },
  { key: "z_minus", label: "Z⁻ Anions (ueq/L)" },
  { key: "nicb", label: "NICB (%)" },
  { key: "latitude", label: "Latitude" },
  { key: "longitude", label: "Longitude" },
];

const CHART_TYPES = [
  { key: "scatter", label: "Scatter Plot" },
  { key: "bar", label: "Bar Chart (Avg by Basin)" },
  { key: "histogram", label: "Histogram (Distribution)" },
  { key: "area", label: "Area Chart (Sorted)" },
];

const BASIN_COLORS = ["#2563EB","#10B981","#8B5CF6","#F59E0B","#EC4899","#6366F1","#14B8A6","#F97316","#06B6D4","#84CC16","#EF4444"];
const COLOR_MODES = [
  { key: "single", label: "Single Color" },
  { key: "region", label: "Color by Basin" },
];

function fmt(n) {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return typeof n === "number" ? n.toFixed(2) : n;
}

function makeHist(values, bins) {
  if (!values.length) return [];
  var min = Math.min.apply(null, values);
  var max = Math.max.apply(null, values);
  if (min === max) return [{ range: min.toFixed(1), count: values.length }];
  var w = (max - min) / bins;
  var h = [];
  for (var i = 0; i < bins; i++) {
    h.push({ range: (min + i * w).toFixed(1), count: 0 });
  }
  values.forEach(function(v) {
    var idx = Math.min(Math.floor((v - min) / w), bins - 1);
    h[idx].count++;
  });
  return h;
}

function CustomTooltip(props) {
  var active = props.active;
  var payload = props.payload;
  if (!active || !payload || payload.length === 0) return null;
  var d = payload[0] && payload[0].payload ? payload[0].payload : {};
  return React.createElement("div", { className: "glass-tooltip" },
    d.river_name ? React.createElement("p", { className: "text-[11px] font-semibold text-gray-900" }, d.river_name) : null,
    d.region ? React.createElement("p", { className: "text-[10px] text-gray-400 mb-1" }, d.region) : null,
    payload.map(function(entry, i) {
      return React.createElement("div", { key: i, className: "flex items-center gap-2 text-[11px]" },
        React.createElement("span", { className: "w-2 h-2 rounded-full", style: { backgroundColor: entry.color } }),
        React.createElement("span", { className: "text-gray-400" }, entry.name || ""),
        React.createElement("span", { className: "font-mono font-medium text-gray-700 ml-1" }, fmt(entry.value))
      );
    })
  );
}

function GraphPage() {
  var _s = useState([]);
  var data = _s[0], setData = _s[1];
  var _b = useState([]);
  var basins = _b[0], setBasins = _b[1];
  var _l = useState(true);
  var loading = _l[0], setLoading = _l[1];

  var _xf = useState("discharge");
  var xField = _xf[0], setXField = _xf[1];
  var _yf = useState("cdr_t_yr");
  var yField = _yf[0], setYField = _yf[1];
  var _ct = useState("scatter");
  var chartType = _ct[0], setChartType = _ct[1];
  var _cm = useState("region");
  var colorMode = _cm[0], setColorMode = _cm[1];

  useEffect(function() {
    setLoading(true);
    Promise.all([fetchAnalyticsFull(), fetchBasinStats()])
      .then(function(res) { setData(res[0]); setBasins(res[1]); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, []);

  var basinColorMap = useMemo(function() {
    var m = {};
    basins.forEach(function(b, i) { m[b.basin] = BASIN_COLORS[i % BASIN_COLORS.length]; });
    return m;
  }, [basins]);

  var xLabel = FIELDS.find(function(f) { return f.key === xField; });
  var yLabel = FIELDS.find(function(f) { return f.key === yField; });

  // Scatter data
  var scatterData = data.filter(function(d) {
    return d[xField] != null && d[yField] != null && isFinite(d[xField]) && isFinite(d[yField]);
  }).map(function(d) {
    return { x: d[xField], y: d[yField], region: d.region || "Unknown", river_name: d.river_name || "", state: d.state || "" };
  });

  // Bar data (avg by basin)
  var barData = basins.map(function(b) {
    var samples = data.filter(function(d) { return d.region === b.basin && d[yField] != null; });
    if (!samples.length) return null;
    var sum = samples.reduce(function(a, d) { return a + (d[yField] || 0); }, 0);
    return { basin: b.basin.length > 20 ? b.basin.slice(0, 18) + ".." : b.basin, fullBasin: b.basin, avg: sum / samples.length, count: samples.length };
  }).filter(Boolean);

  // Histogram data
  var histValues = data.map(function(d) { return d[xField]; }).filter(function(v) { return v != null && isFinite(v); });
  var histData = makeHist(histValues, 25);

  // Area data (sorted by x)
  var areaData = data.filter(function(d) { return d[xField] != null && d[yField] != null; })
    .map(function(d) { return { x: d[xField], y: d[yField] }; })
    .sort(function(a, b) { return a.x - b.x; })
    .slice(0, 500);

  if (loading) {
    return React.createElement("div", { className: "space-y-6" },
      React.createElement(Skeleton, { className: "h-12 w-64" }),
      React.createElement(Skeleton, { className: "h-[500px] rounded-xl" })
    );
  }

  var chartContent = null;

  if (chartType === "scatter") {
    chartContent = React.createElement(ResponsiveContainer, { width: "100%", height: 520 },
      React.createElement(ScatterChart, { margin: { top: 20, right: 30, bottom: 50, left: 20 } },
        React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f3f4f6" }),
        React.createElement(XAxis, { dataKey: "x", name: xLabel ? xLabel.label : xField, type: "number",
          tick: { fontSize: 10, fill: "#9ca3af" }, tickLine: false, axisLine: false, tickFormatter: fmt,
          label: { value: xLabel ? xLabel.label : xField, position: "bottom", offset: 25, fontSize: 11, fill: "#9ca3af" } }),
        React.createElement(YAxis, { dataKey: "y", name: yLabel ? yLabel.label : yField, type: "number",
          tick: { fontSize: 10, fill: "#9ca3af" }, tickLine: false, axisLine: false, tickFormatter: fmt,
          label: { value: yLabel ? yLabel.label : yField, angle: -90, position: "insideLeft", offset: 5, fontSize: 11, fill: "#9ca3af" } }),
        React.createElement(Tooltip, { content: React.createElement(CustomTooltip, null) }),
        colorMode === "region" ? React.createElement(Legend, { wrapperStyle: { fontSize: 10, paddingTop: 10 } }) : null,
        colorMode === "region"
          ? Object.keys(basinColorMap).map(function(r) {
              var regionData = scatterData.filter(function(d) { return d.region === r; });
              if (!regionData.length) return null;
              return React.createElement(Scatter, { key: r, name: r, data: regionData, fill: basinColorMap[r], fillOpacity: 0.6 });
            })
          : React.createElement(Scatter, { data: scatterData, fill: "#2563EB", fillOpacity: 0.5 })
      )
    );
  } else if (chartType === "bar") {
    chartContent = React.createElement(ResponsiveContainer, { width: "100%", height: 520 },
      React.createElement(BarChart, { data: barData, margin: { top: 20, right: 20, left: 10, bottom: 80 } },
        React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f3f4f6" }),
        React.createElement(XAxis, { dataKey: "basin", tick: { fontSize: 9, fill: "#9ca3af" }, angle: -40, textAnchor: "end", interval: 0, tickLine: false, axisLine: false }),
        React.createElement(YAxis, { tick: { fontSize: 10, fill: "#9ca3af" }, tickFormatter: fmt, tickLine: false, axisLine: false,
          label: { value: "Avg " + (yLabel ? yLabel.label : yField), angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" } }),
        React.createElement(Tooltip, { content: React.createElement(CustomTooltip, null) }),
        React.createElement(Bar, { dataKey: "avg", name: "Avg " + (yLabel ? yLabel.label : yField), radius: [4, 4, 0, 0] },
          barData.map(function(b, i) {
            return React.createElement(Cell, { key: i, fill: basinColorMap[b.fullBasin] || BASIN_COLORS[i % BASIN_COLORS.length] });
          })
        )
      )
    );
  } else if (chartType === "histogram") {
    chartContent = React.createElement(ResponsiveContainer, { width: "100%", height: 520 },
      React.createElement(BarChart, { data: histData, margin: { top: 20, right: 20, left: 10, bottom: 30 } },
        React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f3f4f6" }),
        React.createElement(XAxis, { dataKey: "range", tick: { fontSize: 9, fill: "#9ca3af" }, interval: 3, tickLine: false, axisLine: false,
          label: { value: xLabel ? xLabel.label : xField, position: "bottom", offset: 12, fontSize: 10, fill: "#9ca3af" } }),
        React.createElement(YAxis, { tick: { fontSize: 10, fill: "#9ca3af" }, tickLine: false, axisLine: false,
          label: { value: "Count", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" } }),
        React.createElement(Tooltip, { content: React.createElement(CustomTooltip, null) }),
        React.createElement(Bar, { dataKey: "count", name: "Samples", fill: "#8B5CF6", radius: [3, 3, 0, 0], fillOpacity: 0.7 })
      )
    );
  } else if (chartType === "area") {
    chartContent = React.createElement(ResponsiveContainer, { width: "100%", height: 520 },
      React.createElement(AreaChart, { data: areaData, margin: { top: 20, right: 30, bottom: 50, left: 20 } },
        React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f3f4f6" }),
        React.createElement(XAxis, { dataKey: "x", type: "number", tick: { fontSize: 10, fill: "#9ca3af" }, tickFormatter: fmt, tickLine: false, axisLine: false,
          label: { value: xLabel ? xLabel.label : xField, position: "bottom", offset: 25, fontSize: 11, fill: "#9ca3af" } }),
        React.createElement(YAxis, { tick: { fontSize: 10, fill: "#9ca3af" }, tickFormatter: fmt, tickLine: false, axisLine: false,
          label: { value: yLabel ? yLabel.label : yField, angle: -90, position: "insideLeft", offset: 5, fontSize: 11, fill: "#9ca3af" } }),
        React.createElement(Tooltip, { content: React.createElement(CustomTooltip, null) }),
        React.createElement(Area, { dataKey: "y", name: yLabel ? yLabel.label : yField, fill: "#2563EB", fillOpacity: 0.15, stroke: "#2563EB", strokeWidth: 1.5 })
      )
    );
  }

  return React.createElement("div", { className: "space-y-8", "data-testid": "graph-page" },
    // Header
    React.createElement("div", { className: "anim-fade-up" },
      React.createElement("h1", { className: "text-4xl font-bold text-gray-900 tracking-tight", style: { fontFamily: "var(--font-heading)" } }, "Graph"),
      React.createElement("p", { className: "text-base text-gray-400 mt-2" }, "Build custom visualizations — choose axes, chart type, and color mode")
    ),

    // Controls
    React.createElement("div", { className: "bg-white rounded-xl border border-gray-100 p-5 anim-fade-up delay-1", "data-testid": "graph-controls" },
      React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
        // Chart Type
        React.createElement("div", null,
          React.createElement("label", { className: "block text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-1.5" }, "Chart Type"),
          React.createElement(Select, { value: chartType, onValueChange: setChartType },
            React.createElement(SelectTrigger, { className: "h-10 text-sm rounded-lg", "data-testid": "chart-type-select" },
              React.createElement(SelectValue, null)),
            React.createElement(SelectContent, null,
              CHART_TYPES.map(function(t) { return React.createElement(SelectItem, { key: t.key, value: t.key }, t.label); })
            )
          )
        ),
        // X Axis
        React.createElement("div", null,
          React.createElement("label", { className: "block text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-1.5" },
            chartType === "histogram" ? "Variable" : "X Axis"),
          React.createElement(Select, { value: xField, onValueChange: setXField },
            React.createElement(SelectTrigger, { className: "h-10 text-sm rounded-lg", "data-testid": "x-axis-select" },
              React.createElement(SelectValue, null)),
            React.createElement(SelectContent, null,
              FIELDS.map(function(f) { return React.createElement(SelectItem, { key: f.key, value: f.key }, f.label); })
            )
          )
        ),
        // Y Axis
        React.createElement("div", { className: chartType === "histogram" ? "opacity-40 pointer-events-none" : "" },
          React.createElement("label", { className: "block text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-1.5" }, "Y Axis"),
          React.createElement(Select, { value: yField, onValueChange: setYField },
            React.createElement(SelectTrigger, { className: "h-10 text-sm rounded-lg", "data-testid": "y-axis-select" },
              React.createElement(SelectValue, null)),
            React.createElement(SelectContent, null,
              FIELDS.map(function(f) { return React.createElement(SelectItem, { key: f.key, value: f.key }, f.label); })
            )
          )
        ),
        // Color
        React.createElement("div", { className: chartType !== "scatter" ? "opacity-40 pointer-events-none" : "" },
          React.createElement("label", { className: "block text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-1.5" }, "Color Mode"),
          React.createElement(Select, { value: colorMode, onValueChange: setColorMode },
            React.createElement(SelectTrigger, { className: "h-10 text-sm rounded-lg", "data-testid": "color-mode-select" },
              React.createElement(SelectValue, null)),
            React.createElement(SelectContent, null,
              COLOR_MODES.map(function(c) { return React.createElement(SelectItem, { key: c.key, value: c.key }, c.label); })
            )
          )
        )
      ),

      // Data count
      React.createElement("div", { className: "mt-3 flex items-center gap-3" },
        React.createElement("span", { className: "text-[11px] font-mono text-gray-400", "data-testid": "data-count" },
          chartType === "scatter" ? scatterData.length + " data points" :
          chartType === "bar" ? barData.length + " basins" :
          chartType === "histogram" ? histValues.length + " values" :
          areaData.length + " points (max 500)"
        )
      )
    ),

    // Chart
    React.createElement("div", { className: "bg-white rounded-xl border border-gray-100 p-6 anim-fade-up delay-2", "data-testid": "graph-chart" },
      React.createElement("div", { className: "mb-3" },
        React.createElement("h3", { className: "text-sm font-semibold text-gray-900", style: { fontFamily: "var(--font-heading)" } },
          chartType === "scatter" ? (xLabel ? xLabel.label : xField) + " vs " + (yLabel ? yLabel.label : yField) :
          chartType === "bar" ? "Average " + (yLabel ? yLabel.label : yField) + " by Basin" :
          chartType === "histogram" ? (xLabel ? xLabel.label : xField) + " Distribution" :
          (yLabel ? yLabel.label : yField) + " sorted by " + (xLabel ? xLabel.label : xField)
        ),
        React.createElement("p", { className: "text-[11px] text-gray-400 mt-0.5" },
          chartType === "scatter" ? "Each dot represents one river sample" :
          chartType === "bar" ? "Averaged across all samples per basin" :
          chartType === "histogram" ? "Frequency distribution across all samples" :
          "Continuous sorted profile (first 500 data points)"
        )
      ),
      chartContent
    )
  );
}

export default GraphPage;
