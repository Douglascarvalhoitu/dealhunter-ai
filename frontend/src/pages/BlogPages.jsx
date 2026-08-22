import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";
import api from "../lib/api";

export function BlogList() {
  const [posts, setPosts] = useState([]);
  useEffect(() => { api.get("/blog").then((r) => setPosts(r.data)).catch(() => {}); }, []);
  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--dh-navy)]" data-testid="blog-title">Blog</h1>
        <p className="text-slate-500 mt-2">Deal guides, buying tips, and AI-picked recommendations.</p>
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.length === 0 && <div className="text-slate-500" data-testid="blog-empty">No posts yet. Publish an AI article from the Admin → AI Content page.</div>}
          {posts.map((p) => (
            <Link key={p.id} to={`/blog/${p.slug}`} className="rounded-2xl border border-slate-200 bg-white overflow-hidden dh-card-hover block" data-testid="blog-card">
              {p.cover_image && <img src={p.cover_image} alt={p.title} className="w-full aspect-[16/9] object-cover" />}
              <div className="p-5">
                <div className="text-xs text-slate-500">{new Date(p.published_at).toLocaleDateString()}</div>
                <div className="font-display text-lg font-bold text-[var(--dh-navy)] mt-1">{p.title}</div>
                <div className="text-sm text-slate-600 mt-2 line-clamp-2">{p.meta_description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  useEffect(() => {
    api.get(`/blog/${slug}`).then((r) => setPost(r.data)).catch(() => setPost(false));
  }, [slug]);
  useEffect(() => {
    if (!post) return;
    document.title = `${post.title} · Deal Hunter AI`;
    let meta = document.querySelector('meta[name="description"]') || Object.assign(document.createElement("meta"), { name: "description" });
    meta.setAttribute("content", post.meta_description || "");
    document.head.appendChild(meta);
    let ld = document.getElementById("dh-jsonld");
    if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.id = "dh-jsonld"; document.head.appendChild(ld); }
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "BlogPosting",
      headline: post.title, image: post.cover_image, datePublished: post.published_at,
      description: post.meta_description,
    });
  }, [post]);

  if (post === null) return <PublicLayout><div className="p-8 text-slate-500">Loading…</div></PublicLayout>;
  if (post === false) return <PublicLayout><div className="p-8 text-slate-500">Post not found.</div></PublicLayout>;
  return (
    <PublicLayout>
      <article className="max-w-3xl mx-auto px-6 py-12">
        {post.cover_image && <img src={post.cover_image} alt={post.title} className="w-full aspect-[16/9] object-cover rounded-3xl mb-8" />}
        <h1 className="font-display text-4xl font-extrabold text-[var(--dh-navy)]" data-testid="post-title">{post.title}</h1>
        <div className="text-xs text-slate-500 mt-2">{new Date(post.published_at).toLocaleDateString()}</div>
        <div className="prose prose-slate mt-6 whitespace-pre-wrap text-slate-700 leading-relaxed">{post.content}</div>
        {post.product_slug && (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">Featured product</div>
              <div className="font-semibold text-[var(--dh-navy)]">{post.product_name}</div>
            </div>
            <Link to={`/product/${post.product_slug}`} className="h-11 px-5 grid place-items-center rounded-xl dh-btn-green font-semibold">See product</Link>
          </div>
        )}
      </article>
    </PublicLayout>
  );
}
