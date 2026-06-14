import { NextResponse } from "next/server";
import { searchCommunes } from "@/lib/communes-search";

/**
 * GET /api/communes/search?q=<texte>
 *
 * Autocomplétion : renvoie jusqu'à 10 communes dont le nom correspond à
 * `q` (préfixe prioritaire), sans information sur la validité d'une
 * réponse pour une case donnée.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  return NextResponse.json({ results: searchCommunes(q, 10) });
}
