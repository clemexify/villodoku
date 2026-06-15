export interface RarityInfo {
  /** 0 = très commun (grande ville) ... 4 = très rare (petite commune) */
  tier: number;
  label: string;
  /** Classes du badge affiché sur la case, du plus clair (commun) au plus foncé (rare) */
  badgeClass: string;
}

/**
 * Échelle de rareté basée sur la population de la commune : plus la
 * population est faible, plus la ville est rare (donc difficile à
 * connaître/trouver).
 */
const RARITY_SCALE: { maxPopulation: number; tier: number; label: string; badgeClass: string }[] = [
  { maxPopulation: 3000, tier: 4, label: "Très rare", badgeClass: "bg-violet-700 text-white" },
  { maxPopulation: 8000, tier: 3, label: "Rare", badgeClass: "bg-violet-500 text-white" },
  { maxPopulation: 20000, tier: 2, label: "Peu commun", badgeClass: "bg-violet-300 text-violet-900" },
  { maxPopulation: 100000, tier: 1, label: "Commun", badgeClass: "bg-violet-200 text-violet-800" },
  { maxPopulation: Infinity, tier: 0, label: "Très commun", badgeClass: "bg-violet-100 text-violet-700" },
];

export function getRarityInfo(population: number): RarityInfo {
  for (const step of RARITY_SCALE) {
    if (population < step.maxPopulation) return { tier: step.tier, label: step.label, badgeClass: step.badgeClass };
  }
  return RARITY_SCALE[RARITY_SCALE.length - 1];
}

export const MAX_SCORE = 1000;

/** Paliers de niveau affichés sous la jauge de score, du plus haut au plus bas */
const SCORE_RANKS: { minScore: number; label: string }[] = [
  { minScore: 800, label: "Maître" },
  { minScore: 600, label: "Expert" },
  { minScore: 400, label: "Confirmé" },
  { minScore: 200, label: "Amateur" },
  { minScore: 0, label: "Novice" },
];

export function getScoreRank(score: number): string {
  for (const step of SCORE_RANKS) {
    if (score >= step.minScore) return step.label;
  }
  return SCORE_RANKS[SCORE_RANKS.length - 1].label;
}

/**
 * Score (sur 1000/9) obtenu pour une case selon la rareté de la ville
 * choisie par rapport à la rareté maximale possible pour cette case.
 */
export function cellScore(chosenTier: number, maxTier: number): number {
  const maxCellScore = MAX_SCORE / 9;
  if (maxTier <= 0) return maxCellScore;
  return (chosenTier / maxTier) * maxCellScore;
}
