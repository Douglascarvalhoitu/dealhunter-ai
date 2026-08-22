import { useState } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import api from "../lib/api";

export default function PriceAlert({ product }) {
  const [email, setEmail] = useState("");
  const [target, setTarget] = useState(Math.floor(product.price * 0.9));
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/alerts", { email, product_id: product.id, target_price: Number(target) });
      toast.success("Alert saved — we'll notify you when it drops.");
      setEmail("");
    } catch (ex) {
      toast.error(ex?.response?.data?.detail || "Failed to save alert");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 font-semibold text-[var(--dh-navy)] mb-3"><Bell size={16} className="text-[var(--dh-blue)]" /> Price Alert</div>
      <div className="text-sm text-slate-600 mb-3">Notify me when the price drops below:</div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center rounded-xl bg-white border border-slate-200 px-3 h-11">
          <span className="text-slate-500 mr-1">$</span>
          <input data-testid="alert-target" type="number" step="1" min="1" value={target} onChange={(e) => setTarget(e.target.value)} className="w-24 outline-none" />
        </div>
        <input data-testid="alert-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
               className="flex-1 h-11 rounded-xl bg-white border border-slate-200 px-3 outline-none" />
        <button data-testid="alert-submit" disabled={busy} className="h-11 px-5 rounded-xl dh-btn-blue font-semibold">{busy ? "Saving…" : "Notify Me"}</button>
      </div>
    </form>
  );
}
