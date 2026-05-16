// Stack n Stock V7 layer. Loaded after app.js, then starts the app.
Object.assign(state, {
  stockLedger: [],
  grns: [],
  grnLines: [],
  mivs: [],
  mivLines: [],
  deliveryChallans: [],
  deliveryChallanLines: [],
  jobWorks: [],
  jobWorkLines: [],
  wipConversions: [],
  wipConversionLines: [],
  scrapLogs: [],
  reorderSettingsDb: [],
  itemCostLayers: [],
  actionQueue: [],
  dcDraftLines: [],
  jobWorkDraftLines: [],
  wipDraftLines: [],
  scrapDraftLines: [],
});

const V7_TABLES = {
  stockLedger: "stock_ledger",
  grns: "grn_headers",
  grnLines: "grn_lines",
  mivs: "miv_headers",
  mivLines: "miv_lines",
  deliveryChallans: "delivery_challans",
  deliveryChallanLines: "delivery_challan_lines",
  jobWorks: "job_work_headers",
  jobWorkLines: "job_work_lines",
  wipConversions: "wip_conversions",
  wipConversionLines: "wip_conversion_lines",
  scrapLogs: "scrap_register",
  reorderSettingsDb: "reorder_settings",
  itemCostLayers: "item_cost_layers",
};

const v7Num = (v) => Number(v || 0);
const todayISO = () => new Date().toISOString().slice(0, 10);
const upper = (v) => String(v || "").trim().toUpperCase();

function nextDocNo(prefix, rows, field) {
  const year = new Date().getFullYear();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`${escaped}/${year}/(\\d+)$`);
  const max = (rows || []).reduce((best, row) => {
    const match = String(row[field] || "").match(rx);
    return Math.max(best, match ? Number(match[1]) : 0);
  }, 0);
  return `${prefix}/${year}/${String(max + 1).padStart(4, "0")}`;
}

function normalizeLedger(row) {
  return {
    id: row.id || uid(),
    ledger_date: row.ledger_date || todayISO(),
    movement_type: upper(row.movement_type || "ADJUSTMENT_IN"),
    source_doc_type: row.source_doc_type || "",
    source_doc_no: row.source_doc_no || "",
    source_line_id: row.source_line_id || "",
    item_id: row.item_id || "",
    item_code: row.item_code || "",
    description: row.description || "",
    uom: row.uom || "",
    in_qty: v7Num(row.in_qty),
    out_qty: v7Num(row.out_qty),
    from_bin: row.from_bin || "",
    to_bin: row.to_bin || "",
    location_status: row.location_status || "OK",
    work_order: row.work_order || "",
    department: row.department || "",
    vendor: row.vendor || "",
    qty_before: v7Num(row.qty_before),
    qty_after: v7Num(row.qty_after),
    unit_cost: v7Num(row.unit_cost),
    total_value: v7Num(row.total_value),
    remarks: row.remarks || "",
    created_by: row.created_by || null,
    created_by_email: row.created_by_email || "",
    created_at: row.created_at || new Date().toISOString(),
  };
}

function normalizeGrn(row) {
  return {
    id: row.id || uid(),
    grn_no: row.grn_no || nextDocNo("GRN", state.grns, "grn_no"),
    grn_date: row.grn_date || todayISO(),
    po_no: row.po_no || "",
    supplier: row.supplier || "",
    invoice_no: row.invoice_no || "",
    dc_no: row.dc_no || "",
    received_by: row.received_by || "",
    qc_status: upper(row.qc_status || "PENDING"),
    remarks: row.remarks || "",
    created_by: row.created_by || null,
    created_by_email: row.created_by_email || "",
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function normalizeGrnLine(row) {
  return {
    id: row.id || uid(),
    grn_id: row.grn_id || "",
    item_code: row.item_code || "",
    description: row.description || "",
    uom: row.uom || "",
    ordered_qty: v7Num(row.ordered_qty),
    received_qty: v7Num(row.received_qty),
    accepted_qty: v7Num(row.accepted_qty),
    rejected_qty: v7Num(row.rejected_qty),
    hold_qty: v7Num(row.hold_qty),
    putaway_bin: row.putaway_bin || "",
    unit_rate: v7Num(row.unit_rate),
    landed_cost: v7Num(row.landed_cost),
    qc_status: upper(row.qc_status || "PENDING"),
    remarks: row.remarks || "",
    created_at: row.created_at || new Date().toISOString(),
  };
}

function normalizeMiv(row) {
  return {
    id: row.id || uid(),
    miv_no: row.miv_no || nextDocNo("MIV", state.mivs, "miv_no"),
    miv_date: row.miv_date || todayISO(),
    source_ticket_no: row.source_ticket_no || "",
    issued_from: row.issued_from || "",
    issued_to: row.issued_to || "Production",
    department: row.department || "",
    work_order: row.work_order || "",
    issue_type: row.issue_type || "PRODUCTION",
    return_expected: row.return_expected || "N",
    expected_return_date: row.expected_return_date || null,
    issued_by: row.issued_by || "",
    received_by: row.received_by || "",
    status: upper(row.status || "ISSUED"),
    remarks: row.remarks || "",
    created_by: row.created_by || null,
    created_by_email: row.created_by_email || "",
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function normalizeMivLine(row) {
  return {
    id: row.id || uid(),
    miv_id: row.miv_id || "",
    item_id: row.item_id || "",
    item_code: row.item_code || "",
    description: row.description || "",
    uom: row.uom || "",
    from_bin: row.from_bin || "",
    qty_requested: v7Num(row.qty_requested),
    qty_issued: v7Num(row.qty_issued),
    remarks: row.remarks || "",
    created_at: row.created_at || new Date().toISOString(),
  };
}

function normalizeDc(row) {
  return {
    id: row.id || uid(),
    dc_no: row.dc_no || nextDocNo("DC/JW", state.deliveryChallans, "dc_no"),
    dc_date: row.dc_date || todayISO(),
    linked_job_work_no: row.linked_job_work_no || "",
    vendor: row.vendor || "",
    vendor_address: row.vendor_address || "",
    vendor_gstin: row.vendor_gstin || "",
    purpose: row.purpose || "JOB_WORK",
    returnable: row.returnable || "Y",
    expected_return_date: row.expected_return_date || null,
    vehicle_no: row.vehicle_no || "",
    transporter: row.transporter || "",
    eway_bill_no: row.eway_bill_no || "",
    approx_value: v7Num(row.approx_value),
    status: upper(row.status || "OPEN"),
    remarks: row.remarks || "",
    created_by: row.created_by || null,
    created_by_email: row.created_by_email || "",
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function normalizeDcLine(row) {
  return {
    id: row.id || uid(),
    dc_id: row.dc_id || "",
    item_code: row.item_code || "",
    description: row.description || "",
    hsn_sac: row.hsn_sac || "",
    uom: row.uom || "",
    qty: v7Num(row.qty),
    rate: v7Num(row.rate),
    value: v7Num(row.value),
    remarks: row.remarks || "",
    created_at: row.created_at || new Date().toISOString(),
  };
}

function normalizeJobWork(row) {
  return {
    id: row.id || uid(),
    job_work_no: row.job_work_no || nextDocNo("JW", state.jobWorks, "job_work_no"),
    date_sent: row.date_sent || todayISO(),
    vendor: row.vendor || "",
    delivery_challan_no: row.delivery_challan_no || "",
    expected_return_date: row.expected_return_date || null,
    process_instruction: row.process_instruction || "",
    status: upper(row.status || "OPEN"),
    vendor_invoice_no: row.vendor_invoice_no || "",
    job_charges: v7Num(row.job_charges),
    transport_cost: v7Num(row.transport_cost),
    gst_amount: v7Num(row.gst_amount),
    remarks: row.remarks || "",
    created_by: row.created_by || null,
    created_by_email: row.created_by_email || "",
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function normalizeJobWorkLine(row) {
  return {
    id: row.id || uid(),
    job_work_id: row.job_work_id || "",
    source_item_code: row.source_item_code || "",
    source_description: row.source_description || "",
    source_uom: row.source_uom || "",
    qty_sent: v7Num(row.qty_sent),
    output_item_code: row.output_item_code || "",
    output_description: row.output_description || "",
    qty_received: v7Num(row.qty_received),
    wastage_qty: v7Num(row.wastage_qty),
    qc_status: upper(row.qc_status || "PENDING"),
    remarks: row.remarks || "",
    created_at: row.created_at || new Date().toISOString(),
  };
}

function normalizeWip(row) {
  return {
    id: row.id || uid(),
    wip_no: row.wip_no || nextDocNo("WIP", state.wipConversions, "wip_no"),
    start_date: row.start_date || todayISO(),
    completion_date: row.completion_date || null,
    work_order: row.work_order || "",
    process_name: row.process_name || "",
    output_item_code: row.output_item_code || "",
    output_description: row.output_description || "",
    output_uom: row.output_uom || "",
    output_qty: v7Num(row.output_qty),
    labour_cost: v7Num(row.labour_cost),
    consumables_cost: v7Num(row.consumables_cost),
    status: upper(row.status || "IN_PROGRESS"),
    remarks: row.remarks || "",
    created_by: row.created_by || null,
    created_by_email: row.created_by_email || "",
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function normalizeWipLine(row) {
  return {
    id: row.id || uid(),
    wip_id: row.wip_id || "",
    input_item_code: row.input_item_code || "",
    input_description: row.input_description || "",
    input_uom: row.input_uom || "",
    qty_used: v7Num(row.qty_used),
    unit_cost: v7Num(row.unit_cost),
    total_value: v7Num(row.total_value),
    remarks: row.remarks || "",
    created_at: row.created_at || new Date().toISOString(),
  };
}

function normalizeScrap(row) {
  return {
    id: row.id || uid(),
    scrap_no: row.scrap_no || nextDocNo("SCR", state.scrapLogs, "scrap_no"),
    scrap_date: row.scrap_date || todayISO(),
    source_doc_type: row.source_doc_type || "",
    source_doc_no: row.source_doc_no || "",
    item_code: row.item_code || "",
    description: row.description || "",
    uom: row.uom || "",
    qty_scrapped: v7Num(row.qty_scrapped),
    reason: row.reason || "",
    approved_by: row.approved_by || "",
    scrap_value: v7Num(row.scrap_value),
    status: upper(row.status || "RECORDED"),
    remarks: row.remarks || "",
    created_by: row.created_by || null,
    created_by_email: row.created_by_email || "",
    created_at: row.created_at || new Date().toISOString(),
  };
}

function normalizeReorderDb(row) {
  return {
    id: row.id || uid(),
    item_code: row.item_code || "",
    reorder_point: v7Num(row.reorder_point),
    reorder_qty: v7Num(row.reorder_qty),
    enabled: row.enabled !== false,
    preferred_supplier: row.preferred_supplier || "",
    lead_time_days: v7Num(row.lead_time_days),
    updated_by: row.updated_by || null,
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function normalizeCostLayer(row) {
  return {
    id: row.id || uid(),
    item_code: row.item_code || "",
    source_doc_type: row.source_doc_type || "",
    source_doc_no: row.source_doc_no || "",
    qty: v7Num(row.qty),
    unit_cost: v7Num(row.unit_cost),
    total_value: v7Num(row.total_value),
    cost_method: row.cost_method || "ACTUAL",
    created_at: row.created_at || new Date().toISOString(),
  };
}

function ledgerEntriesFor(itemCode) {
  const code = upper(itemCode);
  return state.stockLedger.filter((x) => upper(x.item_code) === code);
}

function calculateItemBalance(itemCode) {
  const entries = ledgerEntriesFor(itemCode);
  if (entries.length) return entries.reduce((sum, x) => sum + v7Num(x.in_qty) - v7Num(x.out_qty), 0);
  const item = state.inventory.find((x) => upper(x.item_code) === upper(itemCode));
  return v7Num(item?.qty);
}

function calculateAvailableStock(itemCode) {
  const hold = state.quarantine
    .filter((x) => upper(x.item_code) === upper(itemCode) && ["HOLD", "MRB", "REJECT"].includes(upper(x.status)))
    .reduce((sum, x) => sum + v7Num(x.qty_hold), 0);
  return Math.max(0, calculateItemBalance(itemCode) - hold);
}

function recalculateInventoryBalances() {
  state.inventory = state.inventory.map((item) => ledgerEntriesFor(item.item_code).length ? normalizeItem({ ...item, qty: calculateItemBalance(item.item_code), updated_at: new Date().toISOString() }) : item);
}

function ensureInventoryItem({ item_code, description = "", uom = "", supplier = "", bin = "", qty = 0, status = "OK" }) {
  let item = state.inventory.find((x) => upper(x.item_code) === upper(item_code));
  if (!item) {
    item = normalizeItem({ id: uid(), supplier, item_code, description, uom, qty, status, bin, part_no: "" });
    state.inventory.unshift(item);
  } else {
    item.description = item.description || description;
    item.uom = item.uom || uom;
    item.supplier = item.supplier || supplier;
    item.bin = item.bin || bin;
  }
  return item;
}

async function insertRows(table, rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!state.dbReady || !state.user || !list.length) return;
  const { error } = await state.supabase.from(table).insert(list);
  if (error) throw new Error(`${table} save failed: ${error.message}`);
}

async function upsertRows(table, rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!state.dbReady || !state.user || !list.length) return;
  const { error } = await state.supabase.from(table).upsert(list);
  if (error) throw new Error(`${table} save failed: ${error.message}`);
}

async function postLedgerEntry(entry) {
  const code = upper(entry.item_code);
  const inQty = v7Num(entry.in_qty);
  const outQty = v7Num(entry.out_qty);
  if (!code) throw new Error("Ledger item code is required.");

  let item = inventoryMasterItemByCode(code);
  if (outQty > 0) {
    if (!item) throw new Error(`Item ${code} does not exist in Inventory Master. Select a valid item code.`);
    const beforeCheck = calculateAvailableStock(code);
    if (beforeCheck < outQty) throw new Error(`Insufficient stock for ${code}. Available ${moneyish(beforeCheck)}, requested ${moneyish(outQty)}.`);
  }
  if (!item) {
    item = ensureInventoryItem({ item_code: code, description: entry.description, uom: entry.uom, supplier: entry.vendor || "", bin: entry.to_bin || entry.from_bin || "", qty: 0 });
  }

  const before = calculateItemBalance(code);
  const after = before + inQty - outQty;
  if (after < 0) throw new Error(`Negative stock blocked for ${code}.`);

  const row = normalizeLedger({
    ...entry,
    item_id: entry.item_id || item.id,
    item_code: code,
    description: entry.description || item.description,
    uom: entry.uom || item.uom,
    qty_before: before,
    qty_after: after,
    created_by: entry.created_by || state.user?.id || null,
    created_by_email: entry.created_by_email || state.user?.email || "",
  });
  state.stockLedger.unshift(row);
  item.qty = row.qty_after;
  item.updated_at = new Date().toISOString();
  if (row.to_bin) item.bin = row.to_bin;
  persistLocal();
  await insertRows("stock_ledger", row);
  if (state.dbReady && state.user) await state.supabase.from("inventory_items").upsert(item);
  return row;
}


async function addCostLayer(row) {
  const layer = normalizeCostLayer(row);
  state.itemCostLayers.unshift(layer);
  persistLocal();
  await insertRows("item_cost_layers", layer);
  return layer;
}

const v7PreviousLoadData = loadData;
loadData = async function() {
  await v7PreviousLoadData();
  const cached = JSON.parse(localStorage.getItem("sns_inventory_dashboard") || "{}");
  const loadCached = () => {
    state.stockLedger = (cached.stockLedger || []).map(normalizeLedger);
    state.grns = (cached.grns || []).map(normalizeGrn);
    state.grnLines = (cached.grnLines || []).map(normalizeGrnLine);
    state.mivs = (cached.mivs || []).map(normalizeMiv);
    state.mivLines = (cached.mivLines || []).map(normalizeMivLine);
    state.deliveryChallans = (cached.deliveryChallans || []).map(normalizeDc);
    state.deliveryChallanLines = (cached.deliveryChallanLines || []).map(normalizeDcLine);
    state.jobWorks = (cached.jobWorks || []).map(normalizeJobWork);
    state.jobWorkLines = (cached.jobWorkLines || []).map(normalizeJobWorkLine);
    state.wipConversions = (cached.wipConversions || []).map(normalizeWip);
    state.wipConversionLines = (cached.wipConversionLines || []).map(normalizeWipLine);
    state.scrapLogs = (cached.scrapLogs || []).map(normalizeScrap);
    state.reorderSettingsDb = (cached.reorderSettingsDb || []).map(normalizeReorderDb);
    state.itemCostLayers = (cached.itemCostLayers || []).map(normalizeCostLayer);
  };
  if (!state.dbReady || !state.user) {
    loadCached();
    recalculateInventoryBalances();
    return;
  }
  const fetchTable = async (key, normalizer, order = "created_at") => {
    const res = await state.supabase.from(V7_TABLES[key]).select("*").order(order, { ascending: false });
    if (res.error) {
      console.warn(`${V7_TABLES[key]} skipped. Run V7 migration.`, res.error);
      return [];
    }
    return (res.data || []).map(normalizer);
  };
  try {
    const [ledger, grns, grnLines, mivs, mivLines, dcs, dcLines, jobs, jobLines, wips, wipLines, scrap, reorderDb, costLayers] = await Promise.all([
      fetchTable("stockLedger", normalizeLedger),
      fetchTable("grns", normalizeGrn),
      fetchTable("grnLines", normalizeGrnLine),
      fetchTable("mivs", normalizeMiv),
      fetchTable("mivLines", normalizeMivLine),
      fetchTable("deliveryChallans", normalizeDc),
      fetchTable("deliveryChallanLines", normalizeDcLine),
      fetchTable("jobWorks", normalizeJobWork),
      fetchTable("jobWorkLines", normalizeJobWorkLine),
      fetchTable("wipConversions", normalizeWip),
      fetchTable("wipConversionLines", normalizeWipLine),
      fetchTable("scrapLogs", normalizeScrap),
      fetchTable("reorderSettingsDb", normalizeReorderDb, "updated_at"),
      fetchTable("itemCostLayers", normalizeCostLayer),
    ]);
    Object.assign(state, { stockLedger: ledger, grns, grnLines, mivs, mivLines, deliveryChallans: dcs, deliveryChallanLines: dcLines, jobWorks: jobs, jobWorkLines: jobLines, wipConversions: wips, wipConversionLines: wipLines, scrapLogs: scrap, reorderSettingsDb: reorderDb, itemCostLayers: costLayers });
  } catch (err) {
    console.warn("V7 load failed; using cached V7 data.", err);
    loadCached();
  }
  recalculateInventoryBalances();
};

persistLocal = function() {
  localStorage.setItem("sns_inventory_dashboard", JSON.stringify({
    inventory: state.inventory,
    quarantine: state.quarantine,
    binLocations: state.binLocations,
    movements: state.movements,
    tickets: state.tickets,
    ticketLines: state.ticketLines,
    returnLogs: state.returnLogs,
    returnLogLines: state.returnLogLines,
    stockLedger: state.stockLedger,
    grns: state.grns,
    grnLines: state.grnLines,
    mivs: state.mivs,
    mivLines: state.mivLines,
    deliveryChallans: state.deliveryChallans,
    deliveryChallanLines: state.deliveryChallanLines,
    jobWorks: state.jobWorks,
    jobWorkLines: state.jobWorkLines,
    wipConversions: state.wipConversions,
    wipConversionLines: state.wipConversionLines,
    scrapLogs: state.scrapLogs,
    reorderSettingsDb: state.reorderSettingsDb,
    itemCostLayers: state.itemCostLayers,
  }));
};

function itemByCode(code) {
  return itemLookupRows().find((x) => upper(x.item_code) === upper(code));
}

function inventoryMasterItemByCode(code) {
  return state.inventory.find((x) => upper(x.item_code) === upper(code));
}

function mivAvailableItemRows() {
  return state.inventory
    .map((item) => ({
      ...item,
      item_code: upper(item.item_code),
      description: item.description || "",
      uom: item.uom || "",
      bin: item.bin || "",
      available_qty: calculateAvailableStock(item.item_code),
      source: "Inventory Master",
    }))
    .filter((item) => item.item_code && item.available_qty > 0)
    .sort((a, b) => String(a.item_code).localeCompare(String(b.item_code)));
}

function mivAvailableItemByCode(code) {
  return mivAvailableItemRows().find((x) => upper(x.item_code) === upper(code));
}

function mivIssueRows() {
  return state.mivLines.map((line) => {
    const miv = state.mivs.find((m) => m.id === line.miv_id) || {};
    return {
      item_id: line.item_id,
      item_code: line.item_code,
      description: line.description,
      uom: line.uom,
      from_bin: line.from_bin,
      qty_issued: line.qty_issued,
      source_doc: miv.miv_no || "",
      source_type: "MIV Register",
    };
  }).filter((x) => x.item_code);
}

function movementIssueRows() {
  return state.movements
    .filter((m) => upper(m.movement_type) !== "PRODUCTION_RETURN")
    .map((m) => {
      const item = itemByCode(m.item_code) || {};
      return {
        item_id: m.item_id || item.id || "",
        item_code: m.item_code,
        description: m.description || item.description || "",
        uom: item.uom || "",
        from_bin: m.bin || item.bin || "",
        qty_issued: v7Num(m.qty_taken),
        source_doc: ticketNoFromMovement(m),
        source_type: "Issue Logs",
      };
    }).filter((x) => x.item_code);
}

function issuedItemRows() {
  const map = new Map();
  [...mivIssueRows(), ...movementIssueRows()].forEach((row) => {
    const key = upper(row.item_code);
    if (!map.has(key)) map.set(key, { ...row, qty_issued: 0, source_docs: new Set(), sources: new Set() });
    const found = map.get(key);
    found.description = found.description || row.description;
    found.uom = found.uom || row.uom;
    found.from_bin = found.from_bin || row.from_bin;
    found.qty_issued += v7Num(row.qty_issued);
    found.source_docs.add(row.source_doc);
    found.sources.add(row.source_type);
  });
  return [...map.values()].map((row) => ({
    ...row,
    source_docs: [...row.source_docs].filter(Boolean),
    sources: [...row.sources],
  })).sort((a, b) => String(a.item_code).localeCompare(String(b.item_code)));
}

function issuedItemByCode(code) {
  const issued = issuedItemRows().find((x) => upper(x.item_code) === upper(code));
  if (issued) return {
    item_code: issued.item_code,
    description: issued.description,
    uom: issued.uom,
    bin: issued.from_bin,
    qty_issued: issued.qty_issued,
    supplier: issued.sources.join(" + "),
    source: issued.sources.join(" + "),
  };
  return null;
}

function isIssuedItemCode(itemCode) {
  return Boolean(issuedItemRows().find((row) => upper(row.item_code) === upper(itemCode)));
}

function transactionItemRows() {
  const rows = [];
  state.grnLines.forEach((l) => rows.push({ item_code: l.item_code, description: l.description, uom: l.uom, bin: l.putaway_bin, supplier: state.grns.find((g) => g.id === l.grn_id)?.supplier || "", source: "GRN Register" }));
  state.jobWorkLines.forEach((l) => {
    rows.push({ item_code: l.source_item_code, description: l.source_description, uom: l.source_uom, bin: "", supplier: "", source: "Job Work Source" });
    rows.push({ item_code: l.output_item_code, description: l.output_description, uom: l.source_uom, bin: "", supplier: "", source: "Job Work Output" });
  });
  state.wipConversionLines.forEach((l) => rows.push({ item_code: l.input_item_code, description: l.input_description, uom: l.input_uom, bin: "", supplier: "", source: "WIP Input" }));
  state.wipConversions.forEach((w) => rows.push({ item_code: w.output_item_code, description: w.output_description, uom: w.output_uom, bin: "", supplier: "", source: "WIP Output" }));
  state.scrapLogs.forEach((s) => rows.push({ item_code: s.item_code, description: s.description, uom: s.uom, bin: "", supplier: "", source: "Scrap Register" }));
  issuedItemRows().forEach((row) => rows.push({ item_code: row.item_code, description: row.description, uom: row.uom, bin: row.from_bin, supplier: "", source: row.sources.join(" + ") }));
  return rows.filter((x) => x.item_code);
}

function itemLookupRows() {
  const map = new Map();
  state.inventory.forEach((item) => map.set(upper(item.item_code), { ...item, source: "Inventory Master" }));
  transactionItemRows().forEach((row) => {
    const key = upper(row.item_code);
    if (!map.has(key)) map.set(key, normalizeItem({ ...row, id: `lookup-${key}`, qty: calculateItemBalance(row.item_code), status: "OK", part_no: "" }));
    else {
      const existing = map.get(key);
      existing.description = existing.description || row.description;
      existing.uom = existing.uom || row.uom;
      existing.bin = existing.bin || row.bin;
      existing.supplier = existing.supplier || row.supplier;
      if (["MIV Register", "Issue Logs", "MIV Register + Issue Logs"].includes(row.source)) existing.source = row.source;
    }
  });
  return [...map.values()].sort((a, b) => String(a.item_code || "").localeCompare(String(b.item_code || "")));
}

function latestUnitCost(itemCode) {
  const layer = state.itemCostLayers.filter((x) => upper(x.item_code) === upper(itemCode) && v7Num(x.unit_cost) > 0).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  return layer ? v7Num(layer.unit_cost) : 0;
}

function ensureDatalist(id) {
  let list = $(id);
  if (!list) {
    list = document.createElement("datalist");
    list.id = id;
    document.body.appendChild(list);
  }
  return list;
}

function refreshItemCodeDropdowns() {
  const list = ensureDatalist("itemCodeOptions");
  list.innerHTML = itemLookupRows().map((item) => {
    const label = [item.description, item.uom, item.bin, `Avail ${moneyish(calculateAvailableStock(item.item_code))}`, item.source].filter(Boolean).join(" | ");
    return `<option value="${escapeHtml(item.item_code)}" label="${escapeHtml(label)}"></option>`;
  }).join("");
  document.querySelectorAll("[data-item-code-input='true']:not([data-issued-source='true']):not([data-miv-source='true'])").forEach((input) => input.setAttribute("list", "itemCodeOptions"));
}

function refreshMivAvailableItemDropdown() {
  const list = ensureDatalist("mivAvailableItemCodeOptions");
  const rows = mivAvailableItemRows();
  list.innerHTML = rows.map((item) => {
    const label = [item.description, item.uom, item.bin, `Avail ${moneyish(item.available_qty)}`].filter(Boolean).join(" | ");
    return `<option value="${escapeHtml(item.item_code)}" label="${escapeHtml(label)}"></option>`;
  }).join("");
  const input = $("mivItemCode");
  if (input) {
    input.dataset.itemCodeInput = "true";
    input.dataset.mivSource = "true";
    if (input.tagName === "SELECT") {
      const current = input.value;
      input.innerHTML = `<option value="">${rows.length ? "Select available item code" : "No available stock items"}</option>` + rows.map((item) => {
        const label = [item.item_code, item.description, item.uom, item.bin, `Avail ${moneyish(item.available_qty)}`].filter(Boolean).join(" | ");
        return `<option value="${escapeHtml(item.item_code)}">${escapeHtml(label)}</option>`;
      }).join("");
      if (current && rows.some((item) => upper(item.item_code) === upper(current))) input.value = current;
    } else {
      input.setAttribute("list", "mivAvailableItemCodeOptions");
      input.setAttribute("autocomplete", "off");
      input.placeholder = rows.length ? "Search available item code" : "No available stock items";
    }
  }
}

function refreshIssuedItemDropdown() {
  const list = ensureDatalist("issuedItemCodeOptions");
  const rows = issuedItemRows();
  const optionHtml = rows.map((item) => {
    const label = [item.description, item.uom, item.from_bin, `Issued ${moneyish(item.qty_issued)}`, item.sources.join(" + "), item.source_docs.join(", ")].filter(Boolean).join(" | ");
    return `<option value="${escapeHtml(item.item_code)}" label="${escapeHtml(label)}"></option>`;
  }).join("");
  list.innerHTML = optionHtml;
  const selectHtml = `<option value="">Select issued item code</option>` + rows.map((item) => {
    const label = [item.item_code, item.description, item.uom, `Issued ${moneyish(item.qty_issued)}`, item.sources.join(" + ")].filter(Boolean).join(" | ");
    return `<option value="${escapeHtml(item.item_code)}">${escapeHtml(label)}</option>`;
  }).join("");
  ["returnItemCode", "dcItemCode", "jobWorkSourceItem", "wipInputItem", "scrapItemCode"].forEach((id) => {
    const input = $(id);
    if (!input) return;
    const current = input.value;
    input.dataset.itemCodeInput = "true";
    input.dataset.issuedSource = "true";
    if (input.tagName === "SELECT") {
      input.innerHTML = selectHtml;
      if (current && rows.some((item) => upper(item.item_code) === upper(current))) input.value = current;
    } else {
      input.setAttribute("list", "issuedItemCodeOptions");
    }
  });
}

function refreshReturnIssueItemDropdown() {
  refreshIssuedItemDropdown();
}

function setFieldValue(id, value, mode = "always") {
  const el = $(id);
  if (!el) return;
  if (mode === "if-empty" && el.value) return;
  el.value = value ?? "";
}

function setAvailableHint(input, item, issuedOnly = false) {
  let hint = input.closest("label")?.querySelector(".item-autofill-hint");
  if (!hint && input.closest("label")) {
    hint = document.createElement("small");
    hint.className = "item-autofill-hint";
    input.closest("label").appendChild(hint);
  }
  if (!hint) return;
  if (!item) {
    hint.textContent = issuedOnly ? "Select item issued through MIV Register or Issue Logs." : "Select an existing item code to auto-fill item data.";
    return;
  }
  if (issuedOnly) {
    hint.textContent = `Issued ${moneyish(item.qty_issued)} ${item.uom || ""} | Bin ${item.bin || "-"} | Source ${item.source || "-"}`;
    return;
  }
  hint.textContent = `Available ${moneyish(calculateAvailableStock(item.item_code))} ${item.uom || ""} | Bin ${item.bin || "-"} | Source ${item.source || item.supplier || "-"}`;
}

function applyItemAutofill(config) {
  const input = $(config.inputId);
  if (!input) return;
  input.dataset.itemCodeInput = "true";
  if (config.source === "issued") input.dataset.issuedSource = "true";
  if (config.source === "available") input.dataset.mivSource = "true";
  if (input.tagName !== "SELECT") input.setAttribute("list", config.source === "issued" ? "issuedItemCodeOptions" : config.source === "available" ? "mivAvailableItemCodeOptions" : "itemCodeOptions");
  const run = () => {
    input.value = upper(input.value);
    const item = config.source === "issued" ? issuedItemByCode(input.value) : config.source === "available" ? mivAvailableItemByCode(input.value) : itemByCode(input.value);
    setAvailableHint(input, item, config.source === "issued");
    if (!item) return;
    setFieldValue(config.descriptionId, item.description);
    setFieldValue(config.uomId, item.uom);
    setFieldValue(config.binId, item.bin);
    setFieldValue(config.supplierId, item.supplier, "if-empty");
    if (config.unitCostId) {
      const cost = latestUnitCost(item.item_code);
      if (cost > 0) setFieldValue(config.unitCostId, cost, "if-empty");
    }
    if (config.qtyId && $(config.qtyId)) {
      $(config.qtyId).max = String(calculateAvailableStock(item.item_code));
      $(config.qtyId).title = `Available: ${moneyish(calculateAvailableStock(item.item_code))} ${item.uom || ""}`;
    }
  };
  input.addEventListener("input", run);
  input.addEventListener("change", run);
  input.addEventListener("blur", run);
}

function setupItemAutofill() {
  refreshItemCodeDropdowns();
  refreshMivAvailableItemDropdown();
  refreshIssuedItemDropdown();
  [
    { inputId: "grnItemCode", descriptionId: "grnDescription", uomId: "grnUom", binId: "grnPutawayBin", supplierId: "grnSupplier" },
    { inputId: "mivItemCode", descriptionId: "mivDescription", uomId: "mivUom", binId: "mivFromBin", qtyId: "mivQtyIssued", source: "available" },
    { inputId: "dcItemCode", descriptionId: "dcDescription", uomId: "dcUom", qtyId: "dcQty", source: "issued" },
    { inputId: "jobWorkSourceItem", descriptionId: "jobWorkSourceDesc", uomId: "jobWorkUom", qtyId: "jobWorkQtySent", source: "issued" },
    { inputId: "jobWorkOutputItem", descriptionId: "jobWorkOutputDesc" },
    { inputId: "wipInputItem", descriptionId: "wipInputDesc", uomId: "wipInputUom", qtyId: "wipQtyUsed", unitCostId: "wipUnitCost", source: "issued" },
    { inputId: "wipOutputItem", descriptionId: "wipOutputDesc", uomId: "wipOutputUom" },
    { inputId: "scrapItemCode", descriptionId: "scrapDescription", uomId: "scrapUom", qtyId: "scrapQty", source: "issued" },
  ].forEach(applyItemAutofill);
}

function setV7Msg(id, message, ok = true) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("success", ok);
}

function renderV7DraftLines() {
  if ($("dcDraftRows")) $("dcDraftRows").innerHTML = state.dcDraftLines.map((l) => `<tr><td>${escapeHtml(l.item_code)}</td><td>${escapeHtml(l.description)}</td><td>${escapeHtml(l.uom)}</td><td>${moneyish(l.qty)}</td><td>${moneyish(l.rate)}</td><td>${moneyish(l.value)}</td><td><button class="mini-btn danger" type="button" onclick="removeDcDraftLine('${l.id}')">Remove</button></td></tr>`).join("") || emptyRow(7);
  if ($("jobWorkDraftRows")) $("jobWorkDraftRows").innerHTML = state.jobWorkDraftLines.map((l) => `<tr><td>${escapeHtml(l.source_item_code)}<br><span class="muted">${escapeHtml(l.source_description)}</span></td><td>${moneyish(l.qty_sent)}</td><td>${escapeHtml(l.output_item_code || "-")}</td><td>${moneyish(l.qty_received)}</td><td>${moneyish(l.wastage_qty)}</td><td><button class="mini-btn danger" type="button" onclick="removeJobWorkDraftLine('${l.id}')">Remove</button></td></tr>`).join("") || emptyRow(6);
  if ($("wipDraftRows")) $("wipDraftRows").innerHTML = state.wipDraftLines.map((l) => `<tr><td>${escapeHtml(l.input_item_code)}</td><td>${escapeHtml(l.input_description)}</td><td>${escapeHtml(l.input_uom)}</td><td>${moneyish(l.qty_used)}</td><td>${moneyish(l.unit_cost)}</td><td>${moneyish(l.total_value)}</td><td><button class="mini-btn danger" type="button" onclick="removeWipDraftLine('${l.id}')">Remove</button></td></tr>`).join("") || emptyRow(7);
  if ($("scrapDraftRows")) $("scrapDraftRows").innerHTML = state.scrapDraftLines.map((l) => `<tr><td>${escapeHtml(l.item_code)}</td><td>${escapeHtml(l.description)}</td><td>${escapeHtml(l.uom)}</td><td>${moneyish(l.qty_scrapped)}</td><td>${moneyish(l.scrap_value)}</td><td><button class="mini-btn danger" type="button" onclick="removeScrapDraftLine('${l.id}')">Remove</button></td></tr>`).join("") || emptyRow(6);
}

function addDcDraftLine() {
  const qty = v7Num($("dcQty").value);
  if (!$("dcItemCode").value.trim() || qty <= 0) return setV7Msg("dcMessage", "Select issued item code and enter quantity before adding a line.", false);
  if (!isIssuedItemCode($("dcItemCode").value)) return setV7Msg("dcMessage", "This item code is not in MIV Register or Issue Logs.", false);
  const rate = v7Num($("dcRate").value);
  state.dcDraftLines.push(normalizeDcLine({ id: uid(), item_code: $("dcItemCode").value.trim(), description: $("dcDescription").value, uom: $("dcUom").value, qty, rate, value: qty * rate, remarks: $("dcRemarks").value }));
  renderV7DraftLines();
}

function addJobWorkDraftLine() {
  const qtySent = v7Num($("jobWorkQtySent").value);
  if (!$("jobWorkSourceItem").value.trim() || qtySent <= 0) return setV7Msg("jobWorkMessage", "Select issued source item and enter sent quantity before adding a line.", false);
  if (!isIssuedItemCode($("jobWorkSourceItem").value)) return setV7Msg("jobWorkMessage", "This source item is not in MIV Register or Issue Logs.", false);
  state.jobWorkDraftLines.push(normalizeJobWorkLine({ id: uid(), source_item_code: $("jobWorkSourceItem").value.trim(), source_description: $("jobWorkSourceDesc").value, source_uom: $("jobWorkUom").value, qty_sent: qtySent, output_item_code: $("jobWorkOutputItem").value.trim(), output_description: $("jobWorkOutputDesc").value, qty_received: $("jobWorkQtyReceived").value, wastage_qty: $("jobWorkWastage").value, qc_status: v7Num($("jobWorkQtyReceived").value) > 0 ? "ACCEPTED" : "PENDING", remarks: $("jobWorkRemarks").value }));
  renderV7DraftLines();
}

function addWipDraftLine() {
  const qtyUsed = v7Num($("wipQtyUsed").value);
  if (!$("wipInputItem").value.trim() || qtyUsed <= 0) return setV7Msg("wipMessage", "Select issued input item and enter used quantity before adding a line.", false);
  if (!isIssuedItemCode($("wipInputItem").value)) return setV7Msg("wipMessage", "This input item is not in MIV Register or Issue Logs.", false);
  const unitCost = v7Num($("wipUnitCost").value);
  state.wipDraftLines.push(normalizeWipLine({ id: uid(), input_item_code: $("wipInputItem").value.trim(), input_description: $("wipInputDesc").value, input_uom: $("wipInputUom").value, qty_used: qtyUsed, unit_cost: unitCost, total_value: qtyUsed * unitCost, remarks: $("wipRemarks").value }));
  renderV7DraftLines();
}

function addScrapDraftLine() {
  const qty = v7Num($("scrapQty").value);
  if (!$("scrapItemCode").value.trim() || qty <= 0) return setV7Msg("scrapMessage", "Select issued item code and enter scrap quantity before adding a line.", false);
  if (!isIssuedItemCode($("scrapItemCode").value)) return setV7Msg("scrapMessage", "This item code is not in MIV Register or Issue Logs.", false);
  state.scrapDraftLines.push(normalizeScrap({ id: uid(), item_code: $("scrapItemCode").value.trim(), description: $("scrapDescription").value, uom: $("scrapUom").value, qty_scrapped: qty, scrap_value: $("scrapValue").value, reason: $("scrapReason").value, approved_by: $("scrapApprovedBy").value, status: $("scrapApprovedBy").value ? "APPROVED" : "RECORDED" }));
  renderV7DraftLines();
}

window.removeDcDraftLine = (id) => { state.dcDraftLines = state.dcDraftLines.filter((x) => x.id !== id); renderV7DraftLines(); };
window.removeJobWorkDraftLine = (id) => { state.jobWorkDraftLines = state.jobWorkDraftLines.filter((x) => x.id !== id); renderV7DraftLines(); };
window.removeWipDraftLine = (id) => { state.wipDraftLines = state.wipDraftLines.filter((x) => x.id !== id); renderV7DraftLines(); };
window.removeScrapDraftLine = (id) => { state.scrapDraftLines = state.scrapDraftLines.filter((x) => x.id !== id); renderV7DraftLines(); };

function openGRNModal() { $("grnForm")?.reset(); $("grnNo").value = nextDocNo("GRN", state.grns, "grn_no"); $("grnDate").value = todayISO(); $("grnQcStatus").value = "ACCEPTED"; $("grnModal")?.showModal(); }
function openMIVModal() {
  $("mivForm")?.reset();
  refreshMivAvailableItemDropdown();
  $("mivNo").value = nextDocNo("MIV", state.mivs, "miv_no");
  $("mivDate").value = todayISO();
  $("mivIssuedTo").value = "Production";
  $("mivDepartment").value = "Production";
  setAvailableHint($("mivItemCode"), null, false);
  $("mivModal")?.showModal();
  setTimeout(() => $("mivItemCode")?.focus(), 80);
}
function openDCModal() { $("dcForm")?.reset(); state.dcDraftLines = []; renderV7DraftLines(); $("dcNo").value = nextDocNo("DC/JW", state.deliveryChallans, "dc_no"); $("dcDate").value = todayISO(); $("dcStatus").value = "OPEN"; $("dcModal")?.showModal(); }
function openJobWorkModal() { $("jobWorkForm")?.reset(); state.jobWorkDraftLines = []; renderV7DraftLines(); $("jobWorkNo").value = nextDocNo("JW", state.jobWorks, "job_work_no"); $("jobWorkDateSent").value = todayISO(); $("jobWorkExpectedReturn").value = todayISO(); $("jobWorkModal")?.showModal(); }
function openWIPModal() { $("wipForm")?.reset(); state.wipDraftLines = []; renderV7DraftLines(); $("wipNo").value = nextDocNo("WIP", state.wipConversions, "wip_no"); $("wipStartDate").value = todayISO(); $("wipModal")?.showModal(); }
function openScrapModal() { $("scrapForm")?.reset(); state.scrapDraftLines = []; renderV7DraftLines(); $("scrapNo").value = nextDocNo("SCR", state.scrapLogs, "scrap_no"); $("scrapDate").value = todayISO(); $("scrapModal")?.showModal(); }

async function saveGRN(e) {
  e.preventDefault();
  try {
    const accepted = v7Num($("grnAcceptedQty").value);
    const hold = v7Num($("grnHoldQty").value);
    const rejected = v7Num($("grnRejectedQty").value);
    const received = v7Num($("grnReceivedQty").value);
    if (accepted + hold + rejected > received) throw new Error("Accepted + hold + rejected cannot exceed received quantity.");
    const now = new Date().toISOString();
    const grn = normalizeGrn({ id: uid(), grn_no: $("grnNo").value.trim(), grn_date: $("grnDate").value, po_no: $("grnPoNo").value, supplier: $("grnSupplier").value, invoice_no: $("grnInvoiceNo").value, received_by: $("grnReceivedBy").value, qc_status: $("grnQcStatus").value, remarks: $("grnRemarks").value, created_by: state.user?.id || null, created_by_email: state.user?.email || "", created_at: now, updated_at: now });
    const line = normalizeGrnLine({ id: uid(), grn_id: grn.id, item_code: $("grnItemCode").value.trim(), description: $("grnDescription").value, uom: $("grnUom").value, received_qty: received, accepted_qty: accepted, hold_qty: hold, rejected_qty: rejected, putaway_bin: $("grnPutawayBin").value, unit_rate: $("grnUnitRate").value, landed_cost: accepted * v7Num($("grnUnitRate").value), qc_status: $("grnQcStatus").value, remarks: $("grnRemarks").value, created_at: now });
    state.grns.unshift(grn); state.grnLines.push(line);
    await insertRows("grn_headers", grn); await insertRows("grn_lines", line);
    if (accepted > 0) await postLedgerEntry({ movement_type: "GRN_ACCEPTED", source_doc_type: "GRN", source_doc_no: grn.grn_no, source_line_id: line.id, item_code: line.item_code, description: line.description, uom: line.uom, in_qty: accepted, to_bin: line.putaway_bin, vendor: grn.supplier, unit_cost: line.unit_rate, total_value: line.landed_cost, remarks: grn.remarks });
    if (accepted > 0 && line.unit_rate > 0) await addCostLayer({ item_code: line.item_code, source_doc_type: "GRN", source_doc_no: grn.grn_no, qty: accepted, unit_cost: line.unit_rate, total_value: line.landed_cost });
    if (hold + rejected > 0) {
      const ncr = normalizeNcr({ id: uid(), ncr_no: `NCR-${grn.grn_no.replaceAll("/", "-")}`, po_ref: grn.po_no, supplier: grn.supplier, item_code: line.item_code, description: line.description, qty_hold: hold + rejected, status: rejected > 0 ? "REJECT" : "HOLD", reason: `GRN ${grn.grn_no} QC ${grn.qc_status}`, owner: "QC", updated_at: now });
      state.quarantine.unshift(ncr); await upsertRows("quarantine_items", ncr).catch(console.warn);
    }
    persistLocal(); renderAll(); setV7Msg("grnMessage", `GRN ${grn.grn_no} saved.`); setTimeout(() => $("grnModal")?.close(), 250);
  } catch (err) { setV7Msg("grnMessage", err.message, false); }
}

async function createMIV(header, lines) {
  const safeLines = lines.map((line) => normalizeMivLine({ ...line, item_code: upper(line.item_code) }));
  if (!safeLines.length) throw new Error("Add at least one MIV line.");

  for (const line of safeLines) {
    const item = inventoryMasterItemByCode(line.item_code);
    if (!item) throw new Error(`Item ${line.item_code} does not exist in Inventory Master. Use the Item Code search list.`);
    if (v7Num(line.qty_issued) <= 0) throw new Error("Qty issued must be greater than zero.");
    const available = calculateAvailableStock(line.item_code);
    if (available < v7Num(line.qty_issued)) throw new Error(`Insufficient stock for ${line.item_code}. Available ${moneyish(available)}, requested ${moneyish(line.qty_issued)}.`);
    line.description = item.description || line.description;
    line.uom = item.uom || line.uom;
    line.from_bin = item.bin || line.from_bin;
    line.item_id = item.id;
  }

  await insertRows("miv_headers", header);
  await insertRows("miv_lines", safeLines);
  state.mivs.unshift(header);
  state.mivLines.push(...safeLines);

  try {
    for (const line of safeLines) {
      await postLedgerEntry({ movement_type: "MIV_ISSUE", source_doc_type: "MIV", source_doc_no: header.miv_no, source_line_id: line.id, item_id: line.item_id, item_code: line.item_code, description: line.description, uom: line.uom, out_qty: line.qty_issued, from_bin: line.from_bin, work_order: header.work_order, department: header.department, remarks: header.remarks });
    }
  } catch (err) {
    state.mivs = state.mivs.filter((x) => x.id !== header.id);
    state.mivLines = state.mivLines.filter((x) => x.miv_id !== header.id);
    if (state.dbReady && state.user) {
      try { await state.supabase.from("miv_lines").delete().eq("miv_id", header.id); } catch (_) {}
      try { await state.supabase.from("miv_headers").delete().eq("id", header.id); } catch (_) {}
    }
    persistLocal();
    throw err;
  }
  persistLocal();
}


async function saveMIV(e) {
  e.preventDefault();
  try {
    const code = upper($("mivItemCode").value);
    const item = mivAvailableItemByCode(code);
    const qty = v7Num($("mivQtyIssued").value);
    if (!item) throw new Error("Select an available item code from the Item Code search list.");
    if (qty <= 0) throw new Error("Qty issued must be greater than zero.");
    if (qty > item.available_qty) throw new Error(`Qty issued cannot exceed available stock. Available ${moneyish(item.available_qty)}.`);

    $("mivItemCode").value = item.item_code;
    $("mivDescription").value = item.description || "";
    $("mivUom").value = item.uom || "";
    $("mivFromBin").value = item.bin || "";

    const now = new Date().toISOString();
    const header = normalizeMiv({ id: uid(), miv_no: $("mivNo").value.trim(), miv_date: $("mivDate").value, issued_to: $("mivIssuedTo").value, department: $("mivDepartment").value, work_order: $("mivWorkOrder").value, return_expected: $("mivReturnExpected").value, issued_by: state.user?.email || "Stores", received_by: $("mivReceivedBy").value, remarks: $("mivRemarks").value, created_by: state.user?.id || null, created_by_email: state.user?.email || "", created_at: now, updated_at: now });
    const line = normalizeMivLine({ id: uid(), miv_id: header.id, item_id: item.id, item_code: item.item_code, description: item.description, uom: item.uom, from_bin: item.bin, qty_requested: qty, qty_issued: qty, remarks: $("mivRemarks").value, created_at: now });
    await createMIV(header, [line]);
    renderAll();
    setV7Msg("mivMessage", `MIV ${header.miv_no} saved.`);
    setTimeout(() => $("mivModal")?.close(), 250);
  } catch (err) { setV7Msg("mivMessage", err.message, false); }
}


async function saveDeliveryChallan(e) {
  e.preventDefault();
  try {
    const now = new Date().toISOString();
    const fallbackValue = v7Num($("dcQty").value) * v7Num($("dcRate").value);
    const draftLines = state.dcDraftLines.length ? state.dcDraftLines : [normalizeDcLine({ id: uid(), item_code: $("dcItemCode").value.trim(), description: $("dcDescription").value, uom: $("dcUom").value, qty: $("dcQty").value, rate: $("dcRate").value, value: fallbackValue, remarks: $("dcRemarks").value, created_at: now })];
    if (draftLines.some((line) => !line.item_code || v7Num(line.qty) <= 0)) throw new Error("Add at least one valid delivery challan line.");
    if (draftLines.some((line) => !isIssuedItemCode(line.item_code))) throw new Error("Delivery challan items must come from MIV Register or Issue Logs.");
    const value = draftLines.reduce((sum, line) => sum + v7Num(line.value), 0);
    const dc = normalizeDc({ id: uid(), dc_no: $("dcNo").value.trim(), dc_date: $("dcDate").value, vendor: $("dcVendor").value, linked_job_work_no: $("dcJobWorkNo").value, expected_return_date: $("dcExpectedReturn").value || null, vehicle_no: $("dcVehicleNo").value, approx_value: value, status: $("dcStatus").value, remarks: $("dcRemarks").value, created_by: state.user?.id || null, created_by_email: state.user?.email || "", created_at: now, updated_at: now });
    const lines = draftLines.map((line) => normalizeDcLine({ ...line, id: line.id || uid(), dc_id: dc.id, created_at: now }));
    state.deliveryChallans.unshift(dc); state.deliveryChallanLines.push(...lines);
    await insertRows("delivery_challans", dc); await insertRows("delivery_challan_lines", lines);
    state.dcDraftLines = []; persistLocal(); renderAll(); setV7Msg("dcMessage", `Delivery challan ${dc.dc_no} saved with ${lines.length} line(s).`); setTimeout(() => $("dcModal")?.close(), 250);
  } catch (err) { setV7Msg("dcMessage", err.message, false); }
}

async function saveJobWork(e) {
  e.preventDefault();
  try {
    const now = new Date().toISOString();
    const fallbackLine = normalizeJobWorkLine({ id: uid(), source_item_code: $("jobWorkSourceItem").value.trim(), source_description: $("jobWorkSourceDesc").value, source_uom: $("jobWorkUom").value, qty_sent: $("jobWorkQtySent").value, output_item_code: $("jobWorkOutputItem").value.trim(), output_description: $("jobWorkOutputDesc").value, qty_received: $("jobWorkQtyReceived").value, wastage_qty: $("jobWorkWastage").value, qc_status: v7Num($("jobWorkQtyReceived").value) > 0 ? "ACCEPTED" : "PENDING", remarks: $("jobWorkRemarks").value, created_at: now });
    const draftLines = state.jobWorkDraftLines.length ? state.jobWorkDraftLines : [fallbackLine];
    if (draftLines.some((line) => !line.source_item_code || v7Num(line.qty_sent) <= 0)) throw new Error("Add at least one valid job work line.");
    if (draftLines.some((line) => !isIssuedItemCode(line.source_item_code))) throw new Error("Job work source items must come from MIV Register or Issue Logs.");
    for (const line of draftLines) if (calculateAvailableStock(line.source_item_code) < line.qty_sent) throw new Error(`Insufficient stock for ${line.source_item_code}.`);
    const completed = draftLines.some((line) => v7Num(line.qty_received) > 0);
    const job = normalizeJobWork({ id: uid(), job_work_no: $("jobWorkNo").value.trim(), date_sent: $("jobWorkDateSent").value, vendor: $("jobWorkVendor").value, delivery_challan_no: $("jobWorkDcNo").value || nextDocNo("DC/JW", state.deliveryChallans, "dc_no"), expected_return_date: $("jobWorkExpectedReturn").value, process_instruction: $("jobWorkProcess").value, status: completed ? "COMPLETED" : "OPEN", job_charges: $("jobWorkCharges").value, transport_cost: $("jobWorkTransport").value, remarks: $("jobWorkRemarks").value, created_by: state.user?.id || null, created_by_email: state.user?.email || "", created_at: now, updated_at: now });
    const lines = draftLines.map((line) => normalizeJobWorkLine({ ...line, id: line.id || uid(), job_work_id: job.id, created_at: now }));
    state.jobWorks.unshift(job); state.jobWorkLines.push(...lines);
    await insertRows("job_work_headers", job); await insertRows("job_work_lines", lines);
    if (!state.deliveryChallans.some((dc) => dc.dc_no === job.delivery_challan_no)) {
      const dc = normalizeDc({ id: uid(), dc_no: job.delivery_challan_no, dc_date: job.date_sent, linked_job_work_no: job.job_work_no, vendor: job.vendor, expected_return_date: job.expected_return_date, status: completed ? "CLOSED" : "OPEN", remarks: job.remarks, created_by: job.created_by, created_by_email: job.created_by_email, created_at: now, updated_at: now });
      const dcLines = lines.map((line) => normalizeDcLine({ id: uid(), dc_id: dc.id, item_code: line.source_item_code, description: line.source_description, uom: line.source_uom, qty: line.qty_sent, remarks: line.remarks, created_at: now }));
      state.deliveryChallans.unshift(dc); state.deliveryChallanLines.push(...dcLines);
      await insertRows("delivery_challans", dc); await insertRows("delivery_challan_lines", dcLines);
    }
    const totalReceived = lines.reduce((sum, line) => sum + v7Num(line.qty_received), 0);
    for (const line of lines) {
      await postLedgerEntry({ movement_type: "JOB_WORK_OUT", source_doc_type: "JOB_WORK", source_doc_no: job.job_work_no, source_line_id: line.id, item_code: line.source_item_code, description: line.source_description, uom: line.source_uom, out_qty: line.qty_sent, vendor: job.vendor, remarks: job.remarks });
      if (v7Num(line.qty_received) > 0 && line.output_item_code) {
        const allocated = totalReceived ? (v7Num(job.job_charges) + v7Num(job.transport_cost)) * (v7Num(line.qty_received) / totalReceived) : 0;
        await postLedgerEntry({ movement_type: "JOB_WORK_IN", source_doc_type: "JOB_WORK", source_doc_no: job.job_work_no, source_line_id: line.id, item_code: line.output_item_code, description: line.output_description, uom: line.source_uom, in_qty: line.qty_received, vendor: job.vendor, total_value: allocated, unit_cost: line.qty_received ? allocated / line.qty_received : 0, remarks: job.remarks });
        await addCostLayer({ item_code: line.output_item_code, source_doc_type: "JOB_WORK", source_doc_no: job.job_work_no, qty: line.qty_received, unit_cost: line.qty_received ? allocated / line.qty_received : 0, total_value: allocated });
      }
    }
    state.jobWorkDraftLines = []; persistLocal(); renderAll(); setV7Msg("jobWorkMessage", `Job work ${job.job_work_no} saved with ${lines.length} line(s).`); setTimeout(() => $("jobWorkModal")?.close(), 250);
  } catch (err) { setV7Msg("jobWorkMessage", err.message, false); }
}

async function saveWIPConversion(e) {
  e.preventDefault();
  try {
    const now = new Date().toISOString();
    const fallbackValue = v7Num($("wipQtyUsed").value) * v7Num($("wipUnitCost").value);
    const draftLines = state.wipDraftLines.length ? state.wipDraftLines : [normalizeWipLine({ id: uid(), input_item_code: $("wipInputItem").value.trim(), input_description: $("wipInputDesc").value, input_uom: $("wipInputUom").value, qty_used: $("wipQtyUsed").value, unit_cost: $("wipUnitCost").value, total_value: fallbackValue, remarks: $("wipRemarks").value, created_at: now })];
    if (draftLines.some((line) => !line.input_item_code || v7Num(line.qty_used) <= 0)) throw new Error("Add at least one valid WIP input line.");
    if (draftLines.some((line) => !isIssuedItemCode(line.input_item_code))) throw new Error("WIP input items must come from MIV Register or Issue Logs.");
    for (const line of draftLines) if (calculateAvailableStock(line.input_item_code) < line.qty_used) throw new Error(`Insufficient stock for ${line.input_item_code}.`);
    const wip = normalizeWip({ id: uid(), wip_no: $("wipNo").value.trim(), start_date: $("wipStartDate").value, completion_date: todayISO(), work_order: $("wipWorkOrder").value, process_name: $("wipProcessName").value, output_item_code: $("wipOutputItem").value.trim(), output_description: $("wipOutputDesc").value, output_uom: $("wipOutputUom").value, output_qty: $("wipOutputQty").value, labour_cost: $("wipLabourCost").value, consumables_cost: $("wipConsumablesCost").value, status: "COMPLETED", remarks: $("wipRemarks").value, created_by: state.user?.id || null, created_by_email: state.user?.email || "", created_at: now, updated_at: now });
    const lines = draftLines.map((line) => normalizeWipLine({ ...line, id: line.id || uid(), wip_id: wip.id, created_at: now }));
    state.wipConversions.unshift(wip); state.wipConversionLines.push(...lines);
    await insertRows("wip_conversions", wip); await insertRows("wip_conversion_lines", lines);
    for (const line of lines) await postLedgerEntry({ movement_type: "WIP_INPUT", source_doc_type: "WIP", source_doc_no: wip.wip_no, source_line_id: line.id, item_code: line.input_item_code, description: line.input_description, uom: line.input_uom, out_qty: line.qty_used, work_order: wip.work_order, remarks: wip.remarks, unit_cost: line.unit_cost, total_value: line.total_value });
    const inputValue = lines.reduce((sum, line) => sum + v7Num(line.total_value), 0);
    const totalValue = inputValue + v7Num(wip.labour_cost) + v7Num(wip.consumables_cost);
    await postLedgerEntry({ movement_type: "WIP_OUTPUT", source_doc_type: "WIP", source_doc_no: wip.wip_no, source_line_id: wip.id, item_code: wip.output_item_code, description: wip.output_description, uom: wip.output_uom, in_qty: wip.output_qty, work_order: wip.work_order, remarks: wip.remarks, unit_cost: wip.output_qty ? totalValue / wip.output_qty : 0, total_value: totalValue });
    await addCostLayer({ item_code: wip.output_item_code, source_doc_type: "WIP", source_doc_no: wip.wip_no, qty: wip.output_qty, unit_cost: wip.output_qty ? totalValue / wip.output_qty : 0, total_value: totalValue });
    state.wipDraftLines = []; persistLocal(); renderAll(); setV7Msg("wipMessage", `WIP ${wip.wip_no} saved with ${lines.length} input line(s).`); setTimeout(() => $("wipModal")?.close(), 250);
  } catch (err) { setV7Msg("wipMessage", err.message, false); }
}

async function saveScrap(e) {
  e.preventDefault();
  try {
    const now = new Date().toISOString();
    const baseNo = $("scrapNo").value.trim();
    const fallback = normalizeScrap({ id: uid(), item_code: $("scrapItemCode").value.trim(), description: $("scrapDescription").value, uom: $("scrapUom").value, qty_scrapped: $("scrapQty").value, scrap_value: $("scrapValue").value, reason: $("scrapReason").value, approved_by: $("scrapApprovedBy").value, status: $("scrapApprovedBy").value ? "APPROVED" : "RECORDED" });
    const draftLines = state.scrapDraftLines.length ? state.scrapDraftLines : [fallback];
    if (draftLines.some((line) => !line.item_code || v7Num(line.qty_scrapped) <= 0)) throw new Error("Add at least one valid scrap line.");
    if (draftLines.some((line) => !isIssuedItemCode(line.item_code))) throw new Error("Scrap items must come from MIV Register or Issue Logs.");
    for (const line of draftLines) if (calculateAvailableStock(line.item_code) < line.qty_scrapped) throw new Error(`Insufficient stock for ${line.item_code}.`);
    const scraps = draftLines.map((line, index) => normalizeScrap({ ...line, id: line.id || uid(), scrap_no: index === 0 ? baseNo : `${baseNo}-${index + 1}`, scrap_date: $("scrapDate").value, source_doc_type: $("scrapSourceType").value, source_doc_no: $("scrapSourceNo").value, reason: $("scrapReason").value || line.reason, approved_by: $("scrapApprovedBy").value || line.approved_by, status: $("scrapApprovedBy").value ? "APPROVED" : line.status, created_by: state.user?.id || null, created_by_email: state.user?.email || "", created_at: now }));
    state.scrapLogs.unshift(...scraps); await insertRows("scrap_register", scraps);
    for (const scrap of scraps) await postLedgerEntry({ movement_type: "SCRAP", source_doc_type: scrap.source_doc_type || "SCRAP", source_doc_no: scrap.scrap_no, item_code: scrap.item_code, description: scrap.description, uom: scrap.uom, out_qty: scrap.qty_scrapped, total_value: scrap.scrap_value, remarks: scrap.reason });
    state.scrapDraftLines = []; persistLocal(); renderAll(); setV7Msg("scrapMessage", `Scrap ${baseNo} saved with ${scraps.length} line(s).`); setTimeout(() => $("scrapModal")?.close(), 250);
  } catch (err) { setV7Msg("scrapMessage", err.message, false); }
}

const v7BaseIssueLogGroups = issueLogGroups;
issueLogGroups = function() {
  const map = new Map();
  v7BaseIssueLogGroups().forEach((group) => map.set(group.ticket_no, group));
  state.mivs.forEach((miv) => {
    const lines = state.mivLines.filter((line) => line.miv_id === miv.id);
    if (!lines.length) return;
    const movements = lines.map((line) => normalizeMovement({ id: `miv-${line.id}`, item_id: line.item_id, item_code: line.item_code, description: line.description, bin: line.from_bin, qty_taken: line.qty_issued, qty_before: 0, qty_after: calculateItemBalance(line.item_code), issued_to: miv.issued_to || miv.department || "Production", work_order: miv.work_order || miv.source_ticket_no || "", notes: `MIV ${miv.miv_no}`, movement_type: "MIV_ISSUE", created_at: miv.created_at || miv.miv_date || new Date().toISOString() }));
    map.set(miv.miv_no, { ticket_no: miv.miv_no, movements, ticket: { ticket_no: miv.miv_no, work_order: miv.work_order, department: miv.department || miv.issued_to, status: miv.status }, source_type: "MIV" });
  });
  return [...map.values()].sort((a, b) => new Date(b.movements[0]?.created_at || 0) - new Date(a.movements[0]?.created_at || 0));
};

returnSourceOptions = function(selected = "") {
  const groups = issueLogGroups();
  return `<option value="">Select source MIV / issue log</option>` + groups.map((g) => {
    const label = g.source_type === "MIV" ? "MIV Register" : "Issue Log";
    const detail = g.ticket?.work_order || g.movements[0]?.issued_to || "";
    return `<option value="${escapeHtml(g.ticket_no)}" ${g.ticket_no === selected ? "selected" : ""}>${escapeHtml(g.ticket_no)} - ${escapeHtml(label)}${detail ? ` - ${escapeHtml(detail)}` : ""}</option>`;
  }).join("");
};

aggregateIssueSource = function(ticketNo) {
  const group = issueLogGroups().find((g) => g.ticket_no === ticketNo);
  if (!group) return [];
  const map = new Map();
  for (const m of group.movements) {
    const key = `${m.item_id || ""}__${m.item_code}__${m.bin || ""}`;
    const item = itemByCode(m.item_code) || {};
    if (!map.has(key)) map.set(key, { item_id: m.item_id || item.id || "", item_code: m.item_code || "", description: m.description || item.description || "", from_bin: m.bin || item.bin || "", uom: item.uom || "", qty_issued: 0 });
    map.get(key).qty_issued += v7Num(m.qty_taken);
  }
  return [...map.values()];
};

function sourceHasReturnItem(sourceNo, itemCode) {
  if (!itemCode) return true;
  return aggregateIssueSource(sourceNo).some((row) => upper(row.item_code) === upper(itemCode));
}

function chooseSourceForReturnItem(itemCode) {
  if (!itemCode) return $("returnSourceTicket")?.value || "";
  const current = $("returnSourceTicket")?.value || "";
  if (current && sourceHasReturnItem(current, itemCode)) return current;
  return issueLogGroups().find((g) => sourceHasReturnItem(g.ticket_no, itemCode))?.ticket_no || current;
}

const v7BaseBuildReturnDraftLines = buildReturnDraftLines;
buildReturnDraftLines = function(ticketNo) {
  v7BaseBuildReturnDraftLines(ticketNo);
  const itemCode = $("returnItemCode")?.value || "";
  if (itemCode) state.returnDraftLines = state.returnDraftLines.filter((line) => upper(line.item_code) === upper(itemCode));
};

window.onReturnSourceChange = function(ticketNo) {
  refreshIssuedItemDropdown();
  buildReturnDraftLines(ticketNo);
  renderReturnDraftLines();
};

function onReturnItemChange() {
  const itemCode = $("returnItemCode")?.value || "";
  const sourceNo = chooseSourceForReturnItem(itemCode);
  if ($("returnSourceTicket") && sourceNo) $("returnSourceTicket").value = sourceNo;
  buildReturnDraftLines(sourceNo);
  renderReturnDraftLines();
}

const v7BaseOpenReturnModal = openReturnModal;
openReturnModal = function(sourceTicket = "") {
  refreshIssuedItemDropdown();
  v7BaseOpenReturnModal(sourceTicket);
  refreshIssuedItemDropdown();
};
window.openReturnModal = openReturnModal;
window.openReturnLogBySource = openReturnModal;
window.forceOpenReturnModal = function(sourceTicket = "") {
  try {
    if ($("returnModal")?.open) return;
    openReturnModal(sourceTicket);
  } catch (err) {
    console.error("Return modal open failed", err);
    alert(`Return modal open failed: ${err.message}`);
  }
};

const v7PreviousOpenItemModal = openItemModal;
openItemModal = function(item = null) {
  v7PreviousOpenItemModal(item);
  if ($("qty")) {
    $("qty").readOnly = !!item;
    $("qty").title = item ? "Stock is ledger-driven in V7. Use transactions to change stock." : "Opening stock posts an OPENING_STOCK ledger entry for new items.";
  }
};

handleItemSubmit = async function(e) {
  e.preventDefault();
  const isNew = !$("itemId").value;
  const openingQty = v7Num($("qty").value);
  const item = normalizeItem({ id: $("itemId").value || uid(), supplier: $("supplier").value, item_code: $("itemCode").value, description: $("description").value, uom: $("uom").value, qty: isNew ? 0 : calculateItemBalance($("itemCode").value), status: $("status").value, bin: $("bin").value, part_no: $("partNo").value });
  await saveItem(item);
  if (isNew && openingQty > 0) await postLedgerEntry({ movement_type: "OPENING_STOCK", source_doc_type: "OPENING", source_doc_no: `OPEN-${item.item_code}`, item_id: item.id, item_code: item.item_code, description: item.description, uom: item.uom, in_qty: openingQty, to_bin: item.bin, remarks: "Opening stock from item creation" });
  $("itemModal").close();
  renderAll();
};

window.issueTicket = async function(ticketId) {
  const ticket = state.tickets.find((x) => x.id === ticketId);
  if (!ticket) return;
  const lines = ticketLines(ticketId);
  for (const line of lines) if (calculateAvailableStock(line.item_code) < v7Num(line.qty_requested)) return alert(`Insufficient quantity for ${line.item_code}.`);
  if (!confirm(`Issue ${ticket.ticket_no}, create MIV, and deduct stock through ledger?`)) return;
  try {
    const now = new Date().toISOString();
    const header = normalizeMiv({ id: uid(), miv_no: nextDocNo("MIV", state.mivs, "miv_no"), miv_date: todayISO(), source_ticket_no: ticket.ticket_no, issued_to: ticket.department || "Production", department: ticket.department || "Production", work_order: ticket.work_order, return_expected: ticket.return_expected || "N", issued_by: state.user?.email || "Stores", received_by: ticket.received_by, status: "ISSUED", remarks: `Ticket ${ticket.ticket_no}`, created_by: state.user?.id || null, created_by_email: state.user?.email || "", created_at: now, updated_at: now });
    const voucherLines = lines.map((line) => normalizeMivLine({ id: uid(), miv_id: header.id, item_id: line.item_id, item_code: line.item_code, description: line.description, uom: line.uom, from_bin: line.from_bin, qty_requested: line.qty_requested, qty_issued: line.qty_requested, remarks: `Ticket ${ticket.ticket_no}`, created_at: now }));
    await createMIV(header, voucherLines);
    const movements = voucherLines.map((line) => normalizeMovement({ id: uid(), item_id: line.item_id, item_code: line.item_code, description: line.description, bin: line.from_bin, qty_taken: line.qty_issued, qty_before: 0, qty_after: calculateItemBalance(line.item_code), issued_to: ticket.department || "Production", work_order: ticket.work_order, notes: `Ticket ${ticket.ticket_no}`, movement_type: "PRODUCTION_TICKET_ISSUE", created_at: now }));
    state.movements.unshift(...movements);
    for (const line of lines) line.qty_issued = v7Num(line.qty_requested);
    ticket.status = "ISSUED"; ticket.issued_by = state.user?.email || "Stores"; ticket.issued_at = now; ticket.updated_at = now;
    if (state.dbReady) {
      await state.supabase.from("stock_movements").insert(movements);
      for (const line of lines) await state.supabase.from("material_issue_ticket_lines").upsert(line);
      await state.supabase.from("material_issue_tickets").upsert(dbSafeTicket(ticket));
    }
    persistLocal(); renderAll(); window.printMIV?.(header.id);
  } catch (err) { alert(err.message || "Issue failed."); }
};

function buildActionQueue() {
  const actions = [];
  state.inventory.forEach((item) => {
    if (isReorderItem(item)) actions.push({ type: "REORDER", priority: calculateAvailableStock(item.item_code) <= 0 ? "HIGH" : "MEDIUM", item_code: item.item_code, source_doc_no: "", owner: "Purchase", message: `${item.item_code} below reorder point` });
  });
  state.actionQueue = actions;
  return actions;
}

function renderActionQueue() {
  const rows = buildActionQueue();
  if ($("actionQueueCount")) $("actionQueueCount").textContent = `${rows.length} actions`;
  if ($("actionQueueRows")) $("actionQueueRows").innerHTML = rows.map((a) => `<tr><td><span class="status ${escapeHtml(a.priority)}">${escapeHtml(a.priority)}</span></td><td>${escapeHtml(a.type)}</td><td>${escapeHtml(a.source_doc_no || "-")}</td><td>${escapeHtml(a.item_code || "-")}</td><td>${escapeHtml(a.owner)}</td><td>${escapeHtml(a.message)}</td></tr>`).join("") || emptyRow(6);
  if ($("dashboardActionCount")) $("dashboardActionCount").textContent = `${rows.length} actions`;
  if ($("dashboardActionRows")) $("dashboardActionRows").innerHTML = rows.slice(0, 8).map((a) => `<tr><td><span class="status ${escapeHtml(a.priority)}">${escapeHtml(a.priority)}</span></td><td>${escapeHtml(a.type)}</td><td>${escapeHtml(a.item_code || "-")}</td><td>${escapeHtml(a.owner)}</td><td>${escapeHtml(a.message)}</td></tr>`).join("") || emptyRow(5);
}

function reorderDbFor(item) { return state.reorderSettingsDb.find((x) => upper(x.item_code) === upper(item.item_code)); }
getReorderPoint = function(row) { return v7Num(reorderDbFor(row)?.reorder_point || state.reorderSettings[itemKey(row)]?.point || state.reorderThreshold || 3); };
isReorderFlagEnabled = function(row) { return (reorderDbFor(row)?.enabled ?? state.reorderSettings[itemKey(row)]?.enabled) !== false; };
isReorderItem = function(row) { return isReorderFlagEnabled(row) && calculateAvailableStock(row.item_code) <= getReorderPoint(row); };
window.setReorderPoint = async function(id, value) {
  const item = state.inventory.find((x) => x.id === id || x.item_code === id);
  if (!item) return;
  const existing = reorderDbFor(item);
  const row = normalizeReorderDb({ ...(existing || {}), id: existing?.id || uid(), item_code: item.item_code, reorder_point: Math.max(0, v7Num(value)), enabled: existing?.enabled ?? true, updated_by: state.user?.id || null, updated_at: new Date().toISOString() });
  state.reorderSettingsDb = state.reorderSettingsDb.filter((x) => upper(x.item_code) !== upper(item.item_code));
  state.reorderSettingsDb.unshift(row);
  state.reorderSettings[itemKey(item)] = { point: row.reorder_point, enabled: row.enabled };
  saveReorderSettings(); persistLocal(); await upsertRows("reorder_settings", row).catch((err) => alert(err.message)); renderAll();
};
window.toggleReorderFlag = async function(id, checked) {
  const item = state.inventory.find((x) => x.id === id || x.item_code === id);
  if (!item) return;
  const existing = reorderDbFor(item);
  const row = normalizeReorderDb({ ...(existing || {}), id: existing?.id || uid(), item_code: item.item_code, reorder_point: existing?.reorder_point ?? getReorderPoint(item), enabled: !!checked, updated_by: state.user?.id || null, updated_at: new Date().toISOString() });
  state.reorderSettingsDb = state.reorderSettingsDb.filter((x) => upper(x.item_code) !== upper(item.item_code));
  state.reorderSettingsDb.unshift(row);
  state.reorderSettings[itemKey(item)] = { point: row.reorder_point, enabled: row.enabled };
  saveReorderSettings(); persistLocal(); await upsertRows("reorder_settings", row).catch((err) => alert(err.message)); renderAll();
};

function stockRowsForDisplay() { return filteredInventory().map((item) => ({ ...item, qty: calculateItemBalance(item.item_code), available_qty: calculateAvailableStock(item.item_code) })); }
renderInventory = function() {
  const rows = stockRowsForDisplay();
  $("inventoryRows").innerHTML = rows.map((x) => `<tr><td>${escapeHtml(x.supplier)}</td><td><strong>${escapeHtml(x.item_code)}</strong><br><span class="muted">${escapeHtml(x.part_no || "")}</span></td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.uom)}</td><td>${moneyish(x.available_qty)}${isReorderItem(x) ? '<br><span class="reorder-chip">REORDER</span>' : ""}<br><span class="muted">Ledger: ${moneyish(x.qty)}</span></td><td>${statusChip(x.status)}</td><td>${escapeHtml(x.bin)}</td><td><div class="row-actions"><button class="mini-btn" onclick="editItem('${x.id}')">Edit</button><button class="mini-btn danger" onclick="confirmDeleteItem('${x.id}')">Delete</button></div></td></tr>`).join("") || emptyRow(8);
};
reorderRows = function() { return state.inventory.filter((x) => isReorderItem(x) || reorderDbFor(x)).sort((a, b) => calculateAvailableStock(a.item_code) - calculateAvailableStock(b.item_code)); };
renderReorder = function() {
  if (!$("reorderRows")) return;
  const rows = reorderRows();
  $("reorderCount").textContent = `${rows.filter(isReorderItem).length} flagged`;
  $("reorderRows").innerHTML = rows.map((x) => `<tr><td><strong>${escapeHtml(x.item_code)}</strong></td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.supplier)}</td><td>${moneyish(calculateAvailableStock(x.item_code))}</td><td><input class="reorder-input" type="number" min="0" step="1" value="${getReorderPoint(x)}" onchange="setReorderPoint('${x.id}', this.value)" /></td><td>${escapeHtml(x.uom)}</td><td>${escapeHtml(x.bin)}</td><td><label><input class="flag-toggle" type="checkbox" ${isReorderFlagEnabled(x) ? "checked" : ""} onchange="toggleReorderFlag('${x.id}', this.checked)" /> ${isReorderItem(x) ? '<span class="reorder-chip">REORDER</span>' : '<span class="muted">No flag</span>'}</label></td><td><span class="muted">Purchase follow-up</span></td></tr>`).join("") || emptyRow(9);
};

renderDashboard = function() {
  const rows = stockRowsForDisplay();
  if ($("kpiSkus")) $("kpiSkus").textContent = new Set(rows.map((x) => x.item_code).filter(Boolean)).size;
  if ($("kpiQty")) $("kpiQty").textContent = moneyish(rows.reduce((s, x) => s + v7Num(x.available_qty), 0));
  if ($("kpiOk")) $("kpiOk").textContent = moneyish(rows.reduce((s, x) => s + v7Num(x.qty), 0));
  if ($("kpiHold")) $("kpiHold").textContent = moneyish(state.quarantine.reduce((s, x) => s + v7Num(x.qty_hold), 0));
  if ($("kpiReorder")) $("kpiReorder").textContent = rows.filter(isReorderItem).length;
  if ($("recordCount")) $("recordCount").textContent = `${rows.length} records`;
  renderBars("statusBars", groupBy(rows, "status", "qty"));
  renderBars("supplierBars", Object.fromEntries(Object.entries(groupBy(rows, "supplier", "qty")).sort((a, b) => b[1] - a[1]).slice(0, 7)));
  if ($("recentRows")) $("recentRows").innerHTML = rows.slice(0, 9).map((x) => `<tr><td>${escapeHtml(x.item_code)}</td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.supplier)}</td><td>${moneyish(x.available_qty)} ${escapeHtml(x.uom)}</td><td>${statusChip(x.status)}</td><td>${escapeHtml(x.bin)}</td></tr>`).join("") || emptyRow(6);
  renderActionQueue();
};

function rowsFor(id, list, fk) { return list.filter((x) => x[fk] === id); }
function renderGRNRegister() { if ($("grnRows")) { $("grnCount").textContent = `${state.grns.length} GRNs`; $("grnRows").innerHTML = state.grns.map((g) => { const lines = rowsFor(g.id, state.grnLines, "grn_id"); return `<tr><td><strong>${escapeHtml(g.grn_no)}</strong></td><td>${escapeHtml(g.grn_date)}</td><td>${escapeHtml(g.supplier)}</td><td>${escapeHtml(g.po_no || "-")}</td><td>${lines.length}</td><td>${moneyish(lines.reduce((s, x) => s + x.accepted_qty, 0))}</td><td>${moneyish(lines.reduce((s, x) => s + x.hold_qty + x.rejected_qty, 0))}</td><td>${statusChip(g.qc_status)}</td><td><button class="mini-btn" onclick="printGRN('${g.id}')">Print</button></td></tr>`; }).join("") || emptyRow(9); } }
function renderMIVRegister() { if ($("mivRows")) { $("mivCount").textContent = `${state.mivs.length} MIVs`; $("mivRows").innerHTML = state.mivs.map((m) => { const lines = rowsFor(m.id, state.mivLines, "miv_id"); return `<tr><td><strong>${escapeHtml(m.miv_no)}</strong></td><td>${escapeHtml(m.miv_date)}</td><td>${escapeHtml(m.source_ticket_no || "-")}</td><td>${escapeHtml(m.issued_to)}</td><td>${escapeHtml(m.work_order)}</td><td>${lines.length}</td><td>${moneyish(lines.reduce((s, x) => s + x.qty_issued, 0))}</td><td>${statusChip(m.status)}</td><td><button class="mini-btn" onclick="printMIV('${m.id}')">Print</button></td></tr>`; }).join("") || emptyRow(9); } }
function renderDeliveryChallanRegister() { if ($("dcRows")) { $("dcCount").textContent = `${state.deliveryChallans.length} DCs`; $("dcRows").innerHTML = state.deliveryChallans.map((dc) => { const lines = rowsFor(dc.id, state.deliveryChallanLines, "dc_id"); return `<tr><td><strong>${escapeHtml(dc.dc_no)}</strong></td><td>${escapeHtml(dc.dc_date)}</td><td>${escapeHtml(dc.vendor)}</td><td>${escapeHtml(dc.linked_job_work_no || "-")}</td><td>${escapeHtml(dc.expected_return_date || "-")}</td><td>${moneyish(lines.reduce((s, x) => s + x.qty, 0))}</td><td>${moneyish(dc.approx_value)}</td><td>${statusChip(dc.status)}</td><td><button class="mini-btn" onclick="printDeliveryChallan('${dc.id}')">Print</button></td></tr>`; }).join("") || emptyRow(9); } }
function renderJobWorkRegister() { if ($("jobWorkRows")) { $("jobWorkCount").textContent = `${state.jobWorks.length} jobs`; $("jobWorkRows").innerHTML = state.jobWorks.map((j) => { const line = rowsFor(j.id, state.jobWorkLines, "job_work_id")[0] || {}; return `<tr><td><strong>${escapeHtml(j.job_work_no)}</strong></td><td>${escapeHtml(j.vendor)}</td><td>${escapeHtml(j.delivery_challan_no || "-")}</td><td>${escapeHtml(line.source_item_code || "-")}</td><td>${moneyish(line.qty_sent)}</td><td>${escapeHtml(line.output_item_code || "-")}</td><td>${moneyish(line.qty_received)}</td><td>${escapeHtml(j.expected_return_date || "-")}</td><td>${statusChip(j.status)}</td><td><button class="mini-btn" onclick="printJobWork('${j.id}')">Print</button></td></tr>`; }).join("") || emptyRow(10); } if ($("materialAtVendorCards")) $("materialAtVendorCards").innerHTML = ""; }
function renderWIPRegister() { if ($("wipRows")) { $("wipCount").textContent = `${state.wipConversions.length} WIP`; $("wipRows").innerHTML = state.wipConversions.map((w) => { const line = rowsFor(w.id, state.wipConversionLines, "wip_id")[0] || {}; return `<tr><td><strong>${escapeHtml(w.wip_no)}</strong></td><td>${escapeHtml(w.start_date)}</td><td>${escapeHtml(w.work_order)}</td><td>${escapeHtml(w.process_name)}</td><td>${escapeHtml(line.input_item_code || "-")}</td><td>${escapeHtml(w.output_item_code)}</td><td>${moneyish(w.output_qty)}</td><td>${moneyish(v7Num(line.total_value) + v7Num(w.labour_cost) + v7Num(w.consumables_cost))}</td><td>${statusChip(w.status)}</td><td><button class="mini-btn" onclick="printWIP('${w.id}')">Print</button></td></tr>`; }).join("") || emptyRow(10); } }
function renderStockLedger() { if ($("ledgerRows")) { $("ledgerCount").textContent = `${state.stockLedger.length} entries`; $("ledgerRows").innerHTML = state.stockLedger.slice(0, 700).map((l) => `<tr><td>${escapeHtml(l.ledger_date)}</td><td>${escapeHtml(l.movement_type)}</td><td>${escapeHtml(l.source_doc_type)}<br><span class="muted">${escapeHtml(l.source_doc_no)}</span></td><td><strong>${escapeHtml(l.item_code)}</strong><br><span class="muted">${escapeHtml(l.description)}</span></td><td>${moneyish(l.in_qty)}</td><td>${moneyish(l.out_qty)}</td><td>${moneyish(l.qty_before)}</td><td>${moneyish(l.qty_after)}</td><td>${escapeHtml(l.from_bin)}</td><td>${escapeHtml(l.to_bin)}</td><td>${escapeHtml(l.remarks)}</td></tr>`).join("") || emptyRow(11); } }
function renderScrapRegister() { if ($("scrapRows")) { $("scrapCount").textContent = `${state.scrapLogs.length} scrap records`; $("scrapRows").innerHTML = state.scrapLogs.map((s) => `<tr><td><strong>${escapeHtml(s.scrap_no)}</strong></td><td>${escapeHtml(s.scrap_date)}</td><td>${escapeHtml(s.source_doc_type)}<br><span class="muted">${escapeHtml(s.source_doc_no)}</span></td><td>${escapeHtml(s.item_code)}<br><span class="muted">${escapeHtml(s.description)}</span></td><td>${moneyish(s.qty_scrapped)}</td><td>${escapeHtml(s.reason)}</td><td>${moneyish(s.scrap_value)}</td><td>${statusChip(s.status)}</td></tr>`).join("") || emptyRow(8); } }
function renderCostSummary() { if ($("costRows")) { $("costLayerCount").textContent = `${state.itemCostLayers.length} cost layers`; if ($("costSummaryCards")) $("costSummaryCards").innerHTML = ""; $("costRows").innerHTML = state.itemCostLayers.map((c) => `<tr><td><strong>${escapeHtml(c.item_code)}</strong></td><td>${escapeHtml(c.source_doc_type)}<br><span class="muted">${escapeHtml(c.source_doc_no)}</span></td><td>${moneyish(c.qty)}</td><td>${moneyish(c.unit_cost)}</td><td>${moneyish(c.total_value)}</td><td>${escapeHtml(c.cost_method)}</td><td>${new Date(c.created_at).toLocaleString()}</td></tr>`).join("") || emptyRow(7); } }

const v7PreviousRenderAll = renderAll;
renderAll = function() {
  recalculateInventoryBalances();
  v7PreviousRenderAll();
  refreshItemCodeDropdowns();
  refreshMivAvailableItemDropdown();
  refreshIssuedItemDropdown();
  renderGRNRegister(); renderMIVRegister(); renderDeliveryChallanRegister(); renderJobWorkRegister(); renderWIPRegister(); renderStockLedger(); renderScrapRegister(); renderCostSummary(); renderActionQueue(); renderV7DraftLines();
  if (state.team === "inventory") {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active-view"));
    const viewEl = $(`${state.view}View`);
    if (viewEl) viewEl.classList.add("active-view");
    const titles = { dashboard: "Inventory Dashboard V7", "action-queue": "Dashboard Action Queue", inventory: "Inventory Master", "stock-ledger": "Stock Ledger", quarantine: "QC / Quarantine", suppliers: "Supplier Metrics", bins: "Bin Register", reorder: "Reorder Control", grn: "GRN Register", tickets: "Ticket Notifications", miv: "MIV Issue Register", movements: "Issue Logs", returns: "MRN Return Register", "delivery-challan": "Delivery Challan", jobwork: "Outside Job Work", "wip-conversion": "WIP / Conversion", scrap: "Scrap Register", costing: "Cost Summary", settings: "Supabase Setup" };
    if ($("pageTitle")) $("pageTitle").textContent = titles[state.view] || "Inventory Dashboard V7";
  }
};

window.printGRN = () => window.print();
window.printMIV = () => window.print();
window.printDeliveryChallan = () => window.print();
window.printJobWork = () => window.print();
window.printWIP = () => window.print();

function ledgerExportRows() { return state.stockLedger.map((r) => ({ Date: r.ledger_date, Movement: r.movement_type, Source: r.source_doc_type, DocNo: r.source_doc_no, ItemCode: r.item_code, Description: r.description, UOM: r.uom, InQty: r.in_qty, OutQty: r.out_qty, Before: r.qty_before, After: r.qty_after, FromBin: r.from_bin, ToBin: r.to_bin, UnitCost: r.unit_cost, TotalValue: r.total_value, Remarks: r.remarks })); }
function grnExportRows() { return state.grnLines.map((l) => ({ ItemCode: l.item_code, Description: l.description, UOM: l.uom, Received: l.received_qty, Accepted: l.accepted_qty })); }
function mivExportRows() { return state.mivLines.map((l) => ({ ItemCode: l.item_code, Description: l.description, UOM: l.uom, QtyIssued: l.qty_issued })); }
function dcExportRows() { return state.deliveryChallanLines.map((l) => ({ ItemCode: l.item_code, Description: l.description, UOM: l.uom, Qty: l.qty, Rate: l.rate, Value: l.value })); }
function jobWorkExportRows() { return state.jobWorkLines.map((l) => ({ SourceItem: l.source_item_code, QtySent: l.qty_sent, OutputItem: l.output_item_code, QtyReceived: l.qty_received })); }
function wipExportRows() { return state.wipConversionLines.map((l) => ({ InputItem: l.input_item_code, QtyUsed: l.qty_used, UnitCost: l.unit_cost, TotalValue: l.total_value })); }
function scrapExportRows() { return state.scrapLogs.map((s) => ({ ScrapNo: s.scrap_no, ItemCode: s.item_code, QtyScrapped: s.qty_scrapped, Reason: s.reason })); }
function costExportRows() { return state.itemCostLayers.map((c) => ({ ItemCode: c.item_code, Qty: c.qty, UnitCost: c.unit_cost, TotalValue: c.total_value })); }
function actionQueueExportRows() { return buildActionQueue().map((a) => ({ Priority: a.priority, Type: a.type, ItemCode: a.item_code, Owner: a.owner, Message: a.message })); }

const v7PreviousExportTableExcel = exportTableExcel;
exportTableExcel = function(type) {
  const maps = { "stock-ledger": ["Stack n Stock Ledger", ledgerExportRows()], grn: ["Stack n Stock GRN", grnExportRows()], miv: ["Stack n Stock MIV", mivExportRows()], "delivery-challan": ["Stack n Stock Delivery Challan", dcExportRows()], jobwork: ["Stack n Stock Job Work", jobWorkExportRows()], "wip-conversion": ["Stack n Stock WIP", wipExportRows()], scrap: ["Stack n Stock Scrap", scrapExportRows()], costing: ["Stack n Stock Costing", costExportRows()], "action-queue": ["Stack n Stock Action Queue", actionQueueExportRows()] };
  if (!maps[type]) return v7PreviousExportTableExcel(type);
  const [name, rows] = maps[type]; const wb = XLSX.utils.book_new(); addSheet(wb, name.substring(0, 31), rows); XLSX.writeFile(wb, `${slug(name)}.xlsx`);
};
exportWorkbookExcel = function() {
  const wb = XLSX.utils.book_new();
  [["Inventory Master", inventoryExportRows()], ["Stock Ledger", ledgerExportRows()], ["GRN Register", grnExportRows()], ["MIV Register", mivExportRows()], ["MRN Return Logs", returnExportRows()], ["Delivery Challans", dcExportRows()], ["Job Work", jobWorkExportRows()], ["WIP Conversions", wipExportRows()], ["Scrap Register", scrapExportRows()], ["Action Queue", actionQueueExportRows()]].forEach(([name, rows]) => addSheet(wb, name, rows));
  XLSX.writeFile(wb, `stacknstock_v7_inventory_control_${todayISO()}.xlsx`);
};

const v7PreviousBindEvents = bindEvents;
bindEvents = function() {
  v7PreviousBindEvents();
  setupItemAutofill();
  $("openGrnModal")?.addEventListener("click", openGRNModal);
  $("openMivModal")?.addEventListener("click", openMIVModal);
  $("openDcModal")?.addEventListener("click", openDCModal);
  $("openJobWorkModal")?.addEventListener("click", openJobWorkModal);
  $("openWipModal")?.addEventListener("click", openWIPModal);
  $("openScrapModal")?.addEventListener("click", openScrapModal);
  $("grnForm")?.addEventListener("submit", saveGRN);
  $("mivForm")?.addEventListener("submit", saveMIV);
  $("dcForm")?.addEventListener("submit", saveDeliveryChallan);
  $("jobWorkForm")?.addEventListener("submit", saveJobWork);
  $("wipForm")?.addEventListener("submit", saveWIPConversion);
  $("scrapForm")?.addEventListener("submit", saveScrap);
  $("addDcLineBtn")?.addEventListener("click", addDcDraftLine);
  $("addJobWorkLineBtn")?.addEventListener("click", addJobWorkDraftLine);
  $("addWipInputLineBtn")?.addEventListener("click", addWipDraftLine);
  $("addScrapLineBtn")?.addEventListener("click", addScrapDraftLine);
  $("returnItemCode")?.addEventListener("input", onReturnItemChange);
  $("returnItemCode")?.addEventListener("change", onReturnItemChange);
};

init();


window.SNS_MIV_ITEM_SEARCH_FIX = {
  rows: () => mivAvailableItemRows(),
  refresh: () => { refreshMivAvailableItemDropdown(); setupItemAutofill(); },
  balance: (code) => calculateAvailableStock(code),
};
