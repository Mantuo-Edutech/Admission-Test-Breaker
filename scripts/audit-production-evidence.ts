import { auditProductionEvidence } from "./lib/production-evidence.js";

const requireReady = process.argv.includes("--require-ready");
const expectedRelease = process.env.PRODUCTION_EVIDENCE_RELEASE?.trim();
const assessment = await auditProductionEvidence({
  ...(expectedRelease === undefined || expectedRelease === "" ? {} : { expectedRelease }),
});

console.log(
  `Production evidence: ${assessment.verifiedGateCount}/${assessment.totalGateCount} P0 gates verified`,
);
console.log(`Production release: ${expectedRelease || "not supplied"}`);
for (const gate of assessment.gates) {
  console.log(`- ${gate.id}: ${gate.status} (${gate.source})`);
  for (const control of gate.controls.filter((item) => !item.ready)) {
    console.log(`  - ${control.label}: ${control.reason}`);
  }
}

if (requireReady && !assessment.ready) process.exitCode = 1;
