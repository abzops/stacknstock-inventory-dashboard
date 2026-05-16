# Stack n Stock V8.1.2 Direct MIV Item Code Dropdown Fix

Replace these files:

- `v8-module.js`
- `v8-styles.css`
- `supabase-v8-stock-accuracy-jobwork-migration.sql`

No real SQL migration is required.

## Fixed

In `Create Direct MIV`, the `Item Code` field is now a dropdown loaded from Supabase `inventory_items`.

It auto-fills:

- Description
- UOM
- From Bin
- Available Qty hidden field

It also prevents Qty Issued from being greater than available stock.

## After replacing

Hard refresh:

Ctrl + Shift + R

## Debug

Open browser console:

```js
SNS_V812_directMivItemDropdown.reload()
SNS_V812_directMivItemDropdown.rows()
```
