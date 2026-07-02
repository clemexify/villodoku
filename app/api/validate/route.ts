import { NextResponse } from "next/server";
import { getDailyGrid } from "@/lib/daily-grid";
import { loadCommunes } from "@/lib/corpus";
import type { Commune } from "@/lib/grid-engine";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface ValidateBody {
  date?: unknown;
  row?: unknown;
  col?: unknown;
  codeCommune?: unknown;
  usedCodes?: unknown;
}

function isCellIndex(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 2;
}

function formatPop(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M d'habitants`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k habitants`;
  return `${n.toLocaleString("fr-FR")} habitants`;
}

/** Décrit en langage naturel ce que la ville vaut réellement pour un critère donné. */
function describeForCommune(criterionId: string, c: Commune): string {
  if (criterionId.startsWith("dept_num_")) {
    return `se trouve dans le département ${c.departement_nom} (${c.departement_code})`;
  }
  if (criterionId.startsWith("dept_")) {
    return `se trouve dans le département ${c.departement_nom}`;
  }
  if (criterionId.startsWith("region_")) {
    return `se trouve en ${c.region_nom}`;
  }
  if (criterionId.startsWith("pop_")) {
    return `compte ${formatPop(c.population)}`;
  }
  if (criterionId === "montagne") {
    if (c.altitude != null) return `se situe à ${c.altitude} m d'altitude`;
    return `n'a pas d'altitude enregistrée`;
  }
  if (criterionId === "littoral") {
    return c.est_littorale ? `est une ville littorale` : `n'est pas une ville littorale`;
  }
  if (criterionId === "frontiere") {
    return c.frontiere_terrestre ? `est en zone frontalière` : `n'est pas en zone frontalière`;
  }
  if (criterionId === "mer_manche" || criterionId === "mer_atlantique" || criterionId === "mer_mediterranee") {
    if (c.mer_bordee === "Manche") return `est bordée par la Manche`;
    if (c.mer_bordee === "Atlantique") return `est bordée par l'Atlantique`;
    if (c.mer_bordee === "Méditerranée") return `est bordée par la Méditerranée`;
    return `n'est pas une ville côtière`;
  }
  if (criterionId === "sans_e") {
    const hasE = c.nom_commune.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("e");
    return hasE ? `son nom contient la lettre « e »` : `son nom ne contient pas de « e »`;
  }
  if (criterionId === "saint") {
    return c.nom_commence_saint
      ? `son nom commence par « Saint »`
      : `son nom ne commence pas par « Saint »`;
  }
  if (criterionId === "tiret") {
    return c.nom_avec_tiret ? `son nom contient un tiret` : `son nom n'a pas de tiret`;
  }
  if (criterionId === "nom_article") {
    return /^(Le |La |Les |L')/.test(c.nom_commune)
      ? `son nom commence par un article`
      : `son nom ne commence pas par un article`;
  }
  if (criterionId === "nom_en") {
    const has = c.nom_commune.includes("-sur-") || c.nom_commune.includes("-sous-") || c.nom_commune.includes("-en-");
    return has ? `son nom contient -sur-, -sous- ou -en-` : `son nom ne contient pas -sur-, -sous- ni -en-`;
  }
  if (criterionId === "ends_ville") {
    return c.nom_commune.toLowerCase().endsWith("ville")
      ? `son nom se termine par « ville »`
      : `son nom ne se termine pas par « ville »`;
  }
  if (criterionId === "nom_long" || criterionId === "nom_7car" || criterionId === "nom_8car") {
    return `son nom compte ${c.nom_commune.length} caractères`;
  }
  if (criterionId === "nom_court") {
    const letters = c.nom_commune.replace(/[-'\s]/g, "").length;
    return `son nom compte ${letters} lettres`;
  }
  if (criterionId.startsWith("letter_")) {
    return `commence par la lettre « ${c.nom_premiere_lettre} »`;
  }
  if (criterionId.startsWith("last_letter_")) {
    return `se termine par la lettre « ${c.nom_derniere_lettre} »`;
  }
  if (criterionId.startsWith("contains_")) {
    const letter = criterionId.replace("contains_", "");
    const normalized = c.nom_commune.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return normalized.includes(letter)
      ? `son nom contient la lettre « ${letter.toUpperCase()} »`
      : `son nom ne contient pas la lettre « ${letter.toUpperCase()} »`;
  }
  if (criterionId.startsWith("river_")) {
    const river = criterionId.replace("river_", "");
    if (c.cours_eau.includes(river)) return `est traversée par ${river}`;
    if (c.cours_eau.length === 0) return `n'est traversée par aucun cours d'eau`;
    if (c.cours_eau.length === 1) return `est traversée par ${c.cours_eau[0]}`;
    return `est traversée par ${c.cours_eau.slice(0, 2).join(" et ")}`;
  }
  if (criterionId === "football_l1" || criterionId === "football_l1l2") {
    return `n'a pas eu de club de foot professionnel depuis 2000`;
  }
  if (criterionId === "ile") {
    return `n'est pas situé sur une île`;
  }
  if (criterionId === "drom") {
    return c.est_drom ? `est une commune d'outre-mer` : `est une commune de métropole`;
  }
  if (criterionId === "prefecture") {
    return c.est_prefecture ? `est une préfecture` : `n'est pas une préfecture`;
  }
  if (criterionId === "sous_prefecture") {
    return c.est_sous_prefecture ? `est une sous-préfecture` : `n'est pas une sous-préfecture`;
  }
  if (criterionId.startsWith("dist_")) {
    const parts = criterionId.split("_"); // ["dist", "50", "paris"]
    const km = parts[1];
    const cityName = parts.slice(2).join("_");
    const CITY_NAMES: Record<string, string> = {
      paris: "Paris", lyon: "Lyon", marseille: "Marseille", bordeaux: "Bordeaux",
      toulouse: "Toulouse", nantes: "Nantes", lille: "Lille", nice: "Nice",
      strasbourg: "Strasbourg", rennes: "Rennes", tours: "Tours",
      montpellier: "Montpellier", dijon: "Dijon", clermont: "Clermont-Ferrand",
    };
    return `n'est pas à moins de ${km} km de ${CITY_NAMES[cityName] ?? cityName}`;
  }
  return `ne remplit pas ce critère`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ValidateBody | null;
  if (!body) {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { date, row, col, codeCommune, usedCodes } = body;

  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Format de date invalide (attendu YYYY-MM-DD)" }, { status: 400 });
  }
  if (!isCellIndex(row) || !isCellIndex(col)) {
    return NextResponse.json({ error: "row/col doivent être des entiers entre 0 et 2" }, { status: 400 });
  }
  if (typeof codeCommune !== "string" || codeCommune.length === 0) {
    return NextResponse.json({ error: "codeCommune requis" }, { status: 400 });
  }

  const grid = await getDailyGrid(date);
  if (!grid) {
    return NextResponse.json({ error: "Grille introuvable pour cette date" }, { status: 404 });
  }

  const communes = loadCommunes();
  const commune = communes.find((c) => c.code_commune === codeCommune);

  if (!commune) {
    return NextResponse.json({ valid: false, reason: "not_in_cell" });
  }

  const used = Array.isArray(usedCodes) ? usedCodes : [];
  if (used.includes(codeCommune)) {
    return NextResponse.json({
      valid: false,
      reason: "already_used",
      communeName: commune.nom_commune,
    });
  }

  const rowCriterion = grid.rows[row];
  const colCriterion = grid.cols[col];
  const satisfiesRow = rowCriterion.test(commune);
  const satisfiesCol = colCriterion.test(commune);

  if (satisfiesRow && satisfiesCol) {
    const sorted = [...grid.cells[row][col].solutions].sort((a, b) => b.population - a.population);
    const solutionRank = sorted.findIndex((s) => s.code_commune === codeCommune);
    return NextResponse.json({
      valid: true,
      commune: {
        code_commune: commune.code_commune,
        nom_commune: commune.nom_commune,
        departement_nom: commune.departement_nom,
        population: commune.population,
      },
      solutionRank,
      solutionsCount: grid.cells[row][col].solutions.length,
    });
  }

  // Descriptions en langage naturel de ce que vaut réellement la ville
  const criteriaDescriptions: string[] = [];
  if (!satisfiesRow) criteriaDescriptions.push(describeForCommune(rowCriterion.id, commune));
  if (!satisfiesCol) criteriaDescriptions.push(describeForCommune(colCriterion.id, commune));

  return NextResponse.json({
    valid: false,
    reason: !satisfiesRow && !satisfiesCol ? "not_in_cell" : !satisfiesRow ? "not_in_row" : "not_in_col",
    communeName: commune.nom_commune,
    criteriaDescriptions,
  });
}
