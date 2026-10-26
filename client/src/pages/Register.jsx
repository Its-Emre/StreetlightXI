import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register({ name, email, password, groupCode });
      navigate(location.state?.next || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-white outline-none transition focus:border-flood-500";

  return (
    <div className="flood-glow flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="fade-up">
          <h1 className="text-center font-display text-4xl font-black italic tracking-tight text-white">
            JOIN THE <span className="text-flood-500">XI</span>
          </h1>
          <p className="mt-2 text-center text-sm text-ink-300">
            Streetlight XI is private — only the group gets in.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-4 rounded-3xl border border-ink-800 bg-ink-900/80 p-6 shadow-2xl"
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-300">Your name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="EMRE"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-300">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-300">Group code</label>
              <input
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value)}
                className={inputCls}
                placeholder="The code your group uses"
              />
              <p className="mt-1.5 text-xs text-ink-500">
                Ask anyone in the group — it keeps outsiders out.
              </p>
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
              {busy ? "Joining..." : "JOIN STREETLIGHT XI"}
            </button>

            <p className="text-center text-sm text-ink-300">
              Already in?{" "}
              <Link to="/login" className="font-semibold text-flood-400 hover:text-flood-300">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
