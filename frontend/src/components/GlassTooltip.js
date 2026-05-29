import React from "react";

export function GlassTooltip(props) {
  const { active, payload, label, formatter } = props;
  if (!active || !payload || payload.length === 0) return null;

  const items = payload.map(function(entry, index) {
    const displayVal = formatter
      ? formatter(entry.value, entry.name)
      : typeof entry.value === "number"
      ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : entry.value;

    return React.createElement("div", { key: index, className: "flex items-center gap-2 text-[11px]" },
      React.createElement("span", { className: "w-2 h-2 rounded-full flex-shrink-0", style: { backgroundColor: entry.color } }),
      React.createElement("span", { className: "text-gray-400" }, entry.name, ":"),
      React.createElement("span", { className: "font-mono font-medium text-gray-700" }, displayVal)
    );
  });

  const children = [];
  if (label) {
    children.push(React.createElement("p", { key: "label", className: "text-[11px] font-semibold text-gray-900 mb-1" }, label));
  }
  children.push.apply(children, items);

  return React.createElement("div", { className: "glass-tooltip" }, children);
}

export default GlassTooltip;
