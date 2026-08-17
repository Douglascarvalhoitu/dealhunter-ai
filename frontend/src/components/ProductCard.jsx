import { Link } from "react-router-dom";
import { money, discountPct, trackClickUrl } from "../lib/format";
import { BACKEND_URL } from "../lib/api";

export default function ProductCard({ p, testId = "product-card" }) {
  const disc = discountPct(p.price, p.old_price);
  return (
    <div data-testid={testId} className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden dh-card-hover">
      {p.is_demo && (
        <span className="absolute top-3 left-3 z-10 text-[10px] uppercase tracking-wider font-semibold bg-slate-900/80 text-white px-2 py-1 rounded-full">Demo</span>
      )}
      {disc > 0 && (
        <span className="absolute top-3 right-3 z-10 text-xs font-bold bg-[var(--dh-green)] text-white px-2 py-1 rounded-full">-{disc}%</span>
      )}
      <Link to={`/product/${p.slug}`} className="block">
        <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
          <img src={p.image} alt={p.name}
               loading="lazy"
               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
      <div className="px-4 pb-4">
        <a data-testid={`${testId}-cta`}
           href={trackClickUrl(BACKEND_URL, p.id)}
           target="_blank" rel="nofollow noopener sponsored"
           className="w-full h-11 grid place-items-center rounded-xl dh-btn-green font-semibold">
          View Deal
        </a>
      </div>
    </div>
  );
}
