import { useEffect, useState } from "react";
import PublicLayout from "../components/PublicLayout";
import ProductCard from "../components/ProductCard";
import api from "../lib/api";
import { getFavs } from "../lib/store";
import { Heart } from "lucide-react";

export default function FavoritesPage() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const ids = getFavs();
    if (!ids.length) return;
    api.get("/products", { params: { limit: 200 } }).then((r) => {
      const set = new Set(ids);
      setItems((r.data.items || []).filter((p) => set.has(p.id)));
    });
  }, []);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--dh-navy)] flex items-center gap-2" data-testid="favs-title">
          <Heart className="text-rose-500" /> Your Favorites
        </h1>
        {items.length === 0 ? (
          <div className="text-slate-500 mt-6" data-testid="favs-empty">No favorites yet. Tap the heart on any product to save it here.</div>
        ) : (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p) => <ProductCard key={p.id} p={p} testId="favs-card" />)}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
