import { getActorById } from "./registry";
import type { NewLead } from "../db/schema";
import { extractStaticFields } from "../ai/lead-extractor";
import type { AIProvider } from "../ai/provider";

export interface NormalizeResult {
  lead: NewLead;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

function pickString(item: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeWebsite(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.origin;
  } catch {
    return value;
  }
}

function extractDeterministicFields(item: Record<string, unknown>) {
  const displayName = pickString(item, ["title", "name", "displayName", "companyName"]);
  const email = pickString(item, ["email", "emailAddress", "contactEmail"]);
  const website = normalizeWebsite(pickString(item, ["website", "url", "companyWebsite"]));
  const phone = pickString(item, ["phone", "phoneNumber", "telephone", "internationalPhoneNumber"]);
  return { displayName, email, website, phone };
}

export async function normalizeSingleItem(
  actorId: string,
  item: Record<string, unknown>,
  campaignId: number,
  sourceRunId: string,
  provider: AIProvider
): Promise<NormalizeResult> {
  const actor = getActorById(actorId);
  if (!actor) throw new Error(`Unknown actor: ${actorId}`);

  const deterministic = extractDeterministicFields(item);
  const lead: NewLead = {
    campaignId,
    source: actorId,
    sourceRunId,
    status: "new",
    rawData: item,
    displayName: deterministic.displayName,
    email: deterministic.email,
    website: deterministic.website,
    phone: deterministic.phone,
  };

  let costUsd = 0, inputTokens = 0, outputTokens = 0;

  const hasProviderKey =
    (provider === "openai" && Boolean(process.env.OPENAI_API_KEY)) ||
    (provider === "anthropic" && Boolean(process.env.ANTHROPIC_API_KEY));

  if (hasProviderKey) {
    try {
      const staticFields = await extractStaticFields(item, actor.name, provider);
      costUsd = staticFields.costUsd;
      inputTokens = staticFields.inputTokens;
      outputTokens = staticFields.outputTokens;
      if (staticFields.displayName) lead.displayName = staticFields.displayName;
      if (staticFields.email) lead.email = staticFields.email;
      if (staticFields.website) lead.website = normalizeWebsite(staticFields.website);
      if (staticFields.phone) lead.phone = staticFields.phone;
      lead.llmCostUsd = costUsd;
      lead.llmInputTokens = inputTokens;
      lead.llmOutputTokens = outputTokens;
      lead.discoveryLlmCostUsd = costUsd;
    } catch (err) {
      console.error(`Static field extraction failed for item in ${actorId}:`, err);
    }
  }

  return { lead, costUsd, inputTokens, outputTokens };
}

export async function normalizeActorResults(
  actorId: string,
  items: Record<string, unknown>[],
  campaignId: number,
  sourceRunId: string,
  provider: AIProvider
): Promise<NewLead[]> {
  const results: NewLead[] = [];
  for (const item of items) {
    const { lead } = await normalizeSingleItem(actorId, item, campaignId, sourceRunId, provider);
    results.push(lead);
  }
  return results;
}
