# Prompt de démarrage — Villodoku

> À coller dans Claude (VS Code, Claude.ai ou autre) au début de chaque session de développement.

---

## Contexte du projet

Je développe **Villodoku**, un jeu de puzzle quotidien inspiré de **métrodoku** (métro parisien) et du principe **GeoGrid**, adapté aux **villes de France**.

### Principe du jeu

Le joueur voit une grille **3×3**. Chaque ligne et chaque colonne ont un **critère** (ex : "préfecture de département" × "commence par la lettre B"). Le joueur doit remplir chaque case avec une ville française qui satisfait **simultanément** le critère de sa ligne et celui de sa colonne.

Règles clés :
- Une nouvelle grille chaque jour (même grille pour tous les joueurs)
- Plusieurs réponses valides par case, mais chaque ville ne peut être utilisée qu'une seule fois dans la grille
- **Score basé sur la rareté** : une réponse choisie par peu de joueurs rapporte plus de points
- Maximum **3 erreurs** par partie
- Score plafonné à **900 points**
- L'autocomplétion aide à saisir le nom de la ville (pas de faute de frappe)

### Principe structurant essentiel

Chaque case doit toujours avoir **au moins une ville connue du grand public** comme réponse valide (Paris, Lyon, Bordeaux...). Le corpus inclut des petites villes pour permettre des réponses rares et valoriser la connaissance locale, mais la grille ne doit jamais bloquer un joueur lambda. Ce principe doit être vérifié lors de la **génération des grilles**.

---

## Base de données existante

### Fichiers disponibles à la racine du projet

```
villodoku_corpus.json   ← fichier de jeu principal (5 609 communes ≥ 2 000 hab, 2,8 Mo)
villodoku_db.json       ← base complète (37 590 communes, 18 Mo, pour admin/debug)
build_villodoku.py      ← script Python qui génère les deux fichiers ci-dessus depuis @etalab/decoupage-administratif
```

### Structure d'une entrée commune

```json
{
  "code_commune":        "13055",
  "nom_commune":         "Marseille",
  "departement_code":    "13",
  "departement_nom":     "Bouches-du-Rhône",
  "region_code":         "93",
  "region_nom":          "Provence-Alpes-Côte d'Azur",
  "population":          886040,
  "est_drom":            false,
  "est_prefecture":      true,
  "est_sous_prefecture": false,
  "est_littorale":       true,
  "est_montagne":        false,
  "cours_eau":           ["Huveaune"],
  "nom_avec_tiret":      false,
  "nom_commence_saint":  false,
  "nom_premiere_lettre": "M"
}
```

### Source des données

- **Communes + population + découpage administratif** : package npm `@etalab/decoupage-administratif` (données INSEE, COG 2024)
- **Préfectures** : dérivé des `chefLieu` de département (108 préfectures)
- **Sous-préfectures** : dérivé des `chefLieu` d'arrondissement, hors préfectures (233 villes)
- **Communes littorales** : encodage partiel (~53 villes) depuis la liste Loi Littoral 1986 — **à compléter**
- **Communes de montagne** : encodage partiel (~32 villes) — **à compléter**
- **Cours d'eau** : encodage manuel (~100 villes) — **à compléter** via croisement géospatial BD Carthage IGN

---

## Critères de grille disponibles

| Critère | Champ à interroger | Exemple de valeurs |
|---|---|---|
| Population > 100 000 hab | `population >= 100000` | Paris, Lyon, Marseille |
| Population 20 000–100 000 hab | `population >= 20000 && population < 100000` | Bayonne, Antibes, Colmar |
| DOM-TOM | `est_drom === true` | Fort-de-France, Cayenne, Saint-Denis |
| Préfecture de département | `est_prefecture === true` | Bordeaux, Rennes, Dijon |
| Sous-préfecture | `est_sous_prefecture === true` | Brest, Saint-Malo, Thonon-les-Bains |
| Ville littorale | `est_littorale === true` | Nice, Biarritz, Dunkerque |
| Ville de montagne | `est_montagne === true` | Grenoble, Chamonix, Annecy |
| Traversée par un cours d'eau X | `cours_eau.includes("Loire")` | Nantes, Orléans, Tours |
| Nom avec tiret | `nom_avec_tiret === true` | Aix-en-Provence, Saint-Malo |
| Nom commence par "Saint" | `nom_commence_saint === true` | Saint-Étienne, Saint-Nazaire |
| Nom commence par la lettre X | `nom_premiere_lettre === "B"` | Bordeaux, Brest, Bayonne |
| Région administrative | `region_nom === "Bretagne"` | Rennes, Brest, Vannes, Lorient |

> ⚠️ Les critères `est_littorale`, `est_montagne` et `cours_eau` sont partiellement encodés.
> Pour les grilles de jeu, ne les utiliser que pour des villes dont on est certain.
> Un croisement géospatial avec la BD Carthage IGN permettra de compléter ça plus tard.

---

## Stack technique cible

- **Framework** : Next.js (App Router) + TypeScript
- **Base de données** : le fichier `villodoku_corpus.json` chargé statiquement côté serveur suffit pour démarrer. Migration vers SQLite (via `better-sqlite3`) si besoin de requêtes complexes.
- **Style** : Tailwind CSS
- **Pas de dépendances inutiles** : le jeu est simple, on évite l'over-engineering

### Principes d'architecture

- La **validation des réponses** se fait côté serveur (API route Next.js), jamais côté client — la liste des réponses valides pour chaque case ne doit pas être exposée dans le bundle JS
- La **grille du jour** est déterminée par la date (seed basé sur la date → même grille pour tous les joueurs du monde le même jour)
- Les **stats de rareté** (% de joueurs ayant choisi chaque ville) sont stockées côté serveur et agrégées par grille + case
- L'état de la partie en cours est sauvegardé en **localStorage** (pas besoin de compte utilisateur pour jouer)

---

## Ce qui reste à construire

### Côté données (priorité avant dev)
- [ ] Compléter `est_littorale` : croisement avec la liste officielle CEREMA (~900 communes)
- [ ] Compléter `est_montagne` : croisement avec la liste loi Montagne (~5 500 communes)
- [ ] Compléter `cours_eau` : croisement géospatial BD Carthage × contours communaux IGN

### Côté application
- [ ] Moteur de génération de grilles (avec contrainte "au moins une réponse connue par case")
- [ ] API route de validation de réponse
- [ ] API route de récupération de la grille du jour
- [ ] Composant grille 3×3 avec autocomplétion
- [ ] Système de score + rareté
- [ ] Partage du résultat (texte emoji à copier-coller)
- [ ] Page d'archives (grilles passées)
- [ ] Système de streak (série de jours consécutifs)

---

## Références / inspiration

- **métrodoku** : https://metrodoku.fr — même mécanique, sur les stations du métro parisien. Lancé en avril 2026, 30 000 joueurs réguliers. Développé seul, sans pub, avec Ko-fi pour le soutien. Interface très épurée.
- **GeoGrid** : https://www.geogridgame.com — même mécanique sur les pays du monde
- **Wordle** / **Le Mot** : pour la logique de jeu quotidien et partage de résultat

---

## Démarrage suggéré

Si c'est la première session, commencer par :

```bash
npx create-next-app@latest villodoku --typescript --tailwind --app --no-src-dir
cd villodoku
cp ../villodoku_corpus.json ./data/
```

Puis me demander de générer le **moteur de grille** (`lib/grid-engine.ts`) en premier — c'est le cœur du jeu, tout le reste en dépend.
