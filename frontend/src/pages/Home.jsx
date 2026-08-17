import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Search, Flame, Star, Bot, Coins, TrendingDown, Zap, Gamepad2, Cpu, Home as HomeIcon, PawPrint, Dumbbell, Smartphone, Headphones } from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import ProductCard from "../components/ProductCard";
import api from "../lib/api";

const CATS = [
  { slug: "gaming", label: "Gaming", Icon: Gamepad2 },
  { slug: "technology", label: "Technology", Icon: Cpu },
  { slug: "home", label: "Home", Icon: HomeIcon },
  { slug: "pets", label: "Pets", Icon: PawPrint },
  { slug: "fitness", label: "Fitness", Icon: Dumbbell },
  { slug: "smartphones", label: "Smartphones", Icon: Smartphone },
  { slug: "audio", label: "Audio", Icon: Headphones },
];

const SECTIONS = [
  { key: "trending", title: "Trending Deals", Icon: Flame, url: "/products/trending" },
  { key: "ai_picks", title: "AI Picks", Icon: Bot, url: "/products/ai-picks" },
  { key: "best_value", title: "Best Value", Icon: Coins, url: "/products/best-value" },
  { key: "price_drops", title: "Price Drops", Icon: TrendingDown, url: "/products/price-drops" },
  { key: "new", title: "New Deals", Icon: Zap, url: "/products/new" },
  { key: "popular", title: "Popular Products", Icon: Star, url: "/products/trending" },
];

export default function Home() {
  const [q, setQ] = useState("");
  const [sections, setSections] = useState({});
  const nav = useNavigate();

  useEffect(() => {
    SECTIONS.forEach(async (s) => {
      try { const r = await api.get(s.url); setSections((prev) => ({ ...prev, [s.key]: r.data })); } catch {}
    });
  }, []);

  const submit = (e) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q)}`); };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="dh-hero-grid">
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-16 md:pt-24 md:pb-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-600 mb-6">
              <Sparkles size={14} className="text-[var(--dh-blue)]" /> AI-powered deal discovery
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--dh-navy)] leading-[1.05]">
              Find Better Deals <span className="text-[var(--dh-blue)]">With AI</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-slate-600 max-w-xl">
              AI-powered product discovery that helps you find interesting products, compare options and discover great deals faster.
            </p>

            <form onSubmit={submit} className="mt-8 flex items-stretch gap-2 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm max-w-xl">
              <div className="flex items-center pl-3 text-slate-400"><Search size={18} /></div>
              <input
                data-testid="hero-search-input"
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder='e.g. "Best gaming headphones under $50"'
                className="flex-1 bg-transparent px-2 focus:outline-none text-[15px]"
              />
              <button data-testid="hero-search-submit" className="h-12 px-6 rounded-full dh-btn-blue font-semibold">Find Deals</button>
            </form>

            <div className="mt-4 text-xs text-slate-500">Try: <button className="underline" onClick={() => setQ("Gaming laptop")}>Gaming laptop</button> · <button className="underline" onClick={() => setQ("Smartwatch")}>Smartwatch</button> · <button className="underline" onClick={() => setQ("Pet products")}>Pet products</button> · <button className="underline" onClick={() => setQ("Headphones")}>Headphones</button></div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-[var(--dh-blue)]/10 to-[var(--dh-green)]/10" />
            <img src="https://images.unsplash.com/photo-1758523668802-53f1e40977ba?w=1000&q=85"
                 alt="Deal Hunter Hero"
                 className="relative rounded-3xl w-full object-cover aspect-[4/3] border border-slate-200 shadow-xl" />
          </div>
        </div>
      </section>

      {/* Category strip */}
      <section className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {CATS.map(({ slug, label, Icon }) => (
            <Link key={slug} to={`/category/${slug}`} data-testid={`home-cat-${slug}`}
                  className="group rounded-2xl bg-white border border-slate-200 p-4 flex flex-col items-center gap-2 dh-card-hover">
              <div className="w-11 h-11 rounded-xl bg-slate-50 grid place-items-center text-[var(--dh-navy)] group-hover:bg-[var(--dh-blue)]/10 group-hover:text-[var(--dh-blue)] transition-colors">
                <Icon size={22} />
              </div>
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Sections */}
      {SECTIONS.map(({ key, title, Icon }) => {
        const items = sections[key] || [];
        if (!items.length) return null;
        return (
          <section key={key} className="max-w-7xl mx-auto px-6 mt-14">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Icon size={20} className="text-[var(--dh-blue)]" />
                <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--dh-navy)]">{title}</h2>
              </div>
              <Link to="/deals" data-testid={`home-see-all-${key}`} className="text-sm text-[var(--dh-blue)] font-medium">See all →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} testId={`home-${key}-card`} />)}
            </div>
          </section>
        );
      })}

      {/* Email capture */}
      <EmailCapture />
    </PublicLayout>
  );
}

function EmailCapture() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try { await api.post("/subscribers", { email }); setMsg("Thanks! You're on the list."); setEmail(""); }
    catch { setMsg("Please try again."); }
  };
  return (
    <section className="max-w-7xl mx-auto px-6 mt-16 mb-6">
      <div className="rounded-3xl bg-[var(--dh-navy)] text-white p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h3 className="font-display text-3xl md:text-4xl font-bold">Get the Best Deals</h3>
          <p className="text-slate-300 mt-2">AI-curated deal alerts. Unsubscribe anytime.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
          <input data-testid="email-capture-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                 placeholder="you@example.com"
                 className="flex-1 h-12 rounded-full px-5 text-slate-900" />
          <button data-testid="email-capture-submit" className="h-12 px-6 rounded-full dh-btn-green font-semibold">Send Me Deals</button>
          {msg && <div data-testid="email-capture-msg" className="text-xs text-slate-300 mt-1">{msg}</div>}
        </form>
      </div>
    </section>
  );
}
