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
          <span className="text-emerald-600">Villo</span>
          <span className="text-gray-800">doku</span>
        </Link>
        <Link href="/" className="text-emerald-600 hover:underline">
          ← Retour au jeu
        </Link>
      </div>

      <h1 className="font-display text-3xl font-bold text-gray-900">Mentions légales</h1>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-gray-900">Éditeur du site</h2>
        <p>
          Villodoku est un projet personnel, édité et développé par Clément Cruchon.
          <br />
          Contact :{" "}
          <a href="mailto:clement.cruchon@gmail.com" className="text-emerald-600 hover:underline">
            clement.cruchon@gmail.com
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
          Les données communales (population, découpage administratif, préfectures, etc.)
          proviennent du Code Officiel Géographique de l&apos;INSEE, distribué via le paquet{" "}
          <a
            href="https://github.com/etalab/decoupage-administratif"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline"
          >
            @etalab/decoupage-administratif
          </a>{" "}
          (Etalab, Licence Ouverte / Open Licence). Villodoku n&apos;est affilié ni à l&apos;INSEE,
          ni à Etalab, ni à aucune collectivité territoriale.
        </p>
        <p>
          Le nom « Villodoku », son interface et son code sont la propriété de leur auteur, sauf
          mention contraire. Toute reproduction du code source est soumise aux termes de la
          licence du dépôt associé.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-gray-900">
          Données personnelles et cookies
        </h2>
        <p>
          Villodoku ne nécessite aucune création de compte. La progression de la partie en cours,
          l&apos;historique des grilles jouées et la série de jours consécutifs (« streak ») sont
          enregistrés uniquement dans le <strong>stockage local de votre navigateur</strong>{" "}
          (localStorage) et ne sont jamais transmis à un serveur ni partagés avec un tiers.
        </p>
        <p>
          Aucun cookie de suivi ni outil d&apos;analyse publicitaire n&apos;est utilisé sur ce
          site.
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
