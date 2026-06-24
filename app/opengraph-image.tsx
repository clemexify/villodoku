import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Villodoku — Testez votre connaissance des villes de France";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const baloo = await fetch(
    "https://fonts.gstatic.com/s/baloo2/v21/wXKrE3kTposypRyd11_WAewrhXY.woff2"
  ).then((r) => r.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          background: "#4f46e5",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Baloo 2'",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 0, marginBottom: 24 }}>
          <span style={{ fontSize: 120, fontWeight: 800, color: "white" }}>Villo</span>
          <span style={{ fontSize: 120, fontWeight: 800, color: "#c7d2fe" }}>doku</span>
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 32, color: "#e0e7ff", fontWeight: 500, letterSpacing: 1 }}>
          Testez votre connaissance des villes de France
        </div>

        {/* Grille décorative */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 52,
          }}
        >
          {[true, false, true, false, true, true, true, false, true].map((filled, i) => (
            <div
              key={i}
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: filled ? "white" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>

        {/* URL */}
        <div style={{ fontSize: 28, color: "#c7d2fe", marginTop: 48, fontWeight: 600 }}>
          villodoku.fr
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Baloo 2", data: baloo, weight: 800 }],
    }
  );
}
