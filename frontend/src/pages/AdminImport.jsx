import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../lib/api";
import { toast } from "sonner";
import { Upload, Sparkles } from "lucide-react";

const SAMPLE = JSON.stringify({
  associate_tag: "yourtag-20",
  items: [{
    name: "Sample Product",
    description: "Short description of the product.",
    category: "technology",
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=80",
    price: 199.99,
    old_price: 249.99,
    store: "Amazon",
    network: "Amazon Associates",
    affiliate_url: "https://www.amazon.com/dp/B0EXAMPLE",
    commission_pct: 4.0,
    country: "US",
    currency: "USD",
    features: ["Feature 1", "Feature 2"]
  }]
}, null, 2);

export default function AdminImport() {
  const [json, setJson] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const loadAlerts = () => api.get("/admin/alerts").then((r) => setAlerts(r.data)).catch(() => {});
  useEffect(() => { loadAlerts(); }, []);

  const runImport = async () => {
    setBusy(true); setResult(null);
    try {
      const parsed = JSON.parse(json);
      const r = await api.post("/admin/import/feed", parsed);
      setResult(r.data);
      toast.success(`Imported: ${r.data.created} created, ${r.data.updated} updated`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message);
    } finally { setBusy(false); }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setJson(String(reader.result || ""));
    reader.readAsText(f);
  };

  const checkAlerts = async () => {
    const r = await api.post("/admin/alerts/check");
    toast.success(`Triggered ${r.data.triggered_count} alert(s)`);
    loadAlerts();
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-6xl">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2" data-testid="import-title"><Upload size={22} /> Import & Alerts</h1>
        <p className="text-slate-400 text-sm">Bulk-import products from an Amazon-compatible JSON feed. All fields required per item: name, category, image, price, affiliate_url. Provide <code className="text-slate-200">associate_tag</code> to auto-append it to URLs.</p>

        <div className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Feed Import (JSON)</h3>
            <label className="text-xs px-3 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-2 cursor-pointer">
              <input type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
              Upload .json
            </label>
          </div>
          <textarea data-testid="import-json" rows={14} value={json} onChange={(e) => setJson(e.target.value)}
                    className="w-full bg-[#0B1121] border border-white/10 rounded-lg p-3 font-mono text-xs text-slate-100" />
          <div className="mt-3 flex justify-end">
            <button data-testid="import-run" onClick={runImport} disabled={busy} className="h-10 px-5 rounded-lg dh-btn-green font-semibold flex items-center gap-2">
              <Sparkles size={14} /> {busy ? "Importing…" : "Import Products"}
            </button>
          </div>
          {result && (
            <div className="mt-4 text-sm text-slate-200" data-testid="import-result">
              <div>Created: <span className="font-bold text-emerald-300">{result.created}</span></div>
              <div>Updated: <span className="font-bold text-blue-300">{result.updated}</span></div>
              <div>Errors: <span className="font-bold text-red-300">{result.errors.length}</span></div>
              {result.errors.length > 0 && <pre className="mt-2 bg-black/30 p-3 rounded text-xs">{JSON.stringify(result.errors, null, 2)}</pre>}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3">Tip: Amazon PA-API 5.0 output can be mapped to this schema. For advanced auto-sync (scheduled), Amazon PA-API credentials are required.</p>
        </div>

        <div className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Price Alerts</h3>
            <button data-testid="alerts-check" onClick={checkAlerts} className="h-10 px-4 rounded-lg dh-btn-blue text-sm font-semibold">Check triggers now</button>
          </div>
          {alerts.length === 0 ? <div className="text-slate-400 text-sm">No alerts yet.</div> :
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-xs uppercase"><tr><th className="text-left p-2">Email</th><th className="text-left p-2">Product</th><th className="text-right p-2">Target</th><th className="p-2">Status</th></tr></thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="border-t border-white/5">
                    <td className="p-2">{a.email}</td>
                    <td className="p-2">{a.product_name}</td>
                    <td className="p-2 text-right">${a.target_price}</td>
                    <td className="p-2 text-center"><span className={`text-xs font-bold ${a.status === "triggered" ? "text-emerald-300" : "text-yellow-300"}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>}
          <p className="text-xs text-slate-500 mt-3">Email delivery requires an email integration (Resend/SendGrid). Triggered alerts are recorded server-side.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
