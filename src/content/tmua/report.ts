import type { CorpusArtifacts } from "./verify.js";

const stageLabels = [
  ["discovered", "file discovered"],
  ["indexed", "source relationships indexed"],
  ["extracted", "question structure extracted, not yet verified"],
  ["verified", "independently checked"],
  ["published", "available in the online practice experience"],
] as const;

export function renderCorpusReport(artifacts: CorpusArtifacts): string {
  const lines = [
    "# TMUA Corpus Audit Report",
    "",
    `**Audit timestamp:** ${artifacts.publicSummary.auditedAt}`,
    "",
    "All file references are repository-relative. No machine-specific raw path is persisted.",
    "",
    "## Verified summary",
    "",
    "- 96 observed imported paths / 46 canonical sources",
    `- ${artifacts.officialResources.length} official supplements`,
    `- ${artifacts.papers.length} papers / ${artifacts.questions.length} question shells / ${artifacts.publicSummary.publishedQuestionCount} currently published`,
    "",
    "> PDF presence is not online-playable status. A paper becomes playable only after its question content is independently verified and explicitly published.",
    "",
    "## Processing stage legend",
    "",
    ...stageLabels.map(([stage, meaning]) => `- \`${stage}\`: ${meaning}`),
    "",
    "## Official worked-solution supplements",
    "",
    "| Resource | Edition | Paper | Pages | Availability |",
    "| --- | --- | ---: | ---: | --- |",
    ...artifacts.officialResources.map(
      (resource) =>
        `| ${resource.id} | ${resource.edition} | ${resource.paper} | ${resource.expectedPages} | ${resource.availability} |`,
    ),
    "",
    "## Historic paper relationships",
    "",
    "| Paper | Question source | Answer source | Worked solution | Stage | Online questions |",
    "| --- | --- | --- | --- | --- | ---: |",
    ...artifacts.papers.map(
      (paper) =>
        `| ${paper.id} | ${paper.questionSourceId} | ${paper.answerSourceId} | ${paper.workedSolutionSourceId} | ${paper.contentStage} | ${paper.onlineQuestionCount} |`,
    ),
    "",
    "## Canonical imported sources and duplicate paths",
    "",
    ...artifacts.manifest.sources.flatMap((source) => [
      `### ${source.id}`,
      "",
      `- Canonical: \`${source.canonicalPath}\``,
      `- SHA-256: \`${source.sha256}\``,
      `- Type: \`${source.documentType}\``,
      `- Pages: ${source.metadata.pages}`,
      `- Duplicate paths: ${
        source.duplicatePaths.length === 0
          ? "none"
          : source.duplicatePaths.map((path) => `\`${path}\``).join(", ")
      }`,
      "",
    ]),
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}
