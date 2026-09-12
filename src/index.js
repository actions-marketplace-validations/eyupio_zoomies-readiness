import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import { fileURLToPath } from "node:url";
import { analyseRepository } from "./analyse.js";
import { markdown } from "./report.js";

function insideWorkspace(workspace, requested, label) {
  const resolved = path.resolve(workspace, requested);
  const relative = path.relative(workspace, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must be inside GITHUB_WORKSPACE`);
  }
  return resolved;
}

function run() {
  try {
    const workspace = path.resolve(
      process.env.GITHUB_WORKSPACE || process.cwd(),
    );
    const workflowDirectory = insideWorkspace(
      workspace,
      core.getInput("workflow-path") || ".github/workflows",
      "workflow-path",
    );
    const outputDirectory = insideWorkspace(
      workspace,
      core.getInput("report-directory") || "zoomies-readiness",
      "report-directory",
    );
    const failOn = (core.getInput("fail-on") || "never").toLowerCase();
    if (!["never", "unsupported", "manual-review"].includes(failOn)) {
      throw new Error(
        "fail-on must be one of: never, unsupported, manual-review",
      );
    }

    const report = analyseRepository(workflowDirectory, {
      x64: core.getInput("linux-x64-pool") || "zoomies-linux-x64",
      arm64: core.getInput("linux-arm64-pool") || "zoomies-linux-arm64",
    });
    const repository = process.env.GITHUB_REPOSITORY || "this repository";
    const reportMarkdown = markdown(report, repository);

    fs.mkdirSync(outputDirectory, { recursive: true });
    const jsonPath = path.join(outputDirectory, "report.json");
    const markdownPath = path.join(outputDirectory, "report.md");
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(markdownPath, reportMarkdown);

    core.summary.addRaw(reportMarkdown);
    core.summary.write();
    core.setOutput("score", report.score);
    core.setOutput("total-jobs", report.counts.total);
    core.setOutput("ready-jobs", report.counts.ready);
    core.setOutput("manual-review-jobs", report.counts.review);
    core.setOutput("unsupported-jobs", report.counts.unsupported);
    core.setOutput("report-json", path.relative(workspace, jsonPath));
    core.setOutput("report-markdown", path.relative(workspace, markdownPath));

    if (report.parse_errors.length > 0) {
      core.warning(
        `${report.parse_errors.length} workflow file(s) could not be parsed`,
      );
    }
    if (failOn === "unsupported" && report.counts.unsupported > 0) {
      core.setFailed(
        `${report.counts.unsupported} job(s) use platforms not yet supported by first-party Zoomies images`,
      );
    }
    if (
      failOn === "manual-review" &&
      (report.counts.review > 0 || report.counts.unsupported > 0)
    ) {
      core.setFailed(
        `${report.counts.review + report.counts.unsupported} job(s) need review`,
      );
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  run();

export { insideWorkspace, run };
