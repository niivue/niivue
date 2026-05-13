# Workflow Designer & Wizard UX Review

Synthesis of a four-facet UX/UI audit covering the workflow **Designer** surface (the tool authors use to create workflows) and the produced **Wizard** runtime (what end-users see when running a workflow).

Date: 2026-05-13
Branch: `BIDS-allineate`
Reviewers (subagents): Designer IA & Interaction · Wizard Runtime UX · Visual Design & Aesthetics · Accessibility & Microcopy

---

## Convergences (≥2 reviewers flagged independently)

These are the highest-signal targets — fixing them collapses ~40% of the long-tail issues.

| Theme | Where it hurts |
|---|---|
| Header chrome inconsistent across Designer dialog, Wizard shell, Template gallery (size / padding / bg) | IA + Visual |
| Validation feedback hidden in a header popover, not attached to the offending node/field | IA + A11y + Wizard |
| Disabled-without-reason (Next button, Save button, future steps) | Wizard + A11y |
| Color-only state encoding (selected, current step, edge type) | Visual + A11y |
| No focus traps / lost focus on dialog close (Gallery + WizardShell are hand-rolled, not Radix `Dialog.Root`) | A11y |
| No undo / no dirty-state confirm in the Designer | IA |
| Long-running ops have no progress, no cancel | Wizard |
| IPC failures swallowed (`.catch(console.error)`) | A11y + IA |

---

## Phase 1 — Ship within a week (P0)

Each section below is a small, shippable PR.

### 1. Author-data safety in the Designer

Closing the dialog silently discards unsaved work; a single trash-icon misclick destroys a step with no undo.

- Track `dirty` (compare draft to last-loaded snapshot)
- Confirm before X close + before "← Templates" / view switch when dirty
- ~30-line undo stack (draft is fully serializable)
- Toast on save success
- Files: `WorkflowDesignerDialog.tsx:263-484`

### 2. Validation lives on the node, not in a popover

- `WorkflowDesignerDialog.tsx:246,257` correlates errors to steps by substring-matching the message text — mis-matches `convert` vs `convert_t1`. Use `e.stepName` directly (already on the issue object).
- Render the first error inline under the node header in `WorkflowDiagramView.tsx`
- Add `aria-invalid` + `aria-errormessage`; wrap the popover in `role="status" aria-live="polite"`

### 3. Footer pacing + Next-disabled reasons (Wizard)

- Delete the right-side Cancel at `WizardFooter.tsx:38-47` — keep one Cancel (header X). Two Cancels next to a primary Next is a destructive-action footgun.
- Pass `disabledReason: string` from each step; render as a tooltip on the disabled Next button.
- `useWizardEngine.ts:61-78` (`missingInputs`) already computes the reasons — plumb them.

### 4. Field-level error display (Wizard)

- Pass `error?: string` into `AutoField`; render below input with `aria-describedby`.
- Always render `fieldDef.description` as helper text (drop the label-gate at `AutoField.tsx:34`).
- Require `fieldDef.label`; lint workflow defs missing it — no more raw `output_dir` leaking to end users.

### 5. Focus traps + Escape + restore (A11y P0)

- Rewrite `WorkflowTemplateGallery.tsx:116-264` and `WizardShell.tsx:84-148` as `Dialog.Root` instead of hand-rolled `fixed inset-0`.
- Replace `display:none` on `Dialog.Title` in `WorkflowDesignerDialog.tsx:401-404` with `<VisuallyHidden>` — `display:none` removes the title from the accessibility tree, breaking the SR association.
- `aria-label` on every icon-only button — sweep across `WorkflowDiagramView.tsx:157,176,194,434`, `WorkflowDesignerDialog.tsx:484`, `WorkflowTemplateGallery.tsx:127`.
- Add `aria-current="step"` and SR-only state text in `WizardStepIndicator.tsx:24-67`.

### 6. Long-running ops (Wizard P0)

- Always-cancellable: drop `disabled` on Cancel during `loading` at `WizardFooter.tsx:31`.
- Stream determinate progress from the engine (`useWizardEngine.ts:107,250,270`) — title each phase ("Converting 12/47 series…"). Currently a 5-minute DICOM convert is a generic indeterminate spinner.

---

## Phase 2 — Next sprint (P1)

### 7. Unify the design-system surface

- Single header recipe everywhere: `Heading size="4"` + `px-6 py-4` + `bg-panel` + `border-b border-neutral-5`
- Single palette location across List + Diagram views (recommend a left rail, ~280px). Today: List view has its palette internal to `ContextSpineDesigner`; Diagram view docks `BlockPalette` as a `max-h-56` bottom strip.
- Single "selected" recipe: `bg-accent-3` + `border-accent-7` + `text-accent-11` — apply at `WizardStepIndicator.tsx:31`, `WorkflowDiagramView.tsx:122-148`, `BlockPalette.tsx:199`.

### 8. Inspector panel in Diagram view

`WorkflowDiagramView.tsx:541` tracks `selected`, but nothing renders the selected step's parameters in diagram view. Selection only changes a border color; to edit a step's params the author has to switch to List view. Render a right-hand inspector that reuses the list-view per-step editor when `selectedStep != null`.

### 9. Synthetic source nodes

Add "Workflow Inputs" and "Form Fields" nodes on the left of the canvas so every `in:` / `form:` / `=` badge in `WorkflowDiagramView.tsx:252-272` becomes a visible edge.

### 10. Drag-to-canvas from palette

`BlockPalette.tsx:202` is click-only. `DragHandleDots2Icon` is already imported in `ContextSpineDesigner.tsx:18`. Wire one drag library, use it for both palette→canvas and step reorder.

### 11. Resumable runs + close-during-run confirmation

- Persist `runId` in localStorage; offer "Resume?" on reopen.
- Confirm close in `handleClose` (`useWizardEngine.ts:299-317`) when a run is in flight or partial outputs exist on disk.

### 12. Empty states with a CTA

- Diagram empty canvas (`WorkflowDiagramView.tsx:718-733`): dashed drop zone graphic + arrow at palette + "Browse templates" link.
- List-view empty state — currently absent in `ContextSpineDesigner`, so a brand new author sees a blank pane.

### 13. Form density + responsive shell

- Optional `group` + 2-column grid above 768px in `FormSection.tsx:90-104` (today everything is one flat `flex-col gap-3`).
- Below 720px window: collapse `WizardShell.tsx:112` rail to icons-only.
- Let custom-component sections opt out of `max-w-4xl` (`WizardShell.tsx:123`) so BIDS tables breathe on wide displays.

### 14. Surface IPC failures

`.catch(console.error)` at `WorkflowTemplateGallery.tsx:68,93,103,113` — replace with a Callout + Retry. The pattern already exists at `WorkflowDialog.tsx:653-660` (`engine.error`); extend it to load failures.

---

## Phase 3 — Polish (P2)

- Parallelize completion-screen previews (3-4 concurrent vs serial at `CompletionScreen.tsx:101-119`) — 50 files is currently 30+ seconds of spinners.
- Promote "Load All in Viewer" to primary CTA on `CompletionScreen.tsx:363-372` (Done → soft). The payoff of finishing a wizard is rarely "close it."
- Delete or relabel the "Advanced Editor" template-gallery card at `WorkflowTemplateGallery.tsx:241-256` — it routes to the same blank designer; the promised "Full control over JSON" was removed (per the comment at `WorkflowDesignerDialog.tsx:8-11`).
- `prefers-reduced-motion` guard in `WizardTransition.tsx:19-41` (currently fires unconditionally).
- Replace ASCII `×` / `⇢` glyphs in `WorkflowDiagramView.tsx:431,455` with Radix icons.
- Replace native `confirm(...)` in `WorkflowTemplateGallery.tsx:107` with Radix `AlertDialog`.
- Edge encoding: today coercion vs incompatible use `dasharray "6 4"` vs `"2 3"` — visually near-identical. Make incompatible thicker + `--red-9`; coercion lighter dash.

---

## Design-system foundations

Adopt these so the cleanup sticks.

### Lint / CI rules

1. **No raw `rgba()` or hex in JSX `style` props.** All elevation via `--shadow-N`, all colors via Radix scales. Block `rgba(` and `#[0-9a-f]{3,8}` in JSX style. Current offenders: `WorkflowDiagramView.tsx:133,428,452,767`, `WorkflowTemplateGallery.tsx:163,228,243`.
2. **Spacing from the 4/8/12/16 scale or Radix `--space-N`.** Ban `10px`, `6px`, `2.5`. Grep guard: `padding: '\d+px \d+px'`.
3. **Every interactive non-Radix `<button>` gets `:focus-visible` + `aria-label`.** Or replace bare `<button>` in `WorkflowDiagramView.tsx:157-209` with Radix `IconButton variant="ghost"`. Lint rule: flag `<button>` without `aria-label` or text child.

### Microcopy style guide

1. **Verb + object, never verb alone.** "Save workflow" not "Save"; "Loading workflows…" not "Loading…". Buttons name *what* they act on; progress messages name the noun in flight.
2. **Errors blame the system and point to the fix.** No "Please…", no internal field names. Pattern: `Can't <do X> — <why> in <where>. <Next action>.` Example: "Can't save — 2 issues in the steps marked red. Open the error panel."
3. **Empty states promise the next step.** Every zero-state ends in an actionable sentence ("Pick a tool from the palette below to add your first step"), never a passive description of the absence.

---

## Suggested PR rollout for Phase 1

- **PR 1 — Designer safety:** dirty/undo/save-toast + aria-label sweep + `stepName` fix + inline node errors. (Issues 9, 10, 12, 13, A11Y-1, A11Y-2.)
- **PR 2 — Wizard footer & fields:** kill duplicate Cancel, disabled-reason tooltip, field-level errors, helper text, always-cancellable runs. (Wizard #1, #3, #6, #8.)
- **PR 3 — Dialog foundations:** Radix `Dialog.Root` migration for Gallery + WizardShell, `<VisuallyHidden>` titles, `aria-current="step"`. (A11Y-3, A11Y-8.)

Then Phase 2 in two-week increments.

---

## Appendix: raw issue inventory

### Designer IA & interaction

1. (P1) "Advanced Editor" card is a lie — `WorkflowTemplateGallery.tsx:241-256` advertises features the designer doesn't have. `MainApp.tsx:1713-1715` routes both `blank` and `advanced` to the same dialog with `initialDefinition=null`.
2. (P1) Blank-start has no in-designer empty state outside the diagram. List view (`ContextSpineDesigner`) has none.
3. (P2) No way back to the gallery from the designer (`WorkflowDesignerDialog.tsx:390-404`).
4. (P1) Layout shifts between List and Diagram views — palette in different locations and orientations.
5. (P0) No properties panel in diagram mode — `WorkflowDiagramView.tsx:541` tracks selected state but nothing renders the inspector.
6. (P1) No drag from palette to canvas — `BlockPalette.tsx:202` is `onClick` only.
7. (P2) Reorder is button-only — `WorkflowDiagramView.tsx:158-191` ChevronUp/Down; `DragHandleDots2Icon` imported but unused.
8. (P1) Workflow-input / context-field refs are invisible as connections.
9. (P0) No dirty-state tracking — closing silently discards work.
10. (P0) No undo / redo — single misclick destroys a step.
11. (P2) Save success has no visible feedback.
12. (P0) Validation match by `String.includes(step.name)` mis-fires on overlapping names.
13. (P1) Errors siloed in header popover only.
14. (P2) No right-click menus, no keyboard shortcuts.
15. (P2) `config-only` badge shown in palette but not on placed nodes.

### Wizard runtime UX

1. (P2) Step descriptions only render for current step (`WizardStepIndicator.tsx:61`).
2. (P2) Future steps use `cursor-default`, no tooltip explaining why unreachable (`WizardStepIndicator.tsx:35`).
3. (P2) No progress bar; rail hides when `steps.length <= 1` (`WizardShell.tsx:111`).
4. (P0) Two Cancel buttons on non-first step — `WizardFooter.tsx:38-47`.
5. (P0) `disabled={!canProceed || loading}` with no surfaced reason — `WizardFooter.tsx:52`.
6. (P1) `handleStepClick` only allows backward jumps (`WizardShell.tsx:73-80`).
7. (P1) Close X has no confirm — `WizardHeader.tsx:29-37`.
8. (P1) Transition 250ms blocking on every Next/Back — `WizardTransition.tsx:29-38`.
9. (P1) Flat `flex-col gap-3` for all fields — `FormSection.tsx:90-104`.
10. (P1) `AutoField.tsx:33` leaks API identifiers when label missing.
11. (P1) `AutoField.tsx:155` silently coerces undefined to a number.
12. (P2) Section spinner replaces the entire panel including the heading.
13. (P1) `AutoField.tsx:34` only surfaces descriptions when label exists.
14. (P0) Generic "Running…" spinner with no name/progress/ETA.
15. (P0) Cancel disabled during loading — no escape hatch on a 5-minute run.
16. (P1) `handleClose` cancels run but doesn't surface partial-write warning.
17. (P1) No resumability — `useWizardEngine.ts:81-141` re-starts on `open`.
18. (P0) `WizardShell` doesn't render `engine.error`.
19. (P0) `AutoField` has no field-level error display.
20. (P1) Failed conversions don't tell user which series failed.
21. (P1) `console.error` swallows heuristic and update failures.
22. (P2) Completion screen is understated; no celebratory state, no summary stats.
23. (P2) "Load All in Viewer" gated on `>1 file`; entire row should be clickable.
24. (P1) Serial preview rendering — 50 files = 30+ seconds.
25. (P1) "Done" is primary CTA; "Load All in Viewer" should be.
26. (P1) Fixed 224px rail + 896px max-width — bad on both narrow and wide windows.
27. (P2) No minimum window-size enforcement.

### Visual design

1. (P1) `WorkflowDesignerDialog.tsx:409` uses `Text size="3"` for the H1; others use `Heading size="4"`.
2. (P2) `WorkflowTemplateGallery.tsx:137` competes with the parent header.
3. (P1) `BlockPalette.tsx:177` uppercase-tracked category headings vs mixed-case headings elsewhere.
4. (P2) Step-name `--code-font-family` at `size="1"` is visually subordinate to a label — but it's the authoritative identifier.
5. (P1) Three header paddings for the same role: `py-2 px-4` vs `py-4 px-6`.
6. (P1) Magic numbers in `WorkflowDiagramView.tsx`: `8px 10px`, `4px 10px 6px`, `gap: 10`, etc.
7. (P0 dirty) Hardcoded shadows (`WorkflowDiagramView.tsx:133,428,452,767`, `WorkflowTemplateGallery.tsx:163,228,243`).
8. (P1) Mixed token namespaces: `border-neutral-5` vs `var(--gray-5)`.
9. (P1) Header background mismatch — designer is transparent, others use `bg-panel`.
10. (P2) `text-neutral-8` for body text in `WorkflowTemplateGallery.tsx:146`.
11. (P2) Placeholder thumb `bg-neutral-12` (ink-black) — should be `bg-neutral-3`.
12. (P1) Icon size drift across 12/14/15/20/32px.
13. (P2) ASCII `×` and `⇢` next to Radix icons — inconsistent stroke.
14. (P1) Two big-modal containment metaphors (`95vw × 90vh` vs full-viewport).
15. (P2) Cards use `hover:shadow-md` Tailwind black shadow.
16. (P2) Palette dock `max-h-56` feels squeezed.
17. (P1) Three different "selected/active" treatments.
18. (P1) Focus rings absent on custom buttons in `WorkflowDiagramView.tsx:163-208`.
19. (P2) Disabled state doesn't change opacity — looks identical to enabled.
20. (P1) Three spinner colors across `WizardFooter.tsx`, `FormSection.tsx`, `CompletionScreen.tsx`.
21. (P1) Diagram empty canvas is the worst first-impression in the app.
22. (P1) Legend Panel: 11px text, hardcoded shadow, low-fidelity.
23. (P2) Edge stroke uses `--*-9` (solid brand) — should be `--*-8` (UI element).
24. (P2) Coercion vs incompatible edges visually identical.
25. (P2) 2px node border reads "tile" not "node".

### Accessibility + microcopy

- **A11Y-1 (P0)** `display:none` on `Dialog.Title` / `Description` — `WorkflowDesignerDialog.tsx:401-404`.
- **A11Y-2 (P0)** Icon-only buttons without `aria-label` — `WorkflowDesignerDialog.tsx:484`, `WorkflowDiagramView.tsx:157,176,194,434`, `WorkflowTemplateGallery.tsx:127`.
- **A11Y-3 (P0)** No `aria-current="step"` in `WizardStepIndicator.tsx:24-67`.
- **A11Y-4 (P0)** Validation errors not associated with fields; popover not announced.
- **A11Y-5 (P1)** Diagram not keyboard-operable — nodes not focusable, no SR fallback for wiring.
- **A11Y-6 (P1)** Edge encoding is color-only for color-blind users.
- **A11Y-7 (P1)** `prefers-reduced-motion` ignored.
- **A11Y-8 (P1)** No focus trap / restore in `WorkflowTemplateGallery` and `WizardShell` (hand-rolled overlays).
- **A11Y-9 (P2)** Native `confirm()` for destructive delete.
- **COPY-1 (P1)** Inconsistent save verbs ("Save" / "Run" / "Done").
- **COPY-2 (P1)** Save errors are unactionable — don't point to the offending field.
- **COPY-3 (P1)** Diagram empty-state lacks an action; palette is below the fold.
- **COPY-4 (P1)** IPC failures silently swallowed.
- **COPY-5 (P2)** Config-only tooltip is a paragraph.
- **COPY-6 (P2)** Mixed gerund + noun forms for loading messages.
- **COPY-7 (P2)** `BidsSidecarFixAdapter` empty state exposes `bids_dir`.
- **COPY-8 (P2)** Required-fields panel exposes internal names (`stepName / inputName / type`).
