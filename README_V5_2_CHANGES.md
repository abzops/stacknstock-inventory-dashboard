# Stack n Stock Inventory Dashboard v5.2

## Changes in this patch

1. Issue Logs are now grouped by ticket/log number.
   - One row appears per issue ticket/log.
   - Clicking a log opens all product lines and details.
   - A print button is available inside the log detail view.

2. Production Material Request Cart UI improved.
   - Work Order / Job, Department, Received By, Return Expected, and Notes are mandatory.
   - Request Ref (MR/Kit) was removed.
   - Successful ticket creation now shows Ticket No, Job No, and item count.

3. Bin Location Register improved.
   - Added overview cards.
   - All bin table headers are sortable.

4. Reorder Point improved.
   - Reorder point is editable per item.
   - Reorder flag can be enabled or disabled per item.
   - These per-item settings are stored locally in the browser.

## Setup

Use your existing working `config.js` from v5.1.
No new Supabase migration is required for this patch.

Run locally:

```bash
python -m http.server 8000
```

Open:

```txt
http://localhost:8000
```
