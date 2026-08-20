# Nimbus AI European Real-Estate Prospecting

This fork adds a Nimbus-focused prospecting layer on top of the existing Apify discovery/enrichment pipeline.

## Target

Small European real-estate businesses, prioritizing agencies with 1–10 employees, identifiable owners/founders, public business contact details, and a publicly published WhatsApp link where available.

## CLI

Generate discovery queries:

```bash
npm run cli -- nimbus queries
```

Generate queries for selected countries:

```bash
npm run cli -- nimbus queries --countries "Spain,Portugal,Italy,Germany,Netherlands,Belgium,France,Ireland"
```

Score an enriched lead payload:

```bash
npm run cli -- nimbus-score --json '{"displayName":"Example Estate Agency","website":"https://example.com","phone":"+34123456789","whatsapp":"https://wa.me/34123456789","employees":5,"founder":"Jane Doe","industry":"real estate"}'
```

## WhatsApp verification rule

A phone number is **not** considered WhatsApp-verified merely because it exists. The scorer only reports `verified_public` when a public `wa.me` or WhatsApp URL is present in the collected source data. A phone number associated only with a WhatsApp mention is reported separately as `public_phone_only`.

## Recommended campaign workflow

1. Use `nimbus queries` to generate country-specific discovery terms.
2. Run the existing Google Maps actor through `discover`.
3. Enrich website/contact data with the existing enrichment actor.
4. Pass the resulting lead payload through `nimbus-score`.
5. Keep HOT/WARM leads for manual verification of owner identity, employee count, and public WhatsApp evidence before outreach.

The system does not claim that employee count, owner identity, or WhatsApp availability is verified unless those signals are actually present in the collected data.
