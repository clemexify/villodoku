import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST → valide et enregistre une grille pour une date
export async function POST(req: NextRequest) {

  const body = await req.json() as {
    date: string;
    rows: { id: string; label: string; category: string }[];
    cols: { id: string; label: string; category: string }[];
  };

  if (!body.date || !body.rows || !body.cols) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from("scheduled_grids")
    .upsert({ date: body.date, rows: body.rows, cols: body.cols }, { onConflict: "date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE → retire une grille validée
export async function DELETE(req: NextRequest) {

  const { date } = await req.json() as { date: string };
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const { error } = await getSupabase()
    .from("scheduled_grids")
    .delete()
    .eq("date", date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
