import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  analyseRepository,
  classifyTarget,
  conditionalTargets,
  needsDocker,
  resolveTargets,
} from "../src/analyse.js";
import { markdown } from "../src/report.js";

const pools = { x64: "zoomies-linux-x64", arm64: "zoomies-linux-arm64" };

test("classifies hosted, Zoomies, and existing self-hosted targets", () => {
  assert.equal(classifyTarget(["ubuntu-latest"], pools).status, "ready");
  assert.equal(
    classifyTarget(["ubuntu-24.04-arm"], pools).suggestion,
    "zoomies-linux-arm64",
  );
  assert.equal(classifyTarget(["windows-latest"], pools).status, "unsupported");
  assert.equal(classifyTarget(["zoomies-linux-x64"], pools).status, "already");
  assert.equal(
    classifyTarget(["self-hosted", "linux", "x64"], pools).status,
    "reusable",
  );
  assert.equal(
    classifyTarget(["blacksmith-8vcpu-ubuntu-2404"], pools).status,
    "ready",
  );
});

test("expands a static runs-on matrix without guessing dynamic matrices", () => {
  const staticJob = {
    strategy: { matrix: { os: ["ubuntu-latest", "ubuntu-24.04-arm"] } },
  };
  assert.deepEqual(resolveTargets("${{ matrix.os }}", staticJob).targets, [
    ["ubuntu-latest"],
    ["ubuntu-24.04-arm"],
  ]);
  assert.equal(
    resolveTargets("${{ matrix.os }}", {
      strategy: { matrix: { os: "${{ fromJSON(inputs.os) }}" } },
    }).dynamic,
    true,
  );
});

test("understands a safe conditional between two literal runner labels", () => {
  const expression =
    "${{ inputs.recovery && 'ubuntu-latest' || 'zoomies-linux-x64' }}";
  assert.deepEqual(conditionalTargets(expression), [
    "ubuntu-latest",
    "zoomies-linux-x64",
  ]);
  assert.deepEqual(resolveTargets(expression, {}).targets, [
    ["ubuntu-latest"],
    ["zoomies-linux-x64"],
  ]);
  assert.equal(conditionalTargets("${{ format('{0}-x64', inputs.os) }}"), null);
});

test("detects jobs that need Docker-aware runner pools", () => {
  assert.equal(
    needsDocker({ services: { postgres: { image: "postgres:17" } } }),
    true,
  );
  assert.equal(
    needsDocker({ steps: [{ uses: "docker/build-push-action@v6" }] }),
    true,
  );
  assert.equal(needsDocker({ steps: [{ run: "npm test" }] }), false);
});

test("analyses a repository and renders actionable reports", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zoomies-readiness-"));
  fs.writeFileSync(
    path.join(root, "ci.yml"),
    `name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: docker build .
  matrix:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    runs-on: \${{ matrix.os }}
  existing:
    runs-on: [self-hosted, linux, x64]
`,
  );

  const report = analyseRepository(root, pools);
  assert.deepEqual(report.counts, {
    total: 3,
    ready: 1,
    reusable: 1,
    already: 0,
    review: 0,
    unsupported: 1,
    docker: 1,
  });
  assert.equal(report.score, 67);
  const rendered = markdown(report, "eyupio/example");
  assert.match(rendered, /67% ready/);
  assert.match(rendered, /zoomies-linux-x64/);
  assert.match(rendered, /Docker-in-jobs/);
});

test("reports malformed workflow files without abandoning valid files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zoomies-readiness-"));
  fs.writeFileSync(path.join(root, "broken.yml"), "jobs: [");
  fs.writeFileSync(
    path.join(root, "valid.yaml"),
    "jobs:\n  build:\n    runs-on: ubuntu-latest\n",
  );
  const report = analyseRepository(root, pools);
  assert.equal(report.counts.total, 1);
  assert.equal(report.parse_errors.length, 1);
});
