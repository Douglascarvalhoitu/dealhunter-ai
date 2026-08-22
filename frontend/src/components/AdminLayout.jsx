import { NavLink, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LayoutDashboard, Package, Sparkles, PenSquare, Network, BarChart3, LogOut, Upload, Settings } from "lucide-react";

const LOGO_URL = "https://customer-assets-0z36b82j.emergentagent.net/job_smart-deal-hub-1/artifacts/tkme36ut_ChatGPT%20Image%2017%20de%20ago.%20de%202026%2C%2018_42_36.png";

const NAV = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true, testId: "nav-dashboard" },
  { to: "/admin/products", label: "Products", Icon: Package, testId: "nav-products" },
  { to: "/admin/ai-control", label: "AI Sales Control", Icon: Sparkles, testId: "nav-ai-control" },
  { to: "/admin/ai-content", label: "AI Content", Icon: PenSquare, testId: "nav-ai-content" },
  { to: "/admin/networks", label: "Affiliate Networks", Icon: Network, testId: "nav-networks" },
  { to: "/admin/import", label: "Import & Alerts", Icon: Upload, testId: "nav-import" },
  { to: "/admin/reports", label: "Reports", Icon: BarChart3, testId: "nav-reports" },
  { to: "/admin/settings", label: "Settings", Icon: Settings, testId: "nav-settings" },
];

export default function AdminLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  if (loading) return <div className="min-h-screen bg-[var(--dh-navy)] text-white grid place-items-center">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-[var(--dh-navy)] text-slate-100 dh-dark">
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--dh-sidebar)] border-r border-white/5 p-5 hidden md:flex flex-col">
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src={LOGO_URL} alt="Deal Hunter AI" className="h-24 w-auto object-contain" />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, Icon, end, testId }) => (
            <NavLink key={to} to={to} end={end} data-testid={testId}
              className={({ isActive }) => `flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors ${isActive ? "bg-[var(--dh-navy-2)] text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="text-xs text-slate-400 mb-2">{user.email}</div>
          <button data-testid="logout-btn" onClick={() => { logout(); nav("/"); }}
                  className="w-full h-10 rounded-lg bg-white/5 hover:bg-white/10 text-sm flex items-center justify-center gap-2">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>
      <main className="md:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
