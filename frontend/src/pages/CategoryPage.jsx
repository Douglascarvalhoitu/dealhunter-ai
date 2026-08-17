import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";
import ProductCard from "../components/ProductCard";
import api from "../lib/api";

export default function CategoryPage() {
  const { slug } = useParams();
  const [items, setItems] = useState([]);
  const [sort, setSort] = useState("popular");
  useEffect(() => {
    api.get("/products", { params: { category: slug, sort, limit: 48 } })
      .then((r) => setItems(r.data.items || []))
      .catch(() => setItems([]));
  }, [slug, sort]);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--dh-navy)] capitalize" data-testid="category-title">{slug} deals</h1>
          <select data-testid="category-sort" value={sort} onChange={(e) => setSort(e.target.value)}
                  className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm">
            <option value="popular">Most popular</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="biggest_drop">Biggest price drop</option>
          </select>
        </div>
        {items.length === 0 ? <div className="text-slate-500">No products.</div> :
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p) => <ProductCard key={p.id} p={p} testId="category-card" />)}
          </div>}
      </div>
    </PublicLayout>
  );
}
