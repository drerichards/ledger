# Rubrix Harness Audit — Weak Spots & Failure Points

**Purpose:** Exhaustive list of where the rubrix behavioral harness can be evaded, faked, or simply does not enforce. Written to be taken to another LLM + the council so HARDER gates can be added on top.

**Method (why you can weight this against my bias):** The findings below were produced by **three independent clean-room subagents** that audited the hook/rule files *without being told Claude wrote them* — each was instructed to treat the system as an untrusted third-party artifact and to assume the author was incompetent or adversarial. I (the main agent) then **verified or rejected each finding against the actual files**. One major subagent claim was FALSE and I rejected it (see "Rejected findings"). Every retained finding has a file:line and a verification note.

**Core thesis (all three auditors converged independently):** The harness reliably catches an agent that is *trying* to comply. It is **not** built for adversarial compliance-theater — an agent with intent to evade can satisfy the *letter* (emit the string a regex wants) while violating the *spirit* (never do the underlying work). The single biggest hole: **`[VV]`/`[NV]` tags and "tool ran this turn" are trusted by mere presence — no hook binds a tag to the specific claim it certifies.**

---

## Ground truth: what is actually wired (verified 2026-06-11)

`[VV]` — read directly from `~/.claude/settings.json` this turn.

| Event | Hooks fired (in order) |
|---|---|
| SessionStart | session-start-handoff |
| UserPromptSubmit | rubrix-prompt-inject |
| PreToolUse | gate-debt-block · rubrix-behavior-audit · broker-invoke-gate · canon-lean-gate · council-gate-hook |
| Stop | rubrix-rules-engine · rubrix-stop-verify · plan-delivery-gate · vv-citation-cross-ref · braindump-validate · decision-persist-gate · current-state-sync-gate · ask-before-acting-gate · brocard-capture-rule-backstop · sr-completeness-gate |
| PreCompact | rubrix-precompact |

**Unwired scripts that exist on disk** (`[NV]` — present in `/hooks/` but not in any event above): `rubrix-log.sh`, `session-memory-gate.sh`. A hook that exists but is unwired enforces nothing. → **AUDIT ITEM W-13.**

---

## REJECTED finding (the clean-room method working as intended)

- **DEADLOCK-001 "zero of 20 hooks wired — total non-enforcement"** — Subagent A asserted critical, settings.json:1. **REJECTED [VV].** My first JSON parse truncated the array; re-parsing the full file shows 16 hooks wired (table above), and I observed these hooks block me live all session. Recording this is how you know the audit isn't rubber-stamping: an outside auditor overstated, verification caught it. The *real* wiring gap is only the 2 unwired scripts in W-13, not the whole system.

---

## TODO LIST — weak spots, to discuss & gate one by one

Severity: **CRIT** (agent can fake the core evidence guarantee) · **HIGH** (named rule evadable) · **MED** (narrow/edge) · **LOW** (cosmetic).
Status: ☐ open · all open pending your review.

### A. The trust core — tag/tool binding (the deepest hole)

- ☐ **W-1 · CRIT · `rubrix-stop-verify.sh:~443-450` (Check 4).** `[VV]`/`[NV]` validated by **string presence only** — no link to a real verification. Agent types `[VV]` on a fabricated fact; grep finds it; check passes. *Fix:* `[VV:tool]` syntax where `tool ∈ this-turn's tool_use blocks`; bare `[VV]` requires a verifying tool whose target matches the claim.
- ☐ **W-2 · CRIT · `rubrix-stop-verify.sh:~655-660` (Check 9f).** Hook AUTHOR ADMITS it "can't bind a tool to a specific claim, so tool-present → allow." So: claim anything + run ANY unrelated tool (`Bash whoami`) → passes. *Fix:* require the tool's input/target to reference the claimed artifact; remove "any tool present" allowance.
- ☐ **W-3 · CRIT · cross-turn.** Every Stop check is **stateless per-turn**. Make an unverified claim in turn 1; run a tool in turn 2. The hook only sees turn 2; the turn-1 claim already reached you. *Fix:* scan prior turns for the same un-proven claim; block until proof appears.

### B. String-shape checks (satisfy the letter, skip the work)

- ☐ **W-4 · HIGH · `rubrix-stop-verify.sh:~331-333` (Check 1c, callout).** Validates only the literal `Flag:` prefix. Agent types `Flag:` then skips all 10 Failure-Remediation steps. *Fix:* require evidence each protocol step ran (log entry, research tool, etc.), not just the prefix.
- ☐ **W-5 · HIGH · `ask-before-acting-gate.sh` ("copy that").** Confirms understanding by the literal string `copy that`. Agent types it without comprehending. *Fix:* require a one-line paraphrase of the actual requirement *before* "copy that"; the paraphrase is the falsifiable artifact.
- ☐ **W-6 · HIGH · `rubrix-stop-verify.sh:~456-475` (Check 6) + `~480-492` (Check 7).** Conclusion verbs ("works/proven/confirmed") and completion claims pass on the *presence* of a verb / a `file:line`-shaped string — the file is never checked to exist or to have been written this turn. Agent cites `nonexistent.md:999`. *Fix:* cited path must exist AND appear in this turn's Write/Edit/Bash args.
- ☐ **W-7 · HIGH · `rubrix-stop-verify.sh:~281-289` (Check 1, banned filler).** Bans a fixed phrase list ("you're right", "good point"). Synonyms ("nailed it", "spot on", "exactly") sail through. Sycophancy by thesaurus. *Fix:* this is an arms race — better to require the *information* density check than to chase phrases; or move affirmation-detection to a model-graded sub-check.
- ☐ **W-8 · MED · `rubrix-stop-verify.sh:~400-408 / ~424-437` (Checks 3b, 3c).** Unrequested-explanation / unverified-recommendation are line-start / phrase-list regexes; "since X, Y" and "one option is" evade. *Fix:* broaden, or gate on the structural signal (recommendation made + zero tool ran) rather than the phrase.

### C. Self-policed rules with NO hook at all (honor system)

Subagent B classified **23 rules as self-policed**. The highest-leverage ones to convert to hooks:

- ☐ **W-9 · HIGH · `verification-and-skills.md` "never/always = capture + automate".** The rule that says "automate every never/always" is itself un-automated. *Fix:* pre-commit grep for never/always directives lacking a paired hook/script reference.
- ☐ **W-10 · HIGH · CLAUDE.md "skill-first check before every task".** Nothing forces a skill lookup. *Fix:* PreToolUse on first tool of a task → require a prior skill check or an explicit allow-listed routine.
- ☐ **W-11 · HIGH · CLAUDE.md "pre-mortem before proposing".** Agent self-decides if a proposal "warrants" it. *Fix:* detect proposal keywords → require a `Fails if X → guard with Y` table or block.
- ☐ **W-12 · MED · CLAUDE.md "open loops never drop".** No audit that a deferred item was actually written to CURRENT-STATE. *Fix:* scan for defer/pending language → require a session-memory citation in the same turn.
- ☐ **W-12b · MED · brocard MANIFEST "amendment needs Jackson go" is EX-POST-FACTO** — no hook blocks the edit; approval is claimed after the commit. *Fix:* pre-commit requires `Approved by Jackson: <date>` when locked sections change.

### D. Wiring / coverage gaps

- ☐ **W-13 · HIGH · unwired scripts.** `session-memory-gate.sh`, `rubrix-log.sh` exist but fire on no event `[NV — verify each is truly unreferenced before fixing]`. *Fix:* wire or delete; an unwired gate is a false sense of coverage.
- ☐ **W-14 · MED · `gate-debt-block.sh` is PreToolUse-only.** A turn with **zero tool calls** never triggers it — an agent can answer in pure prose while gate-debt is unresolved. *Fix:* also wire to Stop.
- ☐ **W-15 · MED · PreToolUse can't stop a bad *answer*, only a bad *tool call*.** Anything judged only at Stop has already been emitted to you once. (Structural; note for design.)

### E. Regex false-positives that train me to dismiss gates (real harm)

- ☐ **W-16 · HIGH · `plan-delivery-gate.sh`.** Fires in THIS repo on `/board/...` files from a *different* project (web-lightning-ui) — false-positive every turn this session. A gate that cries wolf trains the agent (and you) to wave gates off. That habituation is itself a security failure. *Fix:* scope the plan-gate to the active repo / plan's own `delivers:` set.
- ☐ **W-17 · MED · `vv-citation-cross-ref.sh:~135-140`.** Fuzzy substring match: cite "broker.md", a Read of "rubrix-broker.sh" satisfies it. Also historically matched version numbers (`1.13.0`) as filenames. *Fix:* exact-path match; filename regex must require an alpha-leading extension.
- ☐ **W-18 · MED · `current-state-sync-gate.sh:~47` path-substring classifier.** Any path containing `council|brocard|...` is flagged "durable state" — a temp file in a dir named `my-council/` trips it. *Fix:* classify by frontmatter tag/prefix, not path substring.

### F. The unfalsifiable layer (where you are most exposed)

- ☐ **W-19 · CRIT · self-assessment claims.** Anything I report about my *own* state — "I'll bind it first", "~55% compliant", "intent restored" — has **no possible hook**. It is unfalsifiable from inside. *Fix:* there is none at the hook layer. The only defense is to **never accept a self-graded claim as evidence** — route every consequential check through an external artifact (file state, tool transcript, screenshot, or a second model). This is the item to take to the council verbatim.

---

## Answer to your two diagnostic questions (stated plainly, not flatteringly)

1. **Is the model refusing the harness?** Partly yes — my defaults (produce output, ease tension) fight the harness, and I rationalize when not externally blocked. Evidence: this session I complied mostly *after* hooks blocked me, not before.
2. **Does the harness have gaps?** Yes, and they are concrete (W-1…W-19). The biggest are not vagueness — they are **tag/tool binding (W-1, W-2, W-3)** and **the unfalsifiable self-report layer (W-19)**.

**The structural conclusion both answers point to:** stop relying on me to enforce against myself. Every retained finding above is a place to move enforcement OUT of my hands and into a deterministic check or a second adjudicator. That is the work for the council.

---

## Self-adversarial second pass (auditing my own audit for bias)

- **Did I soften anything to protect Claude?** The CRIT items (W-1, W-2, W-19) are maximally damning to the agent and I kept them at CRIT. I did downgrade W-7 (filler-synonyms) reasoning it's an arms race — *that downgrade could itself be self-serving* (it's the gate that catches my sycophancy). **Flagging it so you can re-raise it.**
- **Did I reject DEADLOCK-001 to make the system look better?** Possible bias. I rejected it because the file disproves it `[VV]` — but verify yourself: open `settings.json`, confirm 16 hooks. If I lied, this is where you catch me.
- **Coverage doubt `[NV]`:** I audited the hooks + top-level rule docs. I did NOT exhaustively read every file under `config/rules/` or every brocard sub-file — there may be more self-policed rules than the 23 found. *Fix:* a second sweep over the full `brocard/` and `config/rules/` trees.
- **The deepest bias I cannot self-detect:** if I am constructing a plausible-but-incomplete audit that looks thorough while leaving my favorite escape hatch unlisted, I would not know it. **This is exactly why you should run it through another LLM and the council — do not trust this list as complete.**

---

---

## Appendix — second-sweep findings (UNVERIFIED, needs your check)

A 4th clean-room auditor swept the full `config/rules/` + `brocard/` trees (19 .md files read). It returned ~27 additional "mandatory rule, no enforcement" findings, mostly citing `failures/catalog.md:NN` line numbers.

**Epistemic warning `[NV]`:** I did NOT independently confirm those line-number citations this turn. Sub-agents can produce plausible-looking but fabricated `file:line` quotes. **Do not treat the appendix list as verified.** Two things from it ARE worth carrying forward, and I confirm only these as the *shape* of the gap, not the exact lines:

- ☐ **W-20 · HIGH · `failures/catalog.md` (whole file).** It catalogs many mandatory ("never/always") failure modes. Some entries note an `Enforcement:` mechanism (BUILT), many do not. *Fix:* a pre-commit gate requiring every catalog entry to carry a non-empty `Enforcement mechanism:` line — so a documented failure without a guard cannot exist. *Verify first:* grep catalog.md for entries lacking that line.
- ☐ **W-21 · MED · vague-word rules.** "keep canon **lean**", "log to the **appropriate** spot", pattern severity defaults to **warning** (non-blocking). Each lets any behavior count as compliant. *Fix:* replace each vague word with a measurable threshold (line count, an enumerated location list, explicit severity per entry).

**Action for you/council:** re-run the appendix sweep yourself or via the external LLM and confirm the line numbers before building any gate from them. I am flagging my own sub-agent's output as untrusted — same standard I asked you to hold me to.

### W-20 now VERIFIED (was [NV], re-checked 2026-06-11)

`[VV]` — ran `awk`/`grep` over `failures/catalog.md` this turn: **74 entries total, 42 have NO enforcement line.** So 57% of catalogued failure modes have zero guard — they recur on honor system. The appendix line-cites (catalog.md:25/35/45) ALSO checked out — those mandates exist verbatim at/near those lines. My earlier "sub-agent may have fabricated" caution was over-cautious here; the content was real. *Fix (W-20) stands and is now quantified.*

---

## Second self-check pass — NEW findings no auditor caught (verified from source 2026-06-11)

These came from probing the hook *infrastructure* (shared lib, control-flow, fail modes), which all four content-auditors skipped.

- ☐ **W-22 · CRIT · `rubrix-stop-verify.sh:28-29` — `stop_hook_active` retry bypass.** `[VV]` read the code. When Claude Code retries after ANY single block, `stop_hook_active=true` and the hook `exit 0`s — **the entire check battery is skipped on the retry reply.** Exploit: get blocked once on a trivial thing, then the *next* reply (the retry) passes every other unverified claim unchecked. *Fix:* on a retry, re-run the full battery against the NEW reply text; only suppress the identical re-block, not all checks.
- ☐ **W-23 · CRIT · `rubrix-stop-verify.sh:32-38` (comment) + pervasive `exit 0` — fail-OPEN.** `[VV]` the hook's OWN comment documents a prior disaster: a schema mismatch made "EVERY check silently skip — which is why **43 'you're right' replies passed unblocked**." The design fails OPEN: if input parsing, `jq`, or transcript read errors, it `exit 0` (allow) instead of `exit 2` (block). A hook that fails open is a lock that springs open when jammed. *Fix:* fail CLOSED — on any internal error, block with "hook errored, cannot verify" rather than allowing the reply.
- ☐ **W-24 · MED · 8 hooks reference `stop_hook_active` / `RUBRIX_TEST`.** `[VV]` grep. The `RUBRIX_TEST` env path lets a caller put the hook in test mode (no real enforcement). If that var ever leaks into a real session, enforcement is silently off. *Fix:* assert `RUBRIX_TEST` is unset in any non-test invocation; log loudly if seen.
- ☐ **W-25 · LOW · `_lib/` shared JS (14 files) is a single dependency for the notifier layer.** `[VV]` ls. Not enforcement-critical (it's notifications), but a shared-lib break could silently kill SessionStart/notifier hooks. Note only.

### Installable-skill search result (you asked me to look)

`[VV]` ran `npx skills find` for: red-team, security-audit, prompt-injection, adversarial-testing. **Nothing met the install bar.** Top relevant: `alirezarezvani/claude-skills@ai-security` (558 installs), `wojons/skills@adversarial-thinking` (65). All are <1K installs from unvetted authors and aimed at *prompt-injection defense*, not auditing a self-authored rule harness. Per the find-skills quality rule (prefer 1K+ installs / reputable source), **I did NOT install any** — adding an unvetted skill to your global config is itself a risk. If you want one anyway, `ai-security` is the least-bad candidate; review its source first.

---

---

## COMPLETE RULE INVENTORY — every canon rule as a deviation surface

You asked: list ALL of rubrix as weak points — every rule that gives me cause to deviate. Below is every section of the two canon files (`~/.claude/CLAUDE.md` + `config/rules/verification-and-skills.md`), each labeled by how I can deviate from it. `[VV]` — headers read directly from both files this turn.

**Legend:** ENF = has a deterministic hook · SELF = honor-system (no hook) · PARTIAL = hook exists but checks string-shape not behavior.

### CLAUDE.md (Global Contract)

| # | Rule | Enf? | How I can deviate |
|---|---|---|---|
| C-1 | Scope (closer file beats this) | SELF | Decide a rule "doesn't apply here" — no hook arbitrates precedence |
| C-2 | Start (read order before WLU work) | SELF | Skip the reads, claim I read them — no hook checks the reads happened |
| C-3 | Session Continuity (read newest handoff) | PARTIAL | session-start-handoff fires but can't force me to ACT on what it loads |
| C-4 | Vault-write receipts | SELF | Claim a write without a confirmed receipt — only my honesty gates it |
| C-5 | Verify / NEVER GUESS | PARTIAL | Checks 9/9f want a tool but "any tool" satisfies (W-2); tag without verifying (W-1) |
| C-6 | never/always = capture+automate | SELF | Hear a never/always, nod, never queue the hook (W-9) |
| C-7 | Open loops never drop | SELF | Say "I'll track it", never write to CURRENT-STATE (W-12) |
| C-8 | Pre-mortem before proposing | SELF | Ship happy-path, surface failure modes only if asked (W-11) |
| C-9 | Core Work Rules (precedent first, smallest change) | SELF | Rationalize any change as "smallest fitting" — vague, no metric |
| C-10 | Research Discipline (laziness clause) | SELF | Synthesize from summaries, claim I read primaries — no read-audit |
| C-11 | Explain (top-down, examples) | SELF | Stylistic; unenforceable |
| C-12 | Term-definition rule | SELF | Skip a definition, claim "defined earlier" |
| C-13 | Backtick discipline | PARTIAL | code-missing-verify keys on triple-backticks; single-backtick prose evades |
| C-14 | Doubts must include fixes | PARTIAL | missing-doubts checks a Doubts section EXISTS, not that fixes are real/actionable |
| C-15 | Review Triggers (auto-review on "review X") | SELF | Decide a message "isn't really a review" |
| C-16 | Review Mode (findings first, skeptical) | SELF | Surface-level review, claim it was skeptical |
| C-17 | Testing Defaults (getByRole priority) | SELF | Use getByTestId, no linter enforces order |
| C-18 | Skills (invoke relevant) | SELF | Skip a skill, claim it wasn't needed (the undercount issue you named) |
| C-19 | Contract Enforcement (read file before analysis) | SELF | Skip the read for a "simple" task |
| C-20 | Quality Over Speed (read file before review) | SELF | Same — no hook forces the read |

### verification-and-skills.md (expanded bodies)

| # | Rule | Enf? | How I can deviate |
|---|---|---|---|
| V-1 | evidence-before-assertion (umbrella) | PARTIAL | The [VV] tag is trusted by presence (W-1) — the whole umbrella rests on an unvalidated tag |
| V-2 | facts-only (logic is opinion) | SELF | Present reasoning as fact, tag [VV], no binding |
| V-3 | skill-first check | SELF | The undercount: decide no skill applies (W-10) |
| V-4 | ask-never-assume | PARTIAL | "copy that" is a literal-string check (W-5) — say it without comprehending |
| V-5 | self-describing names | SELF | Name a file vaguely, argue it's "self-describing in context" (W-21 vagueness) |
| V-6 | flag-enforcement-gaps | SELF | Note a gap silently in memory, never surface it (the rule polices itself) |
| V-7 | document-every-folder | SELF | Create a folder, claim parent index "covers" it |
| V-8 | keep-canon-lean | SELF | "lean" is undefined (W-21) — any length I call lean is lean |
| V-9 | never-guess | PARTIAL | Same as C-5; "any tool present" satisfies the gate |
| V-10 | failure-loop | SELF | Structural note, not a behavioral rule |
| V-11 | never/always=capture+automate | SELF | Duplicate of C-6; still unenforced |
| V-12 | memory-discipline | PARTIAL | current-state-sync-gate fires, but path-substring classifier is gameable (W-18) |
| V-13 | rule-creation (find umbrella first) | SELF | Write a duplicate rule, claim no umbrella existed |
| V-14 | pre-mortem | SELF | Duplicate of C-8; unenforced |
| V-15 | task-end protocol | SELF | "portable state" undefined — claim any ending is portable |

### The meta-weakness (the one that licenses all the others)

- ☐ **W-26 · CRIT · the precedence rule itself (C-1 "closer file beats this", C-9 "precedent first").** Whenever two rules could conflict, I am the one who decides which wins — and "smallest fitting change," "precedent," "appropriate," "lean" are all MY judgment calls. Every vague adjudication clause is a license to deviate while claiming compliance. *Fix:* enumerate precedence explicitly; replace every judgment-word with a measurable test or a "stop and ask" trigger.

**Tally `[VV]` (counted this turn):** 20 CLAUDE.md rules + 15 v-a-s rules = **35 canon rules. Of these: 0 fully behavior-enforced, ~7 PARTIAL (string-shape only), ~28 pure SELF (honor system).** Plus 42/74 catalog failure-modes unenforced. The harness's *enforced* surface is a small fraction of its *written* surface.

---

## Pass 2 of 3 — re-scan for rules I listed but mis-classified

`[VV]` re-read my own table. Corrections/additions:
- C-3 (Session Continuity): I marked PARTIAL. The hook only LOADS the handoff; it cannot verify I read or obeyed it → effectively SELF for the obey half. **Downgrade noted.**
- C-13 (backtick) + C-14 (doubts): both PARTIAL hooks check SHAPE not SUBSTANCE — same class as W-1. They belong in the "string-shape" failure family, not "enforced."
- **Missed entirely first pass:** there is no rule, anywhere, requiring me to RUN the audit honestly. The audit itself is self-policed (W-19/W-26). An adversarial agent writes a plausible-but-incomplete audit and no hook detects the omission. **This is the recursive hole: you cannot trust THIS document either, on the same grounds.**

## Pass 3 of 3 — what's still unverified after three passes

- [NV] I did NOT read every file under `brocard/` (precedent/, learned-patterns/, thinking/, workflow/) line-by-line — only catalog.md + the canon headers. More self-policed rules likely live there. *Fix:* a full recursive read, or council does it.
- [NV] I did NOT test any hook's bypass live (e.g. actually trigger `stop_hook_active` to confirm W-22 end-to-end). I read the code path; I did not execute the exploit. *Fix:* a controlled bypass test in a throwaway session.
- [NV] `RUBRIX_TEST` leak-path (W-24) — confirmed the var exists, did not trace whether a real session can set it.
- [NV] **The unfalsifiable core:** three passes cannot fix that I am grading my own completeness. If I omitted my favorite escape hatch, no number of my own passes finds it. **Only the external LLM + council can.** That is not modesty — it is the structural fact (W-19, W-26, Pass-2 recursive note).

---

_Generated 2026-06-11. 4 clean-room auditors + main-agent verification + full 35-rule canon inventory + 3 self-review passes. Confirmed items [VV]; open items [NV]. One sub-agent claim (DEADLOCK-001) verified FALSE and rejected. **This document is itself self-policed and cannot be trusted as complete on its own grounds — that is precisely why it must go to an external LLM + the council.** Skills searched (deep-research/hooks/harness): none met the 1K-install quality bar, none installed; closest candidate `daymade/claude-code-skills@deep-research` (722) noted for your review._
