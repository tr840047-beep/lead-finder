export const NIMBUS_EUROPEAN_REAL_ESTATE_COUNTRIES = [
  "Spain",
  "Portugal",
  "Italy",
  "Germany",
  "Netherlands",
  "Belgium",
  "France",
  "Ireland",
  "Austria",
  "Switzerland",
];

export const NIMBUS_REAL_ESTATE_SEARCHES = [
  "real estate agency",
  "estate agent",
  "property agency",
  "property management",
];

export type WhatsAppEvidence = {
  status: "verified_public" | "public_phone_only" | "not_found";
  number?: string;
  url?: string;
  source: "whatsapp_link" | "wa_me_link" | "phone_only" | "none";
};

export type NimbusLeadScore = {
  score: number;
  tier: "HOT" | "WARM" | "MAYBE" | "SKIP";
  reasons: string[];
};

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(asText).join(" ");
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).map(asText).join(" ");
  return "";
}

function flattenLeadData(data: Record<string, unknown>): string {
  return Object.values(data).map(asText).join(" ");
}

/**
 * Detects an explicitly published WhatsApp link. A phone number alone is NOT
 * treated as WhatsApp verification.
 */
export function detectPublicWhatsApp(data: Record<string, unknown>): WhatsAppEvidence {
  const text = flattenLeadData(data);
  const waLink = text.match(/https?:\\/\\/(?:api\\.)?whatsapp\\.com\\/(?:send\\?[^\\s"']+|[^\\s"']+)/i);
  if (waLink) {
    const phone = waLink[0].match(/[?&](?:phone|number)=([+0-9][0-9\-(). ]{6,})/i)?.[1];
    return { status: "verified_public", number: phone, url: waLink[0], source: "whatsapp_link" };
  }

  const waMe = text.match(/https?:\\/\\/wa\\.me\\/([0-9]{7,15})/i);
  if (waMe) {
    return { status: "verified_public", number: `+${waMe[1]}`, url: waMe[0], source: "wa_me_link" };
  }

  const hasWhatsappWord = /\\bwhatsapp\\b/i.test(text);
  const phone = text.match(/(?:\\+|00)[1-9][0-9]{7,14}/)?.[0];
  if (hasWhatsappWord && phone) {
    return { status: "public_phone_only", number: phone, source: "phone_only" };
  }

  return { status: "not_found", source: "none" };
}

export function scoreNimbusRealEstateLead(data: Record<string, unknown>): NimbusLeadScore {
  const text = flattenLeadData(data).toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (/real estate|estate agent|property agency|property management|realtor|immobilien|inmobiliaria|immobiliare|agence immobili[eè]re/.test(text)) {
    score += 15;
    reasons.push("Real-estate business signal");
  }

  const employees = text.match(/(?:employees|employee count|team size|staff)[^0-9]{0,20}(\\d{1,3})/i)?.[1];
  if (employees) {
    const n = Number(employees);
    if (n >= 1 && n <= 10) {
      score += 10;
      reasons.push("1–10 employee signal");
    }
  }

  const whatsapp = detectPublicWhatsApp(data);
  if (whatsapp.status === "verified_public") {
    score += 15;
    reasons.push("Public WhatsApp link found");
  } else if (whatsapp.status === "public_phone_only") {
    score += 4;
    reasons.push("Phone publicly associated with WhatsApp wording, but no WhatsApp link");
  }

  if (/property|properties|listing|listings|for sale|for rent|real estate/.test(text)) {
    score += 10;
    reasons.push("Property/listing activity");
  }

  if (/founder|owner|proprietor|managing director|ceo|director|gerente|inhaber/.test(text)) {
    score += 10;
    reasons.push("Decision-maker signal");
  }

  if (/linkedin|instagram|facebook/.test(text)) {
    score += 5;
    reasons.push("Social presence found");
  }

  if (/contact us|contact|inquiry|enquir|book a viewing|schedule a viewing|appointment/.test(text)) {
    score += 10;
    reasons.push("Inbound inquiry/appointment signal");
  }

  if (/24\\/7|always available|out of hours|after hours/.test(text)) {
    score += 10;
    reasons.push("After-hours coverage opportunity");
  }

  if (/english|en\\b/.test(text)) {
    score += 5;
    reasons.push("English-language signal");
  }

  score = Math.min(100, score);
  const tier = score >= 80 ? "HOT" : score >= 60 ? "WARM" : score >= 40 ? "MAYBE" : "SKIP";
  return { score, tier, reasons };
}

export function buildNimbusSearchQueries(countries = NIMBUS_EUROPEAN_REAL_ESTATE_COUNTRIES): string[] {
  return countries.flatMap((country) =>
    NIMBUS_REAL_ESTATE_SEARCHES.map((term) => `${term} ${country}`),
  );
}
