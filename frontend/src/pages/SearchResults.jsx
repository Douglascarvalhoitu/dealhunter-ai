import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";
import ProductCard from "../components/ProductCard";
import api from "../lib/api";
import { Sparkles } from "lucide-react";

export default function SearchResults() {
  const [sp] = useSearchParams();
  const q = sp.get("q") || "";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ results: [], filters: {} });

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    api.post("/ai/search", { query: q })
      .then((r) => setData(r.data))
      .catch(() => setData({ results: [], filters: {} }))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-[var(--dh-blue)]" />
          <span className="text-sm text-[var(--dh-blue)] font-semibold">AI Search</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--dh-navy)]" data-testid="search-title">
          Results for "{q}"
        </h1>
        {data.filters && (data.filters.category || data.filters.max_price) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {data.filters.category && <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1">Category: {data.filters.category}</span>}
            {data.filters.max_price && <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1">Max: ${data.filters.max_price}</span>}
          </div>
        )}
        <div className="mt-8">
          {loading ? <div className="text-slate-500">Searching…</div> :
            data.results?.length === 0 ? <div data-testid="search-empty" className="text-slate-500">No products found. Try a different query.</div> :
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.results.map((p) => <ProductCard key={p.id} p={p} testId="search-card" />)}
            </div>}
        </div>
      </div>
    </PublicLayout>
  );
}
