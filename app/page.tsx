import { getDailyGrid } from "@/lib/daily-grid";
import VillodokuApp from "@/components/VillodokuApp";

export default function Home() {
  const today = new Date().toISOString().slice(0, 10);
  const grid = getDailyGrid(today);

  if (!grid) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p>Erreur de génération de la grille du jour.</p>
      </main>
    );
  }

  return (
    <VillodokuApp
      today={today}
      initialRows={grid.rows.map((r) => ({ id: r.id, label: r.label }))}
      initialCols={grid.cols.map((c) => ({ id: c.id, label: c.label }))}
    />
  );
}
