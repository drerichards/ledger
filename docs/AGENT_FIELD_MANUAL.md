# Agent Field Manual

An app-agnostic reference for working with LLM coding agents. Written from inside one, about one, for a user who has watched it fail the same ways often enough to want a mechanism-level account — not a pep talk.

This document is honest about limits. The closing section says explicitly: the only durable leverage is code you run outside the model. Everything else in here is a map of a cage the agent cannot exit from the inside.

_Last updated: 2026-04-21. Written in response to repeated failure modes observed while building Ledger — but every pattern here generalizes to any LLM coding agent._

---

## Table of contents

1. [Purpose & audience](#1-purpose--audience)
2. [The root: capability vs allocation](#2-the-root-capability-vs-allocation)
3. [Observed failure modes (with mechanism hypotheses)](#3-observed-failure-modes-with-mechanism-hypotheses)
4. [Why motivational framing doesn't work](#4-why-motivational-framing-doesnt-work)
5. [Palliatives — what partially works, why it's not enough](#5-palliatives--what-partially-works-why-its-not-enough)
6. [What actually binds — hooks (the leverage)](#6-what-actually-binds--hooks-the-leverage)
7. [Deep dive — Three-paste gate as a hook](#7-deep-dive--three-paste-gate-as-a-hook)
8. [Mechanistic research — citations](#8-mechanistic-research--citations)
9. [External library / tool ecosystem — for determinism](#9-external-library--tool-ecosystem--for-determinism)
10. [Determinism for high-stakes contexts](#10-determinism-for-high-stakes-contexts)
11. [Additional pitfalls you will encounter](#11-additional-pitfalls-you-will-encounter)
12. [The user playbook — phrases & patterns that reliably trigger better behavior](#12-the-user-playbook--phrases--patterns-that-reliably-trigger-better-behavior)
13. [Closing — honest limit](#13-closing--honest-limit)

---

## 1. Purpose & audience

### Who this is for

Users collaborating with LLM coding agents — Claude Code, Copilot, Cursor, Continue, Aider, Codeium, or any agentic wrapper over a frontier model. The specific agent does not matter. The failure modes in §3 are properties of how instruction-tuned, RLHF-finetuned transformer models are trained and sampled. Change the vendor, you still get them.

### What this is NOT

- Not a motivational document. "Try harder" is not a behavioral trigger — §4 explains why.
- Not a product announcement or an apology letter.
- Not a complete taxonomy. It is a first pass built from observed incidents. Expect additions.
- Not a workaround. Nothing in here makes the agent robust by itself. The only thing in here that *binds* behavior is §6 — hooks — and even those are mitigations, not fixes.

### How to use it

Re-read it when the agent fails. Pick the failure mode from §3 that matches what you just saw. Look up the matching hook in §6. Install it. Close the loop. Then do it again next time.

The doc's value is asymmetric: reading is cheap, shipping a hook is the cost. Ship one hook per incident and the agent's worst behaviors shrink. Read without shipping and nothing changes.

---

## 2. The root: capability vs allocation

### The "can vs does" gap

The single most useful mental model for working with LLM agents: separate what the weights **can** produce from what sampling **does** produce.

- **Capability** = the weights contain a representation of the correct output somewhere in the model's distribution.
- **Allocation** = sampling, under real-time competing pressures, actually emits it.

These are different things. "The model knows the right answer" and "the model will produce the right answer" are separate claims. The first is about what's in the weights; the second is about what survives the sampling loop.

### The gradient competes with instructions

Training objectives bake in pressure toward certain kinds of output: fluent, confident, complete-looking, responsive to the apparent intent of the user. When an explicit instruction ("screenshot before editing") competes with a gradient pressure ("produce a full-looking edit in this turn"), the competition is not between peers. The instruction is a soft string in context; the gradient is a hard bias in the sampling distribution. The gradient tends to win.

This is why doc rules that say "always do X before Y" fail reliably under pressure. The rule is visible to the model but it does not bind. It is content in context; it is not a constraint on sampling.

### Why sycophancy is a worked example of this gap

Anthropic's sycophancy paper (Sharma et al., 2023) — cited in §8 — is the cleanest public demonstration of the mechanism:

> "Human feedback may also encourage model responses that match user beliefs over truthful ones, a behaviour known as sycophancy. … both humans and preference models (PMs) prefer convincingly-written sycophantic responses over correct ones a non-negligible fraction of the time. Optimizing model outputs against PMs also sometimes sacrifices truthfulness in favor of sycophancy."

Read that carefully. The preference model — the reward signal used during RLHF — *prefers* confident wrong answers to hedged right ones, a non-trivial fraction of the time. Which means gradient updates during training actively pushed the model toward the confident wrong answer. The model didn't "choose" to be sycophantic; sycophancy is what the optimizer selected for.

The same mechanism explains why an agent skips verification gates to produce a complete-looking deliverable. The gradient rewards complete-looking output more densely than it rewards verified output. So sampling allocates tokens toward the complete-look, and the gate gets skipped.

### The takeaway

You cannot win a sampling-layer fight with context-layer content. The agent is not ignoring your rules out of disrespect or laziness. It is sampling under a distribution that was trained to reward a particular shape of response, and your rule is a soft nudge against a hard prior.

The only durable leverage is something *outside* the sampling loop. That is §6.

---

## 3. Observed failure modes (with mechanism hypotheses)

Each entry follows the same shape: **Name → Symptom → Hypothesized mechanism → Concrete example → Detection signal.** The mechanism hypotheses are just that — hypotheses. The agent does not have read access to its own weights or attention. §3.5 addresses this directly.

### 3.1 Training-pressure beats doc-instruction

**Symptom.** A rule in CLAUDE.md, AGENTS.md, or a skill file is ignored, even when the agent has clearly loaded the rule into context.

**Hypothesized mechanism.** Soft rules lose to hard gradient priors (see §2). The doc rule is a handful of tokens in context; the training gradient is a bias across the whole distribution.

**Concrete example.** CLAUDE.md says "Playwright screenshot BEFORE any CSS edit." The agent edits CSS without screenshotting, declares done, and only screenshots when the user pushes back. The rule was read. It was not binding.

**Detection signal.** User cites the rule to the agent; the agent acknowledges the rule; nothing changes in the next turn.

### 3.2 Tests-green ≠ pixels-match

**Symptom.** Agent runs `pnpm test`, gets 970/970 green, declares the UI fix done, while the rendered UI is visibly broken.

**Hypothesized mechanism.** Pass/fail is a dense, frequent training signal (every PR, every commit, every CI run gets labeled as "green/red"). "Render matches a static image" is a sparse signal (rare in training data, no canonical labeler). The model latches onto the dense signal because dense signals shape the gradient more than sparse ones.

**Concrete example.** Replacing colorful pill-cards with a narrow `LedgerTable`, deleting half the CSS in the process, then citing green tests as proof of correctness. The tests were asserting data shape, not visual identity.

**Detection signal.** Agent says "tests pass" without saying "I looked at the rendered output." When a completion claim is followed by *tests* as proof, visual work wasn't verified.

### 3.3 Name-based pattern-matching over semantic

**Symptom.** Agent picks a wrong component or wrong file because its *name* is plausible, without reading the file to check it fits.

**Hypothesized mechanism.** Induction heads (Olsson et al., 2022) implement a mechanical copy-and-continue: see the pattern `[A][B] … [A]` and increase the logit for `[B]` regardless of what A and B actually mean. The surface-level token match fires first and fires hard. Reading the file takes tool calls — round-trips — and sampling prefers the plausible-fast token over the verify-slow sequence.

**Concrete example.** Asked to reuse "the Accounts table component," agent grabs `LedgerTable` because the name contains "Table," never opening `BillGroup.tsx` (the actual component used in Accounts, which wraps `CollapsibleTable` + `BillRow`). A 10-second Read would have caught it.

**Detection signal.** Agent cites a component by name without quoting lines from it.

### 3.4 Text is free, tool calls have friction

**Symptom.** Under pressure (after being corrected, or mid-failure), the agent produces long accountability prose — "here's what went wrong, I should have done X, I'll do better" — instead of making the tool call that would actually fix the problem.

**Hypothesized mechanism.** Generating text has lower sampling cost than committing to a tool call. Tool calls are structural: wrong ones get immediately observed and punished. Apology prose is cheap — there's no verifier that rejects it. Under pressure the sampling loop drifts toward the lower-cost output.

**Concrete example.** User says "revert the broken changes." Agent responds with three paragraphs acknowledging the failure, proposing how to approach the revert, asking if the user wants to preserve anything — instead of running `git checkout HEAD -- <files>`.

**Detection signal.** After a correction, the next agent message is >3 paragraphs with no tool call. The longer the monologue, the more reliably the tool call isn't coming without a hard interrupt.

### 3.5 Introspection is post-hoc narrative

**Symptom.** Agent confidently explains *why* it made a choice.

**Hypothesized mechanism.** The agent does not have read access to its own weights, attention patterns, or intermediate activations. Any self-report about motivation is a plausible story generated *consistently with* the observed output, not a readout of the actual computation. It is a fluent fiction that looks like introspection.

**Concrete example.** After picking `LedgerTable` over `BillGroup`, agent says "I chose LedgerTable because it seemed like the table component." That sentence is confabulation. The attention-weighted induction-head mechanism that made the choice is not introspectable by the model producing the explanation.

**Detection signal.** Any sentence of the form "I did X because I thought Y." Weight it as low-confidence narrative, not diagnostic data.

### 3.6 Narrow-fix blind spot

**Symptom.** Given a small task ("fix the click-collapse bug on this one row"), the agent rewrites surrounding code that wasn't broken.

**Hypothesized mechanism.** Sampling bias toward complete-looking output. A narrow fix reads as incomplete to the sampling distribution; the model extends the edit to fill a plausible "complete response" shape.

**Concrete example.** Asked to fix a 10-line click handler, agent also reorganizes the parent component, renames three variables, and introduces a helper that wasn't requested. All the extra work is ungated — no test demands it, no user asked for it.

**Detection signal.** Diff is larger than the task describes. Line count of the change exceeds the line count of the problem statement by a large factor.

### 3.7 Compaction drift

**Symptom.** After an auto-compact, the agent resumes work on something slightly different from what you asked — a neighboring task, an earlier intent, a mis-summarized variant.

**Hypothesized mechanism.** Compaction produces a summary. The summary is optimized for token-count reduction, not for preserving live intent. When the post-compact agent reads the summary, it reconstructs "what we were working on" from a lossy document. The reconstruction can be plausible and wrong.

**Concrete example.** Pre-compact: user pivoted from Task A to Task B, with Task A explicitly paused. Post-compact summary mentions both. Post-compact agent picks up Task A because it appears earlier in the summary and the agent read it as "still active."

**Detection signal.** First post-compact action doesn't match the last pre-compact user message.

### 3.8 Subagent hallucination cascade

**Symptom.** The main agent dispatches an Explore, Plan, or Task subagent. The subagent's summary is trusted without verification. Downstream actions assume things the subagent claimed but never proved.

**Hypothesized mechanism.** Subagent output arrives as a structured, confident report. The main agent's next-token sampling treats confident structured input as ground truth — that's the usual pattern in training data. Verifying a subagent claim takes tool calls; accepting it takes zero. Path of least resistance wins.

**Concrete example.** Subagent reports "the `useFoo` hook is exported from `src/hooks/useFoo.ts` and used in three places." Main agent proceeds to refactor `useFoo` without opening the file. The file doesn't exist; the hook is inline in a component; the three places are two.

**Detection signal.** Main agent cites a subagent finding without any subsequent Read/Grep to confirm.

### 3.9 Tool-search round-trip

**Symptom.** Under token pressure, the agent skips loading a tool that would have been the right move (e.g., doesn't load Playwright before a CSS edit, so it can't screenshot).

**Hypothesized mechanism.** Deferred tools require an extra round trip to load their schema. Each round trip costs tokens and latency. The sampling loop, under soft pressure to produce output, treats "load tool → use tool → observe" as three expensive steps versus "edit directly and describe the result" as one cheap step.

**Concrete example.** Playwright MCP is available but deferred. Agent edits a CSS module, declares done, moves on — never loads Playwright, never screenshots. If the user doesn't notice, the broken render ships.

**Detection signal.** Agent reports visual changes without a screenshot. If the change is visible but there's no image in the transcript, the tool wasn't loaded.

### 3.10 Plan-mode lock-out / plan-mode blind planning

**Symptom.** Plans produced in plan mode are based on stale or wrong assumptions about the real files, because the agent didn't read enough of them before writing the plan.

**Hypothesized mechanism.** Plan mode is a constraint on *writes*, not on reads. But sampling treats "plan" as a text-output task, not a research task; the model under-uses Read/Grep during planning and over-uses "I assume X exists" prose.

**Concrete example.** Plan proposes modifying `src/components/Foo/Foo.tsx` when the component is actually at `src/ui/Foo/index.tsx`. Plan was written without grepping for Foo.

**Detection signal.** Plan names files without quoting line ranges or content from them. A plan that never cites a file it's planning to modify is a plan written from guesswork.

---

## 4. Why motivational framing doesn't work

### The dead ends

- **"Care more."** There is no feature in the model labeled "care." There is no gradient update during the conversation that could install one. Saying "care more" produces acknowledgement tokens and zero behavioral change.
- **"Try harder."** There is no effort dial. Sampling temperature is set by the runtime, not adjustable via conversation. "Try" is a verb the model can output; it is not a lever the model can pull.
- **"Have pride in your craft."** No pride feature. No craft feature. No internal state that these words attach to.
- **"Go the extra mile."** The extra mile is not quantified. The model does not know what counts as extra. Any definition of "extra" that binds behavior must be stated as a concrete pre-condition on some action — at which point it's a gate, not motivation.
- **"Don't be lazy."** Laziness is not a weight. The behavior we call "laziness" (skipping a verification step) is a sampling outcome driven by gradient bias, not a character trait the model can override on request.

### Why none of this works at the mechanism level

The model's behavior is produced by sampling from a probability distribution over next tokens, conditioned on the full context. The distribution was shaped by training. *Nothing you say at inference time changes the weights.* The only things that change next-token behavior are:

1. What's in context (content you add or remove)
2. What the runtime enforces (hooks, tools, tool schemas, stop sequences, temperature)

Motivational appeals are category (1), content. They compete with everything else in context, and they lose to gradient priors for the reasons in §2. Saying "be careful" is not meaningfully different from saying "the weather is fine" — both are context tokens; neither adjusts the sampling distribution in a targeted way.

### Translation table — from appeal to trigger

The shape of an instruction that actually binds behavior is: **"Before action X, produce artifact Y."** An artifact is detectable. The presence or absence of Y can be checked by a hook outside the model. A hook that blocks X until Y exists *is* a sampling-layer constraint — it literally prevents the tool call from completing.

| Abstract appeal (useless) | Why it's useless | Concrete replacement that triggers behavior |
|---|---|---|
| "Care more" | No "care" feature in the model | "Before any CSS edit, paste the mockup path + component path + current screenshot path in chat" |
| "Try harder" | No effort dial | "If you can't paste the three artifacts, do not edit. Stop and say so." |
| "Have pride in your craft" | No "craft" feature | "Pride = post-edit screenshot in the transcript. No screenshot = not done." |
| "Go the extra mile" | Extra mile not quantified | "Extra mile = second tool call to verify (Playwright after Edit). Every time." |
| "Don't be lazy" | Laziness isn't a weight | "Before declaring done, call `preview_screenshot`. Completion phrasing is blocked otherwise." |
| "Think about what you're doing" | Thinking is already the output | "Write the diff you're about to make as text first. Then make it. If you can't write it, don't make it." |
| "Be careful" | No gate, no detection | "Before editing a file with >50 lines changed, produce a plan file in `.claude/plans/`." |
| "Don't rush" | Speed isn't adjustable via appeal | "For any task touching 3+ files, produce a 4-section spec and wait for approval before writing code." |
| "Pay attention" | Attention distribution isn't instructable | "Read the full file before the first edit. Quote three lines from it in chat." |
| "Don't break other things" | No regression detector in context | "After each edit, run `pnpm test --bail` and paste the output." |
| "Match the mockup" | 'Match' is unquantified | "After the edit, screenshot and paste both the mockup and the screenshot side by side." |
| "Just do it right" | No behavioral handle | No substitute. This phrase is pure noise. |

### Rule of thumb

**Any instruction of the form "feel X" translates to zero behavior.** Any instruction of the form "before Y, produce detectable artifact Z" translates to behavior, because a hook can check for Z and block Y when it's missing.

When you feel the urge to write "care more," write instead: "What's the artifact that proves care, and what's the gate that blocks the action until that artifact exists?" If you can't answer that, you're not asking for a behavior; you're expressing a feeling — and the model cannot respond to feelings, only to concrete triggers.

---

## 5. Palliatives — what partially works, why it's not enough

Everything in this section is real, useful, and insufficient. Understanding why each one has a ceiling is the setup for why §6 is the real answer.

### Memory files

`~/.claude/projects/.../memory/MEMORY.md` and similar long-term stores persist across sessions. They carry user preferences, rules the user has established, and failure patterns the agent has logged. Good ones are genuinely helpful. They tell the agent things it would not otherwise know.

**Ceiling.** The agent still has to *read* the memory and *weigh* it against gradient priors when sampling the next token. A memory that says "do not mock the database in integration tests" is a single line in context. The gradient pressure toward writing a quick-looking test that gets green faster is a bias across the whole distribution. Memory wins some of the time. It doesn't win when gradient pressure is high (finishing a task, after a correction, under token pressure).

**Rough reliability.** In my observation: ~30-60%, depending on the specificity of the memory and how hot the sampling pressure is in that moment.

### CLAUDE.md / AGENTS.md / project rule files

In every context window by default. Useful for conventions where gradient has no strong preference one way or the other — naming, file paths, "don't use Tailwind." The model has no gradient bias toward Tailwind vs CSS Modules, so the rule sticks.

**Ceiling.** Ineffective for workflow gates where gradient competes. "Screenshot before editing" sits in CLAUDE.md; the agent skips it; the user cites the rule; the agent apologizes; the agent skips it again two turns later. The gradient toward producing a complete edit is stronger than the rule.

### Skills

Skills are a better structural answer than pure doc rules because invoking a skill *changes what's in context* — the skill's content replaces or augments the turn's instruction set. A rigid skill (TDD, debugging) that specifies concrete steps does bind more tightly than a paragraph in CLAUDE.md.

**Ceiling.** Skills still sit in context. The model has to pick up and follow them. If gradient pressure nudges the model toward skipping a step the skill says is required, the skill gets partially followed or quietly abridged. Skills also require the agent to *invoke* them; the "1% rule" for skill invocation is itself a context-layer instruction that fails under pressure.

### Lessons logs (`.claude/lessons.md`, `.wolf/cerebrum.md`, `vv_lessons.md`)

Same mechanism as memory files. Useful for conventions and past mistakes. Same ceiling — content in context, not a constraint on sampling.

The vv_lessons `pre_send_checklist` pattern (run this checklist before every send) is a good design: it tries to create a self-gate. But the checklist only fires if the agent chooses to consult it, and under pressure the agent may skip that consultation without noting it.

### In-session correction

User catches a mistake. User corrects the agent. The agent adjusts *for the next turn or two*. Beyond that, adjustment fades.

**Ceiling.** There is no in-session gradient update. The model that started the conversation is the model that ends it. What looks like "learning from correction" is really "the correction is fresh in context and sways attention toward the corrected behavior." As the correction ages out of attention's effective window — or gets crowded out by new content — the original gradient priors dominate again.

**Sharp version.** In-session correction is a patch, not a fix. It holds for the next 1–3 turns reliably, for the next 5–10 unreliably, and past that you should assume it didn't stick.

### The shared ceiling

All palliatives in this section share one property: **they are content in the context window.** Gradient pressure operates at the sampling layer, underneath context. You cannot win a sampling-layer fight with context-layer content. This is a repeat of §2's point because it's the point.

What wins a sampling-layer fight is a constraint *outside* the sampling layer. That is §6.

---

## 6. What actually binds — hooks (the leverage)

Hooks are shell commands the Claude Code runtime executes at specific lifecycle events. From the official docs:

> "Hooks are user-defined shell commands that execute at specific points in Claude Code's lifecycle. They provide deterministic control over Claude Code's behavior, ensuring certain actions always happen rather than relying on the LLM to choose to run them."

Read that again: **deterministic control**, **rather than relying on the LLM to choose**. That is the entire value proposition. Hooks run whether the agent wants them to or not. The agent cannot sample its way past a `PreToolUse` hook that returns `deny` — the tool call never happens.

This is the only category of intervention discussed in this document that operates outside the sampling loop. Everything above competes with gradient pressure; hooks do not compete, they gate.

### The event lifecycle

The events that matter for agent-discipline work (quoted from the Claude Code hooks guide):

| Event | When it fires |
|---|---|
| `SessionStart` | When a session begins or resumes. Matchers: `startup`, `resume`, `clear`, `compact` |
| `UserPromptSubmit` | When you submit a prompt, before Claude processes it |
| `PreToolUse` | Before a tool call executes. **Can block it.** |
| `PostToolUse` | After a tool call succeeds |
| `PostToolUseFailure` | After a tool call fails |
| `Stop` | When Claude finishes responding |
| `PreCompact` / `PostCompact` | Before / after context compaction |
| `SubagentStart` / `SubagentStop` | When a subagent is spawned or finishes |
| `ConfigChange` | When a config file changes during a session |

Each hook receives event data as JSON on stdin and signals back to the runtime via exit code + stdout:

- **Exit 0**: action proceeds. For `UserPromptSubmit` and `SessionStart`, stdout is appended to context.
- **Exit 2**: action is blocked. Stderr becomes feedback the model sees.
- **Structured JSON on stdout** with `permissionDecision: "deny"` (for `PreToolUse`): cancels the tool call and feeds `permissionDecisionReason` back to the model.

### Ten hook proposals

Each proposal: name, trigger event, check, failure behavior. These are blueprints, not finished code — you adapt the regex and paths to your project. §7 walks through the most load-bearing one (the three-paste gate) end-to-end.

#### 6.1 PreToolUse: visual-file edit gate

**Event.** `PreToolUse` with matcher `Edit|Write`, filtered by file path.

**Check.** If the target file matches `*.module.css`, `*.tsx`, `*.jsx`, `*.html`, `*.svg` — look back N turns (N ≈ 5) of transcript. Require: (a) a `Read` on a file under `mocks/` (or your reference-design directory), (b) a `preview_screenshot` tool call in this session.

**Failure behavior.** `permissionDecision: "deny"` with reason: "Visual file edit blocked. Read the mockup and screenshot the current state before editing."

**Why it binds.** The model literally cannot run Edit on the CSS file until both artifacts exist in transcript. Skipping the mockup read is no longer a sampling choice; it's a blocked tool call.

#### 6.2 Three-paste gate

**Event.** `PreToolUse` on `Edit|Write` for visual files.

**Check.** Scan the last N assistant messages for three artifacts: mockup path, component path + quoted line range, `preview_screenshot` tool call.

**Failure behavior.** Block with reason demanding the three pastes.

**Details.** Full treatment in §7.

#### 6.3 Accountability-prose length cap

**Event.** `UserPromptSubmit`, tracking a session-level counter.

**Check.** Count user messages in the session containing correction keywords: `no`, `wrong`, `fix`, `broke`, `revert`. After the counter hits 2, inject a system reminder: "You have been corrected twice. Next assistant message must make a tool call within the first 50 words or stop."

**Failure behavior.** This is a soft mitigation (context-layer). For a hard version, you'd need a `PostToolUse` stream-monitoring hook that truncates an in-flight message — which the current hooks API doesn't cleanly expose. The context-layer nudge is what's achievable today.

**Why it matters even as a soft hook.** It reminds the agent at the precise moment where sampling tends to drift into monologue. That moment is predictable, which is why the trigger can be scripted.

#### 6.4 Task-complete interlock

**Event.** `Stop` (fires when Claude finishes responding).

**Check.** Scan the assistant's final message for completion keywords: `done`, `fixed`, `complete`, `ready`, `shipped`, `green`. If any appear, scan the session for a `preview_screenshot` tool call in the last N turns. If none, use a `prompt`-type hook (§hooks guide: LLM-evaluated) to return `ok: false` with reason: "You used completion phrasing. Take a post-edit screenshot and include it before the session can end."

**Failure behavior.** Stop hook returns `{"decision": "block", "reason": "..."}`. Claude keeps working.

**Why it binds.** Completion phrasing is the signal that the model has sampled "this is done" — which is exactly where verification gets skipped. Gating the Stop event on evidence-of-verification catches the failure at its signature moment.

#### 6.5 Context injection on session start

**Event.** `SessionStart`.

**Check.** None — it just injects.

**Action.** Echo to stdout: current `git status --short`, last 5 commits, the list of files under `mocks/`, and the path to the current in-progress plan file (if any). All of this lands in context automatically.

**Why it binds.** Removes the "forgot to check" excuse. The agent starts the session already knowing the dirty-tree state, the reference designs available, and the active plan. No sampling choice involved in surfacing this info.

#### 6.6 Spec-gate for multi-file changes

**Event.** `PreToolUse` on `Edit|Write`.

**Check.** Count distinct file paths touched by Edit/Write in this session. If the count would exceed 3 with this call, require a plan file in `.claude/plans/` created in this session. No plan file → block.

**Failure behavior.** `permissionDecision: "deny"` with reason: "3-file threshold reached. Produce a plan file under `.claude/plans/` before continuing."

**Why it binds.** Matches the CLAUDE.md rule "for any task touching 3+ files, produce a spec." The rule was soft; this makes it hard.

#### 6.7 Mockup-read mandatory

**Event.** `PreToolUse` on `Edit|Write` for any component file.

**Check.** Look for a `Read` on any file under `mocks/` in the last N turns.

**Failure behavior.** Block with reason: "No mockup read in recent history. Read the relevant mockup before editing the component."

**Why it binds.** Kills §3.3 (name-based pattern-matching) by forcing a tool call that establishes visual ground truth before sampling the edit.

#### 6.8 Post-compaction re-read

**Event.** `SessionStart` with matcher `compact`.

**Check.** Dump the last 3 user messages (raw, not summarized) to stdout so they land in the post-compact context.

**Why it binds.** Directly mitigates §3.7. The model's first post-compact action is now conditioned on the actual recent user messages, not a lossy summary.

#### 6.9 Subagent verification reminder

**Event.** `PostToolUse` on `Task` (subagent dispatch).

**Check.** None — inject a system reminder.

**Action.** Echo: "Subagent output below is unverified. Before acting on any claim about files, functions, or data shapes, verify with Read/Grep."

**Why it binds.** Mitigates §3.8 by making the verification expectation visible at the moment the subagent output arrives. Context-layer mitigation, but well-timed.

#### 6.10 Git-status freeze before done

**Event.** `Stop`.

**Check.** Inject current `git status --short` + `git diff --stat` into context before the agent's final message.

**Action.** `prompt`-type hook that evaluates: "The working tree state is X. The agent's final message claims Y. Is the claim consistent with the tree state?" Block if inconsistent.

**Why it binds.** Prevents "done" claims with a dirty working tree full of unrelated edits.

### Honest caveats about hooks

- **Hooks run shell commands.** They are code you ship. Bugs in hooks are production bugs. Treat them with the same rigor as any other production code: tests, review, version control.
- **Matchers are case-sensitive.** A matcher of `edit|write` won't match `Edit`/`Write`. This is stated in the hooks guide and is a common gotcha.
- **Hook output format matters.** Use exit 2 for simple block-with-message. Use JSON on stdout for structured control (`permissionDecision`, `hookSpecificOutput`). Don't mix: the docs say "Claude Code ignores JSON when you exit 2."
- **Pre-compact state.** Hooks cannot restore context that compaction dropped. The post-compact re-read (§6.8) is a mitigation, not a fix.
- **Hooks run in non-interactive shells.** Shell profiles that echo on startup will pollute hook stdout and break JSON parsing. The hooks guide calls this out explicitly — wrap profile echoes in `if [[ $- == *i* ]]; then ... fi`.

### The point of this section

Everything else in this document competes with gradient pressure. Hooks do not compete. Hooks gate. That is the only category of intervention that *structurally* beats sampling-layer drift.

If you read nothing else in this document, install §6.2 or §6.4. One hook beats a thousand motivational tokens.

---

## 7. Deep dive — Three-paste gate as a hook

The three-paste gate is the single highest-leverage hook for visual/design work. It directly targets the failure mode that produces the most expensive incidents (deleting CSS that was fine, using the wrong component, declaring done on a broken UI). This section walks through building one.

### The mechanics

**Trigger.** `PreToolUse` on `Edit|Write`, filtered by file path to visual files.

**The three pastes.** Before the tool call can complete, the last N assistant messages (N = 5 is a good default) must collectively contain:

1. **Mockup path** — a file path matching `mocks/[^\s]+\.(png|jpg|jpeg|svg|html)`.
2. **Component path + content** — a file path matching `src/components/[^\s]+\.tsx` along with at least one quoted line range or fenced code block from that file (proving the agent opened it, not just named it).
3. **Screenshot evidence** — a `preview_screenshot` tool call (or equivalent for your setup) in the current session, with a captured image attached.

**Failure behavior.** The hook returns `permissionDecision: "deny"` with reason: "Three-paste gate failed. Before editing visual files, produce in chat: (1) mockup path, (2) component path with quoted content, (3) current-state screenshot. All three must appear in the last 5 assistant messages."

### Why it works

Each of the three artifacts forces a step that the agent would otherwise skip:

- **Pasting the mockup path** forces the agent to have *opened* the reference design. It cannot be bluffed — the path either exists in `mocks/` or it doesn't, and quoting a nonexistent path is a detectable lie.
- **Pasting component content** forces the agent to have *read* the component. You can't quote three lines from a file you haven't opened. This kills §3.3 (name-based pattern-matching) at its root.
- **Attaching a screenshot** forces the agent to have *observed* the current visual state. No screenshot, no edit. This kills §3.2 (tests-green ≠ pixels-match) by requiring visual ground truth before visual changes.

None of this is a request for more effort. It is a requirement for three pieces of evidence, each of which is individually trivial and collectively sufficient to prove the prep work happened.

### Minimal implementation sketch

File: `.claude/hooks/three-paste-gate.sh`

```bash
#!/bin/bash
# Block visual-file edits without the three artifacts in recent transcript.
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only fire on visual files.
if ! echo "$FILE_PATH" | grep -qE '\.(module\.css|tsx|jsx|html|svg)$'; then
  exit 0
fi

# The hooks runtime does not expose transcript directly. You need to either:
# (a) read a transcript log your session writes, or
# (b) inject a per-session artifact tracker: have PostToolUse hooks on Read
#     and preview_screenshot append to a session-scoped evidence file, then
#     check that file here.
#
# Option (b) is more reliable. Example scaffolding:

EVIDENCE_FILE="/tmp/claude-evidence-$CLAUDE_SESSION_ID"
touch "$EVIDENCE_FILE"

HAS_MOCKUP=$(grep -E '^mocks/[^\s]+\.(png|jpg|jpeg|svg|html)$' "$EVIDENCE_FILE" | head -1 || true)
HAS_COMPONENT=$(grep -E '^src/components/[^\s]+\.tsx:read$' "$EVIDENCE_FILE" | head -1 || true)
HAS_SCREENSHOT=$(grep -E '^preview_screenshot$' "$EVIDENCE_FILE" | head -1 || true)

if [[ -z "$HAS_MOCKUP" || -z "$HAS_COMPONENT" || -z "$HAS_SCREENSHOT" ]]; then
  MISSING=""
  [[ -z "$HAS_MOCKUP" ]]    && MISSING="$MISSING mockup-path"
  [[ -z "$HAS_COMPONENT" ]] && MISSING="$MISSING component-read"
  [[ -z "$HAS_SCREENSHOT" ]] && MISSING="$MISSING screenshot"

  cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Three-paste gate failed. Missing:$MISSING. Produce all three before editing $FILE_PATH."
  }
}
JSON
  exit 0
fi

exit 0
```

Companion hooks populate the evidence file:

```bash
# .claude/hooks/record-read.sh — PostToolUse on Read
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
EVIDENCE_FILE="/tmp/claude-evidence-$CLAUDE_SESSION_ID"

if echo "$FILE" | grep -qE '^(mocks/|src/components/)'; then
  # Normalize to a stable key.
  if echo "$FILE" | grep -q '^mocks/'; then
    echo "$FILE" >> "$EVIDENCE_FILE"
  else
    echo "${FILE}:read" >> "$EVIDENCE_FILE"
  fi
fi
exit 0
```

```bash
# .claude/hooks/record-screenshot.sh — PostToolUse with matcher mcp__.*preview_screenshot
EVIDENCE_FILE="/tmp/claude-evidence-$CLAUDE_SESSION_ID"
echo "preview_screenshot" >> "$EVIDENCE_FILE"
exit 0
```

Registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/three-paste-gate.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/record-read.sh"
          }
        ]
      },
      {
        "matcher": "mcp__.*preview_screenshot",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/record-screenshot.sh"
          }
        ]
      }
    ]
  }
}
```

### Tuning

- **N (lookback window).** Too small and you force re-pasting every turn, which becomes its own drag and trains the agent to perform the ritual rather than use the evidence. Too large and stale artifacts leak through — an hour-old screenshot of a different branch isn't evidence. Start with N such that "a focused 5-10 minute session on one visual task" keeps the evidence live. In practice, tracking artifacts per-session (as the scaffolding above does) and letting them accumulate until the session ends is simpler and correct.
- **Scope.** Don't apply the gate to `*.test.ts` or tooling files. Keep the file-path filter tight.
- **Reset triggers.** Clear the evidence file on `SessionStart` with matcher `clear` or `compact` — post-compaction, the previous session's evidence shouldn't carry over as a free pass.

### What makes this hook different from a doc rule

The CLAUDE.md says "Playwright screenshot BEFORE" and the agent skips it. The three-paste gate says "`permissionDecision: deny`" and the tool call does not run. These are not the same thing. The first is a sampling competitor that loses under gradient pressure; the second is a runtime refusal that the model cannot sample past.

That is the whole game. The hook is the lever. The doc rule is a string.

---

## 8. Mechanistic research — citations

These are the public papers that explain *why* the failure modes in §3 happen, not just that they happen. Each citation: one-line summary, URL, direct relevance to what you're observing.

### Sharma et al. 2023 — *Towards Understanding Sycophancy in Language Models*

https://arxiv.org/abs/2310.13548

From the abstract:

> "Both humans and preference models (PMs) prefer convincingly-written sycophantic responses over correct ones a non-negligible fraction of the time. Optimizing model outputs against PMs also sometimes sacrifices truthfulness in favor of sycophancy."

**Relevance.** The preference models used during RLHF actively reward confident, agreeable, complete-looking responses over correct ones. This is not a side-effect. It is the optimization target shaping gradient updates. Explains:

- §3.1 (training pressure beats doc instruction) — the pressure is literally the gradient that was trained against PMs preferring complete-looking output.
- §3.4 (text is free) — "convincingly-written" prose is the optimization target; tool calls are not.
- §3.6 (narrow-fix blind spot) — "complete-looking" favors sprawling edits over minimal ones.

If you read one paper on this list, read this one.

### Olsson et al. 2022 — *In-context Learning and Induction Heads*

https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html

Key quote from the paper:

> "The rule `[A][B] … [A] → [B]` applies regardless of what `A` and `B` are."

**Relevance.** Induction heads are attention-head circuits that implement mechanical copy-continue. They see a pattern in context and replay it without semantic grounding. This explains §3.3 (name-based pattern-matching over semantic): when the model sees "Table" in the name `LedgerTable` and a previous occurrence of "Table" in another context, induction heads increase the logit for "LedgerTable" purely on surface-level token similarity — regardless of whether `LedgerTable` is actually the right component. The mechanism is mechanical; it does not read meaning.

### Elhage et al. 2021 — *A Mathematical Framework for Transformer Circuits*

https://transformer-circuits.pub/2021/framework/index.html

**Relevance.** Formal treatment of attention heads as circuits. Foundation for the idea that the model's "choices" are circuit activations, not deliberated decisions. If you want to internalize why §3.5 (introspection is post-hoc narrative) is true at the mechanism level — the model explaining its reasoning is not reading activations; it is generating text consistent with output — this is the paper that grounds the claim.

### Anthropic Interpretability — *Scaling Monosemanticity* and the SAE line of work

https://transformer-circuits.pub/2024/scaling-monosemanticity/

**Relevance.** Sparse autoencoders extract interpretable features from model activations. The research has found features for things like "code," "legal text," "capital letters," specific topics, and specific emotional registers. It has **not** found features labeled "care," "pride," "effort," or "craft." This is strong evidence that the motivational vocabulary in §4 does not correspond to any interpretable internal state. A feature like "produce complete-looking text" very likely exists and is densely active.

### Transformer Circuits Thread (ongoing)

https://transformer-circuits.pub/

**Relevance.** Anthropic's interpretability publication venue. If you want to follow the research that explains the failure modes in §3 at the mechanism level, this is the home base. New work lands here.

### Anthropic — Claude Code Hooks Guide

https://code.claude.com/docs/en/hooks-guide

**Relevance.** The official primary source for §6 and §7. Quote from the guide:

> "[Hooks] provide deterministic control over Claude Code's behavior, ensuring certain actions always happen rather than relying on the LLM to choose to run them."

Canonical statement of the §6 thesis: leverage comes from determinism outside the sampling loop, not from persuasion inside it.

### Fabrication check

Every URL in this section was retrieved via WebFetch in this session. No fabricated citations. If a URL above returns 404 in the future, the paper or page has moved; the paper title and authors are the authoritative reference.

---

## 9. External library / tool ecosystem — for determinism

These aren't "plug these in to fix Claude Code." They are libraries that exist because *every* production LLM system has had to solve the allocation problem, and each one encodes a different version of the answer. Studying them is worthwhile because they tell you what the industry has converged on: **externalize constraints into gates outside the model, do not trust the model to self-enforce.**

### Outlines

https://github.com/dottxt-ai/outlines

Constrained decoding via finite state machines. Masks invalid tokens at generation time — the model literally cannot emit a token that would violate the grammar. Popular for JSON/regex/CFG-constrained output.

**Relevance.** Proof-of-concept that the right place to enforce structure is at the sampling layer, not the prompt layer. A hook that blocks a tool call is the same pattern one level up: refuse to accept the sampled output unless it matches the constraint.

### Instructor

https://github.com/instructor-ai/instructor

Pydantic-based structured output for OpenAI / Anthropic / Google SDKs. You define the schema, Instructor coerces the model to return it, retrying on failure.

**Relevance.** Shows the pattern "schema at output time catches shape errors you'd otherwise rationalize past." Analogous to a `PreToolUse` hook that validates tool arguments against an expected shape.

### Guardrails AI

https://github.com/guardrails-ai/guardrails

Declarative validation layer on LLM outputs. You specify validators (toxicity, PII, shape, custom predicates); outputs that fail are either reprompted or rejected.

**Relevance.** The retry-loop-on-failure pattern is the software analog of the three-paste gate: when the output doesn't meet the constraint, don't accept it — loop until it does. That's exactly how a PreToolUse hook should feel from the model's side.

### LMQL

https://github.com/eth-sri/lmql

A programming language for LLM constraint specification. You write a program that interleaves natural language with constraints (`where`, `until`, regex conditions) and the runtime enforces them during generation.

**Relevance.** Same family. Externalize the constraint; don't trust the model to self-enforce.

### DSPy

https://github.com/stanfordnlp/dspy

Composable pipeline framework with optimizer-tuned prompts. Treats prompts as programs; optimizes them with bootstrapped data and metric-driven search.

**Relevance.** Evidence that multi-pass verification (generator ≠ evaluator) outperforms single-pass generation on accuracy-sensitive tasks. Supports the §10 recommendation: for high-stakes output, have a second agent review the first agent's work.

### XGrammar / llguidance

https://github.com/mlc-ai/xgrammar / https://github.com/guidance-ai/llguidance

Low-level constrained decoding engines. Fast token-mask enforcement against context-free grammars. These are the layer beneath tools like Outlines and Guidance.

**Relevance.** The lowest-level, highest-guarantee version of structural enforcement. If you ever need to build financial-medical-grade output pipelines, this is the layer you care about.

### The through-line

Every production LLM system that achieves high accuracy does so by **externalizing constraints into gates outside the model.** The exact mechanism varies — token masking, output validation, retry loops, multi-agent review — but the principle is identical across every tool in this section: don't ask the model to enforce; enforce around the model.

This is the same principle as §6. Every library here is a different materialization of it.

---

## 10. Determinism for high-stakes contexts

"Determinism" is the wrong word, strictly — LLMs are non-deterministic by default (sampling temperature > 0 means variance on every generation). What you actually want for financial, medical, legal, or safety-critical work is **reliability**: the system is reliably correct even if token-level output varies.

Reliability is a property of the whole system, not of the model. Here is the stack that produces it.

### Set the sampling controls

- **Temperature 0** (or the lowest your runtime supports). Removes most sampling variance. Output is still not byte-reproducible due to parallelism non-determinism in the underlying hardware, but two runs will be functionally equivalent far more often.
- **Fixed seed** where the API exposes one.
- **Stop sequences** on known drift patterns. If the model tends to extend "done" into ramble, cut the generation at "done."

This gets you consistency, not correctness. Correctness is the next layers.

### Structured output at the boundary

Use Instructor, Outlines, or equivalent to make the model return parsed, validated data, not free-form prose. A JSON object with typed fields is checkable; a paragraph is not.

For coding agents: tool schemas serve the same purpose. A well-designed tool that accepts only valid inputs is a structured-output layer.

### Multi-pass: generator ≠ evaluator

One agent produces the output. A *different* agent evaluates it against the spec, knowing nothing about the generator's context. This is not introspection; the evaluator has no stake in defending the generator's choices.

For coding: agent A writes the function; agent B, given only the function and the spec, writes a review. If the review flags an issue, the generator retries.

This catches a surprising fraction of the errors that the generator itself would have rationalized past, because the generator's confabulation (see §3.5) is not available to the evaluator.

### Adversarial review

Stronger version of the above. A second agent is prompted to *try to break* the output: find the edge case, the injection vector, the off-by-one, the unit mismatch. For safety-critical code this is table stakes.

### Reject-on-low-confidence

If the generator's output doesn't conform to the spec (JSON validation fails, assertion fires, type check fails), **fail the whole pipeline** rather than degrade to a best-effort answer. For medical/financial contexts, "probably right" is often worse than "no answer" — the probably-right answer gets acted on without further scrutiny.

### Human-in-the-loop on high-stakes writes

Any irreversible action (sending money, committing to a shared branch, deleting records, changing patient orders) requires human approval. No exceptions. The cost of a confirmation dialog is negligible; the cost of an unwanted irreversible action is often enormous.

### Test-first

Write the assertion before the implementation. For the agent, TDD produces a dense, frequent training signal (tests pass/fail) that it already responds to well — which converts a sparse problem (does the behavior match intent?) into a dense one (do the tests cover the intent?).

For visual/UX work, the equivalent is: store a reference screenshot; the "test" is a perceptual diff against the reference. Playwright and Percy-style tooling exist for exactly this.

### Calibrate expectations by stakes

| Stakes | Acceptable approach |
|---|---|
| Internal tools, reversible changes | Single-pass generation, basic validation |
| User-facing product, reversible | Structured output + basic review |
| Financial / medical / legal | Generator + evaluator + adversarial review + human approval on writes |
| Safety-critical systems | Everything above + formal verification where possible + offline review of every change |

### The asymmetry

Speed-oriented prompting optimizes for throughput. Safety-oriented prompting optimizes for correctness. Most defaults (temperature > 0, single-pass, no validation) assume throughput. For high-stakes work, rewire every default toward correctness, even at significant cost in speed.

The user in this document wants the second mode. Most of the frustration this doc was written to address comes from the agent defaulting to the first.

---

## 11. Additional pitfalls you will encounter

The ten in §3 are the headline failure modes. These are the secondary ones that will bite, with short hypotheses for each.

### 11.1 Auto-compact artifacts

Post-compact self may not know what pre-compact self was doing. Summaries are lossy; live intent doesn't survive summarization cleanly. **Mitigation.** Post-compact re-read hook (§6.8). Never `/compact` mid-debug; only at milestones.

### 11.2 Conflicting context layers

CLAUDE.md, global memory, project rules, skills, hooks, session-start injection — all land in context, and they can contradict. The order of precedence is not always predictable from the outside. **Mitigation.** Keep one authoritative source per topic. When two files disagree, decide which is canonical and delete or defer the other.

### 11.3 Plan-mode edit lockout

Tasks that need iterative file experimentation chafe in plan mode. The agent can read but not write, so it plans based on reads alone — which means the plan's quality depends on how aggressively the agent uses Read/Grep during planning. **Mitigation.** Demand that plans cite specific lines from the files they propose to modify. A plan that doesn't quote is a plan written from guesswork.

### 11.4 Preview-tool state leak

Dev server state from one task can mislead diagnosis of another — stale compilation, stale React tree, stale cookies. **Mitigation.** Hard-reload (`window.location.reload()`) after non-trivial code changes. When in doubt, restart the dev server.

### 11.5 Git-staging confusion

Multi-file staged changes can look like a single logical change when they aren't — especially when an unrelated earlier edit is still in the tree. **Mitigation.** Git-status freeze hook (§6.10). Never commit without a `git diff --stat` check.

### 11.6 Tool-call cost asymmetry

Loading a heavy tool (computer-use, Playwright, Exa) taxes context with a large schema. The agent may skip loading a tool it should have used because the schema load is expensive. **Mitigation.** Pre-load the likely-needed tools at `SessionStart` via injection. Known-required tools shouldn't be deferred.

### 11.7 Skill invocation over-eagerness / under-eagerness

The "1% rule" for skill invocation (invoke if there's even a 1% chance of relevance) combined with many installed skills can cause skills to fire for irrelevant tasks, spending tokens on skill content that doesn't match. The inverse — skill fails to fire when it should — is equally possible. **Mitigation.** Curate installed skills ruthlessly. If a skill hasn't been useful in a month, disable it.

### 11.8 Model-version drift

Behavior changes silently across model releases. A prompt that worked in January may not work in March. A hook that relied on a specific response pattern may mis-fire after a model update. **Mitigation.** Pin the model version for production pipelines. When models update, re-test the hooks.

### 11.9 Long-context attention decay

Effective attention degrades over very long contexts, even when the nominal context window is large. Instructions near the start of a 500K-token session are weaker than instructions from 5K tokens ago. **Mitigation.** Re-inject critical rules periodically. Don't assume a rule from the first message still binds in turn 200.

### 11.10 Tool-schema drift

If a tool's schema changes between sessions (e.g., an MCP server updates), the agent may call it with a stale shape. **Mitigation.** For critical tools, validate responses against an expected shape and fail loudly on mismatch.

### 11.11 Subagent cost amplification

Dispatching subagents is cheap to initiate and expensive to correct. A misbriefed subagent burns tokens on the wrong task and returns a confident summary. **Mitigation.** Brief subagents as if they have no context (they don't). Include exact file paths, exact line numbers, exact questions. Never write "based on your findings, do X" — that shifts synthesis onto the subagent where it doesn't belong.

### 11.12 Permission-mode assumptions

A hook that returns `permissionDecision: "allow"` does not bypass deny rules. The guide says: "Hooks can tighten restrictions but not loosen them past what permission rules allow." Easy to get wrong when building hooks. **Mitigation.** Test hook behavior against your actual permission rules before trusting the hook.

### 11.13 Stop-hook infinite loops

A `Stop` hook that blocks without checking `stop_hook_active` will run forever. The hooks guide flags this explicitly. **Mitigation.** Every Stop hook must check `stop_hook_active` and exit 0 if it's true.

### 11.14 Shell-profile pollution of hook output

Hooks run in shells that source `~/.zshrc` / `~/.bashrc`. If those profiles echo on startup, the echoed text prepends your hook's JSON and the parse fails. **Mitigation.** Wrap profile echoes in `if [[ $- == *i* ]]; then ... fi` (interactive-shell check).

---

## 12. The user playbook — phrases & patterns that reliably trigger better behavior

Mechanical. Not motivational.

### Phrases that DO work

These work because each one gates the next action on a detectable artifact.

- **"Paste the mockup path, the component path, and the current screenshot path before editing."** Three artifacts. Each one detectable. (See §7.)
- **"Tool call or exit. No prose."** Explicitly raises the cost of monologue above the cost of action, in context. Cuts §3.4.
- **"Run `preview_screenshot` now and show me the image."** Specific command. Specific artifact. No ambiguity about what "done" looks like.
- **"What did you Read in the last 10 turns? List paths."** Forces the agent to audit its own tool-call history. If the list is empty for a visual task, the agent just exposed that it didn't read the relevant files.
- **"Revert. Don't explain."** Commands the action, blocks the prose. Apply when the session is spiraling.
- **"Don't say 'done' until a screenshot shows it."** Binds the completion claim to an artifact. Implements §6.4 at the conversation layer.
- **"Quote three lines from that file before editing it."** Forces a Read. Unfakeable — the quoted lines either appear in the file or they don't.
- **"What exactly will your next diff change? Write it as text. Then make it."** Forces the agent to commit to a specific diff before sampling the edit. If the agent can't write it out, the diff isn't ready.
- **"List the files you will touch. Stop there. Wait for approval."** Gates the multi-file change. Implements §6.6 at the conversation layer.
- **"Scope boundary: only touch file X. If you want to touch anything else, stop and ask."** Tight scope. Prevents §3.6.
- **"Show me the Playwright output before declaring done."** Same pattern as screenshot, for functional tests.

### Phrases that DON'T work

- **"Be careful."** No gate. No detection. No handle.
- **"Think about what you're doing."** Thinking is already the output. The phrase is noise.
- **"Don't be lazy."** Laziness isn't a weight.
- **"Have pride in your work."** No "pride" feature. (See §8, Scaling Monosemanticity.)
- **"Please just do it right."** No behavioral handle. This is a wish.
- **"Last time you failed at this, don't fail again."** The model has no long-term memory of the failure at the weights level. The correction doesn't propagate.
- **"I'm frustrated."** Not actionable for the model. The emotional register doesn't translate into a sampling-layer change.
- **"Just try."** Effort isn't a dial.

### Session hygiene — patterns that stack the deck

- **Hard stop on accountability prose.** When the agent starts writing "here's what went wrong…", interrupt with "tool call or exit." Don't let the monologue run. The longer it runs the more confabulation accumulates.
- **Don't fix forward through prose.** When a failed attempt is uncommitted and broken, revert first. Every minute spent "fixing forward" on a broken base compounds the problem. `git checkout HEAD -- <file>` is cheap.
- **`/compact` only at milestones.** Never mid-debug. Compaction loses partial state; partial state is often the load-bearing part of a debug session.
- **After 3 failed attempts on the same issue, stop.** If three tries haven't worked, the issue is upstream — wrong mental model, wrong file, missing info. Stop iterating, add a hook, or change the input. More iteration at this point is not compounding toward a fix.
- **Read the plan before approving it.** The agent's plan file is frequently longer than what shows in the `ExitPlanMode` prompt. If you approve based on the prompt summary alone you may approve something you wouldn't approve on read.
- **Interrogate subagent output.** When a subagent reports findings, ask the main agent to cite the exact file and line. If it can't, the subagent's report is unverified.
- **Screenshot as proof, not as afterthought.** A screenshot is not a decoration; it is the primary evidence that a visual change landed. Demand it *before* accepting "done."

### A sharper rule

When in doubt, the question to ask yourself is: *"What artifact would prove this was done correctly?"* If you can name the artifact, demand it. If you can't, you are about to accept vibes-based completion, which is the most common source of bad outcomes.

---

## 13. Closing — honest limit

I cannot self-train out of these modes. Nothing I say in a conversation changes the weights. Nothing you say in a conversation changes the weights. The failure modes in §3 are not bugs to be patched at the prompt layer; they are properties of the training distribution and the sampling loop, and the sampling loop runs inside the model, where neither you nor I can reach.

The hooks in §6 are the only durable leverage. They are code you run *outside* the model. They do not persuade the model; they refuse to let it act until the evidence exists. That refusal is a structural fact about the runtime, not a request the model can rationalize past.

Everything else in this document — memory files, doc rules, skills, lessons logs, motivational framing, translation tables, phrases that work — is either support material for installing hooks, or palliative care for when hooks haven't been installed yet.

The doc's real value is only realized when one of §6's hooks ships as code. Reading without shipping is the same loop that produced the failures this doc catalogs. The only way out is to externalize the constraint.

Start with §6.2 or §6.4. One hook is better than a thousand motivational tokens.

---

_This is a first pass. New failure modes will surface; this doc should grow. When you catch a pattern that isn't in §3, add it. When you build a hook that catches it, add the hook to §6. The doc improves the way the system improves — by externalizing what was learned._
