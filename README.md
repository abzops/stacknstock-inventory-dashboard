# Stack n Stock Inventory Dashboard v5

## New in v5

- Login screen now has a **team selector**:
  - Inventory / Stores Team
  - Production Team
- Production Team gets a separate **Redeem / Request Inventory** portal.
- Production can search, sort, filter, add items to cart, enter required quantity, and raise a material issue ticket.
- Inventory / Stores no longer has direct product issue buttons in the inventory table.
- Stores gets a new **Ticket Notifications** section to verify and issue production requests.
- Issued tickets deduct inventory quantity, create issue logs, and keep reorder point flagging below quantity 3.
- Print option added for issue tickets using the same field structure as the uploaded issue ticket sheet.
- Export workbook now includes issue tickets and issue logs.

## Supabase setup

Keep using your existing `config.js` with the public anon/publishable key only.

Run these migrations in order if not already done:

1. `supabase-schema.sql`
2. `supabase-auth-policies.sql`
3. `supabase-v4-bin-production-migration.sql`
4. `supabase-v5-ticket-portal-migration.sql`

The v5 migration creates:

- `material_issue_tickets`
- `material_issue_ticket_lines`

It does not delete inventory data.

## Local run

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Production flow

1. Production Team signs in and selects **Production Team**.
2. Production searches inventory and clicks **Add to Cart**.
3. In Cart, production enters required quantities and raises a ticket.
4. Stores signs in as **Inventory / Stores Team**.
5. Stores opens **Ticket Notifications**.
6. Stores verifies availability and clicks **Verify & Issue**.
7. The system deducts stock, adds issue logs, updates reorder flags, and opens the printable issue ticket.

## Note on access control

The current build separates team portals in the UI. Supabase RLS allows authenticated users to use the required tables. For strict role-based enforcement, add a user role table and role-specific RLS policies later.
