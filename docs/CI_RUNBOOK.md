# CI Recovery Runbook

This runbook defines the canonical response when CI does not start normally. It exists to prevent repeated trial-and-error edits to application code when the failure is actually in GitHub Actions infrastructure.

## Canonical quality gate

A valid CI execution must run these commands in order on Node.js 22:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build:dev
```

`build:dev` is intentional. The production `build` script also invokes database migration and must not be used as a side-effect-free CI gate until the production migration contract is explicitly approved.

## Normal failure vs pre-runner failure

### Normal project/CI failure

Treat the failure as project-owned only when a runner is assigned and at least one workflow step starts. Diagnose the first failing step and fix the actual command, test, dependency, or application code.

### GitHub infrastructure failure

Treat the incident as pre-runner / platform-owned when the run exhibits the following signature:

- conclusion is `startup_failure` or the job fails immediately before execution;
- `runner_id` is `0` or no runner is assigned;
- `steps` is empty;
- no checkout, setup, npm, test, or build log exists;
- an affected run may reference a synthetic/deleted workflow path named `BuildFailed`.

When this signature is present, do **not** modify application code, package dependencies, tests, or build scripts merely to make the run start. Those components have not executed yet.

## Recovery procedure

1. Confirm the failing run belongs to the current PR head SHA.
2. Inspect the run jobs and confirm whether a runner was assigned and whether any step executed.
3. If no runner/steps exist, perform no application-code changes.
4. Re-run the canonical `CI` workflow once using `workflow_dispatch` or the GitHub re-run action after GitHub service/account state changes. Do not create repeated diagnostic commits.
5. If the same pre-runner signature persists, record:
   - repository;
   - workflow ID;
   - run ID;
   - job ID;
   - head SHA;
   - check suite ID;
   - runner ID / runner name;
   - steps count;
   - timestamp.
6. Update the infrastructure incident issue rather than opening duplicate incidents.
7. Escalate to GitHub Support when repository/account settings are correct and the failure occurs before job construction or runner assignment.

## Current incident reference

Tracked in Issue #12: `infra: GitHub Actions hosted runners fail before provisioning`.

Evidence gathered on 2026-09-16 includes:

- normal `quality-gates` runs failing before any step;
- a shell-only workflow with no external Actions failing before runner assignment;
- `ubuntu-latest`, `windows-latest`, and `macos-latest` probes all failing with no runner and no steps;
- similar `startup_failure` behavior in other repositories under the same account;
- a successful Vercel build for the application, demonstrating that the application build path is independent from the GitHub runner-provisioning failure.

## Workflow safeguards

The canonical `.github/workflows/ci.yml` must retain these properties:

- stable check name: `quality-gates`;
- `contents: read` only unless a reviewed use case requires more;
- GitHub Actions pinned to immutable commit SHAs;
- `persist-credentials: false` on checkout;
- Node.js 22;
- `CI=true`;
- 15-minute job timeout;
- concurrency cancellation for superseded runs;
- `workflow_dispatch` for controlled recovery/retry;
- `build:dev`, not production migration build.

## Repository protection after Actions recovery

After `quality-gates` completes successfully at least once, protect `main` with an active ruleset:

1. Require a pull request before merge.
2. Require `quality-gates` before merge.
3. Require the branch to be up to date before merge.
4. Require conversation resolution.
5. Block force pushes.
6. Block branch deletion.
7. Require one approval when a second reviewer is available; otherwise avoid creating a single-maintainer deadlock.

Do not enable auto-merge for the Phase 0 foundation PR until the required checks are healthy.

## Public-repository safety

This repository is currently public. Do not place client data, legal documents, production secrets, access tokens, database credentials, private call/video data, or production-only environment values in the repository.

Do not use an unisolated self-hosted runner as a shortcut for public pull requests. A self-hosted runner must be ephemeral/isolated and restricted to trusted refs if introduced later. Also note that a pre-job GitHub Actions orchestration failure can occur before any self-hosted runner receives a job, so self-hosting is not considered a root-cause fix for the current incident.

## Definition of CI healthy

CI is healthy only when all of the following are true:

- GitHub assigns a runner;
- checkout starts;
- dependency installation succeeds;
- typecheck succeeds;
- lint succeeds;
- tests succeed;
- `build:dev` succeeds;
- `quality-gates` reports success on the current PR head SHA.

A Vercel `READY` deployment is useful secondary evidence for the application build, but it does not replace the complete `quality-gates` check.
