-- Table creation for Ledger
-- =============================================================================
-- Runs BEFORE 0001_enable_rls.sql (lexical order). Defines the 8 financial
-- tables that src/lib/supabase/sync.ts reads/writes. Column names match the
-- *Row types in sync.ts exactly (snake_case). Money is stored in cents (bigint);
-- months/weeks/dates are text (YYYY-MM / YYYY-MM-DD), matching the app's pure
-- string date arithmetic.
--
-- Every table carries user_id (the owner) so 0001_enable_rls.sql can scope rows
-- to auth.uid(). Composite primary keys ((user_id, id) or (user_id, month|week_of))
-- match the conflict targets the sync layer relies on for .upsert(...).
--
-- Seed data is NOT inserted here. It persists through the app's first-login
-- sync (syncStateToSupabase), which stamps each row with the authed user_id.
-- =============================================================================

-- ── bills ──────────────────────────────────────────────────────────────────
create table if not exists public.bills (
  user_id        uuid    not null references auth.users(id) on delete cascade,
  id             text    not null,
  month          text    not null,
  name           text    not null,
  cents          bigint  not null,
  due            integer not null,
  paid           boolean not null default false,
  method         text    not null,
  "group"        text    not null,
  entry          text    not null,
  category       text    not null,
  flagged        boolean not null default false,
  notes          text    not null default '',
  amount_history jsonb   not null default '[]'::jsonb,
  primary key (user_id, id)
);

-- ── installment_plans ────────────────────────────────────────────────────────
create table if not exists public.installment_plans (
  user_id  uuid   not null references auth.users(id) on delete cascade,
  id       text   not null,
  label    text   not null,
  mc       bigint not null,
  start    text   not null,
  "end"    text   not null,
  due_day  integer,
  primary key (user_id, id)
);

-- ── income (one row per user per month) ──────────────────────────────────────
create table if not exists public.income (
  user_id         uuid   not null references auth.users(id) on delete cascade,
  month           text   not null,
  kias_pay        bigint not null default 0,
  military_pay    bigint not null default 0,
  retirement      bigint not null default 0,
  social_security bigint not null default 0,
  primary key (user_id, month)
);

-- ── snapshots (one row per user per month) ────────────────────────────────────
create table if not exists public.snapshots (
  user_id         uuid   not null references auth.users(id) on delete cascade,
  month           text   not null,
  total_billed    bigint not null default 0,
  total_paid      bigint not null default 0,
  shortfall       bigint not null default 0,
  savings_moved   bigint not null default 0,
  kias_pay_actual bigint not null default 0,
  primary key (user_id, month)
);

-- ── paycheck_weeks (one row per user per week) ────────────────────────────────
create table if not exists public.paycheck_weeks (
  user_id    uuid   not null references auth.users(id) on delete cascade,
  week_of    text   not null,
  kias_pay   bigint not null default 0,
  storage    bigint not null default 0,
  rent       bigint not null default 0,
  jazmin     bigint not null default 0,
  dre        bigint not null default 0,
  savings    bigint not null default 0,
  paypal_cc  bigint not null default 0,
  deductions bigint not null default 0,
  primary key (user_id, week_of)
);

-- ── check_log (one row per user per week) ─────────────────────────────────────
create table if not exists public.check_log (
  user_id uuid   not null references auth.users(id) on delete cascade,
  week_of text   not null,
  amount  bigint not null default 0,
  primary key (user_id, week_of)
);

-- ── savings_log (one row per user per week) ───────────────────────────────────
create table if not exists public.savings_log (
  user_id uuid   not null references auth.users(id) on delete cascade,
  week_of text   not null,
  amount  bigint not null default 0,
  primary key (user_id, week_of)
);

-- ── bank_accounts ─────────────────────────────────────────────────────────────
create table if not exists public.bank_accounts (
  user_id       uuid    not null references auth.users(id) on delete cascade,
  id            text    not null,
  name          text    not null,
  balance_cents bigint  not null default 0,
  updated_date  text    not null default '',
  is_legacy     boolean not null default false,
  primary key (user_id, id)
);
