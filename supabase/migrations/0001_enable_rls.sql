-- Row-Level Security for Ledger
-- =============================================================================
-- WHY: Ledger holds a real person's financial data. Without RLS, ANY authenticated
-- request can read/write ANY row — a data leak. These policies scope every row to
-- its owner via auth.uid() so a user can only ever touch their own data.
--
-- COUNCIL-VERIFIED REQUIREMENTS (gemini + copilot, 2026-06-09):
--   1. ENABLE ROW LEVEL SECURITY on EVERY table (a policy alone does nothing;
--      an un-enabled table defaults to fully open).
--   2. Each policy needs BOTH a USING clause (gates SELECT/DELETE) AND a
--      WITH CHECK clause (gates INSERT/UPDATE). USING-only would let a user
--      INSERT a row claiming someone else's user_id.
--   3. Grant only the `authenticated` role — deny `anon`.
--   4. The app's server-side clients forward the user JWT, so auth.uid() resolves
--      to the logged-in user (it is NULL otherwise and these policies deny-all,
--      which is the safe failure mode).
--
-- All 8 financial tables carry a `user_id uuid` column set from the authed user
-- on write (see src/lib/supabase/sync.ts). The policy ties that column to auth.uid().
-- =============================================================================

-- Helper: apply the standard owner-only policy set to a table.
-- (Inlined per-table below for clarity + auditability — no hidden abstraction.)

-- ── bank_accounts ────────────────────────────────────────────────────────────
alter table public.bank_accounts enable row level security;
drop policy if exists "own rows: select" on public.bank_accounts;
drop policy if exists "own rows: modify" on public.bank_accounts;
create policy "own rows: select" on public.bank_accounts
  for select to authenticated using (auth.uid() = user_id);
create policy "own rows: modify" on public.bank_accounts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── bills ────────────────────────────────────────────────────────────────────
alter table public.bills enable row level security;
drop policy if exists "own rows: select" on public.bills;
drop policy if exists "own rows: modify" on public.bills;
create policy "own rows: select" on public.bills
  for select to authenticated using (auth.uid() = user_id);
create policy "own rows: modify" on public.bills
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── check_log ────────────────────────────────────────────────────────────────
alter table public.check_log enable row level security;
drop policy if exists "own rows: select" on public.check_log;
drop policy if exists "own rows: modify" on public.check_log;
create policy "own rows: select" on public.check_log
  for select to authenticated using (auth.uid() = user_id);
create policy "own rows: modify" on public.check_log
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── income ───────────────────────────────────────────────────────────────────
alter table public.income enable row level security;
drop policy if exists "own rows: select" on public.income;
drop policy if exists "own rows: modify" on public.income;
create policy "own rows: select" on public.income
  for select to authenticated using (auth.uid() = user_id);
create policy "own rows: modify" on public.income
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── installment_plans ────────────────────────────────────────────────────────
alter table public.installment_plans enable row level security;
drop policy if exists "own rows: select" on public.installment_plans;
drop policy if exists "own rows: modify" on public.installment_plans;
create policy "own rows: select" on public.installment_plans
  for select to authenticated using (auth.uid() = user_id);
create policy "own rows: modify" on public.installment_plans
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── paycheck_weeks ───────────────────────────────────────────────────────────
alter table public.paycheck_weeks enable row level security;
drop policy if exists "own rows: select" on public.paycheck_weeks;
drop policy if exists "own rows: modify" on public.paycheck_weeks;
create policy "own rows: select" on public.paycheck_weeks
  for select to authenticated using (auth.uid() = user_id);
create policy "own rows: modify" on public.paycheck_weeks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── savings_log ──────────────────────────────────────────────────────────────
alter table public.savings_log enable row level security;
drop policy if exists "own rows: select" on public.savings_log;
drop policy if exists "own rows: modify" on public.savings_log;
create policy "own rows: select" on public.savings_log
  for select to authenticated using (auth.uid() = user_id);
create policy "own rows: modify" on public.savings_log
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── snapshots ────────────────────────────────────────────────────────────────
alter table public.snapshots enable row level security;
drop policy if exists "own rows: select" on public.snapshots;
drop policy if exists "own rows: modify" on public.snapshots;
create policy "own rows: select" on public.snapshots
  for select to authenticated using (auth.uid() = user_id);
create policy "own rows: modify" on public.snapshots
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- VERIFY (run after applying, with two seeded users A and B):
--   - As user A: select from each table → returns ONLY A's rows.
--   - As user A: insert a row with user_id = B's id → REJECTED by WITH CHECK.
--   - As anon (no JWT): select from any table → returns nothing (deny-all).
-- =============================================================================
