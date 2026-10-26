import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ email, password });
      navigate(location.state?.next || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flood-glow flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="fade-up">
          <h1 className="text-center font-display text-4xl font-black italic tracking-tight text-white">
            STREETLIGHT <span className="text-flood-500">XI</span>
          </h1>
          <p className="mt-2 text-center text-sm text-ink-300">
            The game begins when the lights come on.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-4 rounded-3xl border border-ink-800 bg-ink-900/80 p-6 shadow-2xl"
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-white outline-none transition focus:border-flood-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-white outline-none transition focus:border-flood-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300 ring-1 ring-red-500/30">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-flood-500 py-2.5 font-display text-base font-black italic tracking-wide text-ink-950 transition hover:bg-flood-400 disabled:opacity-60"
            >
              {busy ? "Stepping in..." : "STEP ONTO THE PITCH"}
            </button>

            <p className="text-center text-sm text-ink-300">
              New to the group?{" "}
              <Link to="/register" className="font-semibold text-flood-400 hover:text-flood-300">
                Join with the group code
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
