/** Formate une date YYYY-MM-DD en "dimanche 15 juin" (FR, sans année). */
export function formatLongDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** Retourne la date du jour au format YYYY-MM-DD selon le fuseau Europe/Paris. */
export function todayParis(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("/")
    .reverse()
    .join("-");
}
