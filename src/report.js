function escapeCell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

const labels = {
  ready: "Ready",
  reusable: "Reuse labels",
  already: "Already on Zoomies",
  review: "Manual review",
  unsupported: "Not yet supported",
};

function headline(report) {
  if (report.counts.total === 0) return "No jobs with `runs-on` were found.";
  if (report.score === 100) return "This repository is ready to join the pack.";
  if (report.counts.unsupported > 0)
    return "Most of the route is clear, with some platform gaps to review.";
  return "The report identifies what can move now and what needs a human decision.";
}

function markdown(report, repository = "this repository") {
  const lines = [
    "# Zoomies readiness check",
    "",
    `## ${report.score}% ready`,
    "",
    headline(report),
    "",
    `Analysed **${report.counts.total} ${report.counts.total === 1 ? "job" : "jobs"}** across **${report.workflows.length} ${report.workflows.length === 1 ? "workflow file" : "workflow files"}** in **${repository}**.`,
    "",
    "| Ready | Reuse existing labels | Already Zoomies | Manual review | Not yet supported | Docker-aware pool |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    `| ${report.counts.ready} | ${report.counts.reusable} | ${report.counts.already} | ${report.counts.review} | ${report.counts.unsupported} | ${report.counts.docker} |`,
    "",
  ];

  if (report.jobs.length > 0) {
    lines.push(
      "## Jobs",
      "",
      "| Workflow | Job | Assessment | Current `runs-on` | Suggested pool | Notes |",
      "| --- | --- | --- | --- | --- | --- |",
    );
    for (const job of report.jobs) {
      const docker = job.needs_docker
        ? " Requires Docker-in-jobs support (for example `dind`)."
        : "";
      lines.push(
        `| \`${escapeCell(job.workflow)}\` | \`${escapeCell(job.job)}\` | ${labels[job.status]} | \`${escapeCell(job.target)}\` | ${job.suggestion ? `\`${escapeCell(job.suggestion)}\`` : "—"} | ${escapeCell(job.reason + docker)} |`,
      );
    }
    lines.push("");
  }

  if (report.parse_errors.length > 0) {
    lines.push("## Files that could not be read", "");
    for (const error of report.parse_errors)
      lines.push(`- \`${escapeCell(error.file)}\`: ${escapeCell(error.error)}`);
    lines.push("");
  }

  lines.push(
    "## Next step",
    "",
    "Install [Zoomies](https://zoomies.sh/quickstart/), create the suggested pools, then use **Migrate** in the Zoomies web UI to review the exact `runs-on` changes before opening pull requests.",
    "",
    "Zoomies Readiness Check is advisory: it never changes a workflow or creates a runner.",
    "",
  );
  return lines.join("\n");
}

export { markdown };
