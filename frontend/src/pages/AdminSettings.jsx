import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { Settings as SettingsIcon, KeyRound, User } from "lucide-react";

export default function AdminSettings() {
  const { user } = useAuth();
  const [site, setSite] = useState(null);
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });

  useEffect(() => {
    api.get("/admin/site-settings").then((r) => setSite(r.data)).catch(() => {});
  }, []);

  const saveSite = async () => {
    try { await api.post("/admin/site-settings", site); toast.success("Site settings saved"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) { toast.error("Passwords don't match"); return; }
    if (pw.new_password.length < 8) { toast.error("Min 8 characters"); return; }
    try {
      await api.post("/auth/change-password", { current_password: pw.current_password, new_password: pw.new_password });
      toast.success("Password updated");
      setPw({ current_password: "", new_password: "", confirm: "" });
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-4xl">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2" data-testid="settings-title"><SettingsIcon size={22} /> Settings</h1>

        {/* Profile */}
        <div className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-4"><User size={16} className="text-[var(--dh-blue-glow)]" /><h3 className="font-display font-semibold">Profile</h3></div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <Field label="Name"><input value={user?.name || ""} disabled className="dh-in" /></Field>
            <Field label="Email"><input value={user?.email || ""} disabled className="dh-in" /></Field>
            <Field label="Role"><input value={user?.role || ""} disabled className="dh-in" /></Field>
          </div>
        </div>

        {/* Change Password */}
        <form onSubmit={changePw} className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-4"><KeyRound size={16} className="text-[var(--dh-green)]" /><h3 className="font-display font-semibold">Change Password</h3></div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <Field label="Current password"><input data-testid="pw-current" type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} className="dh-in" required /></Field>
            <Field label="New password (min 8)"><input data-testid="pw-new" type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} className="dh-in" required /></Field>
            <Field label="Confirm new password"><input data-testid="pw-confirm" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className="dh-in" required /></Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button data-testid="pw-submit" type="submit" className="h-10 px-5 rounded-lg dh-btn-green font-semibold">Update Password</button>
          </div>
        </form>

        {/* Site settings */}
        {site && (
          <div className="mt-6 rounded-xl bg-[var(--dh-navy-2)] border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4"><SettingsIcon size={16} className="text-[var(--dh-blue-glow)]" /><h3 className="font-display font-semibold">Site Settings</h3></div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <Field label="Site name"><input data-testid="site-name" value={site.site_name} onChange={(e) => setSite({ ...site, site_name: e.target.value })} className="dh-in" /></Field>
              <Field label="Tagline"><input data-testid="site-tagline" value={site.tagline} onChange={(e) => setSite({ ...site, tagline: e.target.value })} className="dh-in" /></Field>
              <Field label="Support email"><input value={site.support_email} onChange={(e) => setSite({ ...site, support_email: e.target.value })} className="dh-in" /></Field>
              <Field label="Default country">
                <select value={site.default_country} onChange={(e) => setSite({ ...site, default_country: e.target.value })} className="dh-in">
                  {["US","CA","UK","AU","BR"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Default currency">
                <select value={site.default_currency} onChange={(e) => setSite({ ...site, default_currency: e.target.value })} className="dh-in">
                  {["USD","CAD","GBP","AUD","BRL"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Affiliate disclosure"><textarea rows={2} value={site.affiliate_disclosure} onChange={(e) => setSite({ ...site, affiliate_disclosure: e.target.value })} className="dh-in" /></Field>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button data-testid="site-save" onClick={saveSite} className="h-10 px-5 rounded-lg dh-btn-blue font-semibold">Save Site Settings</button>
            </div>
          </div>
        )}
      </div>
      <style>{`.dh-in{width:100%;height:40px;background:#0B1121;border:1px solid rgba(255,255,255,0.1);border-radius:.5rem;padding:0 12px;color:#F8FAFC;font-size:14px}.dh-in:focus{outline:none;border-color:#2563EB}textarea.dh-in{height:auto;padding:10px 12px}`}</style>
    </AdminLayout>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="text-xs text-slate-400 mb-1 block">{label}</span>{children}</label>;
}
