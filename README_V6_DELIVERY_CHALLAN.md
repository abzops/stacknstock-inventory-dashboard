# v6 Delivery Challan Update

Adds a Delivery Challan window with template-matched print output, product/price master selection, and Supabase tables.

Run `supabase-v6-delivery-challan-migration.sql` after previous migrations.

The product price master is seeded from current inventory with zero rates. Update `product_price_master.default_rate`, `hsn_sac`, and `gst_percent` in Supabase to enable price selection.
