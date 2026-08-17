import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../lib/api";
import { money } from "../lib/format";

export default function AdminReports() {
  const [period, setPeriod] = useState("weekly");
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/admin/reports/${period}`).then((r) => setData(r.data)); }, [period]);

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl font-bold" data-testid="reports-title">Reports</h1>
          <div className="flex gap-2">
            {["daily", "weekly", "monthly"].map((p) => (
              <button key={p} data-testid={`period-${p}`} onClick={() => setPeriod(p)} className={`h-10 px-4 rounded-lg text-sm ${period === p ? "dh-btn-blue text-white" : "bg-white/5 text-slate-300"}`}>{p}</button>
            ))}
          </div>
        </div>
        {data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card label="Clicks" value={data.clicks} />
              <Card label="Confirmed sales" value={data.sales} />
              <Card label="Pending sales" value={data.pending} />
              <Card label="Conversion rate" value={`${data.conversion_rate}%`} />
              <Card label="Revenue" value={money(data.revenue)} />
              <Card label="Commission" value={money(data.commission)} tone="green" />
            </div>

            <div className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
              <h3 className="font-display font-semibold mb-3">Top Products</h3>
              <table className="w-full text-sm">
                <thead className="text-slate-400 text-xs uppercase"><tr><th className="text-left p-2">Name</th><th className="p-2 text-right">Clicks</th><th className="p-2 text-right">Sales</th><th className="p-2 text-right">Commission</th></tr></thead>
                <tbody>
                  {data.top_products.map((p) => (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="p-2">{p.name}</td>
                      <td className="p-2 text-right">{p.clicks}</td>
                      <td className="p-2 text-right">{p.sales}</td>
                      <td className="p-2 text-right">{money(p.commission_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <div className="text-slate-400">Loading…</div>}
      </div>
    </AdminLayout>
  );
}

function Card({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-2 font-display font-bold text-2xl ${tone === "green" ? "text-emerald-400" : "text-slate-100"}`}>{value}</div>
    </div>
  );
}
