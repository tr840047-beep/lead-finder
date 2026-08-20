#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";

const program = new Command();
program
  .name("lead-finder")
  .description("Apify-powered lead discovery and enrichment CLI")
  .version("1.0.0");

const commandName = process.argv[2];

switch (commandName) {
  case "nimbus": {
    const { nimbusCommand } = await import("./commands/nimbus");
    program.addCommand(nimbusCommand);
    break;
  }
  case "nimbus-score": {
    const { nimbusScoreCommand } = await import("./commands/nimbus");
    program.addCommand(nimbusScoreCommand);
    break;
  }
  case "nimbus-export": {
    const { nimbusExportCommand } = await import("./commands/nimbus-export");
    program.addCommand(nimbusExportCommand);
    break;
  }
  case "discover": {
    const { discoverCommand } = await import("./commands/discover");
    program.addCommand(discoverCommand);
    break;
  }
  case "enrich": {
    const { enrichCommand } = await import("./commands/enrich");
    program.addCommand(enrichCommand);
    break;
  }
  case "status": {
    const { statusCommand } = await import("./commands/status");
    program.addCommand(statusCommand);
    break;
  }
  default: {
    const { nimbusCommand, nimbusScoreCommand } = await import("./commands/nimbus");
    program.addCommand(nimbusCommand);
    program.addCommand(nimbusScoreCommand);
    break;
  }
}

await program.parseAsync();
