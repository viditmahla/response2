import { cn } from "@/lib/utils";

export default function SectionHeader({ number, title, description, className }) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{number}</span>
        <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>{title}</h3>
      </div>
      {description && <p className="text-sm text-gray-400 ml-12">{description}</p>}
    </div>
  );
}
