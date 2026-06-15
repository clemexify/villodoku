# Villodoku — Base de données des communes

## Fichiers

| Fichier | Contenu | Taille |
|---|---|---|
| `villodoku_db.json` | Toutes les communes françaises (37 590) | ~18 Mo |
| `villodoku_corpus.json` | Communes ≥ 2 000 hab (5 609) — **fichier de jeu** | ~2.8 Mo |

## Structure d'une commune

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
  "frontiere_terrestre": false,
  "mer_bordee":          "Méditerranée",
  "cours_eau":           ["Huveaune"],
  "nom_avec_tiret":      false,
  "nom_commence_saint":  false,
  "nom_premiere_lettre": "M"
}
```

## Critères disponibles pour les grilles

| Critère | Champ | Exemples de valeurs |
|---|---|---|
| Population > 100k | `population >= 100000` | Paris, Lyon, Marseille... |
| Population 20k–100k | `population >= 20000 && < 100000` | Antibes, Bayonne... |
| DOM-TOM | `est_drom == true` | Fort-de-France, Cayenne... |
| Préfecture | `est_prefecture == true` | Bordeaux, Rennes... |
| Sous-préfecture | `est_sous_prefecture == true` | Brest, Saint-Malo... |
| Littorale | `est_littorale == true` | Nice, Biarritz... |
| Montagne | `est_montagne == true` | Grenoble, Chamonix... |
| Frontière terrestre | `frontiere_terrestre == true` | Strasbourg, Hendaye... |
| Bordée par la Manche / mer du Nord | `mer_bordee == "Manche"` | Le Havre, Dunkerque, Saint-Malo... |
| Bordée par l'Atlantique | `mer_bordee == "Atlantique"` | Brest, La Rochelle, Biarritz... |
| Bordée par la Méditerranée | `mer_bordee == "Méditerranée"` | Marseille, Nice, Sète... |
| Cours d'eau | `cours_eau.includes("Loire")` | Nantes, Tours, Orléans... |
| Nom avec tiret | `nom_avec_tiret == true` | Aix-en-Provence... |
| Commence par Saint | `nom_commence_saint == true` | Saint-Étienne... |
| Première lettre | `nom_premiere_lettre == "B"` | Bordeaux, Brest... |
| Région | `region_nom == "Bretagne"` | Rennes, Brest, Vannes... |

## Sources

- **Communes + population** : `@etalab/decoupage-administratif` (données INSEE)
- **Préfectures / sous-préfectures** : dérivé des chefs-lieux de département et d'arrondissement
- **Communes littorales** : encodage depuis la liste Loi Littoral 1986 / CEREMA
- **Communes de montagne** : encodage depuis la loi Montagne + altitude
- **Frontière terrestre / mer bordée** : encodage manuel, vérifié commune par commune (géographie)
- **Cours d'eau** : encodage manuel depuis BD Carthage IGN (principales villes)

## ⚠️ Points d'attention

- **Littoral et cours d'eau** : encodage partiel (~50 villes littorales, ~100 villes avec cours d'eau).
  À compléter avec un croisement géospatial BD Carthage × contours communaux.
- **Montagne** : ~32 villes encodées. À enrichir.
- **Frontière terrestre** : 29 communes encodées (Belgique, Allemagne, Suisse, Italie, Espagne, Luxembourg, DOM).
- **Mer bordée** : 169 communes encodées (57 Manche/mer du Nord, 53 Atlantique, 59 Méditerranée).
- **Référence population** : millésime inclus dans le package etalab (recensement INSEE).
- **Date de référence** : COG INSEE au 1er janvier 2024.

## Utilisation en JavaScript

```js
import db from './villodoku_corpus.json'

// Villes littorales en Bretagne
const littoBretagne = db.communes.filter(c =>
  c.est_littorale && c.region_nom === 'Bretagne'
)

// Villes dont le nom commence par "S"
const villesS = db.communes.filter(c =>
  c.nom_premiere_lettre === 'S' && c.population >= 20000
)

// Villes traversées par la Loire
const loireVilles = db.communes.filter(c =>
  c.cours_eau.includes('Loire')
)
```
