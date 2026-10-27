-- CloseAgent schema for Neon Postgres. Already applied to the "closeagentai" project.
-- Users live in the neon_auth schema (Managed Better Auth); user_id = neon_auth user id.

create table if not exists public.profiles (
  user_id text primary key,
  email text,
  sender_name text not null default '',
  sender_company text not null default '',
  offer text not null default '',
  cta text not null default '',
  language text not null default 'English',
  stripe_customer_id text unique,
  subscription_status text not null default 'none',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source text not null,                 -- youtube | hunter | csv
  name text not null default '',
  company text not null default '',
  email text not null default '',
  email_source text not null default '',
  website text not null default '',
  title text not null default '',
  notes text not null default '',
  external_id text,                     -- YouTube channel id / Hunter email
  subscribers bigint,
  status text not null default 'new',   -- new | drafted | sent
  created_at timestamptz not null default now()
);
create unique index if not exists leads_user_external on public.leads (user_id, source, external_id);
create index if not exists leads_user_created on public.leads (user_id, created_at desc);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  lead_id uuid not null references public.leads (id) on delete cascade,
  subject text not null default '',
  body text not null default '',
  angle text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists drafts_lead on public.drafts (lead_id, created_at desc);

create table if not exists public.usage (
  user_id text not null,
  month text not null,                  -- YYYY-MM
  searches int not null default 0,
  drafts int not null default 0,
  lookups int not null default 0,
  primary key (user_id, month)
);
