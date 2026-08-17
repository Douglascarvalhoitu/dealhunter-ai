import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";
import ProductCard from "../components/ProductCard";
import api, { BACKEND_URL } from "../lib/api";
import { money, discountPct, trackClickUrl } from "../lib/format";
import { Check, X, Sparkles, Store, Tag } from "lucide-react";

export default function ProductDetail() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  useEffect(() => {
    api.get(`/products/slug/${slug}`).then((r) => setP(r.data)).catch(() => setP(false));
  }, [slug]);

  if (p === null) return <PublicLayout><div className="max-w-6xl mx-auto p-8 text-slate-500">Loading…</div></PublicLayout>;
  if (p === false) return <PublicLayout><div className="max-w-6xl mx-auto p-8 text-slate-500">Product not found.</div></PublicLayout>;
  const disc = discountPct(p.price, p.old_price);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="text-xs text-slate-500 mb-4"><Link to="/deals">Deals</Link> / <Link to={`/category/${p.category}`} className="capitalize">{p.category}</Link> / <span className="text-slate-700">{p.name}</span></div>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="rounded-3xl overflow-hidden bg-slate-100 border border-slate-200">
            <img src={p.image} alt={p.name} className="w-full aspect-square object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              {p.is_demo && <span data-testid="pd-demo-badge" className="text-[10px] uppercase tracking-wider font-semibold bg-slate-900 text-white px-2 py-1 rounded-full">Demo</span>}
              <span className="inline-flex items-center gap-1 text-xs text-slate-600"><Store size={14} /> {p.store}</span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-600 capitalize"><Tag size={14} /> {p.category}</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--dh-navy)]" data-testid="pd-title">{p.name}</h1>
            <div className="mt-4 flex items-end gap-3">
              <div className="text-4xl font-bold text-[var(--dh-navy)]" data-testid="pd-price">{money(p.price, p.currency)}</div>
              {p.old_price ? <>
                <div className="text-lg line-through text-slate-400">{money(p.old_price, p.currency)}</div>
                <div className="text-sm font-bold text-white bg-[var(--dh-green)] px-2 py-1 rounded-md">-{disc}%</div>
              </> : null}
            </div>

            <p className="mt-5 text-slate-600 leading-relaxed">{p.description}</p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a data-testid="pd-cta"
                 href={trackClickUrl(BACKEND_URL, p.id)}
                 target="_blank" rel="nofollow noopener sponsored"
                 className="flex-1 h-14 grid place-items-center rounded-2xl dh-btn-green text-base font-semibold">
                Check Latest Price
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Affiliate link. Prices and availability may change.</p>

            {p.features?.length > 0 && (
              <div className="mt-8">
                <div className="font-semibold text-[var(--dh-navy)] mb-2">Key features</div>
                <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
                  {p.features.map((f, i) => <li key={i} className="flex items-start gap-2"><Check size={16} className="text-[var(--dh-green)] mt-0.5" /> {f}</li>)}
                </ul>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-[var(--dh-blue)]/20 bg-[var(--dh-blue)]/5 p-5">
              <div className="flex items-center gap-2 text-[var(--dh-blue)] font-semibold mb-3"><Sparkles size={16} /> AI Summary — Pros & Cons</div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-[var(--dh-navy)] mb-1">Pros</div>
                  <ul className="space-y-1">{(p.pros || []).map((x, i) => <li key={i} className="flex gap-2"><Check size={14} className="text-[var(--dh-green)] mt-1" /> {x}</li>)}</ul>
                </div>
                <div>
                  <div className="font-semibold text-[var(--dh-navy)] mb-1">Cons</div>
                  <ul className="space-y-1">{(p.cons || []).map((x, i) => <li key={i} className="flex gap-2"><X size={14} className="text-slate-500 mt-1" /> {x}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {p.related?.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-bold text-[var(--dh-navy)] mb-5">Related products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {p.related.map((r) => <ProductCard key={r.id} p={r} testId="pd-related-card" />)}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}
