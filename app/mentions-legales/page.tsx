import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales — Villodoku",
};

export default function MentionsLegales() {
  const year = new Date().getFullYear();

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 py-10 text-sm leading-relaxed text-gray-700">
      <div className="flex flex-col gap-3">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight">
          <span className="text-indigo-600">Villo</span>
          <span className="text-gray-800">doku</span>
        </Link>
        <Link href="/" className="text-indigo-600 hover:underline">
          ← Retour au jeu
        </Link>
      </div>

      <h1 className="font-display text-3xl font-bold text-gray-900">Mentions légales</h1>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-gray-900">Éditeur du site</h2>
        <p>
          Villodoku est un projet personnel, édité et développé par Clemexify.
          <br />
          Contact :{" "}
          <a href="mailto:clemex9@hotmail.com" className="text-indigo-600 hover:underline">
            clemex9@hotmail.com
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-gray-900">Hébergement</h2>
        <p>
          Ce site est hébergé par un fournisseur tiers (Vercel Inc. ou GitHub, Inc., selon la
          configuration de déploiement en vigueur).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-gray-900">
          Propriété intellectuelle et données
        </h2>
        <p>
          Les données communales utilisées dans ce jeu (population, découpage administratif,
          préfectures, régions, etc.) sont issues du{" "}
          <strong>Code Officiel Géographique (COG) 2026 de l&apos;INSEE</strong>, publié sous
          Licence Ouverte / Open Licence v2.0. Les données d&apos;altitude proviennent du modèle
          numérique de terrain SRTM 90m (NASA, domaine public). Les données de cours d&apos;eau
          sont issues d&apos;{" "}
          <strong>© les contributeurs OpenStreetMap</strong>, sous licence ODbL.
        </p>
        <p>
          Villodoku n&apos;est affilié ni à l&apos;INSEE, ni à OpenStreetMap, ni à aucune
          collectivité territoriale. Le nom « Villodoku », son interface et son code sont la
          propriété de leur auteur.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-gray-900">
          Données personnelles et mesure d&apos;audience
        </h2>
        <p>
          Villodoku ne nécessite aucune création de compte. La progression de la partie en cours,
          l&apos;historique des grilles jouées et la série de jours consécutifs (« streak ») sont
          enregistrés uniquement dans le <strong>stockage local de votre navigateur</strong>{" "}
          (localStorage) et ne sont jamais transmis à un serveur ni partagés avec un tiers.
        </p>
        <p>
          Ce site utilise <strong>Vercel Analytics</strong> pour mesurer l&apos;audience de façon
          agrégée (pages vues, événements de fin de partie). Cet outil ne dépose aucun cookie et
          ne collecte aucune donnée personnelle identifiante.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-gray-900">Responsabilité</h2>
        <p>
          Villodoku est un jeu à but ludique et informatif. Malgré le soin apporté à la
          vérification des critères (préfectures, populations, régions, etc.), des erreurs ou
          approximations peuvent subsister dans les données. L&apos;éditeur ne pourra être tenu
          responsable d&apos;une éventuelle inexactitude.
        </p>
      </section>

      <p className="pt-4 text-xs text-gray-400">© {year} Villodoku — Tous droits réservés.</p>
    </main>
  );
}
