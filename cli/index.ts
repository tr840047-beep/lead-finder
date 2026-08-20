#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { discoverCommand } from "./commands/discover";
import { enrichCommand } from "./commands/enrich";
import { statusCommand } from "./commands/status";
import { nimbusCommand, nimbusScoreCommand } from "./commands/nimbus";
import { nimbusExportCommand } from "./commands/nimbus-export";

const program = new Command();
program.name("lead-finder").description("Apify-powered lead discovery and enrichment CLI").version("1.0.0");
program.addCommand(discoverCommand);
program.addCommand(enrichCommand);
program.addCommand(statusCommand);
program.addCommand(nimbusCommand);
program.addCommand(nimbusScoreCommand);
program.addCommand(nimbusExportCommand);
program.parse();
