import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";
import api, { BACKEND_URL } from "../lib/api";
import { getCompare, toggleCompare } from "../lib/store";
import { money, discountPct, trackClickUrl } from "../lib/format";
import { X, Check, GitCompare } from "lucide-react";

export default function ComparePage() {
  const [items, setItems] = useState([]);
  const load = () => {
    const ids = getCompare();
    if (!ids.length) { setItems([]); return; }
    api.get("/products", { params: { limit: 200 } }).then((r) => {
      const set = new Set(ids);
      setItems((r.data.items || []).filter((p) => set.has(p.id)));
    });
  };
  useEffect(() => { load(); }, []);
  const remove = (id) => { toggleCompare(id); load(); };
  const best = items.length ? [...items].sort((a, b) => a.price - b.price)[0] : null;

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--dh-navy)] flex items-center gap-2" data-testid="compare-title">
          <GitCompare /> Compare Products
        </h1>
        <p className="text-slate-500 mt-2">Side-by-side comparison — up to 4 products.</p>
        {items.length === 0 ? (
          <div className="text-slate-500 mt-8" data-testid="compare-empty">Nothing to compare yet. Tap the compare icon on product cards to add up to 4.</div>
        ) : (
          <div className="mt-8 overflow-x-auto dh-scrollbar">
            <div className="grid gap-4" style={{ gridTemplateColumns: `160px repeat(${items.length}, minmax(220px,1fr))` }}>
              <div />
              {items.map((p) => (
                <div key={p.id} className="relative rounded-2xl border border-slate-200 bg-white p-4">
                  <button onClick={() => remove(p.id)} className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full bg-slate-100 hover:bg-slate-200"><X size={14} /></button>
                  <img src={p.image} alt={p.name} className="w-full aspect-[4/3] object-cover rounded-lg mb-3" />
                  <Link to={`/product/${p.slug}`} className="font-semibold text-[var(--dh-navy)] line-clamp-2">{p.name}</Link>
                </div>
              ))}
              <Row label="Price" values={items.map((p) => (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{money(p.price, p.currency)}</span>
                  {best?.id === p.id && items.length > 1 && <span className="text-[10px] font-bold bg-[var(--dh-green)] text-white rounded-full px-2 py-0.5">Best Value</span>}
                </div>
              ))} />
              <Row label="Discount" values={items.map((p) => <span>{discountPct(p.price, p.old_price) > 0 ? `-${discountPct(p.price, p.old_price)}%` : "—"}</span>)} />
              <Row label="Store" values={items.map((p) => <span>{p.store}</span>)} />
              <Row label="Category" values={items.map((p) => <span className="capitalize">{p.category}</span>)} />
              <Row label="Features" values={items.map((p) => (
                <ul className="text-sm text-slate-700 space-y-1">
                  {(p.features || []).slice(0, 5).map((f, i) => <li key={i} className="flex gap-1"><Check size={12} className="text-[var(--dh-green)] mt-1" /> {f}</li>)}
                </ul>
              ))} />
              <Row label="Action" values={items.map((p) => (
                <a href={trackClickUrl(BACKEND_URL, p.id)} target="_blank" rel="nofollow noopener sponsored"
                   className="h-11 grid place-items-center rounded-xl dh-btn-green font-semibold">View Deal</a>
              ))} />
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

function Row({ label, values }) {
  return (
    <>
      <div className="text-xs uppercase tracking-wider text-slate-500 self-center border-t border-slate-100 pt-4">{label}</div>
      {values.map((v, i) => <div key={i} className="border-t border-slate-100 pt-4">{v}</div>)}
    </>
  );
}
