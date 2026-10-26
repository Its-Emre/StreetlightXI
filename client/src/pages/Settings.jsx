import { useSettings } from "../context/SettingsContext";

const TOGGLES = [
  {
    key: "soldTags",
    icon: "🏷️",
    title: "SOLD tags",
    desc: "The “SOLD 🪙price · Team” tag on player cards and profiles after an auction.",
  },
  {
    key: "goldenFrame",
    icon: "⭐",
    title: "Golden player frame",
    desc: "The gold frame and ★ Golden badge on the group's top-rated player's card.",
  },
  {
    key: "ratings",
    icon: "📊",
    title: "Ratings",
    desc: "Rating numbers on cards, profiles and the team maker. (Balancing still uses them quietly.)",
  },
  {
    key: "leaderboards",
    icon: "🏆",
    title: "Leaderboards",
    desc: "Most Runs, Most Wickets and Safe Hands boards on the Home page.",
  },
  {
    key: "rtm",
    icon: "🔙",
    title: "Right to Match (RTM)",
    desc: "RTM windows during auctions — a former team can match the price and take its player back.",
  },
];

function Switch({ on, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        on ? "bg-flood-500" : "bg-ink-700"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { settings, update } = useSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="font-display text-4xl font-black italic text-white">
        Group <span className="text-flood-500">Settings</span> ⚙️
      </h1>
      <p className="mt-1.5 max-w-xl text-sm text-ink-300">
        Switches for the whole group — flip one here and every member's app follows.
        Changes save instantly.
      </p>

      <div className="fade-up mt-8 divide-y divide-ink-800 overflow-hidden rounded-3xl border border-ink-800 bg-ink-900/70">
        {TOGGLES.map((t) => {
          const on = settings[t.key] !== false;
          return (
            <div key={t.key} className="flex items-center gap-4 px-5 py-4">
              <div className="text-2xl">{t.icon}</div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-bold text-white">{t.title}</h2>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-300">{t.desc}</p>
              </div>
              <Switch on={on} onClick={() => update({ [t.key]: !on })} />
              <span
                className={`w-9 text-xs font-bold uppercase tracking-wider ${
                  on ? "text-flood-400" : "text-ink-500"
                }`}
              >
                {on ? "On" : "Off"}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-ink-500">
        Group-trust rules, as always: anyone in the group can change these. If a switch
        war breaks out, settle it on the pitch. 🏏
      </p>
    </div>
  );
}
