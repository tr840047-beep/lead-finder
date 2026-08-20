import { Command } from "commander";
import { getDb } from "../../src/lib/db";
import { leads, leadPersonalization } from "../../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { rowsToCsv, toNimbusRow } from "../../src/lib/nimbus/export";
import { writeFileSync } from "node:fs";

export const nimbusExportCommand = new Command("nimbus-export")
  .description("Export Nimbus-qualified leads to CSV")
  .requiredOption("--campaign <name>", "Campaign name")
  .option("--min-score <n>", "Minimum Nimbus score", "60")
  .option("--verified-whatsapp", "Only include leads with a public WhatsApp link")
  .option("--output <path>", "Output CSV path", "nimbus-leads.csv")
  .action((opts) => {
    const db = getDb();
    const campaign = db.select().from((require("../../src/lib/db/schema") as typeof import("../../src/lib/db/schema")).campaigns)
      .where(eq((require("../../src/lib/db/schema") as typeof import("../../src/lib/db/schema")).campaigns.name, opts.campaign)).get();
    if (!campaign) throw new Error(`Campaign "${opts.campaign}" not found`);

    const campaignLeads = db.select().from(leads).where(eq(leads.campaignId, campaign.id)).all();
    const rows = campaignLeads.map(lead => {
      const p = db.select().from(leadPersonalization).where(eq(leadPersonalization.leadId, lead.id)).get();
      return toNimbusRow(lead, p);
    }).filter(row => row.score >= Number(opts.minScore) && (!opts.verifiedWhatsapp || row.whatsapp_status === "verified_public"));

    writeFileSync(opts.output, rowsToCsv(rows), "utf8");
    console.log(`Exported ${rows.length} Nimbus leads to ${opts.output}`);
  });
