-- Additive: keep existing orders, coupons and reservation data unchanged.
-- Old orders retain NULL rather than invented customer details.
begin;
alter table orders add column if not exists customer_details jsonb
  check (customer_details is null or jsonb_typeof(customer_details) = 'object');
commit;
