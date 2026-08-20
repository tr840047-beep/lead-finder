import type { Lead, LeadPersonalization } from "../db/schema";
import { detectPublicWhatsApp, scoreNimbusRealEstateLead } from "./prospecting";

export type NimbusExportRow = {
  lead_id: number; company: string; website: string; email: string; phone: string;
  whatsapp_status: "verified_public" | "public_phone_only" | "not_found";
  whatsapp_number: string; whatsapp_url: string; owner: string; employees: string;
  country: string; city: string; linkedin: string; instagram: string; facebook: string;
  score: number; tier: string; reasons: string;
};

const text = (v: unknown) => v == null ? "" : typeof v === "string" ? v : String(v);
const dataFor = (lead: Lead, p?: LeadPersonalization | null) => ({
  ...(lead.rawData as Record<string, unknown> || {}),
  ...(lead.mappedData as Record<string, unknown> || {}),
  ...(p?.rawEnrichmentData as Record<string, unknown> || {}),
});
const pick = (d: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) if (d[k] != null && text(d[k]).trim()) return text(d[k]).trim();
  return "";
};

export function toNimbusRow(lead: Lead, personalization?: LeadPersonalization | null): NimbusExportRow {
  const d = dataFor(lead, personalization);
  const wa = detectPublicWhatsApp(d);
  const s = scoreNimbusRealEstateLead(d);
  return {
    lead_id: lead.id,
    company: lead.displayName || pick(d, ["companyName", "company", "name", "title"]),
    website: lead.website || pick(d, ["website", "url"]),
    email: lead.email || pick(d, ["email", "emailAddress"]),
    phone: lead.phone || pick(d, ["phone", "phoneNumber", "telephone"]),
    whatsapp_status: wa.status, whatsapp_number: wa.number || "", whatsapp_url: wa.url || "",
    owner: pick(d, ["owner", "ownerName", "founder", "founderName", "ceo", "managingDirector"]),
    employees: pick(d, ["employees", "employeeCount", "employeesCount", "teamSize"]),
    country: pick(d, ["country", "addressCountry"]), city: pick(d, ["city", "addressCity"]),
    linkedin: pick(d, ["linkedin", "linkedinUrl", "linkedinProfile"]),
    instagram: pick(d, ["instagram", "instagramUrl"]), facebook: pick(d, ["facebook", "facebookUrl"]),
    score: s.score, tier: s.tier, reasons: s.reasons.join(" | "),
  };
}

export function rowsToCsv(rows: NimbusExportRow[]): string {
  const headers = ["lead_id","company","website","email","phone","whatsapp_status","whatsapp_number","whatsapp_url","owner","employees","country","city","linkedin","instagram","facebook","score","tier","reasons"] as const;
  const esc = (v: unknown) => `"${text(v).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}
