import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type ContactPayload = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  business?: unknown;
  leads?: unknown;
  problem?: unknown;
  preferredTime?: unknown;
};

const REQUIRED_ENV = ["CONTACT_SMTP_HOST", "CONTACT_SMTP_PORT", "CONTACT_SMTP_USER", "CONTACT_SMTP_PASS"] as const;
let cachedTransporter: nodemailer.Transporter | null = null;

function toCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(payload: ContactPayload) {
  const name = toCleanString(payload.name);
  const phone = toCleanString(payload.phone).replace(/[^\d]/g, "");
  const email = toCleanString(payload.email);
  const business = toCleanString(payload.business);
  const leads = toCleanString(payload.leads);
  const problem = toCleanString(payload.problem);
  const preferredTime = toCleanString(payload.preferredTime);

  if (name.length < 2) return { valid: false as const, message: "Name is required." };
  if (!/^[6-9]\d{9}$/.test(phone)) return { valid: false as const, message: "Valid Indian mobile number is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false as const, message: "Valid email is required." };
  if (!business) return { valid: false as const, message: "Business field is required." };
  if (!leads) return { valid: false as const, message: "Leads field is required." };
  if (!preferredTime) return { valid: false as const, message: "Preferred time is required." };

  return {
    valid: true as const,
    data: { name, phone, email, business, leads, problem, preferredTime },
  };
}

function missingEnvVars(): string[] {
  return REQUIRED_ENV.filter((key) => !process.env[key]);
}

function getTransporter(smtpPort: number): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.CONTACT_SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    auth: {
      user: process.env.CONTACT_SMTP_USER,
      pass: process.env.CONTACT_SMTP_PASS,
    },
  });

  return cachedTransporter;
}

export async function POST(request: Request) {
  const startedAtMs = Date.now();
  const missingVars = missingEnvVars();
  if (missingVars.length > 0) {
    console.error("Contact form is misconfigured. Missing env vars:", missingVars);
    return NextResponse.json(
      { ok: false, error: "Contact form is temporarily unavailable. Please try WhatsApp or email directly." },
      { status: 500 }
    );
  }

  let rawPayload: ContactPayload;
  try {
    rawPayload = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const validation = validatePayload(rawPayload);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.message }, { status: 400 });
  }

  const { name, phone, email, business, leads, problem, preferredTime } = validation.data;

  const smtpPort = Number(process.env.CONTACT_SMTP_PORT);
  if (!Number.isFinite(smtpPort)) {
    console.error("CONTACT_SMTP_PORT is not a valid number");
    return NextResponse.json(
      { ok: false, error: "Contact form is temporarily unavailable. Please try again later." },
      { status: 500 }
    );
  }

  const transporter = getTransporter(smtpPort);

  const toAddress = process.env.CONTACT_TO_EMAIL ?? "founder@ivvlin.com";
  const fromAddress = process.env.CONTACT_FROM_EMAIL ?? process.env.CONTACT_SMTP_USER ?? "noreply@ivvlin.com";

  const html = `
    <h2>New demo request from ivvlin.com/contact</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Business:</strong> ${business}</p>
    <p><strong>Leads/month:</strong> ${leads}</p>
    <p><strong>Preferred time:</strong> ${preferredTime}</p>
    <p><strong>Problem:</strong> ${problem || "N/A"}</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      replyTo: email,
      subject: `[Ivvlin] New Demo Request - ${name}`,
      text: [
        "New demo request from ivvlin.com/contact",
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Business: ${business}`,
        `Leads/month: ${leads}`,
        `Preferred time: ${preferredTime}`,
        `Problem: ${problem || "N/A"}`,
      ].join("\n"),
      html,
    });

    const elapsedMs = Date.now() - startedAtMs;
    return NextResponse.json({
      ok: true,
      requestId: info.messageId,
      sentAt: new Date().toISOString(),
      elapsedMs,
    });
  } catch (error) {
    console.error("Failed to send contact form email:", error);
    return NextResponse.json(
      { ok: false, error: "Could not send your request right now. Please use WhatsApp or email directly." },
      { status: 500 }
    );
  }
}
