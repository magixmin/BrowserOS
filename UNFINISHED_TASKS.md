# Unfinished Tasks

Updated: 2026-03-27

This file is the current task board for work that is not fully closed yet. Source plan docs remain authoritative for design detail; this file is for execution status and next actions.

## Browser Ops

- [ ] Real proxy provider credentials and live route dialing
  Source: `docs/project-plans/ai-browser-os-browser-ops.md`
  Status: data model and adapter skeleton exist; recent rounds added safe `proxyServerArg`, credential source/env hints, preview-time missing-env warnings, launcher-side missing-credential detection, resolved credential injection into launched BrowserOS process env, controller-side proxy auth rule injection for bound tabs, launched-instance server bootstrap for proxy auth rules, status/instance health visibility for proxy-auth bootstrap, and instance-level proxy egress verification with persisted IP/country/session verdicts and health integration, but full end-to-end provider dialing across managed instances is still not wired.

- [ ] Chromium profile / session isolation
  Source: `docs/project-plans/ai-browser-os-browser-ops.md`
  Status: window ownership, runtime binding, browserContext wiring, and diagnostics exist; this round also moved Chromium profile directories to launch-context-scoped names instead of sharing one directory per profile, but full launched-instance isolation and lifecycle closure are still pending.

- [ ] Skill execution and automation landing
  Source: `docs/project-plans/ai-browser-os-browser-ops.md`
  Status: task templates now resolve `skillKey` against the real skills catalog, Browser Ops can build an automation brief, and the page can prepare a managed-window automation run draft that opens the sidepanel with a bound browserContext override, but full server-side one-click execution and post-run orchestration are still not connected.

## Eval System

- [x] Verify single-agent regression path end to end
  Source: `packages/browseros-agent/apps/eval/IMPLEMENTATION_PLAN.md`
  Status: completed in this round with automated evaluator coverage in `apps/eval/tests/single-agent-evaluator.test.ts`.

- [x] Verify orchestrator-executor screenshots and `messages.jsonl`
  Source: `packages/browseros-agent/apps/eval/IMPLEMENTATION_PLAN.md`
  Status: completed in this round with automated evaluator coverage in `apps/eval/tests/orchestrator-executor-evaluator.test.ts`.

- [x] Verify accurate `metadata.total_steps` and error/warning capture for both patterns
  Source: `packages/browseros-agent/apps/eval/IMPLEMENTATION_PLAN.md`
  Status: completed in this round with automated coverage in `apps/eval/tests/single-agent-evaluator.test.ts`, `apps/eval/tests/orchestrator-executor-evaluator.test.ts`, and `apps/eval/tests/with-eval-timeout.test.ts`.

- [x] Verify grader pass path with orchestrator-executor (including no "no_screenshots" error)
  Source: `packages/browseros-agent/apps/eval/IMPLEMENTATION_PLAN.md`
  Status: completed in this round with automated task-executor coverage in `apps/eval/tests/task-executor-graders.test.ts`, validating that orchestrator output reaches the multimodal grader with usable screenshot evidence instead of hitting the `no_screenshots` failure path.

## App / Server Cleanup

- [x] Move search suggestions fetching to background to avoid CORS issues
  Source: `packages/browseros-agent/apps/agent/entrypoints/newtab/index/lib/searchSuggestions/getSearchSuggestions.ts`
  Status: completed in this round.

- [x] Re-enable legacy server MCP smoke test on the current HTTP/SSE architecture
  Source: `packages/browseros-agent/apps/server/tests/index.test.ts`
  Status: completed in this round by replacing the skipped STDIO-era test with an active MCP route smoke test that runs against the current HTTP transport and local registry.

- [ ] Remove temporary `--browseros-cdp-port` workarounds after the underlying BrowserOS bug is fixed
  Source: `packages/browseros-agent/apps/agent/web-ext.config.ts`, `packages/browseros-agent/scripts/dev/start.ts`, `packages/browseros-agent/apps/server/tests/__helpers__/browser.ts`
  Status: still using compatibility workarounds.

- [x] Replace placeholder media/demo URLs where marked
  Source: `packages/browseros-agent/apps/agent/lib/constants/mediaUrls.ts`
  Status: completed in this round after verifying the linked media assets resolve successfully.

## Notes

- The Browser Ops and Eval items above are larger tracks. They should be advanced with task-specific verification or implementation PRs instead of more ad hoc TODO comments.
- This tracker should be updated in the same change whenever one of the items above is completed, blocked, or re-scoped.
