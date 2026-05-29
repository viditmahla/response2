import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { BarChart3, FlaskConical, Map, LineChart, Database, MessageCircle, X, Menu } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";

const navItems = [
  { to: "/", label: "Analytics", icon: BarChart3 },
  { to: "/simulator", label: "ERW Simulator", icon: FlaskConical },
  { to: "/map", label: "Spatial CDR", icon: Map },
  { to: "/graph", label: "Graph", icon: LineChart },
  { to: "/data", label: "Data", icon: Database },
];

export default function Shell() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFBFC]" data-testid="app-shell">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100" data-testid="topbar">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold tracking-tight text-blue-600" style={{ fontFamily: "var(--font-heading)" }}>
                resp<span className="text-blue-500">:</span>onse
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1" data-testid="main-nav">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  className={({ isActive }) =>
                    `px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <button
              onClick={() => setChatOpen(!chatOpen)}
              data-testid="chat-toggle"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                chatOpen ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
        <Outlet />
      </main>

      {/* Chat */}
      {chatOpen && (
        <div className="fixed bottom-4 right-4 w-[380px] h-[520px] z-50 rounded-2xl bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden" data-testid="chat-widget">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                <MessageCircle className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">ERW AI Assistant</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors" data-testid="chat-close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ChatWidget />
        </div>
      )}
    </div>
  );
}
