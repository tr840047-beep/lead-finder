import { Command } from "commander";
import { NIMBUS_EUROPEAN_REAL_ESTATE_COUNTRIES, buildNimbusSearchQueries, detectPublicWhatsApp, scoreNimbusRealEstateLead } from "../../src/lib/nimbus/prospecting";

export const nimbusCommand = new Command("nimbus")
  .description("Nimbus AI prospecting helpers for small European real-estate businesses")
  .command("queries")
  .description("Print Google Maps/search queries for European real-estate prospecting")
  .option("--countries <countries>", "Comma-separated countries", NIMBUS_EUROPEAN_REAL_ESTATE_COUNTRIES.join(","))
  .action((opts) => {
    const countries = String(opts.countries)
      .split(",")
      .map((country) => country.trim())
      .filter(Boolean);
    for (const query of buildNimbusSearchQueries(countries)) console.log(query);
  });

export const nimbusScoreCommand = new Command("nimbus-score")
  .description("Score a lead JSON payload for Nimbus AI prospecting")
  .requiredOption("--json <json>", "Lead JSON object")
  .action((opts) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(opts.json);
    } catch {
      console.error("Error: invalid JSON");
      process.exit(1);
    }
    const whatsapp = detectPublicWhatsApp(data);
    const scoring = scoreNimbusRealEstateLead(data);
    console.log(JSON.stringify({ ...scoring, whatsapp }, null, 2));
  });
