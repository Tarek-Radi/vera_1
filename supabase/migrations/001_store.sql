begin;
create extension if not exists pgcrypto;
create sequence if not exists order_number_seq;
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('VERA-' || lpad(nextval('order_number_seq')::text, 8, '0')),
  idempotency_key text not null unique,
  request_hash text not null,
  status text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','CANCELLED','FULFILLED','EXPIRED')),
  subtotal integer not null check (subtotal > 0),
  discount_total integer not null check (discount_total >= 0 and discount_total <= subtotal),
  total_before_shipping integer not null check (total_before_shipping = subtotal - discount_total),
  shipping_status text not null default 'UNCONFIRMED',
  payment_status text not null default 'UNCONFIRMED',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  expires_at timestamptz not null
);
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id), position integer not null,
  product_sku text not null, product_name text not null, color text not null, size text not null,
  quantity integer not null check (quantity between 1 and 20), unit_price integer not null check (unit_price > 0),
  subtotal integer not null check (subtotal = quantity * unit_price),
  discount_percent integer not null default 0 check (discount_percent in (0,15,20,30)),
  discount_amount integer not null check (discount_amount >= 0 and discount_amount <= subtotal),
  line_total integer not null check (line_total = subtotal - discount_amount), coupon_label text,
  unique(order_id, product_sku, size), unique(order_id, position)
);
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(), code_verifier text not null unique check (length(code_verifier) = 64),
  discount_percent integer not null check (discount_percent in (15,20,30)),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','RESERVED','REDEEMED')),
  created_at timestamptz not null default now(), redeemed_at timestamptz,
  check ((status = 'REDEEMED') = (redeemed_at is not null))
);
create table if not exists coupon_reservations (
  id uuid primary key default gen_random_uuid(), coupon_id uuid not null references coupons(id), order_id uuid not null references orders(id),
  order_item_id uuid not null unique references order_items(id), expires_at timestamptz not null,
  status text not null default 'RESERVED' check (status in ('RESERVED','REDEEMED','RELEASED','EXPIRED')),
  created_at timestamptz not null default now(), unique(coupon_id, order_id)
);
create unique index if not exists one_live_coupon on coupon_reservations(coupon_id) where status in ('RESERVED','REDEEMED');
create table if not exists admin_users (user_id uuid primary key, created_at timestamptz not null default now());
create table if not exists order_events (id bigint generated always as identity primary key, order_id uuid not null references orders(id), action text not null, actor_id uuid, created_at timestamptz not null default now());
create table if not exists rate_limits (key text primary key, hits integer not null, resets_at timestamptz not null);
create index if not exists pending_expiry on orders(expires_at) where status = 'PENDING';
create index if not exists recent_orders on orders(created_at desc);
create index if not exists reservations_order on coupon_reservations(order_id);
create index if not exists events_order on order_events(order_id);
alter table orders enable row level security;
alter table order_items enable row level security;
alter table coupons enable row level security;
alter table coupon_reservations enable row level security;
alter table admin_users enable row level security;
alter table order_events enable row level security;
alter table rate_limits enable row level security;
-- No browser role has a policy or direct table access. Next.js uses a private database connection.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on orders, order_items, coupons, coupon_reservations, admin_users, order_events, rate_limits from anon;
    revoke all on sequence order_number_seq from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on orders, order_items, coupons, coupon_reservations, admin_users, order_events, rate_limits from authenticated;
    revoke all on sequence order_number_seq from authenticated;
  end if;
end $$;
commit;
