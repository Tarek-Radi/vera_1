-- Additive migration. Preserve existing records, with NULL details on legacy orders.
begin;
alter table orders add column if not exists customer_details jsonb
check (customer_details is null or jsonb_typeof(customer_details) = 'object');
commit;
