# X-PASS Discover

> **Step into the company. Do the work. Discover your fit.**

A 2D virtual-company career exploration platform. Students join the fictional
F&B company **BITE**, walk into its browser-based office, and do realistic
business work across five departments — reading real materials, interviewing AI
colleagues and customers, making commercial decisions, and revising them when
new information lands.

The final report keeps **LIKE** (what you enjoyed, self-reported) and **SKILL
FIT** (what the work itself showed) as two separate things. They are never
merged into one "career fit score".

This build is the **common platform plus the Sales vertical slice**:
*BITE Protein Drink × QuickMart*, playable end to end.

---

## 1. What was built

**Platform foundation**

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4, Vercel-compatible.
- Neon PostgreSQL + Drizzle ORM, with a generated migration and an idempotent
  content seed.
- A persistence abstraction with two interchangeable implementations, so the app
  runs with **no credentials at all** without pretending an integration is live.
- A department-agnostic **scenario engine**: ordered steps, declarative unlock
  rules, configurable task forms, answer revisions, submissions snapshots,
  AI conversations with server-side hidden-information control, and behavior
  event logging.
- A 2.5D (isometric) BITE office in Phaser — windowed back walls with a city
  view, glass meeting rooms, wood/carpet/marble floors with daylight and soft
  shadows, detailed furniture and seated colleagues, all painted with Canvas 2D,
  all generated from a map definition with no art assets — wired to React
  through an explicit event bridge. The game logic still runs on the flat tile
  grid; only drawing is projected.

**Sales vertical slice** — all ten steps, playable:

`Sales Training → Onboarding → Account Research → Meeting Preparation →
AI Buyer Meeting → Needs Analysis → Proposal v1 → Unexpected Event →
Final Negotiation → Final Submission`

with the exact scenario data, economics, buyer facts, guardrails and disclosure
rules from the implementation pack.

**Also included**

- Behavior event logging with an admin inspector (ordered, raw, no scores).
- Admin foundation: departments, projects, scenario versions/steps/tasks,
  resources, AI personas, events.
- Career report page that shows the LIKE/SKILL FIT split honestly — SKILL FIT
  reads `NE` (Not Enough Evidence) because the evaluator is not built yet.
- A Playwright suite that walks the whole bootcamp in a real browser and pins
  the rules the product rests on: no server-only persona data in any payload,
  guardrails that warn without correcting, and earlier work preserved rather
  than overwritten. See §6.

---

## 2. Architecture

### The one rule the layering enforces

```
Phaser  = experience / spatial layer   movement, collisions, zones, NPCs, prompts
React   = work / data layer            tasks, resources, forms, AI, progress, state
```

Phaser holds **no business state**. The scene reports what the player did —
`zone_changed`, `player_moved`, `interact_npc`, `interact_zone` — through
`OfficeBridge`, and React decides what that interaction means. Walking into the
Data Room emits an event; React opens the resource panel and logs
`resource_opened`. Even the minimap is React: it is an SVG drawn from the same
`map.ts` the scene renders, so it stays crisp at any DPI and costs the game loop
nothing.

Two things in the scene are worth knowing about:

- **The static world is baked into one texture.** A Phaser `Graphics` object
  re-submits every draw command every frame, and the floor alone is ~1,400 tile
  fills. Floor, wall shadows, furniture and walls never change and nothing
  dynamic is drawn between them, so they are rendered once into a single image.
- **Movement is wall-clock based, not frame based.** Phaser's default delta
  smoothing clamps the frame delta to the target frame time, and Arcade's
  default fixed step compounds it — together they make the whole simulation run
  in slow motion on a machine that cannot hold 60fps, so walking speed would
  depend on the player's hardware. `smoothStep: false` + `fixedStep: false` fix
  that. (`scripts/verify-office-map.ts` covers the floor plan; the browser test
  asserts distance travelled, which is what catches this class of regression.)

### The scenario engine is content-driven, not Sales-shaped

`src/services/scenario/engine.ts` is pure evaluation logic over
`(scenario definition, runtime state)`. It contains no Sales branching. A
scenario is **data**: steps, tasks, field definitions, unlock rules, completion
rules. Adding Marketing or HR means writing another definition like
`src/content/sales/scenario.ts`, not changing the engine.

That claim is load-bearing, so the HR requirements were designed for up front:

| HR requirement | How it is already supported |
|---|---|
| Multiple persona instances | Personas are a registry keyed per scenario; conversations are keyed by `(session, persona, step)` |
| Conditional content | `UnlockRule` composes with `all` / `any` over step, task and conversation state |
| Repeatable structured evaluation | `repeatable_group` fields with per-row required sub-fields and `min_rows` completion |
| Multiple AI interviews | Separate transcripts per `(persona, step)`; the fact ledger is per `(session, persona)` |
| Bias / pressure event | `unexpected_event` steps carry structured `eventPayload`, not a text popup |
| Offer constraints | Guardrails are a registry of named checks evaluated against any task's answer |

### Imagery and its provenance

The photography is concept-stage fictional material produced for X-PASS. The
originals live in `assets-src/`; `scripts/build-image-assets.sh` derives the
web-ready crops in `public/img/`, and every crop is a recorded decision rather
than a hand-edited file.

**Read that script before touching an image.** An early batch was generated
while the fictional company was still called *MOGU FOODS* and carries that
wordmark inside the photograph — on a building facade, an office sign, a page
being held, and the product labels. This app's company is BITE, so those frames
are cropped to exclude the wordmark, superseded by a re-generated frame, or not
used at all. The script lists exactly which, and why, and every frame it does
use has been checked at full resolution for legible text: the only wordmark that
survives anywhere is BITE on the headquarters facade. Six originals are retained
but unused — four for the wordmark, two simply superseded by a better frame.
Drop in BITE-branded replacements and the first four become usable.

The company is pictured twice, and the two are not interchangeable.
`MEDIA.companyExterior` is the headquarters seen from the plaza and runs where
the student is still outside — the landing page and the sign-in screen.
`MEDIA.companyOffice` is the team at work and takes over once they are signed in.
`MEDIA.decisionDesk` is dark enough to carry white type, which is why it backs
the decision-revision band rather than sitting in the department cover row.

Images are addressed from content — `src/content/media.ts`, a department's
`coverImage`, a persona's `portrait`, a step's `media` — so re-shooting one is a
content change. `next/image` optimises raster sources and passes SVG through
untouched, so illustration and photography can coexist.

### Hidden information never reaches the browser

This is the core product mechanic, so it is enforced structurally rather than by
convention:

- Hidden facts, disclosure rules and system prompts live only in
  `src/content/**/personas.server.ts`, which imports `server-only` — importing
  it from a client component is a **build error**.
- The only persona shape allowed across the wire is `PublicPersona`
  (`toPublicPersona()` strips prompts, rules and every fact).
- The client receives the buyer's reply plus the **labels** of facts that reply
  disclosed — never the hidden set, never the disclosure rules.
- **No page in the app renders hidden fact content, including `/admin`.** The
  admin persona page shows the wiring (ids, labels, visibility, disclosure
  rules, trigger topics) so disclosure can be debugged, and withholds the
  payload. Authoring belongs in a later admin with real roles.
- A persona can only be opened from a step that declares it, checked
  server-side.

There are automated checks for this: the playthrough asserts that neither the
session JSON nor the rendered workspace HTML contains any system prompt or
disclosure rule.

### Who the AI is allowed to know about

Personas carry a `contextPolicy`. The **QuickMart buyer never sees the student's
private drafts** — she only knows what was actually said to her, which is what
makes the meeting a real conversation. The **BITE sales manager does** see
submitted work, because an internal manager legitimately would.

During the negotiation the server evaluates BITE's guardrails and, if the terms
would be rejected internally, injects *behavioural* steering ("do not treat this
as finally agreed") — never the numbers, because QuickMart does not know BITE's
internal minimums.

### Guardrails warn, they never correct

A student may submit a deal BITE would reject. The UI says
*"This condition is outside BITE's current guardrail"*, the choice is recorded,
and the submission goes through. Silently fixing the answer would destroy the
evidence. `violation` = breaks a BITE internal limit; `advisory` = likely to
fail on QuickMart's side.

### Behavior events are evidence, not points

Every event type from the spec is logged with step/task context and ordered
timestamps. Nothing in the codebase converts a count, a duration or a message
total into a score, and the admin inspector deliberately shows raw rows with no
aggregates.

---

## 3. Important file locations

```
src/
  types/            domain types (scenario, runtime, persona, session view)
  content/
    company.ts            BITE, products, unit economics, guardrail constants
    departments.ts        the five departments (product_id null is meaningful)
    registry.ts           PUBLIC content registry (client-safe)
    personas.server.ts    SERVER-ONLY persona registry
    sales/
      scenario.ts         the 10-step Sales scenario, as data
      resources.ts        Data Room contents
      personas.server.ts  SERVER-ONLY: Yuki Tanaka, hidden facts, system prompts
  services/
    scenario/
      engine.ts           pure unlock / completion / prefill evaluation
      session-service.ts  load, project, sync progress, start sessions
      task-service.ts     save & submit, guardrails, submission snapshots
      guardrails.ts       named guardrail checks (warn only)
      calculators.ts      retail margin, BITE contribution, expected volume
    ai/
      types.ts            ScenarioAIService interface
      mock-service.ts     deterministic adapter (no credentials needed)
      openai-service.ts   production adapter, validates model fact claims
      fact-matcher.ts     deterministic disclosure floor
      conversation-service.ts  what the AI is told, what the client is shown
    events/               behavior logging
  db/
    schema/               identity, scenario, runtime, evaluation
    repository/           XPassRepository + Drizzle and file implementations
    seed/run.ts           idempotent content seed
  game/office/
    map.ts                office layout as data (rooms, doors, furniture, NPCs)
    theme.ts              the office palette and floor materials
    iso.ts                isometric projection and draw-order (depth) rule
    art.ts                2.5D pieces painted with Canvas 2D: walls, furniture, people
    office-scene.ts       Phaser scene: logic on the grid, drawing projected
    bridge.ts             Phaser → React events
  features/               auth, departments, survey, workspace, office, ai, resources
    lobby/                the illustrated lobby (lobby-art.ts) and the /start onboarding screen
    survey/               the one-question-per-screen pre-survey over an illustrated office
  i18n/                   languages (en / ja / ko): config, dictionaries, server getT(), client useT()
  app/                    routes (student, admin, api)
scripts/
  verify-postgres.ts      runs the migration + seed + repository on embedded PG
  verify-disclosure.ts    checks the hidden-fact matcher against real phrasings
tests/e2e/
  journey.spec.ts         the whole bootcamp, driven off the step rail
  hidden-information.spec.ts  nothing server-only reaches the browser
  conversation.spec.ts    a meeting cannot be ended before it is held
  guardrails.spec.ts      warnings do not block, and do not correct
  revision.spec.ts        earlier work is preserved, not overwritten
  identity.spec.ts        sign-up, sign-in and sign-out, and their refusals
  admin.spec.ts           admin is closed in production; it withholds content
  office.spec.ts          Phaser boots and its prompt tracks proximity
  helpers/                flow helpers and the generic form filler
  fixtures/               derives the server-only strings the leak spec uses
drizzle/                  generated migration SQL
```

---

## 4. Database schema overview

30 tables. `npm run db:generate` produces the migration from
`src/db/schema/`.

**Identity / structure** — `users`, `companies`, `departments`, `products`,
`projects`

> `projects.product_id` is **nullable by design**. Product Management starts
> from a customer problem with no product, and Strategy has no assigned product
> at all. The seed raises an error if a department that *does* declare a product
> would fall back to `NULL`, so a null never means "we forgot to seed it".

**Scenario definition** — `scenarios`, `scenario_versions`, `scenario_steps`,
`tasks`, `resources`, `step_resources`, `ai_personas`, `persona_facts`

> A session pins `scenario_version_id` at creation, so publishing a new version
> cannot mutate a session that is already running.

**Runtime** — `project_sessions`, `step_progress`, `task_answers`,
`task_answer_revisions`, `submissions`, `ai_conversations`, `ai_messages`,
`behavior_events`, `pre_surveys`, `post_surveys`, `department_selections`

> `task_answer_revisions` preserves `previous_value`, `value`, `version` and
> timestamp on every real change, so "what changed after the competitor news"
> is answerable. Re-saving an identical answer does **not** create a revision.

**Evaluation (structural placeholders)** — `rubrics`, `rubric_dimensions`,
`evaluation_evidence`, `evaluations`, `like_scores`, `career_reports`

> `evaluations.rating_status` supports `NE` and `rating` is nullable: absence of
> evidence is a real outcome, not a zero. `like_scores` is a separate table from
> `evaluations` so the two can never be collapsed by accident.

---

## 5. Environment variables

See `.env.example`. **All of them are optional.**

| Variable | Unset behaviour |
|---|---|
| `DATABASE_URL` | Local JSON file store (`.data/`), durable across restarts |
| `AUTH_SECRET` | Insecure dev fallback — **set this in production** |
| `OPENAI_API_KEY` | Deterministic mock AI; the scenario stays fully playable |
| `X_PASS_AI_MODE` | `openai` if a key exists, else `mock` |
| `X_PASS_OPENAI_MODEL` | `gpt-4o-mini` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `X_PASS_ADMIN_EMAILS` | Admin open to any signed-in user in dev, **closed in production** |
| `X_PASS_DATA_DIR` | `.data` |

---

## 6. Running locally

Requires **Node 20+**. Nothing else.

```bash
git clone -b claude/intelligent-planck-39vf7c \
  https://github.com/x-pass-gcsc/x-pass-discover.git
cd x-pass-discover
npm install          # ~25s
npm run dev          # http://localhost:3000
```

That is the whole setup. No database, no API key, no `.env`.

> The first `npm run dev` fetches the Inter and JetBrains Mono webfonts, so it
> needs network access once. After that it works offline.

Then: **Create an account** (email + display name, **no password** — it is a
development identity, see §8) → the X-PASS lobby (**START**) → pre-survey → choose departments → **Start
bootcamp** on Sales → work through the ten steps. Returning students sign in at
`/login` with the email alone. Sign out from the header on any signed-in page.
Walk into the 2.5D office from the workspace sidebar, or go straight to
`/office`.

Things worth trying, because they are where the design decisions show:

| Where | What to look for |
|---|---|
| **AI Buyer Meeting** | Ask "tell me about QuickMart" → you get nothing. Ask "how many facings would a new protein drink get?" → the buyer gives you the number and the discovery meter ticks up. |
| **Initial Sales Proposal** | Set the wholesale price to ¥150. You get a guardrail warning — and you can still submit it. |
| **Unexpected Event → Negotiation** | Proposal v1 sits read-only beside the revision form. Nothing is overwritten. |
| **Day one** | A new account (or a sign-in before the pre-survey is done) opens on `/start`, the X-PASS lobby: INTRO 01/04, **START** begins the pre-survey — one question per screen, keys 1–5 answer, Enter moves on. Questions live in `src/content/pre-survey.ts`. After the survey, sign-in goes to the welcome page. |
| **The 2.5D office** | WASD/arrows move relative to the screen (up = towards the back wall; up + right walks straight along a corridor). Walk into the Data Room or up to an NPC, press `E`. |
| **`/admin/events`** | The ordered behaviour log for your own session — raw rows, no scores. |
| **`/admin/ai-personas`** | Disclosure rules and trigger topics are shown; hidden fact content is not, anywhere. |

### With Neon

```bash
echo 'DATABASE_URL=postgres://...'  >> .env
npm run db:migrate
npm run db:seed
npm run dev
```

The seed is idempotent and mirrors the TypeScript content registry into the
relational tables.

### With live AI

```bash
echo 'OPENAI_API_KEY=sk-...' >> .env
```

The header badge switches from *Mock AI* to *OpenAI*.

### Deploying

The app is a standard Next.js App Router project, so any Node host works;
Vercel needs no configuration file.

1. Import `x-pass-gcsc/x-pass-discover` in Vercel and set **Settings → Git →
   Production Branch** to `main`. The repository's default branch is
   `claude/intelligent-planck-39vf7c`, which is where work lands; `main` carries
   the same application code and is the branch to deploy.
2. Set environment variables:

   | Variable | Needed? | Why |
   |---|---|---|
   | `AUTH_SECRET` | **Yes** | Signs the session cookie. `openssl rand -base64 32` |
   | `DATABASE_URL` | Strongly recommended | Without it the deployment runs in **demo mode** — see below |
   | `OPENAI_API_KEY` | Optional | Without it the AI employees run in deterministic mock mode |
   | `X_PASS_ADMIN_EMAILS` | Optional | `/admin` is **closed** in production unless an email is allow-listed |
   | `NEXT_PUBLIC_APP_URL` | Optional | Your deployment URL |

3. **With `DATABASE_URL` set, run the migration and seed once against that
   database before the first real session.** A fresh Neon database is empty —
   setting the connection string does not create the tables:

   ```bash
   DATABASE_URL='postgres://…' npm run db:setup   # migrate, then seed
   ```

   Skip it and the deployment looks healthy until the first write. Both halves
   fail with the instruction rather than a driver error — *“This deployment's
   database has no tables yet…”* if the migration is missing, *“Scenario content
   is not seeded…”* if only the seed is. Running `db:setup` fixes either; it is
   idempotent, so re-running it against a database that is already set up is
   safe.

   Run it from a checkout of this repository — the seed is a TypeScript script
   that mirrors the content registry into the tables, so pasting the migration
   SQL into a database console gets you only half of it.

**Demo mode.** A serverless filesystem is read-only and per-instance, so the
local file store cannot be used in production. A production build with no
`DATABASE_URL` therefore keeps everything **in memory**: the full Sales
bootcamp is playable, and every page badges it as
*“Demo mode — nothing is saved”*. Work is lost whenever an instance recycles.
That is deliberate — the alternative is crashing on the first save, or
pretending data was stored.

### Verification

```bash
npm run verify            # typecheck + lint + office map + disclosure + Postgres
npm run db:verify         # migration + seed + every Drizzle query on embedded PG
npm run verify:disclosure # hidden-fact matcher against realistic phrasings
npm run verify:office     # floor plan: every room, door and NPC still reachable

npm run test:e2e:install  # one-off: fetch the Chromium build Playwright expects
npm run test:e2e          # the browser suite (builds and serves the app itself)
```

`npm run verify` is the fast gate and stays credential-free; `npm run test:e2e`
is the slow one. Both run in CI (`.github/workflows/ci.yml`) as separate jobs.

`npm run db:verify` boots an embedded PostgreSQL (PGlite), applies the generated
migration, runs the seed twice (idempotency), and drives `DrizzleRepository`
through the real scenario services — so the Neon code path is validated without
a Neon account.

`npm run verify:office` matters because office furniture is solid: moving a desk
can quietly wall off a room or trap an NPC. It flood-fills the real collision
grid and fails if any room, door or NPC becomes unreachable.

### The browser suite

`npm run test:e2e` runs Playwright against a **production build** that it starts
itself. That is deliberate: `next start` sets `NODE_ENV=production`, which is
what makes the app choose `memory` persistence — the exact adapter a
credential-less deployment gets. Running against `next dev` would exercise the
file store instead and quietly skip the demo-mode path. It also means every run
starts from an empty store. `DATABASE_URL` and `OPENAI_API_KEY` are blanked for
the suite, so a developer's `.env` can neither point the tests at a real
database nor turn them into billable API calls.

Three things make it maintainable rather than a wall of selectors:

- **It addresses `data-*` hooks, never copy.** Rewording a label does not fail
  a test. `data-field-key` / `data-field-type` / `data-task-kind` /
  `data-step-key` are the contract.
- **The walkthrough is driven off the step rail, not a list of the ten Sales
  steps.** `completeCurrentStep` reads `data-task-kind` and fills whatever is
  there, and `fillTask` fills from `data-field-type`. The engine is supposed to
  know nothing about Sales; so does the test that drives it. Authoring
  Marketing or HR should make `journey.spec.ts` longer, not broken — and if it
  does break, that is the architecture claim failing, which is worth knowing.
- **The leak spec derives its forbidden strings from the real content files.**
  A global setup runs `tests/e2e/fixtures/dump-server-secrets.ts` under
  `tsx --conditions=react-server` and writes out every system prompt,
  conversation rule and disclosure rule. A new persona or hidden fact is
  covered the day it is written, with no test to remember to update.

Point `E2E_BASE_URL` at a running instance (a preview deployment, say) to skip
the build and test that instead.

---

## 7. Mock-mode behaviour

Mock mode is not trying to sound human. It exists so the **entire scenario is
playable and testable with no credentials**, behind exactly the same
`ScenarioAIService` interface as production:

- Hidden facts are disclosed by the same server-side ledger and the same
  "relevant question" rule — ask about shelf space, get the 2 facings.
- At most two facts per turn, so the buyer answers and invites a follow-up
  instead of dumping the scenario.
- A fact already earned is never re-disclosed as new, across both the meeting
  and the negotiation.
- Replies react to the previous turn, push back on vague claims, and switch to
  trade-making language in the negotiation step.
- Guardrail steering works: if the terms break BITE's limits, the buyer does not
  behave as though the deal is closed.

In OpenAI mode the model is additionally given the undisclosed facts with their
disclosure conditions and must report which ones it used. The server **validates
that list** against the facts that exist and are still unrevealed — the model
cannot mint a fact id — and unions it with the deterministic matcher so an
obviously on-topic question still counts as discovery.

---

## 8. Production-ready vs placeholder

**Production-shaped**

- Scenario engine, unlock/completion evaluation, revision history
- Repository abstraction, Drizzle schema, migration, idempotent seed
- Hidden-information boundary and persona/step authorization
- AI service abstraction with both adapters
- Guardrail evaluation and commercial calculators
- Behavior event logging
- Server-side input validation (Zod) and session ownership checks on every route
- Phaser/React layer separation

**Deliberate placeholders**

- **Authentication.** `src/lib/auth/session.ts` is a signed-cookie *development
  identity* with no password. The architecture docs prefer Auth.js; this keeps
  the same narrow seam (`signUp` / `signIn` / `signOut` / `getCurrentUser`) so
  swapping in Auth.js means reimplementing that one file. **Not production
  auth**: no password, no email verification, no recovery, and no way to prove
  the person typing an address owns it. Anyone can sign in as any registered
  address.

  Sign-up and sign-in are separate screens, and `/login` says plainly when an
  address has no account. That is an enumeration oracle, and it is an honest
  one here — with no password, an attacker does not need to enumerate anything,
  they can simply sign in. It is also the only way to stop a typo from silently
  creating a second, empty account and making a student's work look lost.
  **When Auth.js lands, that trade expires**: once there is a credential worth
  guessing, both screens must answer identically to an unauthenticated caller.
  That is a change to `signIn`/`signUp` and the two routes that call them,
  nothing downstream.
- **Evaluation / SKILL FIT.** Tables and the `NE` concept exist; no evidence
  extraction or rating pipeline. The report shows `NE` rather than a number.
- **Post-survey.** Table exists, no UI.
- **Admin is read-only.** Inspection, not authoring.
- **Four of five scenarios.** Marketing, PM, Strategy and HR are modelled as
  departments and projects but have no scenario content authored.
- **Object storage adapter.** `resources.file_url` exists; everything is
  currently inline markdown or table data.
- **Art assets.** The office is generated geometry — deliberately, so a new room
  is a data change. Sprite art would replace the pieces in `art.ts` (one
  isometric tile each, sorted by `iso.ts`) without touching the map or the
  bridge.

### Languages

The interface can be shown in English, Japanese or Korean. The choice is made
from the globe menu (next to the account name, and on the sign-in pages), kept
in the `xpass-locale` cookie, and defaults to the browser's language.

- Strings live in `src/i18n/messages/{en,ja,ko}.ts`. English is the source;
  the other two are type-checked against it, so a missing key fails the build.
- Server components call `await getT()`, client components `useT()`;
  `{name}` placeholders are filled from the second argument.
- Pre-survey questions carry their own `{ en, ja, ko }` text in
  `src/content/pre-survey.ts`.
- Translated so far: sign-in / sign-up, the lobby, the pre-survey, the welcome
  page, the shared header and the office (HUD, room signs, prompts). Still
  English: the landing page, departments, workspace, report, admin and the
  scenario content itself (case material, personas).

---

## 9. Remaining TODOs

- `SPICY_CRISPY_CHICKEN_BITES` has no spec sheet or economics — the pack does
  not supply them, so the record is intentionally minimal rather than invented.
- Session `expired` status is modelled and `deadline_at` is set and displayed,
  but nothing expires a session yet.
- `step_resources` is seeded, but the runtime resolves step resources from the
  content registry; a DB-backed `ScenarioContentSource` would close the loop.
- The follow-up detection that distinguishes `ai_followup_asked` from
  `ai_message_sent` is a word-overlap heuristic. Fine as evidence, not as a
  measure.
- There is no unit-test runner. `npm run verify` and the Playwright suite cover
  the critical invariants end to end; a Vitest layer for the pure functions
  (`engine.ts`, `calculators.ts`, `guardrails.ts`, `stable-json.ts`) would make
  failures point at a line instead of a page.
- `next` carries a transitive build-time `postcss` advisory that is only fixed
  in Next 16 (a breaking major). Deferred deliberately.
- The office renders ~1M pixels per frame. That is nothing for a GPU, but in a
  software rasteriser (headless CI, for example) frame rate scales inversely
  with canvas area — measured at a flat ~9.5M px/s. Movement is correct either
  way now, but a low-end target would want a capped render resolution.

---

## 10. Recommended next phase

1. **Play it end to end as a real student** and fix what that exposes. The
   browser suite now walks the whole bootcamp on every run, and writing it
   already surfaced one dead end (a meeting that could be ended before it was
   held, sealing the step). But automation only finds what it is told to look
   at. Nobody has yet sat down and tried to do the job.
2. **Implement HR as the second scenario.** It is the stress test that matters:
   conditional content, multiple candidate personas, repeated scorecard rows,
   several interview transcripts, and an executive pressure event. Writing it
   should be *content only*. If it is not, that is the bug to fix.
3. **Replace the auth placeholder with Auth.js** and give admin real roles.
4. **Prototype evidence extraction**: work output + behavior → evidence →
   rubric dimension → BARS → rating or `NE` → confidence → deterministic
   aggregation. Keep `NE` first-class and keep LIKE out of it.
5. **Then** Marketing, Product Management and Strategy, plus the post-survey and
   the real career report.
