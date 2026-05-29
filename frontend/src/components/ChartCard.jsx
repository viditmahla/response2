export default function ChartCard({ title, subtitle, children, className = "", testId }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-5 transition-all duration-200 hover:shadow-sm ${className}`}
      data-testid={testId}>
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>{title}</h4>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
