# v6.2 Delivery Challan Procurement Hub Price Source

Delivery Challan product selection now reads product and price data from the Procurement Hub Supabase database.

Default mapping:

- Table: `public.po_lines`
- Product name: `item_desc`
- Product price: `line_grand_total`
- GST %: `item_tax_percent`
- Quantity reference: `quantity_ordered`
- Item code/value: `line_id`
- PO reference: `po_number`
- Vendor: `vendor_name`

## Required config.js values

Add your actual Procurement Hub URL and anon/publishable key:

```js
window.SNS_PRICE_SUPABASE_URL = "https://YOUR_PROCUREMENT_HUB_PROJECT.supabase.co";
window.SNS_PRICE_SUPABASE_ANON_KEY = "YOUR_PROCUREMENT_HUB_ANON_OR_PUBLISHABLE_KEY";
```

Do not use `service_role` or `sb_secret` keys in the frontend.

## If product list is empty

Run `supabase-v6-2-procurement-po-lines-read-policy.sql` inside the Procurement Hub Supabase SQL Editor, or create a safer equivalent RLS policy that permits read access to `public.po_lines`.
