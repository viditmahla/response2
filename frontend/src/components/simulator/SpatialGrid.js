import React, { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { Upload } from "lucide-react";

const INDIA_TOPO =
  "https://raw.githubusercontent.com/udit-001/india-maps-data/refs/heads/main/topojson/india.json";

const FEEDSTOCKS = ["basalt", "dolomite", "calcite"];
const OMEGAS = [5, 10, 15];
const FEEDSTOCK_COLORS = {
  basalt: { low: [254, 226, 226], high: [220, 38, 38] },
  dolomite: { low: [219, 234, 254], high: [37, 99, 235] },
  calcite: { low: [209, 250, 229], high: [5, 150, 105] },
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getColor(val, min, max, feedstock) {
  if (val == null || max === min) return "rgba(148,163,184,0.4)";
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
  const { low, high } = FEEDSTOCK_COLORS[feedstock] || FEEDSTOCK_COLORS.calcite;
  return `rgb(${Math.round(lerp(low[0], high[0], t))},${Math.round(
    lerp(low[1], high[1], t)
  )},${Math.round(lerp(low[2], high[2], t))})`;
}

export default function SpatialGrid({ data, combos }) {
  const comboMap = useMemo(() => {
    const m = {};
    combos.forEach((c) => {
      m[`${c.feedstock}_${c.omega}`] = c;
    });
    return m;
  }, [combos]);

  const grouped = useMemo(() => {
    const g = {};
    data.forEach((d) => {
      if (d.latitude == null || d.longitude == null) return;
      const key = `${d.feedstock}_${d.omega_threshold}`;
      if (!g[key]) g[key] = [];
      g[key].push(d);
    });
    return g;
  }, [data]);

  const cdrRange = useMemo(() => {
    const cdrs = data
      .filter((d) => d.cdr_t_yr != null && d.cdr_t_yr > 0)
      .map((d) => d.cdr_t_yr);
    return {
      min: cdrs.length ? Math.min(...cdrs) : 0,
      max: cdrs.length ? Math.max(...cdrs) : 1,
    };
  }, [data]);

  return (
    <div className="space-y-4" data-testid="spatial-grid-section">
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Spatial Distribution of CDR Potential
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Rows: Feedstock &middot; Columns: Omega threshold &middot; Color:
            CDR intensity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-400 font-mono">Low CDR</span>
            <div className="w-16 h-1.5 rounded-full bg-gradient-to-r from-green-100 to-green-600" />
            <span className="text-[9px] text-gray-400 font-mono">High CDR</span>
          </div>
        </div>
      </div>

      {/* 3x3 Grid */}
      <div className="grid grid-cols-4 gap-0">
        {/* Column headers */}
        <div />
        {OMEGAS.map((o) => (
          <div
            key={o}
            className="text-center py-2 text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-wider"
          >
            &Omega; = {o}
          </div>
        ))}

        {/* Rows */}
        {FEEDSTOCKS.map((fs) => (
          <React.Fragment key={fs}>
            {/* Row label */}
            <div className="flex items-center justify-end pr-3">
              <span className="text-xs font-semibold text-gray-700 capitalize">
                {fs}
              </span>
            </div>

            {/* Map cells */}
            {OMEGAS.map((o) => {
              const key = `${fs}_${o}`;
              const cellData = grouped[key] || [];
              const hasData = cellData.length > 0;
              const combo = comboMap[key];

              return (
                <div
                  key={key}
                  className={`relative border border-gray-100 rounded-lg m-1 overflow-hidden ${
                    hasData ? "bg-slate-50" : "bg-gray-50/50"
                  }`}
                  data-testid={`spatial-cell-${fs}-${o}`}
                  style={{ minHeight: 200 }}
                >
                  {hasData ? (
                    <>
                      <ComposableMap
                        projection="geoMercator"
                        projectionConfig={{ center: [82, 22], scale: 380 }}
                        width={280}
                        height={240}
                        style={{ width: "100%", height: "auto" }}
                      >
                        <Geographies geography={INDIA_TOPO}>
                          {({ geographies }) =>
                            geographies.map((geo) => (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill="#F1F5F9"
                                stroke="#CBD5E1"
                                strokeWidth={0.3}
                                style={{
                                  default: { outline: "none" },
                                  hover: { outline: "none" },
                                  pressed: { outline: "none" },
                                }}
                              />
                            ))
                          }
                        </Geographies>
                        {cellData.map((d, i) => (
                          <Marker
                            key={i}
                            coordinates={[d.longitude, d.latitude]}
                          >
                            <circle
                              r={1.8}
                              fill={getColor(
                                d.cdr_t_yr,
                                cdrRange.min,
                                cdrRange.max,
                                fs
                              )}
                              fillOpacity={0.7}
                              stroke="#fff"
                              strokeWidth={0.2}
                            />
                          </Marker>
                        ))}
                      </ComposableMap>
                      <div className="absolute bottom-1 left-1 bg-white/80 backdrop-blur-sm rounded px-1.5 py-0.5">
                        <span className="text-[8px] font-mono text-gray-500">
                          {combo?.count || cellData.length} pts
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                      <Upload className="w-5 h-5 text-gray-300 mb-1.5" />
                      <p className="text-[10px] text-gray-400 font-medium">
                        No Data
                      </p>
                      <p className="text-[9px] text-gray-300 mt-0.5">
                        Upload {fs} &Omega;={o}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
