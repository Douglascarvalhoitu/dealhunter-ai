import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const LOGO_URL = "https://customer-assets-0z36b82j.emergentagent.net/job_smart-deal-hub-1/artifacts/tkme36ut_ChatGPT%20Image%2017%20de%20ago.%20de%202026%2C%2018_42_36.png";

export default function AdminLogin() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@dealhunter.ai");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  if (user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { await login(email, password); nav("/admin"); }
    catch (ex) { setErr(ex?.response?.data?.detail || "Login failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--dh-navy)] text-white grid place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-[var(--dh-navy-2)] border border-white/10 p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <img src={LOGO_URL} alt="Deal Hunter AI" className="h-20 w-auto object-contain" />
          <div className="text-xs text-slate-400 mt-1">Admin Console</div>
        </div>
        <label className="block text-xs text-slate-300 mb-1">Email</label>
        <input data-testid="login-email" value={email} onChange={(e) => setEmail(e.target.value)}
               className="w-full h-11 rounded-xl bg-[#0B1121] border border-white/10 px-4 text-sm mb-4 focus:outline-none focus:border-[var(--dh-blue)]" />
        <label className="block text-xs text-slate-300 mb-1">Password</label>
        <input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               className="w-full h-11 rounded-xl bg-[#0B1121] border border-white/10 px-4 text-sm focus:outline-none focus:border-[var(--dh-blue)]" />
        {err && <div data-testid="login-error" className="mt-3 text-sm text-red-300">{err}</div>}
        <button data-testid="login-submit" disabled={busy}
                className="mt-6 w-full h-12 rounded-xl dh-btn-blue font-semibold">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
