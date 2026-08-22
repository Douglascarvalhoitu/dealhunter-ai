import { Link } from "react-router-dom";
import { Heart, GitCompare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { money, discountPct, trackClickUrl } from "../lib/format";
import { BACKEND_URL } from "../lib/api";
import { isFav, toggleFav, isCompared, toggleCompare } from "../lib/store";

export default function ProductCard({ p, testId = "product-card" }) {
  const disc = discountPct(p.price, p.old_price);
  const [fav, setFav] = useState(isFav(p.id));
  const [cmp, setCmp] = useState(isCompared(p.id));

  const onFav = (e) => { e.preventDefault(); e.stopPropagation(); toggleFav(p.id); const now = isFav(p.id); setFav(now); toast.success(now ? "Added to favorites" : "Removed from favorites"); };
  const onCmp = (e) => {
    e.preventDefault(); e.stopPropagation();
    const r = toggleCompare(p.id);
    if (r.error) { toast.error(r.error); return; }
    const now = isCompared(p.id); setCmp(now);
    toast.success(now ? "Added to compare" : "Removed from compare");
  };

  return (
    <div data-testid={testId} className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden dh-card-hover">
      {p.is_demo && (
        <span className="absolute top-3 left-3 z-10 text-[10px] uppercase tracking-wider font-semibold bg-slate-900/80 text-white px-2 py-1 rounded-full">Demo</span>
      )}
      {disc > 0 && (
        <span className="absolute top-3 right-14 z-10 text-xs font-bold bg-[var(--dh-green)] text-white px-2 py-1 rounded-full">-{disc}%</span>
      )}
      <button data-testid={`${testId}-fav`} onClick={onFav} className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full grid place-items-center bg-white/90 border border-slate-200 shadow-sm hover:scale-105 ${fav ? "text-rose-500" : "text-slate-500"}`}>
        <Heart size={16} fill={fav ? "currentColor" : "none"} />
      </button>
      <Link to={`/product/${p.slug}`} className="block">
        <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
          <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">{p.category}</div>
          <div className="font-semibold text-[var(--dh-navy)] line-clamp-2 min-h-[3rem]">{p.name}</div>
          <div className="mt-3 flex items-end gap-2">
            <div className="text-xl font-bold text-[var(--dh-navy)]">{money(p.price, p.currency)}</div>
            {p.old_price ? <div className="text-sm line-through text-slate-400">{money(p.old_price, p.currency)}</div> : null}
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 flex gap-2">
        <a data-testid={`${testId}-cta`} href={trackClickUrl(BACKEND_URL, p.id)} target="_blank" rel="nofollow noopener sponsored"
           className="flex-1 h-11 grid place-items-center rounded-xl dh-btn-green font-semibold">View Deal</a>
        <button data-testid={`${testId}-compare`} onClick={onCmp} title="Add to compare"
                className={`h-11 w-11 grid place-items-center rounded-xl border ${cmp ? "border-[var(--dh-blue)] text-[var(--dh-blue)] bg-[var(--dh-blue)]/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
          <GitCompare size={16} />
        </button>
      </div>
    </div>
  );
}
