# Contributing

Issues and pull requests are welcome.

Before submitting a change:

```sh
npm ci
npm test
npm run build
git diff --exit-code -- dist
```

Commit changes to `src/`, their tests, and the rebuilt `dist/` bundle together.
The committed bundle is what GitHub Actions executes.

The analyser must remain advisory and conservative: classify an unfamiliar or
dynamic runner target for manual review rather than guessing a migration that
could leave a job queued forever. Avoid new runtime network access and keep the
default token permissions read-only.
