# Security policy

## Supported versions

Security fixes are made on the latest `v1` release and the `main` branch.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do
not open a public issue containing exploit details, repository data, tokens or
other secrets.

Include the affected version, the workflow configuration used, the observed
impact and a minimal reproduction when it is safe to do so. We will acknowledge
the report as soon as practical, investigate it privately, and coordinate a
fix and disclosure with the reporter.

The action is designed to read only checked-out workflow YAML and make no
network requests. Any behaviour outside that boundary is considered a security
issue.
