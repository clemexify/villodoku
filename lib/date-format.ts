/** Formate une date YYYY-MM-DD en "dimanche 15 juin" (FR, sans année). */
export function formatLongDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}
