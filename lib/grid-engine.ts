/**
 * Moteur de génération de grilles Villodoku.
 *
 * Une grille = 3 critères de ligne x 3 critères de colonne.
 * Chaque case (ligne i, colonne j) est valide si l'intersection des deux
 * critères contient :
 *  - au moins `minSolutionsPerCell` communes (plusieurs solutions possibles)
 *  - au moins une commune "connue du grand public" (cf. getWellKnownCityCodes)
 * et la grille entière doit admettre au moins une affectation de 9 communes
 * distinctes (une par case).
 */

export interface Commune {
  code_commune: string;
  nom_commune: string;
  departement_code: string;
  departement_nom: string;
  region_code: string;
  region_nom: string;
  population: number;
  est_drom: boolean;
  est_prefecture: boolean;
  est_sous_prefecture: boolean;
  est_littorale: boolean;
  est_montagne: boolean;
  altitude: number | null;
  frontiere_terrestre: boolean;
  mer_bordee: string | null;
  cours_eau: string[];
  nom_avec_tiret: boolean;
  nom_commence_saint: boolean;
  nom_premiere_lettre: string;
}

export interface Criterion {
  /** Identifiant unique et stable, ex: "letter_B", "region_Bretagne" */
  id: string;
  /** Libellé affiché au joueur */
  label: string;
  /** Famille de critère, utilisée pour garantir la diversité d'une grille */
  category: string;
  test: (c: Commune) => boolean;
}

export interface GridCell {
  row: Criterion;
  col: Criterion;
  /** Toutes les communes satisfaisant à la fois le critère de ligne et de colonne */
  solutions: Commune[];
}

export interface Grid {
  rows: Criterion[];
  cols: Criterion[];
  cells: GridCell[][];
  /** Une affectation valide (9 communes distinctes, une par case) */
  solutionExample: Commune[][];
}

export interface GridGenOptions {
  /** Nombre minimum de solutions par case (défaut: 3) */
  minSolutionsPerCell?: number;
  /** Codes commune des villes "connues du grand public" (cf. getWellKnownCityCodes) */
  topVilleCodes: Set<string>;
  /** Nombre maximum de tentatives avant d'abandonner (défaut: 5000) */
  maxAttempts?: number;
  /**
   * Si défini, force ce type de critère à figurer dans chaque tentative.
   * Permet de générer des grilles garantissant un critère particulier (ex: "departement").
   */
  requiredCategory?: string;
}

// Seuils minimaux pour qu'une valeur de critère soit retenue dans le pool
// (en dessous, l'intersection avec d'autres critères serait trop souvent vide).
const MIN_CANDIDATES = {
  letter: 40,
  region: 30,
  departement: 20,
  river: 3,
};

// Catégories privilégiées pour la génération des grilles : on tire les 6
// critères d'une grille en priorité parmi celles-ci.
// "tiret" a été retiré de cette liste et intégré dans "nom" pour éviter
// qu'il revienne dans toutes les grilles.
const PRIORITY_CATEGORIES = [
  'letter',
  'region',
  'departement',
  'prefecture',
  'population',
  'mer',
  'frontiere',
  'nom',
  'montagne',
  'river',
  'sous_prefecture',
];

/**
 * Construit le pool de critères disponibles, regroupés par catégorie.
 * Les valeurs trop rares (lettres, régions, cours d'eau peu représentés)
 * sont exclues pour éviter des intersections systématiquement vides.
 */
export function buildCriteriaPool(communes: Commune[]): Map<string, Criterion[]> {
  const pool = new Map<string, Criterion[]>();

  pool.set('population', [
    {
      id: 'pop_large',
      label: 'Plus de 100 000 habitants',
      category: 'population',
      test: (c) => c.population >= 100000,
    },
    {
      id: 'pop_medium',
      label: 'Entre 20 000 et 100 000 habitants',
      category: 'population',
      test: (c) => c.population >= 20000 && c.population < 100000,
    },
    {
      id: 'pop_small',
      label: 'Entre 5 000 et 20 000 habitants',
      category: 'population',
      test: (c) => c.population >= 5000 && c.population < 20000,
    },
  ]);

  pool.set('drom', [
    {
      id: 'drom',
      label: "Commune d'outre-mer (DROM)",
      category: 'drom',
      test: (c) => c.est_drom,
    },
  ]);

  pool.set('prefecture', [
    {
      id: 'prefecture',
      label: 'Préfecture de département',
      category: 'prefecture',
      test: (c) => c.est_prefecture,
    },
  ]);

  pool.set('sous_prefecture', [
    {
      id: 'sous_prefecture',
      label: 'Sous-préfecture',
      category: 'sous_prefecture',
      test: (c) => c.est_sous_prefecture,
    },
  ]);

  pool.set('littoral', [
    {
      id: 'littoral',
      label: 'Ville littorale',
      category: 'littoral',
      test: (c) => c.est_littorale,
    },
  ]);

  pool.set('montagne', [
    {
      id: 'montagne',
      label: 'À plus de 500 m d\'altitude',
      category: 'montagne',
      test: (c) => (c.altitude ?? 0) > 500,
    },
  ]);

  // Département : uniquement ceux suffisamment représentés dans le corpus
  const deptCounts = new Map<string, number>();
  for (const c of communes) {
    deptCounts.set(c.departement_nom, (deptCounts.get(c.departement_nom) ?? 0) + 1);
  }
  const depts: Criterion[] = [];
  for (const [dept, count] of deptCounts) {
    if (count >= MIN_CANDIDATES.departement) {
      depts.push({
        id: `dept_${dept}`,
        label: `Département : ${dept}`,
        category: 'departement',
        test: (c) => c.departement_nom === dept,
      });
    }
  }
  pool.set('departement', depts);

  pool.set('frontiere', [
    {
      id: 'frontiere',
      label: 'Frontière avec un pays étranger',
      category: 'frontiere',
      test: (c) => c.frontiere_terrestre,
    },
  ]);

  pool.set('mer', [
    {
      id: 'mer_manche',
      label: 'Bordée par la Manche / la mer du Nord',
      category: 'mer',
      test: (c) => c.mer_bordee === 'Manche',
    },
    {
      id: 'mer_atlantique',
      label: "Bordée par l'océan Atlantique",
      category: 'mer',
      test: (c) => c.mer_bordee === 'Atlantique',
    },
    {
      id: 'mer_mediterranee',
      label: 'Bordée par la mer Méditerranée',
      category: 'mer',
      test: (c) => c.mer_bordee === 'Méditerranée',
    },
  ]);

  // Critères basés sur la forme du nom — regroupés en une seule catégorie
  // pour éviter que plusieurs critères de ce type coexistent dans une grille.
  // Tiret est intégré ici (plus dans sa propre catégorie) pour réduire sa fréquence.
  pool.set('nom', [
    {
      id: 'tiret',
      label: 'Nom avec un tiret',
      category: 'nom',
      test: (c) => c.nom_avec_tiret,
    },
    {
      id: 'nom_article',
      label: 'Nom commençant par Le, La, Les ou L\'',
      category: 'nom',
      test: (c) => /^(Le |La |Les |L')/.test(c.nom_commune),
    },
    {
      id: 'nom_sur',
      label: 'Nom contenant « -sur- »',
      category: 'nom',
      test: (c) => c.nom_commune.includes('-sur-'),
    },
    {
      id: 'nom_en',
      label: 'Nom contenant « -en- »',
      category: 'nom',
      test: (c) => c.nom_commune.includes('-en-'),
    },
    {
      id: 'nom_long',
      label: 'Nom de plus de 15 caractères',
      category: 'nom',
      test: (c) => c.nom_commune.length > 15,
    },
    {
      id: 'nom_court',
      label: 'Nom de 4 lettres ou moins',
      category: 'nom',
      test: (c) => c.nom_commune.replace(/[-'\s]/g, '').length <= 4,
    },
  ]);

  pool.set('saint', [
    {
      id: 'saint',
      label: 'Nom commençant par "Saint"',
      category: 'saint',
      test: (c) => c.nom_commence_saint,
    },
  ]);

  // Cours d'eau : seuls ceux traversant suffisamment de communes du corpus
  const riverCounts = new Map<string, number>();
  for (const c of communes) {
    for (const r of c.cours_eau) {
      riverCounts.set(r, (riverCounts.get(r) ?? 0) + 1);
    }
  }
  const rivers: Criterion[] = [];
  for (const [river, count] of riverCounts) {
    if (count >= MIN_CANDIDATES.river) {
      rivers.push({
        id: `river_${river}`,
        label: `Traversée par : ${river}`,
        category: 'river',
        test: (c) => c.cours_eau.includes(river),
      });
    }
  }
  pool.set('river', rivers);

  // Première lettre : uniquement les lettres suffisamment représentées
  const letterCounts = new Map<string, number>();
  for (const c of communes) {
    letterCounts.set(c.nom_premiere_lettre, (letterCounts.get(c.nom_premiere_lettre) ?? 0) + 1);
  }
  const letters: Criterion[] = [];
  for (const [letter, count] of letterCounts) {
    if (count >= MIN_CANDIDATES.letter) {
      letters.push({
        id: `letter_${letter}`,
        label: `Commence par la lettre ${letter}`,
        category: 'letter',
        test: (c) => c.nom_premiere_lettre === letter,
      });
    }
  }
  pool.set('letter', letters);

  // Région administrative : uniquement les régions suffisamment représentées
  const regionCounts = new Map<string, number>();
  for (const c of communes) {
    regionCounts.set(c.region_nom, (regionCounts.get(c.region_nom) ?? 0) + 1);
  }
  const regions: Criterion[] = [];
  for (const [region, count] of regionCounts) {
    if (count >= MIN_CANDIDATES.region) {
      regions.push({
        id: `region_${region}`,
        label: `Région : ${region}`,
        category: 'region',
        test: (c) => c.region_nom === region,
      });
    }
  }
  pool.set('region', regions);

  return pool;
}

/**
 * Codes commune des `topN` villes les plus peuplées, en excluant les
 * arrondissements (Paris/Lyon/Marseille) qui ne sont pas des "villes"
 * reconnaissables par le grand public en tant que telles.
 */
export function getWellKnownCityCodes(communes: Commune[], topN = 100): Set<string> {
  const filtered = communes.filter((c) => !c.nom_commune.includes('Arrondissement'));
  const sorted = [...filtered].sort((a, b) => b.population - a.population);
  return new Set(sorted.slice(0, topN).map((c) => c.code_commune));
}

// --- RNG déterministe (mulberry32) -----------------------------------------

export function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Recherche une affectation de 9 communes distinctes (une par case) par
 * backtracking, en traitant d'abord les cases ayant le moins de solutions
 * (heuristique MRV) pour limiter l'explosion combinatoire.
 */
function findFullAssignment(cells: GridCell[][]): Commune[][] | null {
  const positions: Array<[number, number]> = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) positions.push([r, c]);
  }
  positions.sort(
    (a, b) => cells[a[0]][a[1]].solutions.length - cells[b[0]][b[1]].solutions.length
  );

  const assignment: (Commune | null)[][] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
  const used = new Set<string>();

  function backtrack(index: number): boolean {
    if (index === 9) return true;
    const [r, c] = positions[index];
    for (const commune of cells[r][c].solutions) {
      if (used.has(commune.code_commune)) continue;
      used.add(commune.code_commune);
      assignment[r][c] = commune;
      if (backtrack(index + 1)) return true;
      used.delete(commune.code_commune);
      assignment[r][c] = null;
    }
    return false;
  }

  if (!backtrack(0)) return null;
  return assignment as Commune[][];
}

/**
 * Génère une grille valide en tirant 6 critères distincts (un par catégorie
 * parmi 6 catégories tirées au hasard), répartis en 3 lignes / 3 colonnes.
 * Réessaie jusqu'à `maxAttempts` fois tant que les contraintes ne sont pas
 * satisfaites pour les 9 cases.
 */
export function generateGrid(
  communes: Commune[],
  criteriaPool: Map<string, Criterion[]>,
  rng: () => number,
  options: GridGenOptions
): Grid | null {
  const { minSolutionsPerCell = 3, topVilleCodes, maxAttempts = 5000, requiredCategory } = options;

  const categories = Array.from(criteriaPool.keys()).filter(
    (cat) => (criteriaPool.get(cat) ?? []).length > 0
  );
  if (categories.length < 6) return null;

  const priorityCategories = PRIORITY_CATEGORIES.filter((cat) => categories.includes(cat));
  const otherCategories = categories.filter((cat) => !priorityCategories.includes(cat));
  const pickFrom = priorityCategories.length >= 6 ? priorityCategories : [...priorityCategories, ...otherCategories];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let criteria: Criterion[];
    let rows: Criterion[];
    let cols: Criterion[];

    if (requiredCategory) {
      // Chemin "catégorie imposée" : on choisit d'abord le critère requis, puis on
      // cherche 5 autres critères *compatibles* avec lui parmi les catégories disponibles
      // (excluant "region" pour éviter le conflit dept/région).
      // Cela évite les combinaisons fondamentalement impossibles telles que
      // "département plat × altitude > 500 m" ou "département intérieur × mer".
      const reqPool = criteriaPool.get(requiredCategory) ?? [];
      if (reqPool.length === 0) continue;

      const reqCriterion = pick(reqPool, rng);

      const candidateCats = pickFrom.filter((c) => c !== requiredCategory && c !== 'region');
      // Pour un département, le nom du fleuve homonyme à exclure (ex: dept_Rhône → exclure river_Rhône)
      const deptHomonymeRiverId =
        requiredCategory === 'departement'
          ? `river_${reqCriterion.id.replace('dept_', '')}`
          : null;

      const compatGroups: Array<{ cat: string; crit: Criterion[] }> = [];
      for (const cat of candidateCats) {
        const compat = (criteriaPool.get(cat) ?? []).filter((crit) => {
          if (deptHomonymeRiverId && crit.id === deptHomonymeRiverId) return false;
          const sols = communes.filter((co) => reqCriterion.test(co) && crit.test(co));
          return sols.length >= minSolutionsPerCell && sols.some((s) => topVilleCodes.has(s.code_commune));
        });
        if (compat.length > 0) compatGroups.push({ cat, crit: compat });
      }

      if (compatGroups.length < 5) continue;

      const chosenGroups = shuffle(compatGroups, rng).slice(0, 5);
      criteria = shuffle(
        [reqCriterion, ...chosenGroups.map((g) => pick(g.crit, rng))],
        rng
      );
      rows = criteria.slice(0, 3);
      cols = criteria.slice(3, 6);
    } else {
      // Chemin standard
      const chosenCategories = shuffle(pickFrom, rng).slice(0, 6);
      criteria = chosenCategories.map((cat) => pick(criteriaPool.get(cat)!, rng));

      const ids = new Set(criteria.map((c) => c.id));
      if (ids.has('saint') && (ids.has('letter_S') || ids.has('tiret'))) continue;

      const hasRegion = criteria.some((c) => c.category === 'region');
      const hasDept = criteria.some((c) => c.category === 'departement');
      if (hasRegion && hasDept) continue;

      // Bloque fleuve × département homonyme (ex: "Traversée par Rhône" × "Département Rhône")
      // qui est redondant et culturellement confus.
      const riverCrit = criteria.find((c) => c.category === 'river');
      const deptCrit = criteria.find((c) => c.category === 'departement');
      if (riverCrit && deptCrit && deptCrit.id === `dept_${riverCrit.id.replace('river_', '')}`) continue;

      const shuffled = shuffle(criteria, rng);
      rows = shuffled.slice(0, 3);
      cols = shuffled.slice(3, 6);
    }

    const cells: GridCell[][] = [];
    let valid = true;

    for (let r = 0; r < 3 && valid; r++) {
      const rowCells: GridCell[] = [];
      for (let c = 0; c < 3; c++) {
        const solutions = communes.filter((commune) => rows[r].test(commune) && cols[c].test(commune));
        if (solutions.length < minSolutionsPerCell) {
          valid = false;
          break;
        }
        if (!solutions.some((s) => topVilleCodes.has(s.code_commune))) {
          valid = false;
          break;
        }
        rowCells.push({ row: rows[r], col: cols[c], solutions });
      }
      cells.push(rowCells);
    }

    if (!valid) continue;

    const solutionExample = findFullAssignment(cells);
    if (!solutionExample) continue;

    return { rows, cols, cells, solutionExample };
  }

  return null;
}

/**
 * Génère la grille du jour pour une date donnée (format "YYYY-MM-DD").
 * Le seed dérive directement de la date : tous les joueurs obtiennent
 * la même grille le même jour.
 */
export function generateDailyGrid(
  communes: Commune[],
  criteriaPool: Map<string, Criterion[]>,
  date: string,
  topVilleCodes: Set<string>,
  options: Omit<GridGenOptions, 'topVilleCodes'> = {}
): Grid | null {
  const rng = mulberry32(seedFromString(date));
  return generateGrid(communes, criteriaPool, rng, { ...options, topVilleCodes });
}
