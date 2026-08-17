import { useEffect, useState } from "react";
import PublicLayout from "../components/PublicLayout";
import ProductCard from "../components/ProductCard";
import api from "../lib/api";

export default function DealsPage() {
  const [items, setItems] = useState([]);
  const [sort, setSort] = useState("popular");
  useEffect(() => {
    api.get("/products", { params: { sort, limit: 60 } })
      .then((r) => setItems(r.data.items || []))
      .catch(() => setItems([]));
  }, [sort]);
  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--dh-navy)]" data-testid="deals-title">All Deals</h1>
          <select data-testid="deals-sort" value={sort} onChange={(e) => setSort(e.target.value)}
                  className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm">
            <option value="popular">Most popular</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="biggest_drop">Biggest price drop</option>
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((p) => <ProductCard key={p.id} p={p} testId="deals-card" />)}
        </div>
      </div>
    </PublicLayout>
  );
}
