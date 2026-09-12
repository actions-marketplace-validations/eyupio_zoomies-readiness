# Zoomies Readiness Check

Know what can move before changing a single workflow.

Zoomies Readiness Check analyses every job in `.github/workflows`, explains how
its `runs-on` target maps to a [Zoomies](https://zoomies.sh) runner pool, and
puts a migration report directly in the GitHub Actions job summary. It is free,
open source, read-only, and sends no repository data to another service.

## What it recognises

- GitHub-hosted Linux x64 and arm64 labels.
- Managed runner labels from Blacksmith, BuildJet, Depot, Namespace, RunsOn,
  Ubicloud and Warp.
- Static `matrix.os` configurations, including mixed-platform matrices.
- Existing self-hosted labels that a Zoomies pool can adopt without any
  workflow change.
- Jobs already using Zoomies.
- Job containers, services and Docker steps that need a Docker-aware pool.
- Dynamic expressions and unknown configurations that should be reviewed by a
  human rather than guessed.
- Windows and macOS jobs for which Zoomies does not yet publish a first-party
  runner image.

The check never edits a workflow and never starts or registers a runner.

## Usage

```yaml
name: Zoomies readiness

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: eyupio/zoomies-readiness@v1
```

The action writes `zoomies-readiness/report.md` and
`zoomies-readiness/report.json`. Upload them when a downloadable record is
useful:

```yaml
- uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
  with:
    name: zoomies-readiness
    path: zoomies-readiness/
```

## Inputs

| Input              | Default               | Purpose                                     |
| ------------------ | --------------------- | ------------------------------------------- |
| `workflow-path`    | `.github/workflows`   | Directory to scan.                          |
| `linux-x64-pool`   | `zoomies-linux-x64`   | Pool suggested for Linux x64 jobs.          |
| `linux-arm64-pool` | `zoomies-linux-arm64` | Pool suggested for Linux arm64 jobs.        |
| `report-directory` | `zoomies-readiness`   | Workspace-relative report directory.        |
| `fail-on`          | `never`               | `never`, `unsupported`, or `manual-review`. |

`fail-on: never` makes the action purely advisory. `unsupported` fails when a
job uses a platform without a first-party Zoomies image. `manual-review` also
fails for dynamic or unrecognised `runs-on` configurations.

## Outputs

The action outputs `score`, `total-jobs`, `ready-jobs`,
`manual-review-jobs`, `unsupported-jobs`, `report-json`, and
`report-markdown` for use by later workflow steps.

## From report to running fleet

Install Zoomies with one command, create the suggested pools, and use the
Zoomies web UI's **Migrate** flow to review the exact changes and open migration
pull requests.

**[Install Zoomies](https://zoomies.sh/quickstart/)** ·
[Migration guide](https://zoomies.sh/migration/) ·
[GitHub repository](https://github.com/eyupio/zoomies)

## Security

The action requires no token beyond the read access used by checkout. It reads
workflow files from the checked-out workspace and makes no network requests.
All reports remain inside the job unless the calling workflow explicitly
uploads them.

## Licence

Apache-2.0. See [LICENSE](LICENSE).
