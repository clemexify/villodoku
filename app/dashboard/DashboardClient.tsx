"use client";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

export type DayStats = {
  date: string;
  label: string;
  sessions: number;
  unique_users: number;
  completed: number;
  won: number;
  lost: number;
  abandoned: number;
  avg_score: number | null;
  avg_errors: number | null;
  win_rate: number | null;
  completion_rate: number | null;
};

export type CellStat = {
  position: string;
  solve_rate: number;
  solved: number;
  total: number;
};

export type GlobalStats = {
  total_sessions: number;
  total_unique_users: number;
  multi_day_users: number;
  mono_day_users: number;
  total_won: number;
  total_lost: number;
  total_abandoned: number;
};

const COLORS = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  gray: "#9ca3af",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      {children}
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

function pct(n: number) { return `${Math.round(n)}%`; }
function fmt(n: number | null) { return n == null ? "—" : Math.round(n).toString(); }

export default function DashboardClient({
  days,
  cells,
  global: g,
}: {
  days: DayStats[];
  cells: CellStat[];
  global: GlobalStats;
}) {
  const winRate = g.total_won + g.total_lost > 0
    ? Math.round((g.total_won / (g.total_won + g.total_lost)) * 100)
    : 0;
  const completionRate = g.total_sessions > 0
    ? Math.round(((g.total_won + g.total_lost) / g.total_sessions) * 100)
    : 0;
  const retentionRate = g.total_unique_users > 0
    ? Math.round((g.multi_day_users / g.total_unique_users) * 100)
    : 0;

  const pieData = [
    { name: "Victoire", value: g.total_won, color: COLORS.emerald },
    { name: "Échec", value: g.total_lost, color: COLORS.rose },
    { name: "Abandon", value: g.total_abandoned, color: COLORS.gray },
  ].filter(d => d.value > 0);

  const retentionPie = [
    { name: "Multi-jours", value: g.multi_day_users, color: COLORS.indigo },
    { name: "1 seul jour", value: g.mono_day_users, color: COLORS.gray },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">
              <span className="text-indigo-600">Villo</span>doku — Tableau de pilotage
            </h1>
            <p className="text-sm text-gray-500">{g.total_sessions} sessions enregistrées sur {days.length} jour{days.length > 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card title="Fréquentation">
            <KPI label="Sessions totales" value={g.total_sessions} />
          </Card>
          <Card title="Audience">
            <KPI label="Joueurs uniques" value={g.total_unique_users} />
          </Card>
          <Card title="Complétion">
            <KPI label="Parties terminées" value={pct(completionRate)} sub={`${g.total_won + g.total_lost} / ${g.total_sessions}`} />
          </Card>
          <Card title="Victoire">
            <KPI label="Taux de victoire" value={pct(winRate)} sub={`${g.total_won} gagnées / ${g.total_lost} perdues`} />
          </Card>
        </div>

        {/* Fréquentation jour par jour */}
        <Card title="Sessions et joueurs uniques par jour">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sessions" name="Sessions" fill={COLORS.indigo} radius={[4, 4, 0, 0]} />
              <Bar dataKey="unique_users" name="Joueurs uniques" fill={COLORS.violet} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Taux de complétion et victoire */}
        <Card title="Taux de complétion et de victoire par jour (%)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v) => `${Math.round(Number(v))}%`} />
              <Legend />
              <Line dataKey="completion_rate" name="Complétion" stroke={COLORS.sky} strokeWidth={2} dot={false} connectNulls />
              <Line dataKey="win_rate" name="Victoire" stroke={COLORS.emerald} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Score moyen par jour */}
          <Card title="Score moyen par jour (/100)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Line dataKey="avg_score" name="Score moyen" stroke={COLORS.amber} strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Erreurs moyennes par jour */}
          <Card title="Erreurs moyennes par partie">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 5]} />
                <Tooltip />
                <Line dataKey="avg_errors" name="Erreurs moy." stroke={COLORS.rose} strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Outcomes par jour (stacked) */}
        <Card title="Répartition des issues par jour">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="won" name="Victoire" stackId="a" fill={COLORS.emerald} />
              <Bar dataKey="lost" name="Échec" stackId="a" fill={COLORS.rose} />
              <Bar dataKey="abandoned" name="Abandon" stackId="a" fill={COLORS.gray} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Distribution globale */}
          <Card title="Distribution globale des issues">
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-bold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Fidélisation */}
          <Card title={`Fidélisation — ${retentionRate}% reviennent`}>
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
                  <strong>{g.multi_day_users}</strong> joueurs sur {g.total_unique_users} ont joué plusieurs jours
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Heatmap des cases */}
        <Card title="Taux de résolution par case (difficulté des croisements)">
          {cells.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 max-w-sm">
                {cells.map((cell) => {
                  const rate = cell.solve_rate;
                  const bg = rate >= 70 ? "bg-emerald-100 text-emerald-800"
                    : rate >= 40 ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800";
                  return (
                    <div key={cell.position} className={`rounded-xl p-3 text-center ${bg}`}>
                      <div className="text-lg font-bold">{Math.round(rate)}%</div>
                      <div className="text-xs opacity-70">{cell.solved}/{cell.total}</div>
                      <div className="text-xs font-medium">{cell.position}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400">Vert ≥ 70% · Orange 40–70% · Rouge &lt; 40%</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={cells.map(c => ({ name: c.position, taux: Math.round(c.solve_rate) }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={55} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="taux" name="Résolution" fill={COLORS.indigo} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Pas encore de données de cases.</p>
          )}
        </Card>

        {/* Tableau récapitulatif par jour */}
        <Card title="Récapitulatif jour par jour">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4 text-right">Sessions</th>
                  <th className="pb-2 pr-4 text-right">Joueurs</th>
                  <th className="pb-2 pr-4 text-right">Complétion</th>
                  <th className="pb-2 pr-4 text-right">Victoire</th>
                  <th className="pb-2 pr-4 text-right">Score moy.</th>
                  <th className="pb-2 text-right">Erreurs moy.</th>
                </tr>
              </thead>
              <tbody>
                {[...days].reverse().map((d) => (
                  <tr key={d.date} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium capitalize text-gray-700">{d.label}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{d.sessions}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{d.unique_users}</td>
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
      </div>
    </div>
  );
}
