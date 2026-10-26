import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkCls = ({ isActive }) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
    isActive ? "bg-ink-700 text-white" : "text-ink-300 hover:text-white"
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-black italic tracking-tight text-white">
            STREETLIGHT <span className="text-flood-500">XI</span>
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-500 lg:inline">
            Est. under the lights
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 sm:flex">
          <NavLink to="/" end className={linkCls}>
            Home
          </NavLink>
          <NavLink to="/players" className={linkCls}>
            Players
          </NavLink>
          <NavLink to="/teams" className={linkCls}>
            Teams
          </NavLink>
          <NavLink to="/auctions" className={linkCls}>
            Auction
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            to="/players/new"
            className="rounded-full bg-flood-500 px-4 py-2 text-sm font-bold text-ink-950 shadow-[0_0_18px_rgba(245,185,33,0.35)] transition hover:bg-flood-400"
          >
            + Add Player
          </Link>
          <span className="hidden text-sm text-ink-300 md:inline">
            {user?.name}
          </span>
          <button
            onClick={onLogout}
            className="rounded-full border border-ink-700 px-3.5 py-1.5 text-sm text-ink-300 transition hover:border-ink-500 hover:text-white"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 px-4 pb-2.5 sm:hidden">
        <NavLink to="/" end className={linkCls}>
          Home
        </NavLink>
        <NavLink to="/players" className={linkCls}>
          Players
        </NavLink>
        <NavLink to="/teams" className={linkCls}>
          Teams
        </NavLink>
        <NavLink to="/auctions" className={linkCls}>
          Auction
        </NavLink>
      </nav>
    </header>
  );
}
