# How AI Was Used

I used an agentic AI coding assistant (Claude) as a pair programmer. I owned the product decisions, the architecture and the review of every change; the AI sped up scaffolding, boilerplate and test writing. This file records the workflow and the main prompts so the process can be judged, not just the output.

## Workflow
1. **Think first, then prompt.** Wrote the requirements and design notes (`01-requirements.md`, `02-design.md`) before any code, then used them as the context for every prompt.
2. **Small, verifiable steps.** Each prompt asked for one layer (schema → repository → service → routes → UI) and was followed by typecheck + tests before committing. The commit history mirrors these steps.
3. **Tests as the contract.** Behaviour I cared about (median for odd/even counts, never mixing currencies, SQL-injection-safe sorting, duplicate email) was written down as test cases and reviewed by hand.
4. **Verify against real data.** Benchmarked every query against the seeded 10,000 rows and took screenshots of the running app instead of trusting generated code.

## Key prompts (abridged)
| Step | Prompt |
|------|--------|
| Requirements | "Act as a product engineer. For an HR manager replacing Excel for 10k employees across countries, draft a one-page requirements doc: goal, persona, jobs-to-be-done, v1 scope, and explicit exclusions with reasons. Keep it to what answers 'how does the org pay people'." |
| Data model | "Design a single SQLite table for employees with salary in local currency as an integer. Add CHECK constraints and the indexes needed for filtering by country, department, job title and searching by name." |
| Repository | "Write a repository with better-sqlite3. Sort and group-by columns must come from a whitelist; all values must be bound parameters. Compute median per group in SQL with window functions, and split every group by currency." |
| Seed | "Write a deterministic seed generator (seeded PRNG) for 10,000 employees with realistic per-country salary bands and role multipliers. Emails must be unique. It must pass the same zod schema the API uses." |
| Tests | "Write fast Vitest tests using a fresh in-memory DB per test — no SQL mocks. Cover: CRUD, pagination, sort direction, combined filters, LIKE-wildcard escaping, median odd/even, currency separation, duplicate email (409), validation errors (400), unknown sort column rejected." |
| UI | "Build a React + MUI directory page with server-side pagination/sort/filter, debounced search, an add/edit dialog whose validation mirrors the API, and an insights page answering 'what does role X earn in each country'." |

## Where I corrected or overrode the AI
- **Hire dates in the future:** the first seed generated dates up to Dec 2026. I spotted it in the screenshot and capped the range at 2025.
- **Zod v4 API:** generated code used the v3 `invalid_type_error` option and `.email()` chaining; I fixed it for the installed v4.
- **Test isolation:** the client tests failed with duplicate elements because Testing Library's auto-cleanup needs Vitest globals. I added an explicit `cleanup()` instead of turning globals on.
- **A hacky WHERE builder** (string-replacing `LIKE` to add `ESCAPE`) was rewritten into an explicit, readable loop.
- **Mixed currencies:** I rejected "average salary per department" across countries, because it would add INR to USD. Groups are always split by currency (see the design notes).
