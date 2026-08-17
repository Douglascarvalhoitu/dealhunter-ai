import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../lib/api";
import { money } from "../lib/format";
import { Plus, Trash2, Pencil, X, Sparkles } from "lucide-react";

const EMPTY = {
  name: "", description: "", category: "technology", image: "", price: 0, old_price: null,
  store: "", network: "", affiliate_url: "", commission_pct: 5, country: "US", currency: "USD",
  features: [], pros: [], cons: [], tags: [], featured: false, is_demo: false, status: "active",
};

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [scores, setScores] = useState({});

  const load = () => api.get("/products", { params: { limit: 100, search: q || undefined } }).then((r) => setItems(r.data.items || []));
  useEffect(() => { load(); }, [q]);

  const save = async () => {
    const payload = { ...form,
      price: Number(form.price),
      old_price: form.old_price ? Number(form.old_price) : null,
      commission_pct: Number(form.commission_pct),
      features: typeof form.features === "string" ? form.features.split(",").map(s => s.trim()).filter(Boolean) : form.features,
      pros: typeof form.pros === "string" ? form.pros.split(",").map(s => s.trim()).filter(Boolean) : form.pros,
      cons: typeof form.cons === "string" ? form.cons.split(",").map(s => s.trim()).filter(Boolean) : form.cons,
      tags: typeof form.tags === "string" ? form.tags.split(",").map(s => s.trim()).filter(Boolean) : form.tags,
    };
    if (form.id) await api.put(`/admin/products/${form.id}`, payload);
    else await api.post("/admin/products", payload);
    setForm(null); load();
  };
  const remove = async (id) => { if (!window.confirm("Delete this product?")) return; await api.delete(`/admin/products/${id}`); load(); };

  const loadScore = async (pid) => {
    try { const r = await api.get(`/admin/ai/opportunity-score/${pid}`); setScores((s) => ({ ...s, [pid]: r.data })); } catch {}
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold" data-testid="products-title">Products</h1>
            <p className="text-slate-400 text-sm">Manage your affiliate catalog.</p>
          </div>
          <button data-testid="add-product-btn" onClick={() => setForm({ ...EMPTY })}
                  className="h-11 px-5 rounded-xl dh-btn-green font-semibold flex items-center gap-2"><Plus size={16} /> Add Product</button>
        </div>

        <input data-testid="products-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…"
               className="w-full max-w-md mb-5 h-10 rounded-lg bg-[var(--dh-navy-2)] border border-white/10 px-4 text-sm focus:outline-none focus:border-[var(--dh-blue)]" />

        <div className="rounded-xl border border-white/5 bg-[var(--dh-navy-2)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--dh-sidebar)] text-slate-400 text-xs uppercase">
              <tr>
                <th className="p-3 text-left">Product</th><th className="p-3 text-left">Category</th>
                <th className="p-3 text-right">Price</th><th className="p-3 text-right">Clicks</th>
                <th className="p-3 text-right">Sales</th><th className="p-3 text-left">Score</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-white/5" data-testid={`product-row-${p.id}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <div className="font-semibold text-slate-100">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.store} {p.is_demo && <span className="ml-1 uppercase text-[10px] text-slate-500">DEMO</span>}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 capitalize text-slate-300">{p.category}</td>
                  <td className="p-3 text-right">{money(p.price, p.currency)}</td>
                  <td className="p-3 text-right">{p.clicks}</td>
                  <td className="p-3 text-right">{p.sales}</td>
                  <td className="p-3">
                    {scores[p.id] ? (
                      <span className={`text-xs font-semibold ${scores[p.id].score == null ? "text-slate-400" : scores[p.id].score >= 80 ? "text-red-300" : scores[p.id].score >= 60 ? "text-emerald-300" : scores[p.id].score >= 40 ? "text-yellow-300" : "text-slate-400"}`}>
                        {scores[p.id].label}{scores[p.id].score != null ? ` · ${scores[p.id].score}` : ""}
                      </span>
                    ) : (
                      <button data-testid={`score-btn-${p.id}`} onClick={() => loadScore(p.id)} className="text-xs text-[var(--dh-blue-glow)] hover:underline inline-flex items-center gap-1"><Sparkles size={12} /> Score</button>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button data-testid={`edit-${p.id}`} onClick={() => setForm({ ...p })} className="p-2 rounded hover:bg-white/5"><Pencil size={14} /></button>
                    <button data-testid={`del-${p.id}`} onClick={() => remove(p.id)} className="p-2 rounded hover:bg-white/5 text-red-300"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {form && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setForm(null)}>
            <div className="bg-[var(--dh-navy-2)] border border-white/10 rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto dh-scrollbar" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-bold">{form.id ? "Edit product" : "New product"}</h3>
                <button onClick={() => setForm(null)}><X size={18} /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <Field label="Name"><input data-testid="pf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="dh-input" /></Field>
                <Field label="Category">
                  <select data-testid="pf-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="dh-input">
                    {["technology","gaming","audio","home","pets","fitness","smartphones"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Image URL"><input data-testid="pf-image" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="dh-input" /></Field>
                <Field label="Store"><input data-testid="pf-store" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} className="dh-input" /></Field>
                <Field label="Price"><input data-testid="pf-price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="dh-input" /></Field>
                <Field label="Old price (optional)"><input data-testid="pf-oldprice" type="number" step="0.01" value={form.old_price || ""} onChange={(e) => setForm({ ...form, old_price: e.target.value })} className="dh-input" /></Field>
                <Field label="Currency"><input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="dh-input" /></Field>
                <Field label="Country"><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="dh-input" /></Field>
                <Field label="Affiliate URL"><input data-testid="pf-affurl" value={form.affiliate_url} onChange={(e) => setForm({ ...form, affiliate_url: e.target.value })} className="dh-input" /></Field>
                <Field label="Network"><input data-testid="pf-network" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} className="dh-input" /></Field>
                <Field label="Commission %"><input type="number" step="0.1" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} className="dh-input" /></Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="dh-input">
                    <option value="active">active</option><option value="paused">paused</option>
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Description"><textarea data-testid="pf-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="dh-input" /></Field>
                </div>
                <Field label="Features (comma separated)"><input value={Array.isArray(form.features) ? form.features.join(", ") : form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className="dh-input" /></Field>
                <Field label="Pros (comma)"><input value={Array.isArray(form.pros) ? form.pros.join(", ") : form.pros} onChange={(e) => setForm({ ...form, pros: e.target.value })} className="dh-input" /></Field>
                <Field label="Cons (comma)"><input value={Array.isArray(form.cons) ? form.cons.join(", ") : form.cons} onChange={(e) => setForm({ ...form, cons: e.target.value })} className="dh-input" /></Field>
                <Field label="Tags (comma)"><input value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="dh-input" /></Field>
                <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setForm(null)} className="h-10 px-4 rounded-lg bg-white/5">Cancel</button>
                <button data-testid="pf-save" onClick={save} className="h-10 px-4 rounded-lg dh-btn-green font-semibold">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`.dh-input{width:100%;height:40px;background:#0B1121;border:1px solid rgba(255,255,255,0.1);border-radius:.5rem;padding:0 12px;color:#F8FAFC;font-size:14px}.dh-input:focus{outline:none;border-color:#2563EB}textarea.dh-input{height:auto;padding:10px 12px}`}</style>
    </AdminLayout>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="text-xs text-slate-400 mb-1 block">{label}</span>{children}</label>;
}
