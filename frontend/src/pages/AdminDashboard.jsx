import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../lib/api";
import { money } from "../lib/format";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { CircleDollarSign, Target, TrendingUp, ShoppingCart, MousePointerClick, Percent, Sparkles, CheckCircle2, Circle } from "lucide-react";

function KPI({ label, value, sub, Icon, tone = "default" }) {
  const toneCls = { green: "text-emerald-400", blue: "text-blue-400", default: "text-slate-100" }[tone];
  return (
    <div data-testid={`kpi-${label.replace(/\s+/g,'-').toLowerCase()}`} className="rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
      <div className="flex items-center justify-between text-slate-400 text-xs uppercase tracking-wider">
        <span>{label}</span><Icon size={16} />
      </div>
      <div className={`mt-2 font-display text-3xl font-bold ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [qs, setQs] = useState(null);
  useEffect(() => {
    api.get("/admin/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/quick-start").then((r) => setQs(r.data)).catch(() => {});
  }, []);

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold" data-testid="dash-title">Dashboard</h1>
          <p className="text-slate-400 text-sm">Real-time performance overview. Estimates only until real conversions are confirmed.</p>
        </div>

        {stats ? <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label="Today's Clicks" value={stats.today_clicks} Icon={MousePointerClick} />
            <KPI label="Today's Sales" value={stats.today_sales} sub={`Goal: ${stats.daily_goal} · Remaining: ${stats.remaining_goal}`} Icon={ShoppingCart} tone="green" />
            <KPI label="Today's Revenue" value={money(stats.today_revenue)} Icon={CircleDollarSign} />
            <KPI label="Today's Commission" value={money(stats.today_commission)} Icon={CircleDollarSign} tone="green" />
            <KPI label="Conversion Rate" value={`${stats.conversion_rate}%`} Icon={Percent} tone="blue" />
            <KPI label="Daily Goal" value={stats.daily_goal} sub={`Growth mode: ${stats.growth_mode}`} Icon={Target} tone="blue" />
            <KPI label="Month Sales" value={stats.month_sales} Icon={TrendingUp} />
            <KPI label="Month Commission" value={money(stats.month_commission)} Icon={CircleDollarSign} tone="green" />
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mt-6">
            <div className="lg:col-span-2 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">Last 14 days · Clicks & Sales</h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={stats.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#151F32", border: "1px solid #1E293B" }} />
                    <Line type="monotone" dataKey="clicks" stroke="#60A5FA" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
              <h3 className="font-display font-semibold mb-3">Top products (clicks)</h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={stats.top_products.map(p => ({ name: p.name.slice(0,18), clicks: p.clicks }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis type="number" stroke="#64748B" fontSize={11} />
                    <YAxis type="category" dataKey="name" width={120} stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#151F32", border: "1px solid #1E293B" }} />
                    <Bar dataKey="clicks" fill="#2563EB" radius={[0,6,6,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {qs && (
            <div className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-[var(--dh-blue-glow)]" />
                <h3 className="font-display font-semibold">Quick Start · Let's make your first affiliate sale</h3>
                <span className="ml-auto text-xs text-slate-400">{qs.progress}% complete</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-4">
                <div className="h-full bg-[var(--dh-green)]" style={{ width: `${qs.progress}%` }} />
              </div>
              <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                {qs.steps.map((s) => (
                  <li key={s.key} data-testid={`qs-step-${s.key}`} className={`flex items-center gap-2 ${s.done ? "text-emerald-300" : "text-slate-300"}`}>
                    {s.done ? <CheckCircle2 size={16} /> : <Circle size={16} />} {s.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </> : <div className="text-slate-400">Loading…</div>}
      </div>
    </AdminLayout>
  );
}
