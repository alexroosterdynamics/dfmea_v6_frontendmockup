# DFMEA Studio (Frontend Mock)

A desktop-first **DFMEA (Design Failure Mode & Effects Analysis) workspace UI mock** built with **Next.js App Router**.
This project models a modern engineering “studio” experience with a gated DFMEA flow, visual workflow builder, and a pinned AI assistant dock (mock).

---

## What this app is

**DFMEA Studio** is a **frontend UX prototype** showing how DFMEA work can feel like a cohesive product:

* Define and refine **testable requirements**
* Unlock downstream sheets only when requirements are complete
* Explore **process structure** via a force graph
* Perform structured **root cause analysis**
* Build **workflow diagrams** visually
* Keep an **AI assistant dock** available everywhere (mock UI for future LLM integration)

> This repo is UI-first: it uses local JSON + client state and is designed for rapid iteration.

---

## Key features

### ✅ Requirements-first gating

Top navigation includes three sheets:

* **Requirements** (always accessible)
* **Process Diagram** (locked until Requirements are frozen)
* **Root Cause Analysis** (locked until Requirements are frozen)

Unlock rule:

* Requirements are unlocked when **all requirements are frozen** (complete + not flagged) and at least 1 requirement exists.

Dev shortcut:

* Switching Requirements to **List view** unlocks other sheets early.

### ✅ Requirements editor + “Risk Analysis” (mock)

Each requirement supports:

* Card view or List view
* Inline editing via a structured editor block
* “AI checklist” helper prompts
* A mocked “Risk Analysis” heuristic that flags ambiguous requirements

States:

* **Frozen** = complete + not flagged
* **Flagged** = risky/ambiguous
* **Incomplete** = not yet complete

### ✅ Process Diagram (force graph)

A force-directed canvas showing conceptual relationships:

* **Requirements → Systems → Functions**
* Hover highlighting
* Large hitboxes for usability
* Elastic reheat on drag end

### ✅ Root Cause Analysis

A structured sheet that displays:

* Focus item (failure mode + effect + current controls)
* Fishbone categories (grouped causes)
* 5 Whys ladder

### ✅ Workflows builder (React Flow)

A strict-layout workflow editor featuring:

* Grid-based node placement (no free-drag)
* Clickable connection icons per node
* Multiple edge types (series/decision/parallel/substep/route/condition)
* Hover popovers and pinned editable popovers
* Editable decision labels
* Save button wired to a mock API route

### ✅ Pinned AI Dock (mock)

A ChatGPT-like dock pinned at the bottom of every sheet:

* Always-available composer
* Expand/collapse conversation
* Resize modes (sm/md/lg)
* Fullscreen overlay mode
* Suggested prompt chips per sheet

---

## Tech stack

* **Next.js (App Router)**
* **React**
* **Tailwind CSS**
* **lucide-react** (icons)
* **react-force-graph-2d** (process diagram)
* **@xyflow/react** (workflow editor)
* **uuid** (workflow node IDs)

---

## Project structure

```
app/
  page.js                # App shell: top nav + sidebar + workspace

components/
  TopNav.js              # Tab navigation + change notices
  Sidebar.js             # Left navigation + workflows list
  Workspace.js           # View routing + pinned AI dock

  RequirementsViewport.js
  ProcessDiagramViewport.js
  ProcessForceGraph.js
  RootCauseViewport.js
  Workflows.js
  AiDock.js

contexts/
  Context.js             # Global DFMEA state (tabs, workflows, change notices, gating)

data/
  requirements.json
  processDiagram.json
  rootCauseAnalysis.json
  workflows.json

lib/
  workflowVisuals.js     # Workflow styling + constants
```

---

## How the UI works

### 1) App shell + navigation

File: `app/page.js`

The app shell composes:

* `<TopNav />` (tabs + change notices)
* `<Sidebar />` (workspace nav + workflows)
* `<Workspace />` (viewport + AI dock)

Tabs are defined as:

* `requirements`
* `processDiagram`
* `rootCauseAnalysis`

A fourth workspace view exists:

* `workflows` (always accessible from Sidebar)

#### Special behavior: Workflows tab

Selecting `workflows`:

* **Does not** affect the TopNav “active” indicator
* Is always accessible and bypasses gating

---

### 2) Gating logic (Requirements unlock)

Other sheets are locked unless Requirements are complete.

Requirements are considered **unlocked** when:

* At least 1 requirement exists
* Every requirement is **complete** (`isComplete === true`)
* No requirement is **flagged** (`flagged === false`)

Equivalent logic:

* **allComplete** AND **noneFlagged**

Dev shortcuts:

* `devOverride` (local)
* `List view unlock` (switching to list view sets `listViewUnlocked`)

---

### 3) Requirements sheet

File: `components/RequirementsViewport.js`

#### Views

* **Cards view** (default)
* **List view** (unlocks other tabs early)

#### “Frozen” definition

A requirement is frozen when:

* `isComplete === true` and `flagged === false`

#### Mocked risk analysis

The `analyze(text, details)` helper flags risk unless the requirement contains:

* numeric targets (at least one digit)
* units (ms, °C, V, %, etc.)
* operating conditions (at/under/within/range/min/max/etc.)
* sufficient length for clarity
* avoids vague terms like “good / fast / reliable / should / might”

Saving a requirement triggers:

* a short “Running Risk Analysis…” UI
* updated status and reasoning output

#### Adding requirements

The Add flow is strict:

* A requirement **cannot be added** unless its risk analysis passes (“Good”)
* Newly added requirements are immediately **frozen**

---

### 4) Process Diagram sheet

Files:

* `components/ProcessDiagramViewport.js`
* `components/ProcessForceGraph.js`

This uses a force graph to model:

* Root node: requirements
* System nodes
* Function nodes (with subtitle)

UI highlights:

* Root is solid black with a subtle accent ring
* Systems are larger white circles with border
* Functions are smaller nodes with an accent dot
* Dashed link lines for visual clarity

---

### 5) Root Cause Analysis sheet

File: `components/RootCauseViewport.js`

Displays:

* Focus item (failure mode + effect)
* Current controls (pill list)
* Fishbone categories (cards)
* 5 Whys ladder

This view is currently read-only and driven by JSON data.

---

### 6) Workflows sheet

File: `components/Workflows.js`

A visual workflow diagram builder based on React Flow:

#### Connection types

* `series`
* `decision`
* `parallel`
* `substep`
* `route`
* `condition`

#### Behavior

* Nodes are grid-positioned (no free drag)
* Clicking node icons generates new nodes + edges
* Decision edges can display and edit labels
* Hover popovers preview details
* Click pins a popover (editable fields)

#### Saving

The Save button calls:

`POST /api/workflows/save`

Payload:

* `workflowId`
* `diagram`
* `meta` (title, summary, category, owner, textSteps)

Expected success format:

* `{ ok: true, workflow: {...} }`

> Note: The API route handler is not included in the provided snippet.

---

### 7) AI Dock

File: `components/AiDock.js`

Pinned assistant UI that:

* Starts with a tab-specific welcome message
* Includes suggested prompt chips
* Supports collapsed mode (composer only)
* Supports expanded chat + fullscreen overlay
* Adds a placeholder assistant response

Future integration idea:

* Provide the LLM with active sheet context and selection/viewport data.

---

### 8) Change notices

File: `components/TopNav.js`

The bell icon supports:

* Active notice preview card
* Notice history dropdown
* “AI analyzing…” skeleton state per notice

Notices are pushed from the Requirements sheet into context.

---

## Local development

Install:

```bash
npm install
```

Run:

```bash
npm run dev
```

Open:

* `http://localhost:3000`

### Desktop-only layout

This mock UI is designed for **desktop** only.

On smaller screens the app renders a “Desktop required” message.

---

## Data sources

This project is data-driven from `/data/*.json`.

* `requirements.json`
  Project name, requirements list, and change notices.

* `processDiagram.json`
  Process sheet tasks + assistant metadata.

* `rootCauseAnalysis.json`
  Focus item, fishbone categories, and 5 Whys.

* `workflows.json`
  Seed workflows used by the Workflows sheet.

---

## Extending the app

### Wire the AI Dock to a real LLM

Recommended approach:

1. Add an API route (example):

* `POST /api/ai/chat`

2. Send:

* active tab id
* current DFMEA context
* selected requirement/workflow items
* viewport selection

3. Stream responses into `messages` in `AiDock`.

### Replace heuristic “Risk Analysis”

Swap the `analyze()` function with:

* a rules engine for formal requirement quality checks
* or an LLM classifier
* or a scoring model (testability/traceability)

### Persist state

Currently state is local-only:

* Requirements live in `useState()` in `app/page.js`
* Workflows live in context state

To persist, add:

* a database (Supabase / Prisma / etc.)
* or local storage for prototype persistence

---

## Known limitations

* UI-only prototype (not a full DFMEA engine)
* Risk analysis is simplified and local
* Search fields and file upload are visual placeholders
* Workflow save endpoint is expected but not included here

---

## Roadmap ideas

* Real backend save/load for requirements + workflows
* Requirement → function traceability linking
* “Send selection to AI” from each viewport
* Export workflows to PNG/PDF
* Add DFMEA scoring table (S/O/D + RPN)
* Multi-project sidebar support
