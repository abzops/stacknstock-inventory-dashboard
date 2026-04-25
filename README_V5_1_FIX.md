# Stack n Stock Inventory Dashboard v5.1 Fix

This patch fixes two v5 issues:

1. Production ticket save error:
   - Fixes `invalid input syntax for type timestamp with time zone: ""`.
   - Empty `issued_at` is now sent to Supabase as `null`, not an empty string.

2. Production portal refresh issue:
   - The selected team is now restored from `localStorage` after page refresh.
   - If Production Team was selected, refresh returns to the Production Redeem Portal instead of the Inventory dashboard.

Use this package after running the v5 migration.
