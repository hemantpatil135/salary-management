# Requirements — ACME Salary Management

## Goal
Replace the spreadsheets ACME's HR team uses for 10,000 employees across several countries with a web app where an **HR Manager** can (1) keep salary records accurate and (2) answer "how do we pay people?" questions in seconds instead of building pivot tables.

## Persona & key jobs-to-be-done
**HR Manager** — owns compensation data, not technical.
1. *Find* an employee fast (by name, email, country, department, job title).
2. *Maintain* records: add a hire, correct a salary, remove a leaver.
3. *Understand* pay: "What does a Senior Engineer earn in India vs Germany?", "Which department costs the most?", "What's the pay spread within a role?"

## In scope (v1)
| # | Feature | Why it matters |
|---|---------|----------------|
| F1 | **Employee directory**: server-side paginated, sortable table with search (name/email) and filters (country, department, job title) | 10k rows make Excel-style scrolling useless; server-side keeps the UI fast |
| F2 | **Create / edit / delete employee** with validation (required fields, positive salary, valid ISO currency, unique email) | Core data maintenance; validation prevents the "bad cell" problem of spreadsheets |
| F3 | **Salary insights dashboard**: headcount, min / max / average / median salary grouped by **country**, **job title** or **department**, with filters | Answers the "how does the org pay people" questions directly |
| F4 | **Role × country comparison**: pay stats for one job title across countries | The most common comp question in a multi-country org |
| F5 | **Seed script** generating 10,000 realistic, deterministic employees | Required; deterministic so demos and tests are reproducible |

## Data model (single table, deliberately)
`employees(id, full_name, email UNIQUE, job_title, department, country, currency, salary, employment_type, hired_on, created_at, updated_at)`
Salary stored as an **integer in the employee's local currency** (annual, minor-unit-free). Indexes on `country`, `department`, `job_title`, `full_name`.

## Deliberately out of scope (and why)
| Left out | Reasoning |
|----------|-----------|
| **Authentication / roles** | Single persona; adds setup cost without changing the core product. Would be the first v2 item (SSO + "HR viewer vs editor"). |
| **Currency conversion / cross-currency totals** | Mixing currencies needs a trusted FX source and an "as-of" date; a wrong number is worse than none. Insights therefore compare **within a currency** (grouping by country implies one currency). |
| **Salary history / audit trail** | Valuable, but doubles data-model complexity. `updated_at` is kept; an append-only `salary_changes` table is the planned extension. |
| **Payroll, tax, bonuses, equity** | That's payroll software, a different product. |
| **Bulk Excel import/export** | Useful for migration, but the seed script covers the demo; CSV export is a cheap v2 add. |
| **Org hierarchy / managers** | Not needed to answer pay questions in v1. |

## Non-functional requirements
- List and insight queries respond in **< 200 ms** on 10k rows (SQL aggregation + indexes, no client-side crunching).
- Fast, deterministic unit tests for domain logic, API and key UI flows.
- Runs locally with one command; deployable as a single service (API serves the built UI).

## Success criteria
An HR manager can find any employee in < 5 s, update a salary in < 30 s, and answer "average salary for role X in country Y" without leaving the app.
