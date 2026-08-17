import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../lib/api";
import { Plus, Trash2 } from "lucide-react";

export default function AdminNetworks() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const load = () => api.get("/admin/networks").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (form.id) await api.put(`/admin/networks/${form.id}`, form);
    else await api.post("/admin/networks", form);
    setForm(null); load();
  };
  const remove = async (id) => { if (!window.confirm("Delete?")) return; await api.delete(`/admin/networks/${id}`); load(); };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold" data-testid="networks-title">Affiliate Networks</h1>
            <p className="text-slate-400 text-sm">Manage connections. Credentials are stored securely on the server.</p>
          </div>
          <button data-testid="add-network-btn" onClick={() => setForm({ name: "", country: "US", currency: "USD", account_id: "", tracking_id: "", api_status: "not_configured", feed_status: "not_configured", active: true })}
                  className="h-11 px-5 rounded-xl dh-btn-green font-semibold flex items-center gap-2"><Plus size={16} /> Add Network</button>
        </div>
        <div className="rounded-xl border border-white/5 bg-[var(--dh-navy-2)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--dh-sidebar)] text-slate-400 text-xs uppercase">
              <tr><th className="p-3 text-left">Name</th><th className="p-3">Country</th><th className="p-3">Currency</th><th className="p-3">API</th><th className="p-3">Feed</th><th className="p-3">Active</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id} className="border-t border-white/5">
                  <td className="p-3 font-semibold">{n.name}</td>
                  <td className="p-3 text-center">{n.country}</td>
                  <td className="p-3 text-center">{n.currency}</td>
                  <td className="p-3 text-center text-xs">{n.api_status}</td>
                  <td className="p-3 text-center text-xs">{n.feed_status}</td>
                  <td className="p-3 text-center">{n.active ? "Yes" : "No"}</td>
                  <td className="p-3 text-right"><button data-testid={`net-del-${n.id}`} onClick={() => remove(n.id)} className="p-2 rounded hover:bg-white/5 text-red-300"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {form && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setForm(null)}>
            <div className="bg-[var(--dh-navy-2)] border border-white/10 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-xl font-bold mb-4">New network</h3>
              <div className="grid gap-3">
                <input data-testid="nf-name" placeholder="Name (e.g. Awin)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="dh-input" />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="dh-input" />
                  <input placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="dh-input" />
                </div>
                <input placeholder="Account ID" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="dh-input" />
                <input placeholder="Tracking ID" value={form.tracking_id} onChange={(e) => setForm({ ...form, tracking_id: e.target.value })} className="dh-input" />
                <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setForm(null)} className="h-10 px-4 rounded-lg bg-white/5">Cancel</button>
                <button data-testid="nf-save" onClick={save} className="h-10 px-4 rounded-lg dh-btn-green font-semibold">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`.dh-input{width:100%;height:40px;background:#0B1121;border:1px solid rgba(255,255,255,0.1);border-radius:.5rem;padding:0 12px;color:#F8FAFC;font-size:14px}.dh-input:focus{outline:none;border-color:#2563EB}`}</style>
    </AdminLayout>
  );
}
