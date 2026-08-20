import { Command } from "commander";
import { readFileSync } from "node:fs";
import { getDb } from "../../src/lib/db";
import { campaigns } from "../../src/lib/db/schema";
import { runSingleActorDiscovery } from "../../src/lib/apify/discovery";
import { ACTOR_REGISTRY } from "../../src/lib/apify/registry";
import { eq } from "drizzle-orm";

export const discoverCommand = new Command("discover")
  .description("Discover leads using an Apify Actor")
  .requiredOption("--actor <actorId>", "Apify Actor ID (e.g., compass/crawler-google-places)")
  .option("--input <json>", "Actor input as JSON string")
  .option("--input-file <path>", "Path to a JSON file containing actor input")
  .option("--campaign <name>", "Campaign name (creates new if not found)", "CLI Discovery")
  .option("--niche <niche>", "Target niche description", "General")
  .action(async (opts) => {
    const db = getDb();

    if (!opts.input && !opts.inputFile) {
      console.error("Error: provide either --input <json> or --input-file <path>");
      process.exit(1);
    }

    let input: Record<string, unknown>;
    try {
      const raw = opts.inputFile
        ? readFileSync(String(opts.inputFile), "utf8")
        : String(opts.input);
      input = JSON.parse(raw);
    } catch (err) {
      console.error(`Error: Invalid JSON input${opts.inputFile ? ` file (${opts.inputFile})` : ""}`);
      if (err instanceof Error) console.error(err.message);
      process.exit(1);
    }

    const actor = ACTOR_REGISTRY.find((a) => a.id === opts.actor);
    if (!actor) {
      console.log(`Warning: Actor "${opts.actor}" not in registry, proceeding anyway...`);
    }

    let campaign = db
      .select()
      .from(campaigns)
      .where(eq(campaigns.name, opts.campaign))
      .get();

    if (!campaign) {
      campaign = db
        .insert(campaigns)
        .values({
          name: opts.campaign,
          targetNiche: opts.niche,
          apifyActors: [opts.actor],
          status: "active",
        })
        .returning()
        .get();
      console.log(`Created campaign: "${campaign.name}" (ID: ${campaign.id})`);
    }

    console.log(`Running ${opts.actor}...`);
    console.log(`Input: ${JSON.stringify(input, null, 2)}`);

    try {
      const result = await runSingleActorDiscovery(opts.actor, input, campaign.id);

      if (result.status === "failed") {
        console.error(`Run failed: ${result.error}`);
        process.exit(1);
      }

      console.log(`\nRun completed: ${result.totalResults} results from Apify`);
      console.log(`Inserted: ${result.inserted} new leads`);
      console.log(`Skipped: ${result.deduplicated} duplicates`);
      console.log(`Campaign: ${campaign.name} (ID: ${campaign.id})`);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });
