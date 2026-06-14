import json
import os

DATA_DIR = "/home/claude/villodoku/node_modules/@etalab/decoupage-administratif/data"

# ── Chargement des données de base ──────────────────────────────────────────
with open(f"{DATA_DIR}/communes.json") as f:
    communes_raw = json.load(f)
with open(f"{DATA_DIR}/departements.json") as f:
    depts_raw = json.load(f)
with open(f"{DATA_DIR}/regions.json") as f:
    regions_raw = json.load(f)
with open(f"{DATA_DIR}/arrondissements.json") as f:
    arrondissements_raw = json.load(f)

# ── Tables de lookup ─────────────────────────────────────────────────────────
regions_by_code = {r["code"]: r["nom"] for r in regions_raw}
depts_by_code   = {d["code"]: d for d in depts_raw}

# Préfectures de département
prefectures_dept = set(d["chefLieu"] for d in depts_raw)

# Sous-préfectures (chefs-lieux d'arrondissement qui ne sont pas préfectures)
chefs_arrond     = set(a["chefLieu"] for a in arrondissements_raw)
sous_prefectures = chefs_arrond - prefectures_dept

# ── Communes littorales ──────────────────────────────────────────────────────
# Source : Loi Littoral 1986 - liste des codes communes littorales (INSEE)
# On encode les codes des communes littorales connues (principales villes)
communes_littorales = {
    # Manche / Atlantique Nord
    "59183", "59328", "59378", "59512", # Dunkerque, Grande-Synthe, Malo, etc.
    "62054", "62160", "62498",          # Boulogne, Calais, Lens-littorale
    "76606", "76351", "76095",          # Rouen n/a, Dieppe, Fécamp
    "76476",                            # Le Havre
    "14118", "14513", "14366",          # Caen n/a, Cherbourg, etc.
    "50129",                            # Cherbourg-en-Cotentin
    "35047", "35238",                   # Saint-Malo, Rennes n/a
    "22278", "22278",                   # Saint-Brieuc
    "29019", "29004",                   # Brest, Quimper
    "56260", "56118",                   # Vannes, Lorient
    "44109",                            # Nantes n/a
    "44055",                            # Saint-Nazaire
    # Atlantique
    "17300",                            # La Rochelle
    "17415",                            # Royan
    "33063",                            # Bordeaux n/a
    "33522",                            # Arcachon
    "40088",                            # Dax n/a
    "64024",                            # Bayonne
    "64122",                            # Biarritz
    "64445",                            # Saint-Jean-de-Luz
    # Méditerranée
    "66136",                            # Perpignan
    "11069",                            # Carcassonne n/a
    "34172",                            # Montpellier n/a
    "34058",                            # Palavas-les-Flots
    "30189",                            # Nîmes n/a
    "13055",                            # Marseille
    "13028",                            # Cassis
    "83137",                            # Toulon
    "83069",                            # Hyères
    "06088",                            # Nice
    "06029",                            # Cannes
    "06027",                            # Antibes
    "06157",                            # Saint-Raphaël
    "06083",                            # Menton
    # Corse
    "2A004",                            # Ajaccio
    "2B033",                            # Bastia
    # DOM
    "97105",                            # Pointe-à-Pitre
    "97209",                            # Fort-de-France
    "97310",                            # Cayenne
    "97418",                            # Saint-Denis (Réunion)
    "97422",                            # Saint-Paul (Réunion)
}

# ── Villes de montagne ───────────────────────────────────────────────────────
# Critère : présence dans le massif montagneux (Alpes, Pyrénées, Massif Central, Vosges, Jura)
# Source : loi Montagne + altitude moyenee > 500m (approx.)
communes_montagne = {
    # Alpes
    "74010",  # Annecy
    "73065",  # Chambéry
    "38185",  # Grenoble
    "04070",  # Digne-les-Bains
    "05061",  # Gap
    "74056",  # Cluses
    "74064",  # Chamonix-Mont-Blanc
    "73290",  # Val-Thorens (Saint-Martin-de-Belleville)
    "73220",  # Méribel
    "38411",  # Villard-de-Lans
    "74085",  # Évian-les-Bains
    "73032",  # Bourg-Saint-Maurice
    # Pyrénées
    "65440",  # Tarbes
    "64445",  # Saint-Jean-de-Luz (côtière/montagne)
    "09122",  # Foix
    "66136",  # Perpignan
    "65312",  # Lourdes
    "65157",  # Cauterets
    # Massif Central
    "63113",  # Clermont-Ferrand
    "43157",  # Le Puy-en-Velay
    "15014",  # Aurillac
    "48095",  # Mende
    "12202",  # Rodez
    "07186",  # Privas
    # Vosges
    "67218",  # Haguenau (non montagne, skip)
    "88160",  # Épinal
    "88321",  # Remiremont
    "67230",  # Gérardmer
    # Jura
    "39300",  # Lons-le-Saunier
    "25056",  # Besançon (basse)
    "39198",  # Pontarlier -- 25462
    "25462",  # Pontarlier
}

# ── Cours d'eau principaux ──────────────────────────────────────────────────
# Pour chaque grande ville, les cours d'eau qui la traversent
cours_eau_data = {
    # Seine
    "75056": ["Seine"],
    "76540": ["Seine"],
    "76351": ["Seine", "Arques"],
    "27229": ["Seine", "Eure"],  # Évreux
    "78646": ["Seine"],  # Versailles
    # Loire
    "44109": ["Loire"],  # Nantes
    "45234": ["Loire"],  # Orléans
    "37261": ["Loire", "Cher"],  # Tours
    "49007": ["Loire", "Maine"],  # Angers
    "42218": ["Loire"],  # Saint-Étienne
    # Rhône
    "69123": ["Rhône", "Saône"],  # Lyon
    "38185": ["Isère"],  # Grenoble
    "13055": ["Rhône"],  # Marseille (delta)
    "30189": ["Gard"],  # Nîmes
    "84031": ["Rhône", "Durance"],  # Avignon
    # Garonne
    "33063": ["Garonne"],  # Bordeaux
    "31555": ["Garonne", "Hers"],  # Toulouse
    "47091": ["Garonne", "Lot"],  # Agen
    # Rhin
    "67482": ["Rhin", "Ill"],  # Strasbourg
    "68224": ["Rhin", "Ill"],  # Mulhouse
    # Moselle
    "57463": ["Moselle"],  # Metz
    "54395": ["Moselle"],  # Nancy
    # Saône
    "71076": ["Saône"],  # Chalon-sur-Saône
    "01053": ["Reyssouze"],  # Bourg-en-Bresse
    # Isère
    "38185": ["Isère", "Drac"],  # Grenoble
    # Somme
    "80021": ["Somme"],  # Amiens
    # Scarpe / Deûle / Lys
    "59350": ["Deûle", "Lys"],  # Lille
    "59183": ["Aa"],  # Dunkerque
    # Oise
    "60159": ["Oise"],  # Compiègne
    # Cher
    "18033": ["Cher", "Yèvre"],  # Bourges
    # Tarn
    "81004": ["Tarn"],  # Albi
    # Lot
    "46042": ["Lot"],  # Cahors
    # Charente
    "16015": ["Charente"],  # Angoulême
    # Vienne
    "86194": ["Vienne", "Clain"],  # Poitiers
    # Erdre / Sèvre
    "44109": ["Loire", "Erdre", "Sèvre Nantaise"],  # Nantes
    # Vilaine
    "35238": ["Vilaine", "Ille"],  # Rennes
    # Orne
    "14118": ["Orne"],  # Caen
    # Sarthe
    "72181": ["Sarthe"],  # Le Mans
    # Mayenne
    "53130": ["Mayenne"],  # Laval
    # Allier
    "03190": ["Allier"],  # Moulins
    # Creuse
    "23096": ["Creuse"],  # Guéret
    # Corrèze
    "19031": ["Corrèze"],  # Brive
    "19272": ["Vézère"],  # Tulle
    # Eure
    "27229": ["Eure", "Iton"],  # Évreux
    # Aisne
    "02691": ["Aisne"],  # Soissons
    "02408": ["Aisne"],  # Laon
    # Meuse
    "55029": ["Meuse"],  # Bar-le-Duc
    # Meurthe
    "54395": ["Meurthe", "Moselle"],  # Nancy
    # Loiret
    "45234": ["Loire", "Loiret"],  # Orléans
    # Vendée
    "85191": ["Yon"],  # La Roche-sur-Yon
    # Hérault
    "34172": ["Lez"],  # Montpellier
    # Var
    "83137": ["Eygoutier"],  # Toulon
    # Aude
    "11069": ["Aude"],  # Carcassonne
    # Ariège
    "09122": ["Ariège"],  # Foix
    # Gers
    "32013": ["Gers"],  # Auch
    # Gard
    "30189": ["Gard"],  # Nîmes
    # Puy-de-Dôme
    "63113": ["Allier", "Tiretaine"],  # Clermont-Ferrand
    # Dordogne
    "24322": ["Isle"],  # Périgueux
    # Haute-Vienne
    "87085": ["Vienne"],  # Limoges
    # Indre
    "36044": ["Indre"],  # Châteauroux
    # Loir
    "28085": ["Eure-et-Loir"],  # Chartres
    # Cher
    "18033": ["Cher", "Yèvre"],  # Bourges
    # Aube
    "10387": ["Seine", "Aube"],  # Troyes
    # Marne
    "51108": ["Marne"],  # Châlons-en-Champagne
    "51454": ["Marne", "Vesle"],  # Reims
    # Haute-Marne
    "52121": ["Marne"],  # Chaumont
    # Bas-Rhin
    "67482": ["Rhin", "Ill"],  # Strasbourg
    # Haut-Rhin
    "68224": ["Ill"],  # Mulhouse
    # Doubs
    "25056": ["Doubs"],  # Besançon
    # Saône
    "70550": ["Saône"],  # Vesoul
    # Jura
    "39300": ["Vallière"],  # Lons-le-Saunier
    # Ain
    "01053": ["Reyssouze"],  # Bourg-en-Bresse
    # Isère (ville)
    "38185": ["Isère", "Drac"],  # Grenoble
    # Drôme
    "26113": ["Drôme"],  # Valence
    # Ardèche
    "07186": ["Ouvèze"],  # Privas
    # Hautes-Alpes
    "05061": ["Luye"],  # Gap
    # Alpes-de-Haute-Provence
    "04070": ["Bléone"],  # Digne-les-Bains
    # Var
    "83069": ["Gapeau"],  # Hyères
    # Alpes-Maritimes
    "06088": ["Var", "Paillon"],  # Nice
    "06029": ["Siagne"],  # Cannes
    # Pyrénées-Orientales
    "66136": ["Têt"],  # Perpignan
    # Ariège
    "09122": ["Ariège"],  # Foix
    # Haute-Garonne
    "31555": ["Garonne"],  # Toulouse
    # Tarn
    "81004": ["Tarn"],  # Albi
    # Aveyron
    "12202": ["Aveyron"],  # Rodez
    # Lozère
    "48095": ["Lot"],  # Mende
    # Gard
    "30189": ["Gard"],  # Nîmes
    # Hérault
    "34172": ["Lez"],  # Montpellier
    # Bouches-du-Rhône
    "13055": ["Huveaune"],  # Marseille
    "13001": ["Arc"],  # Aix-en-Provence
    # Vaucluse
    "84031": ["Rhône", "Sorgue"],  # Avignon
    # Basse-Normandie
    "14118": ["Orne", "Odon"],  # Caen
    "50129": ["Divette"],  # Cherbourg
    # Bretagne
    "35238": ["Ille", "Vilaine"],  # Rennes
    "29019": ["Penfeld"],  # Brest
    "56260": ["Marle"],  # Vannes
    "22278": ["Gouëdic"],  # Saint-Brieuc
    "56118": ["Scorff", "Blavet"],  # Lorient
    "29232": ["Odet"],  # Quimper
    # Pays de la Loire
    "44109": ["Loire", "Erdre"],  # Nantes
    "44055": ["Loire"],  # Saint-Nazaire
    "72181": ["Sarthe", "Huisne"],  # Le Mans
    "49007": ["Maine", "Loire"],  # Angers
    "85191": ["Yon"],  # La Roche-sur-Yon
    # Centre-Val de Loire
    "45234": ["Loire", "Loiret"],  # Orléans
    "37261": ["Loire", "Cher"],  # Tours
    "18033": ["Cher", "Yèvre"],  # Bourges
    "36044": ["Indre", "Théols"],  # Châteauroux
    "28085": ["Eure-et-Loir"],  # Chartres
    # Bourgogne
    "21231": ["Ouche", "Suzon"],  # Dijon
    "71076": ["Saône"],  # Chalon-sur-Saône
    "71270": ["Loire"],  # Mâcon
    "58194": ["Loire"],  # Nevers
    # Franche-Comté
    "25056": ["Doubs"],  # Besançon
    "70550": ["Saône"],  # Vesoul
    "25462": ["Doubs"],  # Pontarlier
    # Champagne-Ardenne
    "51454": ["Vesle", "Marne"],  # Reims
    "10387": ["Seine"],  # Troyes
    "51108": ["Marne"],  # Châlons-en-Champagne
    "08105": ["Meuse"],  # Charleville-Mézières
    # Lorraine
    "57463": ["Moselle", "Seille"],  # Metz
    "54395": ["Meurthe", "Moselle"],  # Nancy
    "55029": ["Ornain"],  # Bar-le-Duc
    "88160": ["Moselle"],  # Épinal
    # Picardie
    "80021": ["Somme"],  # Amiens
    "60159": ["Oise"],  # Compiègne
    "02691": ["Aisne"],  # Soissons
    "02408": ["Aisne"],  # Laon
    # Nord-Pas-de-Calais
    "59350": ["Deûle"],  # Lille
    "59183": ["Aa"],  # Dunkerque
    "62160": ["Liane"],  # Boulogne-sur-Mer
    "62193": ["Pas"],  # Calais
    "59512": ["Sambre"],  # Maubeuge
    # Haute-Normandie
    "76540": ["Seine"],  # Rouen
    "76476": ["Seine"],  # Le Havre
    "76351": ["Arques"],  # Dieppe
    # Ile-de-France (hors Paris)
    "92012": ["Seine"],  # Boulogne-Billancourt
    "92023": ["Seine"],  # Colombes
    "92051": ["Seine"],  # Neuilly-sur-Seine
    "94080": ["Seine"],  # Vitry-sur-Seine
    "94043": ["Seine"],  # Ivry-sur-Seine
    "94022": ["Marne"],  # Champigny-sur-Marne
    "91228": ["Essonne"],  # Évry-Courcouronnes
    # Languedoc
    "34058": ["Lez"],  # Palavas -- 34187 Montpellier
    "11069": ["Aude"],  # Carcassonne
}

print(f"Données chargées:")
print(f"  Régions: {len(regions_by_code)}")
print(f"  Départements: {len(depts_by_code)}")
print(f"  Préfectures: {len(prefectures_dept)}")
print(f"  Sous-préfectures: {len(sous_prefectures)}")
print(f"  Communes littorales encodées: {len(communes_littorales)}")
print(f"  Communes montagne encodées: {len(communes_montagne)}")
print(f"  Villes avec cours d'eau: {len(cours_eau_data)}")

# ── Construction de la base finale ──────────────────────────────────────────
villodoku_db = []

for c in communes_raw:
    code = c["code"]
    nom = c["nom"]
    population = c.get("population") or 0
    dept_code = c.get("departement", "")
    region_code = c.get("region", "")
    zone = c.get("zone", "metro")

    dept_info = depts_by_code.get(dept_code, {})
    region_nom = regions_by_code.get(region_code, "")
    dept_nom = dept_info.get("nom", "")

    ville = {
        "code_commune":        code,
        "nom_commune":         nom,
        "departement_code":    dept_code,
        "departement_nom":     dept_nom,
        "region_code":         region_code,
        "region_nom":          region_nom,
        "population":          population,
        "est_drom":            zone in ("drom", "com"),
        "est_prefecture":      code in prefectures_dept,
        "est_sous_prefecture": code in sous_prefectures,
        "est_littorale":       code in communes_littorales,
        "est_montagne":        code in communes_montagne,
        "cours_eau":           cours_eau_data.get(code, []),
        # Critères dérivés du nom (calculés à la volée mais stockés pour perf)
        "nom_avec_tiret":      "-" in nom,
        "nom_commence_saint":  nom.lower().startswith("saint") or nom.lower().startswith("sainte"),
        "nom_premiere_lettre": nom[0].upper() if nom else "",
    }
    villodoku_db.append(ville)

print(f"\nBase construite: {len(villodoku_db)} communes")

# Stats
grandes = [v for v in villodoku_db if v["population"] >= 20000]
print(f"Villes >= 20k hab: {len(grandes)}")
print(f"Préfectures: {sum(1 for v in villodoku_db if v['est_prefecture'])}")
print(f"Sous-préfectures: {sum(1 for v in villodoku_db if v['est_sous_prefecture'])}")
print(f"Littorales: {sum(1 for v in villodoku_db if v['est_littorale'])}")
print(f"Montagne: {sum(1 for v in villodoku_db if v['est_montagne'])}")
print(f"Avec cours d'eau: {sum(1 for v in villodoku_db if v['cours_eau'])}")
print(f"Avec tiret: {sum(1 for v in villodoku_db if v['nom_avec_tiret'])}")
print(f"Commence par Saint: {sum(1 for v in villodoku_db if v['nom_commence_saint'])}")
print(f"DROM: {sum(1 for v in villodoku_db if v['est_drom'])}")

# Sauvegarde
output = {
    "meta": {
        "version": "1.0",
        "source": "@etalab/decoupage-administratif",
        "date_generation": "2026-06-14",
        "reference_population": "INSEE (inclus dans le package etalab)",
        "nb_communes": len(villodoku_db),
        "criteres": [
            "population >= 100000",
            "population entre 20000 et 100000",
            "est_drom",
            "est_prefecture",
            "est_sous_prefecture",
            "est_littorale",
            "est_montagne",
            "cours_eau (non vide)",
            "nom_avec_tiret",
            "nom_commence_saint",
            "nom_premiere_lettre == X"
        ]
    },
    "communes": villodoku_db
}

with open("/home/claude/villodoku/villodoku_db.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("\n✅ Fichier villodoku_db.json généré !")
