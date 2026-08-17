import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../lib/api";
import { PenSquare, Sparkles, Copy } from "lucide-react";

const TYPES = [
  ["description", "Product Description"],
  ["seo_article", "SEO Article"],
  ["social_tiktok", "TikTok"],
  ["social_instagram", "Instagram"],
  ["social_facebook", "Facebook"],
  ["social_pinterest", "Pinterest"],
  ["social_x", "X (Twitter)"],
  ["social_youtube_shorts", "YouTube Shorts"],
  ["ad_ideas", "Ad Ideas"],
  ["headlines", "Headlines"],
  ["cta", "CTA Generator"],
];

export default function AdminAIContent() {
  const [products, setProducts] = useState([]);
  const [pid, setPid] = useState("");
  const [type, setType] = useState("description");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    api.get("/products", { params: { limit: 100 } }).then((r) => { setProducts(r.data.items || []); if (r.data.items?.[0]) setPid(r.data.items[0].id); });
    api.get("/admin/ai/drafts").then((r) => setDrafts(r.data)).catch(() => {});
  }, []);

  const gen = async () => {
    if (!pid) return;
    setBusy(true); setOut(null);
    try {
      const r = await api.post("/admin/ai/content", { product_id: pid, content_type: type });
      setOut(r.data);
      const dr = await api.get("/admin/ai/drafts"); setDrafts(dr.data);
    } catch (e) {
      setOut({ content: "Error generating content: " + (e?.response?.data?.detail || e.message) });
    } finally { setBusy(false); }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold flex items-center gap-2" data-testid="content-title"><PenSquare size={22} /> AI Content Generator</h1>
          <p className="text-slate-400 text-sm">Generate drafts for products. Review before publishing anywhere.</p>
        </div>

        <div className="rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400 block mb-1">Product</span>
              <select data-testid="content-product" value={pid} onChange={(e) => setPid(e.target.value)} className="dh-input">
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-400 block mb-1">Content type</span>
              <select data-testid="content-type" value={type} onChange={(e) => setType(e.target.value)} className="dh-input">
                {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <button data-testid="content-generate" onClick={gen} disabled={busy || !pid}
                    className="h-10 rounded-lg dh-btn-blue font-semibold self-end flex items-center gap-2 justify-center">
              <Sparkles size={16} /> {busy ? "Generating…" : "Generate"}
            </button>
          </div>

          {out && (
            <div className="mt-5 rounded-lg border border-white/10 p-4" data-testid="content-output">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Draft · {out.content_type || type}</div>
                <button onClick={() => navigator.clipboard.writeText(out.content || "")} className="text-xs inline-flex items-center gap-1 text-slate-300 hover:text-white"><Copy size={12} /> Copy</button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-slate-100 font-sans">{out.content}</pre>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
          <h3 className="font-display font-semibold mb-3">Recent drafts</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto dh-scrollbar">
            {drafts.slice(0, 20).map((d) => (
              <div key={d.id} className="rounded-lg border border-white/10 p-3">
                <div className="text-xs text-slate-400 mb-1">{d.content_type} · {new Date(d.created_at).toLocaleString()}</div>
                <div className="text-sm text-slate-100 line-clamp-3 whitespace-pre-wrap">{d.content}</div>
              </div>
            ))}
            {drafts.length === 0 && <div className="text-slate-400 text-sm">No drafts yet.</div>}
          </div>
        </div>
      </div>
      <style>{`.dh-input{width:100%;height:40px;background:#0B1121;border:1px solid rgba(255,255,255,0.1);border-radius:.5rem;padding:0 12px;color:#F8FAFC;font-size:14px}.dh-input:focus{outline:none;border-color:#2563EB}`}</style>
    </AdminLayout>
  );
}
