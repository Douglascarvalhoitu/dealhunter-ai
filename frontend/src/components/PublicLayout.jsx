import { Link, useNavigate } from "react-router-dom";
import { Search, Menu } from "lucide-react";
import { useState } from "react";

const LOGO_URL = "https://customer-assets-0z36b82j.emergentagent.net/job_smart-deal-hub-1/artifacts/tkme36ut_ChatGPT%20Image%2017%20de%20ago.%20de%202026%2C%2018_42_36.png";

export default function PublicLayout({ children }) {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const submit = (e) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q)}`); };

  return (
    <div className="min-h-screen bg-[var(--dh-off)]">
      <header className="sticky top-0 z-40 border-b border-slate-200 dh-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center gap-4">
          <Link to="/" data-testid="nav-logo" className="flex items-center gap-2 shrink-0">
            <img src={LOGO_URL} alt="Deal Hunter AI" className="h-14 md:h-16 w-auto object-contain" />
          </Link>

          <form onSubmit={submit} className="hidden md:flex flex-1 max-w-xl mx-auto relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="nav-search-input"
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="What are you looking for?"
              className="w-full pl-9 pr-24 h-11 rounded-full border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dh-blue)]"
            />
            <button data-testid="nav-search-submit" className="absolute right-1 top-1 h-9 px-4 rounded-full dh-btn-blue text-sm font-medium">Find Deals</button>
          </form>

          <nav className="hidden md:flex items-center gap-5 text-sm text-slate-600">
            <Link to="/deals" data-testid="nav-deals" className="hover:text-[var(--dh-navy)]">Deals</Link>
            <Link to="/category/gaming" data-testid="nav-gaming" className="hover:text-[var(--dh-navy)]">Gaming</Link>
            <Link to="/category/audio" data-testid="nav-audio" className="hover:text-[var(--dh-navy)]">Audio</Link>
            <Link to="/favorites" data-testid="nav-favorites" className="hover:text-[var(--dh-navy)]">Favorites</Link>
            <Link to="/compare" data-testid="nav-compare" className="hover:text-[var(--dh-navy)]">Compare</Link>
            <Link to="/blog" data-testid="nav-blog" className="hover:text-[var(--dh-navy)]">Blog</Link>
            <Link to="/admin/login" data-testid="nav-admin" className="px-4 h-9 grid place-items-center rounded-full border border-slate-300 hover:bg-slate-100">Admin</Link>
          </nav>
          <Menu className="md:hidden text-slate-700" />
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-20 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8 text-sm text-slate-600">
          <div>
            <img src={LOGO_URL} alt="Deal Hunter AI" className="h-14 w-auto mb-3" />
            <p>AI-powered deal discovery. Prices and availability change frequently. Estimates only.</p>
          </div>
          <div>
            <div className="font-semibold text-[var(--dh-navy)] mb-2">Categories</div>
            <ul className="space-y-1">
              <li><Link to="/category/technology">Technology</Link></li>
              <li><Link to="/category/gaming">Gaming</Link></li>
              <li><Link to="/category/audio">Audio</Link></li>
              <li><Link to="/category/home">Home</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-[var(--dh-navy)] mb-2">Disclosure</div>
            <p>As an affiliate, we may earn a commission from qualifying purchases at no extra cost to you.</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 text-center pb-6">© {new Date().getFullYear()} Deal Hunter AI. All rights reserved.</div>
      </footer>
    </div>
  );
}
