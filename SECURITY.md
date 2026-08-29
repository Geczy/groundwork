# Security policy

## Supported versions

Security fixes are made only on the current `main` branch and, when releases exist, the latest
release. Older revisions are not maintained. Applications created from this starter are independent
projects whose owners are responsible for updating dependencies and applying relevant fixes.

Never place a Supabase secret/service-role key in a `VITE_*` variable or Docker build argument;
Vite values are public bytes in the shipped bundle. Browser access uses a publishable/anon key plus
RLS. Keep shared-database application objects inside their dedicated schema.

## Report a vulnerability

Once this project has its own GitHub repository, report suspected vulnerabilities through that
repository's private security advisory form. Until then, contact the project owner privately. Do
not include vulnerability details in a public issue, discussion, or pull request.

Include as much of the following as is practical:

- The affected revision, dependency, or generated output
- Steps to reproduce the issue or a minimal proof of concept
- The likely impact and conditions required to exploit it
- Any mitigation or suggested fix you have already identified

Reports are reviewed on a best-effort basis. The maintainer will acknowledge a reproducible report,
coordinate remediation, and agree on disclosure timing before details are made public. Please avoid
accessing data that is not yours, disrupting services, or testing applications created by other
users of this starter without their permission.
