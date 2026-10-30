import { ImageResponse } from "next/og";

export const alt = "CloseAgent — Find the right people. Write to them like a human.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "radial-gradient(900px 500px at 15% 0%, rgba(139,109,255,0.35), transparent 60%), #07070d",
          color: "#ecedf6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #5b8cff, #8b6dff, #c86dff)",
              color: "white",
              fontSize: 28,
            }}
          >
            C
          </div>
          CloseAgent
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 48, fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
          <span>Find the right people.</span>
          <span style={{ color: "#a68cff" }}>Write to them like a human.</span>
        </div>
        <div style={{ marginTop: 36, fontSize: 26, color: "#8d90ab" }}>
          YouTube creators & decision-makers · public business emails · personal AI drafts
        </div>
      </div>
    ),
    size,
  );
}
