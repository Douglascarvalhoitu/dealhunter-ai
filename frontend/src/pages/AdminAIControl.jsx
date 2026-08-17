import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../lib/api";
import { money } from "../lib/format";
import { Sparkles, Target, Zap, Gauge, TrendingUp, Calendar } from "lucide-react";

const GOALS = [1, 3, 5, 10, 20, 50, 100];
const MODES = [
  { key: "conservative", label: "Conservative", desc: "Few recommendations, focus on proven products." },
  { key: "balanced", label: "Balanced", desc: "Test new products while keeping top performers." },
  { key: "aggressive", label: "Aggressive", desc: "Run more content, SEO and headline experiments." },
];

export default function AdminAIControl() {
  const [settings, setSettings] = useState({ daily_sales_goal: 10, growth_mode: "balanced" });
  const [strat, setStrat] = useState(null);
  const [sim, setSim] = useState({ desired_sales: 10, conversion_rate: 2, avg_commission: 5 });
  const [simRes, setSimRes] = useState(null);
  const [plan, setPlan] = useState(null);
  const [customGoal, setCustomGoal] = useState("");

  const load = () => {
    api.get("/admin/dashboard/settings").then((r) => setSettings({ daily_sales_goal: r.data.daily_sales_goal || 10, growth_mode: r.data.growth_mode || "balanced" })).catch(() => {});
    api.get("/admin/ai/strategist").then((r) => setStrat(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async (patch) => {
    const s = { ...settings, ...patch };
    setSettings(s);
    await api.post("/admin/dashboard/settings", s);
    load();
  };

  const runSim = async () => {
    const r = await api.post("/admin/dashboard/simulator", {
      desired_sales: Number(sim.desired_sales),
      conversion_rate: Number(sim.conversion_rate),
      avg_commission: Number(sim.avg_commission),
    });
    setSimRes(r.data);
  };

  const generatePlan = async () => {
    const r = await api.post("/admin/ai/daily-plan");
    setPlan(r.data);
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold" data-testid="ai-control-title">AI Sales Control Center</h1>
          <p className="text-slate-400 text-sm">Set your daily goal, pick growth intensity, review AI recommendations. All actions are advisory — nothing publishes automatically.</p>
        </div>

        {/* Goal */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4"><Target size={16} className="text-[var(--dh-green)]" /><h3 className="font-display font-semibold">Daily Sales Goal</h3></div>
            <div className="flex flex-wrap gap-2 mb-3">
              {GOALS.map((g) => (
                <button key={g} data-testid={`goal-${g}`} onClick={() => saveSettings({ daily_sales_goal: g })}
                        className={`px-4 h-10 rounded-full border text-sm ${settings.daily_sales_goal === g ? "bg-[var(--dh-green)] border-transparent text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}>
                  {g}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} placeholder="Custom goal" data-testid="goal-custom" className="dh-input" />
              <button data-testid="goal-save-custom" onClick={() => customGoal && saveSettings({ daily_sales_goal: Number(customGoal) })} className="h-10 px-4 rounded-lg dh-btn-blue text-sm font-semibold">Save</button>
            </div>
            <p className="text-xs text-slate-500 mt-3">This is a goal, not guaranteed sales.</p>
          </div>

          <div className="rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4"><Zap size={16} className="text-[var(--dh-blue-glow)]" /><h3 className="font-display font-semibold">Growth Mode</h3></div>
            <div className="grid gap-2">
              {MODES.map((m) => (
                <button key={m.key} data-testid={`mode-${m.key}`} onClick={() => saveSettings({ growth_mode: m.key })}
                        className={`text-left p-3 rounded-lg border ${settings.growth_mode === m.key ? "border-[var(--dh-blue)] bg-[var(--dh-blue)]/10" : "border-white/10 hover:bg-white/5"}`}>
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-xs text-slate-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Strategist */}
        <div className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-3"><Sparkles size={16} className="text-[var(--dh-blue-glow)]" /><h3 className="font-display font-semibold">AI Sales Strategist</h3></div>
          {strat?.mode_note && <div className="text-xs text-slate-400 mb-3">{strat.mode_note}</div>}
          <ul className="grid md:grid-cols-2 gap-3">
            {(strat?.recommendations || []).map((r, i) => (
              <li key={i} data-testid={`strategist-rec-${i}`} className="rounded-lg border border-white/10 p-4">
                <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${r.priority === "high" ? "text-red-300" : "text-yellow-300"}`}>{r.priority} priority</div>
                <div className="font-semibold mb-1">{r.title}</div>
                <div className="text-sm text-slate-300">{r.detail}</div>
              </li>
            ))}
            {(!strat || strat.recommendations?.length === 0) && <li className="text-slate-400 text-sm">No recommendations yet. Add products and drive traffic to gather signals.</li>}
          </ul>
        </div>

        {/* Simulator */}
        <div className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-3"><Gauge size={16} className="text-[var(--dh-green)]" /><h3 className="font-display font-semibold">Sales Goal Simulator</h3></div>
          <div className="grid md:grid-cols-4 gap-3">
            <label className="block"><span className="text-xs text-slate-400 block mb-1">Desired sales/day</span><input data-testid="sim-sales" type="number" value={sim.desired_sales} onChange={(e) => setSim({ ...sim, desired_sales: e.target.value })} className="dh-input" /></label>
            <label className="block"><span className="text-xs text-slate-400 block mb-1">Conversion rate (%)</span><input data-testid="sim-cr" type="number" step="0.1" value={sim.conversion_rate} onChange={(e) => setSim({ ...sim, conversion_rate: e.target.value })} className="dh-input" /></label>
            <label className="block"><span className="text-xs text-slate-400 block mb-1">Avg commission (USD)</span><input data-testid="sim-comm" type="number" step="0.5" value={sim.avg_commission} onChange={(e) => setSim({ ...sim, avg_commission: e.target.value })} className="dh-input" /></label>
            <button data-testid="sim-run" onClick={runSim} className="h-10 px-4 rounded-lg dh-btn-blue font-semibold self-end">Calculate</button>
          </div>
          {simRes && (
            <div className="mt-4 grid md:grid-cols-4 gap-3 text-sm" data-testid="sim-results">
              <Stat label="Required visitors" value={simRes.required_visitors} />
              <Stat label="Expected sales" value={simRes.expected_sales} />
              <Stat label="Expected commission" value={money(simRes.expected_commission)} />
              <Stat label="Monthly commission" value={money(simRes.monthly.commission)} />
              <div className="md:col-span-4 text-xs text-slate-500">{simRes.note}</div>
            </div>
          )}
        </div>

        {/* Daily plan */}
        <div className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Calendar size={16} className="text-[var(--dh-blue-glow)]" /><h3 className="font-display font-semibold">Today's Growth Plan</h3></div>
            <button data-testid="plan-generate" onClick={generatePlan} className="h-10 px-4 rounded-lg dh-btn-blue text-sm font-semibold">Generate Today's Plan</button>
          </div>
          {plan && <>
            <div className="text-sm text-slate-300 mb-3">Target: <span className="font-semibold">{plan.target} sales</span> · Mode: <span className="capitalize">{plan.mode}</span></div>
            <ul className="grid md:grid-cols-2 gap-3">
              {plan.tasks.map((t, i) => (
                <li key={i} data-testid={`plan-task-${i}`} className="rounded-lg border border-white/10 p-4">
                  <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${t.priority === "high" ? "text-red-300" : "text-yellow-300"}`}>{t.priority} priority</div>
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-xs text-slate-400 mt-1">Reason: {t.reason}</div>
                  <div className="text-xs text-slate-400">Expected: {t.expected}</div>
                </li>
              ))}
            </ul>
            <div className="text-xs text-slate-500 mt-3">{plan.note}</div>
          </>}
        </div>
      </div>
      <style>{`.dh-input{width:100%;height:40px;background:#0B1121;border:1px solid rgba(255,255,255,0.1);border-radius:.5rem;padding:0 12px;color:#F8FAFC;font-size:14px}.dh-input:focus{outline:none;border-color:#2563EB}`}</style>
    </AdminLayout>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="text-[11px] uppercase text-slate-400">{label}</div>
      <div className="mt-1 font-display font-bold text-xl">{value}</div>
    </div>
  );
}
