-- CloseAgent SaaS schema. Run once in Supabase → SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  sender_name text default '',
  sender_company text default '',
  offer text default '',
  cta text default '',
  language text default 'English',
  stripe_customer_id text unique,
  subscription_status text default 'none',   -- none | active | trialing | past_due | canceled
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,                       -- youtube | hunter | csv
  name text default '',
  company text default '',
  email text default '',
  email_source text default '',               -- e.g. youtube_description, hunter, csv
  website text default '',
  title text default '',
  notes text default '',
  external_id text,                           -- YouTube channel id, etc.
  subscribers bigint,
  status text default 'new',                  -- new | drafted | sent
  created_at timestamptz default now()
);
-- NULL external_ids (CSV rows) never conflict, so this only dedupes channels/contacts.
create unique index if not exists leads_user_external on public.leads (user_id, source, external_id);
create index if not exists leads_user_created on public.leads (user_id, created_at desc);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  subject text default '',
  body text default '',
  angle text default '',
  created_at timestamptz default now()
);
create index if not exists drafts_lead on public.drafts (lead_id, created_at desc);

create table if not exists public.usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,                        -- YYYY-MM
  searches int not null default 0,
  drafts int not null default 0,
  lookups int not null default 0,
  primary key (user_id, month)
);

-- Atomic usage increment used by the server (service role).
create or replace function public.increment_usage(p_user uuid, p_month text, p_field text, p_amount int)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.usage (user_id, month) values (p_user, p_month)
  on conflict (user_id, month) do nothing;
  if p_field = 'searches' then
    update public.usage set searches = searches + p_amount where user_id = p_user and month = p_month;
  elsif p_field = 'drafts' then
    update public.usage set drafts = drafts + p_amount where user_id = p_user and month = p_month;
  elsif p_field = 'lookups' then
    update public.usage set lookups = lookups + p_amount where user_id = p_user and month = p_month;
  else
    raise exception 'unknown usage field %', p_field;
  end if;
end $$;
revoke all on function public.increment_usage(uuid, text, text, int) from public, anon, authenticated;

-- Create a profile row for every new user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security: users only see their own data.
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.drafts enable row level security;
alter table public.usage enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
-- Profile updates (offer settings) go through the server so billing columns can't be edited by users.

drop policy if exists "own leads" on public.leads;
create policy "own leads" on public.leads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own drafts" on public.drafts;
create policy "own drafts" on public.drafts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own usage read" on public.usage;
create policy "own usage read" on public.usage for select using (auth.uid() = user_id);
