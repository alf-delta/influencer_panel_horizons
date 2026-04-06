-- ============================================================
-- Horizons Influencer Panel — Supabase Schema
-- Run in Supabase SQL Editor (Database → SQL Editor → New query)
-- ============================================================

-- Influencers (main table)
create table if not exists influencers (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  username                text,
  email                   text,
  platform                text check (platform in ('instagram', 'tiktok', 'youtube')) default 'instagram',
  followers               integer default 0,
  engagement_rate         numeric(5,2) default 0,
  location_raw            text,
  geo_zone                text check (geo_zone in ('A', 'B', 'C')) default 'C',
  import_score            integer default 0,
  status                  text check (status in ('candidate','outreach','active','in_production','review','complete','archived')) default 'candidate',
  current_campaign        text,
  current_scenario        text check (current_scenario in ('couples','birthday','corporate','family','wellness','wedding','summit','sport')),
  affiliate_code          text,
  ftc_disclosure_confirmed boolean default false,
  iterations_count        integer default 0,
  avg_iteration_score     numeric(5,2),
  tier                    text check (tier in ('Gold','Silver','Out','Unrated')) default 'Unrated',
  last_campaign           text,
  qcpe_last_iteration     numeric(5,2),
  content_library_assets  integer default 0,
  notes                   text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- Iterations (post-campaign scoring per influencer)
create table if not exists iterations (
  id               uuid primary key default gen_random_uuid(),
  influencer_id    uuid references influencers(id) on delete cascade,
  campaign_name    text,
  scenario         text,
  -- New 3-block scoring system (Technical 35% / Communication 25% / Horizons Fit 40%)
  technical        integer check (technical between 1 and 10),
  communication    integer check (communication between 1 and 10),
  horizons_fit     integer check (horizons_fit between 1 and 10),
  -- Legacy 4-axis fields (kept for existing rows)
  content_quality  integer check (content_quality between 0 and 10) default 0,
  value_received   integer check (value_received between 0 and 10) default 0,
  content_longevity integer check (content_longevity between 0 and 10) default 0,
  qcpe_score       integer check (qcpe_score between 0 and 10) default 0,
  total_score      numeric(5,2),
  notes            text,
  created_at       timestamptz default now()
);

-- Migration: add new columns to existing iterations table
alter table iterations add column if not exists technical     integer check (technical between 1 and 10);
alter table iterations add column if not exists communication integer check (communication between 1 and 10);
alter table iterations add column if not exists horizons_fit  integer check (horizons_fit between 1 and 10);

-- Attio webhook sync log
create table if not exists attio_sync_log (
  id             uuid primary key default gen_random_uuid(),
  influencer_id  uuid references influencers(id) on delete set null,
  event_type     text not null,  -- 'import' | 'stage_change' | 'iteration_saved'
  payload        jsonb,
  status         text check (status in ('pending','sent','failed')) default 'pending',
  attempts       integer default 0,
  error_message  text,
  created_at     timestamptz default now(),
  synced_at      timestamptz
);

-- Auto-update updated_at on influencers
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists influencers_updated_at on influencers;
create trigger influencers_updated_at
  before update on influencers
  for each row execute function update_updated_at();

-- Row Level Security (enable, then allow all for initial setup)
alter table influencers     enable row level security;
alter table iterations      enable row level security;
alter table attio_sync_log  enable row level security;

-- Dev policies (replace with auth-scoped policies for production)
drop policy if exists "dev_all_influencers"    on influencers;
drop policy if exists "dev_all_iterations"     on iterations;
drop policy if exists "dev_all_attio_sync_log" on attio_sync_log;

create policy "dev_all_influencers"    on influencers     for all using (true);
create policy "dev_all_iterations"     on iterations      for all using (true);
create policy "dev_all_attio_sync_log" on attio_sync_log  for all using (true);

-- Indexes for common queries
create index if not exists idx_influencers_status    on influencers(status);
create index if not exists idx_influencers_tier      on influencers(tier);
create index if not exists idx_influencers_geo_zone  on influencers(geo_zone);
create index if not exists idx_iterations_influencer on iterations(influencer_id);
create index if not exists idx_sync_log_influencer   on attio_sync_log(influencer_id);
create index if not exists idx_sync_log_status       on attio_sync_log(status);
