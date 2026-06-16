# Stratégie analytics Villodoku

## Décision retenue

Deux couches complémentaires, à activer dès que le jeu sort du cercle de test.

### GoatCounter — fréquentation globale
- Script client léger, sans cookie, GDPR-friendly
- Donne : visiteurs uniques, pages vues, pays, device, referrers
- Limitation clé : **compteur agrégé uniquement** — pas de données brutes par session, pas de corrélation entre événements, pas de funnel, pas de rétention

### Supabase — événements structurés (log brut)
Table `game_sessions` minimaliste :

| Colonne | Type | Exemple |
|---|---|---|
| `id` | uuid | auto |
| `played_at` | timestamptz | 2026-06-16T14:32Z |
| `grid_date` | date | 2026-06-16 |
| `won` | boolean | true |
| `score` | integer | 740 |
| `errors` | integer | 2 |
| `cells_solved` | integer | 9 |
| `duration_s` | integer | 183 |

Clé ANON Supabase côté client (prévue pour ça, pas de secret à cacher).

### Pourquoi les deux
GoatCounter répond à "combien de personnes jouent".  
Supabase répond à "comment ils jouent" — et les données brutes collectées dès le début permettront toute analyse ultérieure (rétention, cohorts, score distribution, funnel).

Les données GoatCounter ne sont **pas migrables** vers un format granulaire après coup : ce qui est agrégé l'est définitivement.

## À implémenter
- [ ] GoatCounter : ajouter le script dans `app/layout.tsx` (1 ligne)
- [ ] Supabase : créer le projet, la table, appeler l'API depuis `VillodokuGrid.tsx` au `onGameEnd`
- [ ] Événements GoatCounter custom : `partie_demarree`, `partie_gagnee`, `partie_perdue`
