"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

export type DayStats = {
  date: string;
  label: string;
  sessions: number;
  completed: number;
  won: number;
  lost: number;
  abandoned: number;
  avg_score: number | null;
  avg_errors: number | null;
  win_rate: number | null;
  completion_rate: number | null;
};

export type TrafficDay = {
  date: string;
  label: string;
  visitors: number;
  started: number;
  completed: number;
};

export type CrossingStat = {
  label: string;
  solve_rate: number;
  solved: number;
  total: number;
};

export type Insight = {
  type: "success" | "warning" | "danger" | "info";
  title: string;
  text: string;
  recommendation: string;
};

export type GlobalStats = {
  total_sessions: number;
  total_unique_users: number;
  multi_day_users: number;
  mono_day_users: number;
  total_won: number;
  total_lost: number;
  total_abandoned: number;
  shared_count: number;
};

const C = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  gray: "#9ca3af",
  teal: "#14b8a6",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="h-px flex-1 bg-gray-200" />
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{children}</h2>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function Funnel({ steps }: { steps: { label: string; value: number; color: string; pct?: string }[] }) {
  const max = steps[0]?.value ?? 1;
  return (
    <div className="space-y-3">
      {steps.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <div className="w-40 shrink-0 text-right text-sm text-gray-600">{s.label}</div>
          <div className="relative flex-1 h-9 bg-gray-100 rounded-lg overflow-hidden">
            <div
              className="h-full rounded-lg flex items-center pl-3 text-white text-sm font-bold"
              style={{
                width: `${max > 0 ? Math.max((s.value / max) * 100, s.value > 0 ? 8 : 0) : 0}%`,
                background: s.color,
              }}
            >
              {s.value}
            </div>
          </div>
          {s.pct && <div className="w-24 shrink-0 text-xs text-gray-400">{s.pct}</div>}
        </div>
      ))}
    </div>
  );
}

function CrossingQuartile({
  title, color, bg, items,
}: {
  title: string; color: string; bg: string; items: CrossingStat[];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color }}>{title}</h3>
      <div className="flex-1 overflow-y-auto max-h-52 space-y-1 pr-1">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400">Aucune donnée</p>
        ) : items.map((c) => (
          <div key={c.label} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1" style={{ background: bg }}>
            <span className="text-xs text-gray-700 truncate">{c.label}</span>
            <span className="text-xs font-bold shrink-0" style={{ color }}>{c.solve_rate}%</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">{items.length} croisement{items.length > 1 ? "s" : ""}</p>
    </div>
  );
}

function pct(n: number) { return `${Math.round(n)}%`; }
function fmt(n: number | null) { return n == null ? "—" : Math.round(n).toString(); }

export default function DashboardClient({
  days,
  trafficDays,
  global: g,
  crossings,
  insights,
}: {
  days: DayStats[];
  trafficDays: TrafficDay[];
  global: GlobalStats;
  crossings: CrossingStat[];
  insights: Insight[];
}) {
  const winRate = g.total_won + g.total_lost > 0
    ? Math.round((g.total_won / (g.total_won + g.total_lost)) * 100) : 0;
  const completionRate = g.total_sessions > 0
    ? Math.round(((g.total_won + g.total_lost) / g.total_sessions) * 100) : 0;

  const retentionPie = [
    { name: "Multi-jours", value: g.multi_day_users, color: C.indigo },
    { name: "1 seul jour", value: g.mono_day_users, color: C.gray },
  ].filter(d => d.value > 0);

  const funnelSteps = [
    { label: "Parties lancées", value: g.total_sessions, color: C.indigo },
    { label: "Parties terminées", value: g.total_won + g.total_lost, color: C.sky, pct: g.total_sessions > 0 ? pct(completionRate) : undefined },
    { label: "Parties gagnées", value: g.total_won, color: C.emerald, pct: g.total_won + g.total_lost > 0 ? pct(winRate) + " des terminées" : undefined },
    { label: "Partagées WhatsApp", value: g.shared_count, color: "#25D366", pct: g.total_sessions > 0 ? pct(Math.round((g.shared_count / g.total_sessions) * 100)) : undefined },
  ];

  // Quartiles des croisements (triés du plus facile au plus difficile)
  const sorted = [...crossings].sort((a, b) => b.solve_rate - a.solve_rate);
  const n = sorted.length;
  const q1 = sorted.slice(0, Math.ceil(n * 0.25));
  const q2 = sorted.slice(Math.ceil(n * 0.25), Math.ceil(n * 0.5));
  const q3 = sorted.slice(Math.ceil(n * 0.5), Math.ceil(n * 0.75));
  const q4 = sorted.slice(Math.ceil(n * 0.75));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            <span className="text-indigo-600">Villo</span>doku — Tableau de pilotage
          </h1>
          <p className="text-sm text-gray-500">{g.total_sessions} sessions · {g.total_unique_users} joueurs uniques · {days.length} grille{days.length > 1 ? "s" : ""}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card title="Sessions">
            <KPI label="Parties lancées" value={g.total_sessions} />
          </Card>
          <Card title="Joueurs uniques">
            <KPI label="Utilisateurs distincts" value={g.total_unique_users} sub={`${g.multi_day_users} multi-jours`} />
          </Card>
          <Card title="Complétion">
            <KPI label="Parties terminées" value={pct(completionRate)} sub={`${g.total_won + g.total_lost} / ${g.total_sessions}`} />
          </Card>
          <Card title="Victoire">
            <KPI label="Taux de victoire" value={pct(winRate)} sub={`${g.total_won} gagnées / ${g.total_lost} perdues`} />
          </Card>
        </div>

        {/* ══════════════════════════ TRAFIC ══════════════════════════ */}
        <SectionTitle>Trafic</SectionTitle>

        <Card title="Visiteurs par jour calendaire">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trafficDays} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="visitors" name="Visiteurs uniques" fill={C.indigo} radius={[4, 4, 0, 0]} />
              <Bar dataKey="started" name="Parties lancées" fill={C.violet} radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Parties terminées" fill={C.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title={`Fidélisation — ${g.total_unique_users > 0 ? Math.round((g.multi_day_users / g.total_unique_users) * 100) : 0}% reviennent`}>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={retentionPie} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                  {retentionPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3">
              {retentionPie.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-gray-600">{d.name}</span>
                  <span className="font-bold text-gray-900">{d.value}</span>
                </div>
              ))}
              <div className="mt-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                <strong>{g.multi_day_users}</strong> joueur{g.multi_day_users > 1 ? "s" : ""} sur {g.total_unique_users} ont joué plusieurs jours
              </div>
            </div>
          </div>
        </Card>

        {/* ══════════════════════════ ANALYSE DES GRILLES ══════════════════════════ */}
        <SectionTitle>Analyse des grilles</SectionTitle>

        {/* Croisements en 4 quartiles */}
        {crossings.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CrossingQuartile title="Très faciles" color="#059669" bg="#f0fdf4" items={q1} />
            <CrossingQuartile title="Faciles" color="#0284c7" bg="#f0f9ff" items={q2} />
            <CrossingQuartile title="Difficiles" color="#d97706" bg="#fffbeb" items={q3} />
            <CrossingQuartile title="Très difficiles" color="#e11d48" bg="#fff1f2" items={q4} />
          </div>
        ) : (
          <Card title="Croisements critère × critère">
            <p className="text-sm text-gray-400">Pas encore assez de données.</p>
          </Card>
        )}

        {/* Score + erreurs par grille */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card title="Score moyen par grille (/100)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip formatter={(v) => [`${Math.round(Number(v))}`, "Score moy."]} />
                <Bar dataKey="avg_score" name="Score moyen" fill={C.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Erreurs moyennes par grille (/5)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 5]} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}`, "Erreurs moy."]} />
                <Bar dataKey="avg_errors" name="Erreurs moy." fill={C.rose} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Issues par grille */}
        <Card title="Issues par grille">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="won" name="Victoire" stackId="a" fill={C.emerald} />
              <Bar dataKey="lost" name="Échec" stackId="a" fill={C.rose} />
              <Bar dataKey="abandoned" name="Abandon" stackId="a" fill={C.gray} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* ══════════════════════════ CONVERSION ══════════════════════════ */}
        <SectionTitle>Conversion</SectionTitle>

        <Card title="Entonnoir de conversion">
          <Funnel steps={funnelSteps} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
            {[
              { label: "Complétion", value: pct(completionRate), sub: "lancées → terminées" },
              { label: "Victoire", value: pct(winRate), sub: "terminées → gagnées" },
              { label: "Partage", value: g.total_sessions > 0 ? pct(Math.round((g.shared_count / g.total_sessions) * 100)) : "—", sub: "lancées → WhatsApp" },
              { label: "Rétention", value: g.total_unique_users > 0 ? pct(Math.round((g.multi_day_users / g.total_unique_users) * 100)) : "—", sub: "joueurs multi-jours" },
            ].map(k => (
              <div key={k.label} className="rounded-xl bg-gray-50 p-3">
                <div className="text-xl font-bold text-gray-900">{k.value}</div>
                <div className="text-xs font-semibold text-gray-600">{k.label}</div>
                <div className="text-xs text-gray-400">{k.sub}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ══════════════════════════ TABLE ══════════════════════════ */}
        <SectionTitle>Détail par grille</SectionTitle>

        <Card title="Récapitulatif jour par jour">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase">
                  <th className="pb-2 pr-4">Grille</th>
                  <th className="pb-2 pr-4 text-right">Lancées</th>
                  <th className="pb-2 pr-4 text-right">Terminées</th>
                  <th className="pb-2 pr-4 text-right">Victoires</th>
                  <th className="pb-2 pr-4 text-right">% Complétion</th>
                  <th className="pb-2 pr-4 text-right">% Victoire</th>
                  <th className="pb-2 pr-4 text-right">Score moy.</th>
                  <th className="pb-2 text-right">Erreurs moy.</th>
                </tr>
              </thead>
              <tbody>
                {[...days].reverse().map((d) => (
                  <tr key={d.date} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium capitalize text-gray-700">{d.label}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{d.sessions}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{d.completed}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{d.won}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{d.completion_rate != null ? pct(d.completion_rate) : "—"}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{d.win_rate != null ? pct(d.win_rate) : "—"}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{fmt(d.avg_score)}</td>
                    <td className="py-2 text-right text-gray-600">{fmt(d.avg_errors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ══════════════════════════ INSIGHTS ══════════════════════════ */}
        {insights.length > 0 && (
          <>
            <SectionTitle>Analyse et recommandations</SectionTitle>
            <div className="space-y-3">
              {insights.map((ins, i) => {
                const styles = {
                  success: { border: "border-emerald-200 bg-emerald-50", title: "text-emerald-800", icon: "✅" },
                  warning: { border: "border-amber-200 bg-amber-50",   title: "text-amber-800",   icon: "⚠️" },
                  danger:  { border: "border-rose-200 bg-rose-50",     title: "text-rose-800",     icon: "🔴" },
                  info:    { border: "border-sky-200 bg-sky-50",       title: "text-sky-800",       icon: "ℹ️" },
                }[ins.type];
                return (
                  <div key={i} className={`rounded-xl border p-4 ${styles.border}`}>
                    <p className={`font-semibold text-sm ${styles.title}`}>{styles.icon} {ins.title}</p>
                    <p className="mt-1 text-sm text-gray-700">{ins.text}</p>
                    <p className="mt-2 text-sm text-gray-500 italic">→ {ins.recommendation}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
