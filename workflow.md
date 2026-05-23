# Inventory Dashboard Workflow

This document converts the handwritten inventory-dashboard notes into a structured workflow for raw material issue, production/WIP conversion, scrap, material return, job work, delivery challan, cost summary, and ticket-based material issue.

---

## 1. MIV Register

**MIV = Material Issue Voucher**

### Purpose
The MIV Register is used when raw material is issued from the store for:

- Production
- Job work
- Work order processing

### Stock Impact
After saving/posting an MIV:

- Raw material stock in the store should reduce.
- The issue entry should be available in Issue Logs.
- The issued item should be selectable in the WIP/Conversion screen.

### Basic Flow

```text
Store Raw Material Stock → MIV Register → Issue Logs → WIP/Conversion
```

---

## 2. Issue Logs

### Purpose
Issue Logs maintain the detailed history of all material issues.

### Details Captured
Issue Logs should track every material movement issued from the store, including:

- Issue voucher/reference number
- Item code
- Item name
- Quantity issued
- Unit cost
- Total issue cost
- Work order/job work reference, if applicable
- Date and user information

### Usage
The item-code dropdown in the WIP/Conversion screen should be populated from Issue Logs.

### Basic Flow

```text
MIV Register → Issue Logs → WIP/Conversion Item Selection
```

---

## 3. WIP / Conversion

**WIP = Work in Progress**

### Purpose
The WIP/Conversion screen is the main production conversion screen.

It is used to convert issued raw material into:

- Semi-finished goods
- Finished goods

### Example Entry

#### Input Material

| Field | Value |
|---|---|
| Input Item Code | RM-STL-001 |
| Input Quantity | 50 kg |
| Input Unit Cost | 120 |
| Input Cost | 6,000 |

#### Process

| Field | Value |
|---|---|
| Process Name | Cutting & Welding |

#### Output Material

| Field | Value |
|---|---|
| Output Item Code | FG-BRKT-001 |
| Output Quantity | 25 Nos |
| Labour Cost | 800 |
| Consumables Cost | 300 |

### Cost Calculation

```text
Input Material Cost = 50 × 120 = 6,000
Labour Cost         = 800
Consumables Cost    = 300
Total Cost          = 7,100
Cost per Output Unit = 7,100 ÷ 25 = 284
```

### Posting Impact
After posting WIP/Conversion:

- Issued raw material quantity reduces.
- Output item stock increases.
- Cost ledger is posted.
- Cost per output unit is calculated and stored.

### Inventory Movement

```text
Raw Material / Issued Material → WIP → Finished Goods
```

### Basic Flow

```text
Issue Logs → WIP/Conversion → FG Stock → Cost Ledger
```

---

## 4. Scrap Register

### Purpose
The Scrap Register is used when scrap is generated during production.

### Example Entry

| Field | Value |
|---|---|
| Work Order | 1234 |
| Process | Cutting & Welding |
| Scrap Item | SCRAP-STL-001 |
| Scrap Quantity | 3 kg |
| Scrap Value | 30 per kg |

### Posting Impact
After saving/posting scrap:

- Scrap quantity should be recorded against the work order/process.
- Scrap stock should increase, if scrap is inventory-tracked.
- Scrap value should be available for costing or reporting.

### Basic Flow

```text
WIP/Conversion → Scrap Register
```

---

## 5. MRN Return Register

**MRN = Material Return Note**

### Purpose
The MRN Return Register is used when issued material is not fully consumed and the balance is returned back to the store.

### Example

| Field | Value |
|---|---|
| Issued Quantity | 50 kg |
| Used in WIP | 45 kg |
| Return Quantity | 5 kg |

### Posting Impact
After posting an MRN return:

- Returned quantity should increase store stock.
- Issue Logs should reflect the returned quantity.
- Net consumed quantity should be available for WIP/costing.

### Basic Flow

```text
Issue Logs → MRN Return Register → Store Stock
```

---

## 6. Job Work

### Purpose
Job Work is used when material is sent outside the company for external processing.

### Example Use Case
Raw material is sent to a vendor for:

- Machining
- Coating
- Plating
- Any other outsourced process

### Basic Flow

```text
MIV Register → Job Work → Delivery Challan → Receive Back → WIP/Conversion
```

### Posting Impact
When material is sent for job work:

- Material should move out from store/job-work stock.
- A delivery challan should be generated for outward movement.
- The material should later be received back after vendor processing.
- Received material can be used in WIP/Conversion.

---

## 7. Delivery Challan

### Purpose
Delivery Challan is used for dispatching material outward.

### Use Cases
Use a Delivery Challan when sending goods to:

- Customer
- Vendor
- Job worker
- Site
- Another location

### Finished Goods Flow

```text
WIP/Conversion → FG Stock → Delivery Challan
```

### Job Work Flow

```text
Raw Material Stock → MIV/Issue → Delivery Challan → Job Worker
```

### Posting Impact
After posting a delivery challan:

- Outward movement should be recorded.
- Stock should reduce from the relevant location/status.
- The challan should be linked to the customer/vendor/job worker/site/location.

---

## 8. Cost Summary

### Purpose
The Cost Summary gives the final costing view of the production or conversion process.

### Cost Components
The cost summary should include:

- Input material cost
- Labour cost
- Consumables cost
- Scrap value, if applicable
- Job work cost, if applicable
- Total production cost
- Cost per output unit

### Example

| Cost Component | Amount |
|---|---:|
| Input Material Cost | 6,000 |
| Labour Cost | 800 |
| Consumables Cost | 300 |
| Total Cost | 7,100 |
| Output Quantity | 25 Nos |
| Cost per Output Unit | 284 |

---

## 9. Ticket Notification

### Purpose
Ticket Notification is used when the production team raises an issue ticket for required items.

### Process

1. Production team raises an issue ticket for required material.
2. Store/inventory team reviews the ticket.
3. Store/inventory issues the required items against that ticket.
4. The issue is recorded in MIV/Issue Logs.

### Basic Flow

```text
Production Requirement → Issue Ticket → Store/Inventory Review → MIV/Issue → Issue Logs
```

---

## End-to-End Workflows

### A. Production / Finished Goods Workflow

```text
Store Raw Material Stock
  → MIV Register
  → Issue Logs
  → WIP/Conversion
  → Finished Goods Stock
  → Delivery Challan
  → Cost Summary
```

### B. Job Work Workflow

```text
Raw Material Stock
  → MIV/Issue
  → Delivery Challan
  → Job Worker
  → Receive Back
  → WIP/Conversion
```

### C. Scrap Workflow

```text
WIP/Conversion
  → Scrap Register
  → Scrap Stock / Scrap Value
  → Cost Summary
```

### D. Material Return Workflow

```text
Issue Logs
  → MRN Return Register
  → Store Stock
```

### E. Ticket-Based Material Issue Workflow

```text
Production Team
  → Issue Ticket
  → Store/Inventory
  → MIV Register
  → Issue Logs
  → WIP/Conversion
```

---

## Suggested Dashboard Modules

The inventory dashboard can be organized into the following modules:

1. MIV Register
2. Issue Logs
3. WIP/Conversion
4. Scrap Register
5. MRN Return Register
6. Job Work
7. Delivery Challan
8. Cost Summary
9. Ticket Notifications

---

## Key Stock Movements

| Transaction | Stock Impact |
|---|---|
| MIV Register | Raw material stock decreases |
| WIP/Conversion | Issued raw material decreases; output stock increases |
| Scrap Register | Scrap stock increases |
| MRN Return Register | Store stock increases |
| Job Work Issue | Material moves outside for processing |
| Delivery Challan | Relevant stock decreases due to outward dispatch |
| Receive Back from Job Work | Processed material stock increases |

---

## Key Business Rules

- MIV should always reduce store stock after posting.
- Issue Logs should maintain complete material issue history.
- WIP/Conversion item dropdown should use issued item codes from Issue Logs.
- WIP/Conversion should increase output item stock after posting.
- Cost ledger should be posted after WIP/Conversion.
- Scrap generated during production should be recorded in the Scrap Register.
- Returned unused material should be posted through the MRN Return Register.
- Delivery Challan should be used for any outward material movement.
- Cost Summary should show final costing after material, labour, consumables, scrap, and job work adjustments.
