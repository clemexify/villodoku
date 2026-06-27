import { getDailyGrid } from "@/lib/daily-grid";
import { LAUNCH_DATE, datesSinceLaunch } from "@/lib/game-storage";
import VillodokuApp from "@/components/VillodokuApp";
import { todayParis } from "@/lib/date-format";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const today = todayParis();
  const { date } = await searchParams;

  const availableDates = new Set(datesSinceLaunch(today));
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && availableDates.has(date) ? date : today;

  const grid = getDailyGrid(selectedDate);

  if (!grid) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p>Erreur de génération de la grille du jour.</p>
      </main>
    );
  }

  return (
    <VillodokuApp
      key={selectedDate}
      today={today}
      initialSelectedDate={selectedDate}
      initialRows={grid.rows.map((r) => ({ id: r.id, label: r.label }))}
      initialCols={grid.cols.map((c) => ({ id: c.id, label: c.label }))}
      initialSolutionsCounts={grid.cells.map((row) => row.map((cell) => cell.solutions.length))}
    />
  );
}
