import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Ivvlin — AI Employees for Business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "#030712",
          color: "#f9fafb",
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 6, opacity: 0.9 }}>IVVLIN</div>
        <div style={{ fontSize: 76, lineHeight: 1.05, marginTop: 24, fontWeight: 700 }}>
          AI Employees
          <br />
          For Modern Teams
        </div>
        <div style={{ fontSize: 28, marginTop: 24, opacity: 0.85 }}>
          WhatsApp-first automation for lead response, follow-up, and conversion.
        </div>
      </div>
    ),
    { ...size }
  );
}
