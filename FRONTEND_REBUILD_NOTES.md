# Stack n Stock Frontend Rebuild Patch v9.2

This package keeps the current UI style and page structure. It fixes the transaction algorithm and the Direct MIV bug without replacing the dashboard design.

## Fixed

- Direct MIV Item Code is now dropdown-only from available `inventory_items`.
- Manual invalid item codes like `12345` are blocked before save.
- MIV header and line are validated before any database insert.
- MIV cannot create orphan header/line records if stock posting fails.
- Stock OUT movements cannot auto-create inventory items.
- Negative stock is blocked in the frontend ledger algorithm.
- `postLedgerEntry()` now validates item existence, quantity, and calculated balance before insert.
- Existing UI colors, layout, sidebar, modals, cards, and tables are preserved.

## Files changed

- `index.html`
- `v7-module.js`
- `v8-module.js`
- `v8-styles.css`

## Post-test SQL checks

Run after creating one Direct MIV:

```sql
select *
from public.stock_ledger
where qty_after < 0
order by created_at desc;
```

Expected: no rows.

```sql
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
```

Expected: no rows.
