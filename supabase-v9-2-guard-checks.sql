-- Stack n Stock V9.2 guard checks

-- 1. Negative stock must never exist.
select *
from public.stock_ledger
where qty_after < 0
order by created_at desc;

-- 2. Cached inventory qty must match ledger calculation.
with ledger_balance as (
  select
    upper(item_code) as item_code,
    sum(coalesce(in_qty, 0)) - sum(coalesce(out_qty, 0)) as ledger_stock
  from public.stock_ledger
  group by upper(item_code)
)
select
  i.item_code,
  coalesce(i.qty, 0) as inventory_qty,
  coalesce(l.ledger_stock, 0) as ledger_qty,
  coalesce(i.qty, 0) - coalesce(l.ledger_stock, 0) as difference
from public.inventory_items i
left join ledger_balance l
  on upper(i.item_code) = upper(l.item_code)
where coalesce(i.qty, 0) <> coalesce(l.ledger_stock, 0);
