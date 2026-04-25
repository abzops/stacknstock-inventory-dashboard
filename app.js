const state = {
  inventory: [],
  quarantine: [],
  binLocations: [],
  movements: [],
  reorderThreshold: 3,
  view: "dashboard",
  search: "",
  status: "",
  supplier: "",
  supabase: null,
  dbReady: false,
  user: null,
};

const $ = (id) => document.getElementById(id);
const cleanStatus = (s) => (s || "OK").toString().trim().toUpperCase();
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const moneyish = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function normalizeItem(row) {
  return {
    id: row.id || uid(),
    supplier: row.supplier || "",
    item_code: row.item_code || "",
    description: row.description || "",
    uom: row.uom || "",
    qty: Number(row.qty || 0),
    status: cleanStatus(row.status),
    bin: row.bin || "",
    part_no: row.part_no || "",
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function normalizeNcr(row) {
  return {
    id: row.id || uid(),
    date_quarantine: row.date_quarantine || new Date().toISOString().slice(0, 10),
    ncr_no: row.ncr_no || "",
    po_ref: row.po_ref || "",
    supplier: row.supplier || "",
    item_code: row.item_code || "",
    description: row.description || "",
    lot_batch: row.lot_batch || "",
    qty_hold: Number(row.qty_hold || 0),
    reason: row.reason || "",
    status: cleanStatus(row.status || "HOLD"),
    location: row.location || "",
    disposition: row.disposition || "",
    owner: row.owner || "",
    target_close: row.target_close || "",
    actual_close: row.actual_close || "",
    remarks: row.remarks || "",
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function normalizeBin(row) {
  return {
    id: row.id || uid(),
    bin_id: row.bin_id || row.bin || "",
    zone: row.zone || "",
    area_room: row.area_room || "",
    rack_no: row.rack_no || "",
    level: row.level || "",
    bin_no: row.bin_no || "",
    bin_type: row.bin_type || "",
    status: row.status || "Active",
    allowed_category: row.allowed_category || "",
    esd_required: row.esd_required || "",
    capacity: row.capacity || "",
    current_item_codes: row.current_item_codes || "",
    label_posted: row.label_posted || "",
    created_by_date: row.created_by_date || "",
    notes: row.notes || "",
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function normalizeMovement(row) {
  return {
    id: row.id || uid(),
    item_id: row.item_id || "",
    item_code: row.item_code || "",
    description: row.description || "",
    bin: row.bin || "",
    qty_taken: Number(row.qty_taken || 0),
    qty_before: Number(row.qty_before || 0),
    qty_after: Number(row.qty_after || 0),
    issued_to: row.issued_to || "Production",
    work_order: row.work_order || "",
    notes: row.notes || "",
    movement_type: row.movement_type || "PRODUCTION_ISSUE",
    created_at: row.created_at || new Date().toISOString(),
  };
}

function isReorderItem(row) {
  return Number(row.qty || 0) < state.reorderThreshold;
}

async function init() {
  setupSupabase();
  bindEvents();

  if (state.dbReady) {
    const { data, error } = await state.supabase.auth.getSession();
    if (error) setAuthMessage(error.message);
    state.user = data.session?.user || null;

    state.supabase.auth.onAuthStateChange(async (event, session) => {
      state.user = session?.user || null;
      if (event === "SIGNED_OUT" || !state.user) {
        showAuth();
        return;
      }
      await enterApp();
    });

    if (!state.user) {
      showAuth();
      return;
    }
  }

  await enterApp();
}

function setupSupabase() {
  if (window.SNS_SUPABASE_URL && window.SNS_SUPABASE_ANON_KEY && window.supabase) {
    state.supabase = window.supabase.createClient(window.SNS_SUPABASE_URL, window.SNS_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    state.dbReady = true;
    $("connectionStatus").textContent = "Supabase connected";
    $("connectionHelp").textContent = "Connected to Supabase. Inventory changes sync with the database.";
  }
}

async function enterApp() {
  $("authScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
  await refreshFromDatabase();
}

async function refreshFromDatabase() {
  setLoadingState(true);
  try {
    await loadData();
    renderAll();
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  const btn = $("refreshDataBtn");
  if (btn) {
    btn.disabled = isLoading;
    btn.textContent = isLoading ? "Loading..." : "Refresh Data";
  }
  const status = $("connectionStatus");
  if (status && isLoading && state.dbReady) status.textContent = "Loading data...";
  if (status && !isLoading && state.dbReady) status.textContent = "Supabase connected";
}

function showAuth() {
  $("appShell").classList.add("hidden");
  $("authScreen").classList.remove("hidden");
}

async function loadData() {
  if (state.dbReady) {
    const { data: sessionData } = await state.supabase.auth.getSession();
    state.user = sessionData.session?.user || null;
    if (!state.user) {
      showAuth();
      return;
    }

    const [inv, ncr, bins, moves] = await Promise.all([
      state.supabase.from("inventory_items").select("*", { count: "exact" }).order("updated_at", { ascending: false }),
      state.supabase.from("quarantine_items").select("*", { count: "exact" }).order("updated_at", { ascending: false }),
      state.supabase.from("bin_locations").select("*", { count: "exact" }).order("bin_id", { ascending: true }),
      state.supabase.from("stock_movements").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(200),
    ]);

    if (inv.error) {
      console.error("Inventory load error", inv.error);
      alert(`Inventory load error: ${inv.error.message}`);
    }
    if (ncr.error) {
      console.error("Quarantine load error", ncr.error);
      alert(`Quarantine load error: ${ncr.error.message}`);
    }
    if (bins?.error) console.warn("Bin register load skipped", bins.error);
    if (moves?.error) console.warn("Stock movement load skipped", moves.error);

    state.inventory = (inv.data || []).map(normalizeItem);
    state.quarantine = (ncr.data || []).map(normalizeNcr);
    state.binLocations = (bins?.data || []).map(normalizeBin);
    state.movements = (moves?.data || []).map(normalizeMovement);

    if (bins?.error && !state.binLocations.length) {
      const seedRes = await fetch("sample-data.json");
      const seed = await seedRes.json();
      state.binLocations = (seed.bin_locations || seed.binLocations || []).map(normalizeBin);
      $("connectionHelp").textContent = "Inventory is synced. Bin register is shown from local seed until you run the v4 Supabase migration.";
    }

    if (state.inventory.length || state.quarantine.length || state.binLocations.length) {
      persistLocal();
    } else {
      const cached = localStorage.getItem("sns_inventory_dashboard");
      if (cached) {
        const parsed = JSON.parse(cached);
        state.inventory = (parsed.inventory || []).map(normalizeItem);
        state.quarantine = (parsed.quarantine || []).map(normalizeNcr);
        state.binLocations = (parsed.binLocations || parsed.bin_locations || []).map(normalizeBin);
        state.movements = (parsed.movements || parsed.stock_movements || []).map(normalizeMovement);
        $("connectionHelp").textContent = "Supabase returned 0 rows. Showing last cached data. Check RLS policies or seed data.";
      } else {
        $("connectionHelp").textContent = "Supabase returned 0 rows. Check that inventory_items has rows and authenticated RLS select policies are active.";
      }
    }
    return;
  }

  const cached = localStorage.getItem("sns_inventory_dashboard");
  if (cached) {
    const parsed = JSON.parse(cached);
    state.inventory = (parsed.inventory || []).map(normalizeItem);
    state.quarantine = (parsed.quarantine || []).map(normalizeNcr);
    state.binLocations = (parsed.binLocations || parsed.bin_locations || []).map(normalizeBin);
    state.movements = (parsed.movements || parsed.stock_movements || []).map(normalizeMovement);
    return;
  }

  const res = await fetch("sample-data.json");
  const seed = await res.json();
  state.inventory = (seed.inventory || []).map(normalizeItem);
  state.quarantine = (seed.quarantine || []).map(normalizeNcr);
  state.binLocations = (seed.bin_locations || seed.binLocations || []).map(normalizeBin);
  state.movements = (seed.stock_movements || seed.movements || []).map(normalizeMovement);
  persistLocal();
}

function persistLocal() {
  localStorage.setItem("sns_inventory_dashboard", JSON.stringify({
    inventory: state.inventory,
    quarantine: state.quarantine,
    binLocations: state.binLocations,
    movements: state.movements,
  }));
}

async function saveItem(item) {
  item.updated_at = new Date().toISOString();
  const i = state.inventory.findIndex((x) => x.id === item.id);
  if (i >= 0) state.inventory[i] = item;
  else state.inventory.unshift(item);
  persistLocal();
  if (state.dbReady) {
    const { error } = await state.supabase.from("inventory_items").upsert(item);
    if (error) alert(`Save failed: ${error.message}`);
  }
  renderAll();
}

async function deleteItem(id) {
  state.inventory = state.inventory.filter((x) => x.id !== id);
  persistLocal();
  if (state.dbReady) {
    const { error } = await state.supabase.from("inventory_items").delete().eq("id", id);
    if (error) alert(`Delete failed: ${error.message}`);
  }
  renderAll();
}

async function saveNcr(row) {
  row.updated_at = new Date().toISOString();
  const i = state.quarantine.findIndex((x) => x.id === row.id);
  if (i >= 0) state.quarantine[i] = row;
  else state.quarantine.unshift(row);
  persistLocal();
  if (state.dbReady) {
    const { error } = await state.supabase.from("quarantine_items").upsert(row);
    if (error) alert(`NCR save failed: ${error.message}`);
  }
  renderAll();
}

async function deleteNcr(id) {
  state.quarantine = state.quarantine.filter((x) => x.id !== id);
  persistLocal();
  if (state.dbReady) {
    const { error } = await state.supabase.from("quarantine_items").delete().eq("id", id);
    if (error) alert(`NCR delete failed: ${error.message}`);
  }
  renderAll();
}

async function saveBin(row) {
  row.updated_at = new Date().toISOString();
  const i = state.binLocations.findIndex((x) => x.id === row.id);
  if (i >= 0) state.binLocations[i] = row;
  else state.binLocations.unshift(row);
  persistLocal();
  if (state.dbReady) {
    const { error } = await state.supabase.from("bin_locations").upsert(row);
    if (error) alert(`Bin save failed: ${error.message}`);
  }
  renderAll();
}

async function deleteBin(id) {
  state.binLocations = state.binLocations.filter((x) => x.id !== id);
  persistLocal();
  if (state.dbReady) {
    const { error } = await state.supabase.from("bin_locations").delete().eq("id", id);
    if (error) alert(`Bin delete failed: ${error.message}`);
  }
  renderAll();
}

async function issueToProduction(item, qtyTaken, issuedTo, workOrder, notes) {
  const before = Number(item.qty || 0);
  const taken = Math.max(0, Number(qtyTaken || 0));
  if (!taken) return alert("Enter a quantity greater than 0.");
  if (taken > before) return alert("Issue quantity cannot be greater than available quantity.");
  const after = Math.max(0, before - taken);
  const updated = normalizeItem({ ...item, qty: after, updated_at: new Date().toISOString() });
  const movement = normalizeMovement({
    id: uid(), item_id: item.id, item_code: item.item_code, description: item.description,
    bin: item.bin, qty_taken: taken, qty_before: before, qty_after: after, issued_to: issuedTo || "Production",
    work_order: workOrder || "", notes: notes || "", movement_type: "PRODUCTION_ISSUE", created_at: new Date().toISOString(),
  });
  const i = state.inventory.findIndex((x) => x.id === item.id);
  if (i >= 0) state.inventory[i] = updated;
  state.movements.unshift(movement);
  persistLocal();
  if (state.dbReady) {
    const [{ error: itemError }, { error: moveError }] = await Promise.all([
      state.supabase.from("inventory_items").upsert(updated),
      state.supabase.from("stock_movements").insert(movement),
    ]);
    if (itemError) alert(`Stock update failed: ${itemError.message}`);
    if (moveError) alert(`Movement log failed: ${moveError.message}`);
  }
  if (after < state.reorderThreshold) alert(`${item.item_code} is now below reorder point. Available qty: ${moneyish(after)}`);
  renderAll();
}

function filteredInventory() {
  const q = state.search.toLowerCase();
  return state.inventory.filter((x) => {
    const blob = [x.supplier, x.item_code, x.description, x.bin, x.part_no].join(" ").toLowerCase();
    return (!q || blob.includes(q)) && (!state.status || x.status === state.status) && (!state.supplier || x.supplier === state.supplier);
  });
}

function groupBy(rows, key, valueKey) {
  return rows.reduce((acc, r) => {
    const k = r[key] || "Unknown";
    acc[k] = (acc[k] || 0) + Number(valueKey ? r[valueKey] || 0 : 1);
    return acc;
  }, {});
}

function renderAll() {
  renderSupplierFilter();
  renderDashboard();
  renderInventory();
  renderQuarantine();
  renderSuppliers();
  renderBins();
  renderReorder();
  renderMovements();
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active-view"));
  $(`${state.view}View`).classList.add("active-view");
  $("pageTitle").textContent = { dashboard: "Inventory Dashboard", inventory: "Inventory Register", quarantine: "Quarantine / NCR", suppliers: "Supplier Metrics", bins: "Bin Location Register", reorder: "Reorder Point", movements: "Production Issue Log", settings: "Supabase Setup" }[state.view];
}

function renderSupplierFilter() {
  const current = state.supplier;
  const suppliers = [...new Set(state.inventory.map((x) => x.supplier).filter(Boolean))].sort();
  $("supplierFilter").innerHTML = `<option value="">All suppliers</option>` + suppliers.map((s) => `<option ${s === current ? "selected" : ""}>${escapeHtml(s)}</option>`).join("");
}

function renderDashboard() {
  const rows = filteredInventory();
  const skuCount = new Set(rows.map((x) => x.item_code).filter(Boolean)).size;
  const qty = rows.reduce((s, x) => s + Number(x.qty || 0), 0);
  const okQty = rows.filter((x) => x.status === "OK").reduce((s, x) => s + Number(x.qty || 0), 0);
  const holdQty = rows.filter((x) => x.status !== "OK").reduce((s, x) => s + Number(x.qty || 0), 0) + state.quarantine.reduce((s, x) => s + Number(x.qty_hold || 0), 0);
  const reorderCount = rows.filter(isReorderItem).length;
  $("kpiSkus").textContent = skuCount;
  $("kpiQty").textContent = moneyish(qty);
  $("kpiOk").textContent = moneyish(okQty);
  $("kpiHold").textContent = moneyish(holdQty);
  if ($("kpiReorder")) $("kpiReorder").textContent = reorderCount;
  $("recordCount").textContent = `${rows.length} records`;

  renderBars("statusBars", groupBy(rows, "status", "qty"));
  renderBars("supplierBars", Object.fromEntries(Object.entries(groupBy(rows, "supplier", "qty")).sort((a, b) => b[1] - a[1]).slice(0, 7)));
  $("recentRows").innerHTML = rows.slice(0, 9).map((x) => `<tr><td>${escapeHtml(x.item_code)}</td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.supplier)}</td><td>${moneyish(x.qty)} ${escapeHtml(x.uom)}</td><td>${statusChip(x.status)}</td><td>${escapeHtml(x.bin)}</td></tr>`).join("") || emptyRow(6);
}

function renderBars(id, obj) {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map((x) => x[1]), 1);
  $(id).innerHTML = entries.map(([label, val]) => `<div class="bar-row"><div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (val / max) * 100)}%"></div></div><div class="bar-value">${moneyish(val)}</div></div>`).join("") || `<p class="muted">No data available</p>`;
}

function renderInventory() {
  const rows = filteredInventory();
  $("inventoryRows").innerHTML = rows.map((x) => `<tr><td>${escapeHtml(x.supplier)}</td><td><strong>${escapeHtml(x.item_code)}</strong><br><span class="muted">${escapeHtml(x.part_no || "")}</span></td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.uom)}</td><td>${moneyish(x.qty)} ${isReorderItem(x) ? '<br><span class="reorder-chip">REORDER</span>' : ''}</td><td>${statusChip(x.status)}</td><td>${escapeHtml(x.bin)}</td><td><div class="row-actions"><button class="mini-btn" onclick="openIssueModalById('${x.id}')">Issue</button><button class="mini-btn" onclick="editItem('${x.id}')">Edit</button><button class="mini-btn danger" onclick="confirmDeleteItem('${x.id}')">Delete</button></div></td></tr>`).join("") || emptyRow(8);
}

function renderQuarantine() {
  $("quarantineRows").innerHTML = state.quarantine.map((x) => `<tr><td><strong>${escapeHtml(x.ncr_no)}</strong><br><span class="muted">${escapeHtml(x.date_quarantine || "")}</span></td><td>${escapeHtml(x.po_ref)}</td><td>${escapeHtml(x.supplier)}</td><td>${escapeHtml(x.item_code)}<br><span class="muted">${escapeHtml(x.description)}</span></td><td>${moneyish(x.qty_hold)}</td><td>${escapeHtml(x.reason)}</td><td>${statusChip(x.status)}</td><td>${escapeHtml(x.owner)}</td><td>${escapeHtml(x.target_close || "")}</td><td><div class="row-actions"><button class="mini-btn" onclick="editNcr('${x.id}')">Edit</button><button class="mini-btn danger" onclick="confirmDeleteNcr('${x.id}')">Delete</button></div></td></tr>`).join("") || emptyRow(10);
}

function supplierRows() {
  return Object.entries(groupBy(state.inventory, "supplier", "qty")).sort((a, b) => b[1] - a[1]).map(([name, qty]) => {
    const items = state.inventory.filter((x) => x.supplier === name);
    const ok = items.filter((x) => x.status === "OK").length;
    const attention = items.length - ok;
    return { supplier: name, total_qty: qty, line_items: items.length, ok_lines: ok, attention_lines: attention };
  });
}

function renderSuppliers() {
  const suppliers = supplierRows();
  $("supplierCards").innerHTML = suppliers.map((s) => `<article class="supplier-card"><h3>${escapeHtml(s.supplier)}</h3><strong>${moneyish(s.total_qty)}</strong><p>Total quantity across ${s.line_items} line items</p><p>${s.ok_lines} OK lines · ${s.attention_lines} attention lines</p></article>`).join("") || `<p class="muted">No suppliers found</p>`;
}

function filteredBins() {
  const q = state.search.toLowerCase();
  return state.binLocations.filter((x) => {
    const blob = [x.bin_id, x.zone, x.area_room, x.rack_no, x.level, x.bin_no, x.bin_type, x.status, x.allowed_category, x.current_item_codes, x.notes].join(" ").toLowerCase();
    return !q || blob.includes(q);
  });
}

function renderBins() {
  if (!$('binRows')) return;
  const rows = filteredBins();
  $('binCount').textContent = `${rows.length} bins`;
  $('binRows').innerHTML = rows.map((x) => `<tr><td><strong>${escapeHtml(x.bin_id)}</strong></td><td>${escapeHtml(x.area_room)}</td><td>${escapeHtml(x.rack_no)}</td><td>${escapeHtml(x.level)}</td><td>${escapeHtml(x.bin_no)}</td><td>${escapeHtml(x.bin_type)}</td><td>${statusChip(x.status || 'Active')}</td><td>${escapeHtml(x.allowed_category)}</td><td>${escapeHtml(x.current_item_codes)}</td><td>${escapeHtml(x.label_posted)}</td><td><div class="row-actions"><button class="mini-btn" onclick="editBin('${x.id}')">Edit</button><button class="mini-btn danger" onclick="confirmDeleteBin('${x.id}')">Delete</button></div></td></tr>`).join('') || emptyRow(11);
}

function reorderRows() {
  return state.inventory.filter(isReorderItem).sort((a, b) => Number(a.qty || 0) - Number(b.qty || 0));
}

function renderReorder() {
  if (!$('reorderRows')) return;
  const rows = reorderRows();
  $('reorderCount').textContent = `${rows.length} flagged`;
  $('reorderRows').innerHTML = rows.map((x) => `<tr><td><strong>${escapeHtml(x.item_code)}</strong></td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.supplier)}</td><td>${moneyish(x.qty)}</td><td>${state.reorderThreshold}</td><td>${escapeHtml(x.uom)}</td><td>${escapeHtml(x.bin)}</td><td><span class="reorder-chip">REORDER</span></td><td><button class="mini-btn" onclick="openIssueModalById('${x.id}')">Issue</button></td></tr>`).join('') || emptyRow(9);
}

function renderMovements() {
  if (!$('movementRows')) return;
  $('movementCount').textContent = `${state.movements.length} issues`;
  $('movementRows').innerHTML = state.movements.slice(0, 200).map((x) => `<tr><td>${new Date(x.created_at).toLocaleString()}</td><td><strong>${escapeHtml(x.item_code)}</strong><br><span class="muted">${escapeHtml(x.description)}</span></td><td>${escapeHtml(x.bin)}</td><td>${moneyish(x.qty_taken)}</td><td>${moneyish(x.qty_before)}</td><td>${moneyish(x.qty_after)}</td><td>${escapeHtml(x.issued_to)}</td><td>${escapeHtml(x.work_order)}</td><td>${escapeHtml(x.notes)}</td></tr>`).join('') || emptyRow(9);
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.addEventListener("click", () => { state.view = btn.dataset.view; document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active")); btn.classList.add("active"); renderAll(); }));
  $("searchInput").addEventListener("input", (e) => { state.search = e.target.value; renderAll(); });
  $("statusFilter").addEventListener("change", (e) => { state.status = e.target.value; renderAll(); });
  $("supplierFilter").addEventListener("change", (e) => { state.supplier = e.target.value; renderAll(); });
  $("openItemModal").addEventListener("click", () => openItemModal());
  $("openNcrModal").addEventListener("click", () => openNcrModal());
  document.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", () => $(btn.dataset.close).close()));
  document.querySelectorAll("[data-export-table]").forEach((btn) => btn.addEventListener("click", () => exportTableExcel(btn.dataset.exportTable)));
  $("itemForm").addEventListener("submit", handleItemSubmit);
  $("ncrForm").addEventListener("submit", handleNcrSubmit);
  $("binForm")?.addEventListener("submit", handleBinSubmit);
  $("issueForm")?.addEventListener("submit", handleIssueSubmit);
  $("openBinModal")?.addEventListener("click", () => openBinModal());
  $("exportExcelBtn").addEventListener("click", exportWorkbookExcel);
  $("refreshDataBtn")?.addEventListener("click", refreshFromDatabase);
  $("authForm").addEventListener("submit", handleSignIn);
  $("signUpBtn").addEventListener("click", handleSignUp);
  $("signOutBtn").addEventListener("click", handleSignOut);
}

function openItemModal(item = null) {
  $("itemModalTitle").textContent = item ? "Edit Inventory Item" : "Add Inventory Item";
  $("itemId").value = item?.id || "";
  $("supplier").value = item?.supplier || "";
  $("itemCode").value = item?.item_code || "";
  $("description").value = item?.description || "";
  $("uom").value = item?.uom || "";
  $("qty").value = item?.qty ?? "";
  $("status").value = item?.status || "OK";
  $("bin").value = item?.bin || "";
  $("partNo").value = item?.part_no || "";
  $("itemModal").showModal();
}

function openNcrModal(row = null) {
  $("ncrModalTitle").textContent = row ? "Edit Quarantine / NCR" : "Add Quarantine / NCR";
  $("ncrId").value = row?.id || "";
  $("ncrNo").value = row?.ncr_no || "";
  $("poRef").value = row?.po_ref || "";
  $("ncrSupplier").value = row?.supplier || "";
  $("ncrItemCode").value = row?.item_code || "";
  $("ncrDescription").value = row?.description || "";
  $("qtyHold").value = row?.qty_hold ?? "";
  $("ncrStatus").value = row?.status || "HOLD";
  $("reason").value = row?.reason || "";
  $("owner").value = row?.owner || "";
  $("targetClose").value = row?.target_close || "";
  $("ncrModal").showModal();
}

function openBinModal(row = null) {
  $('binModalTitle').textContent = row ? 'Edit Bin Location' : 'Add Bin Location';
  $('binIdHidden').value = row?.id || '';
  $('binId').value = row?.bin_id || '';
  $('binArea').value = row?.area_room || '';
  $('binRack').value = row?.rack_no || '';
  $('binLevel').value = row?.level || '';
  $('binNo').value = row?.bin_no || '';
  $('binType').value = row?.bin_type || 'OK';
  $('binStatus').value = row?.status || 'Active';
  $('binCategory').value = row?.allowed_category || '';
  $('binCurrentItems').value = row?.current_item_codes || '';
  $('binLabelPosted').value = row?.label_posted || '';
  $('binNotes').value = row?.notes || '';
  $('binModal').showModal();
}

function openIssueModal(item) {
  $('issueItemId').value = item.id;
  $('issueItemCode').textContent = item.item_code;
  $('issueItemDescription').textContent = item.description;
  $('issueAvailableQty').textContent = `${moneyish(item.qty)} ${item.uom || ''}`;
  $('issueQty').value = '';
  $('issueTo').value = 'Production';
  $('issueWorkOrder').value = '';
  $('issueNotes').value = '';
  $('issueModal').showModal();
}

window.editItem = (id) => openItemModal(state.inventory.find((x) => x.id === id));
window.confirmDeleteItem = (id) => { if (confirm("Delete this inventory item?")) deleteItem(id); };
window.editNcr = (id) => openNcrModal(state.quarantine.find((x) => x.id === id));
window.confirmDeleteNcr = (id) => { if (confirm("Delete this Quarantine / NCR record?")) deleteNcr(id); };
window.editBin = (id) => openBinModal(state.binLocations.find((x) => x.id === id));
window.confirmDeleteBin = (id) => { if (confirm("Delete this bin location?")) deleteBin(id); };
window.openIssueModalById = (id) => openIssueModal(state.inventory.find((x) => x.id === id));

function handleItemSubmit(e) {
  e.preventDefault();
  saveItem(normalizeItem({ id: $("itemId").value || uid(), supplier: $("supplier").value, item_code: $("itemCode").value, description: $("description").value, uom: $("uom").value, qty: $("qty").value, status: $("status").value, bin: $("bin").value, part_no: $("partNo").value }));
  $("itemModal").close();
}

function handleNcrSubmit(e) {
  e.preventDefault();
  saveNcr(normalizeNcr({ id: $("ncrId").value || uid(), ncr_no: $("ncrNo").value, po_ref: $("poRef").value, supplier: $("ncrSupplier").value, item_code: $("ncrItemCode").value, description: $("ncrDescription").value, qty_hold: $("qtyHold").value, status: $("ncrStatus").value, reason: $("reason").value, owner: $("owner").value, target_close: $("targetClose").value }));
  $("ncrForm").reset();
  $("ncrModal").close();
}

function handleBinSubmit(e) {
  e.preventDefault();
  saveBin(normalizeBin({
    id: $('binIdHidden').value || uid(),
    bin_id: $('binId').value,
    area_room: $('binArea').value,
    rack_no: $('binRack').value,
    level: $('binLevel').value,
    bin_no: $('binNo').value,
    bin_type: $('binType').value,
    status: $('binStatus').value,
    allowed_category: $('binCategory').value,
    current_item_codes: $('binCurrentItems').value,
    label_posted: $('binLabelPosted').value,
    notes: $('binNotes').value,
  }));
  $('binModal').close();
}

function handleIssueSubmit(e) {
  e.preventDefault();
  const item = state.inventory.find((x) => x.id === $('issueItemId').value);
  if (!item) return alert('Item not found. Refresh data and try again.');
  issueToProduction(item, $('issueQty').value, $('issueTo').value, $('issueWorkOrder').value, $('issueNotes').value);
  $('issueModal').close();
}

async function handleSignIn(e) {
  e.preventDefault();
  if (!state.dbReady) return setAuthMessage("Add Supabase keys in config.js first.");
  state.team = $('teamSelect')?.value || state.team || 'inventory';
  localStorage.setItem('sns_selected_team', state.team);
  const { error } = await state.supabase.auth.signInWithPassword({ email: $("authEmail").value, password: $("authPassword").value });
  setAuthMessage(error ? error.message : "Signed in.");
}

async function handleSignUp() {
  if (!state.dbReady) return setAuthMessage("Add Supabase keys in config.js first.");
  const { error } = await state.supabase.auth.signUp({ email: $("authEmail").value, password: $("authPassword").value });
  setAuthMessage(error ? error.message : "Account created. Check email if confirmation is enabled, then sign in.");
}

async function handleSignOut() {
  if (state.dbReady) await state.supabase.auth.signOut();
  localStorage.removeItem("sns_inventory_dashboard");
  if (!state.dbReady) location.reload();
}

function setAuthMessage(msg) { $("authMessage").textContent = msg; }

function inventoryExportRows() {
  return filteredInventory().map((r) => ({ Supplier: r.supplier, "Item Code": r.item_code, Description: r.description, UOM: r.uom, Qty: r.qty, Status: r.status, Bin: r.bin, "Part No": r.part_no }));
}
function quarantineExportRows() {
  return state.quarantine.map((r) => ({ "NCR No": r.ncr_no, "PO Ref": r.po_ref, Supplier: r.supplier, "Item Code": r.item_code, Description: r.description, "Qty Hold": r.qty_hold, Reason: r.reason, Status: r.status, Owner: r.owner, "Target Close": r.target_close || "" }));
}
function suppliersExportRows() {
  return supplierRows().map((r) => ({ Supplier: r.supplier, "Total Qty": r.total_qty, "Line Items": r.line_items, "OK Lines": r.ok_lines, "Attention Lines": r.attention_lines }));
}
function binExportRows() {
  return filteredBins().map((r) => ({ "Bin ID": r.bin_id, "Area/Room": r.area_room, Rack: r.rack_no, Level: r.level, "Bin No": r.bin_no, Type: r.bin_type, Status: r.status, Category: r.allowed_category, "Current Item Codes": r.current_item_codes, "Label Posted": r.label_posted, Notes: r.notes }));
}
function reorderExportRows() {
  return reorderRows().map((r) => ({ "Item Code": r.item_code, Description: r.description, Supplier: r.supplier, "Available Qty": r.qty, "Reorder Point": state.reorderThreshold, UOM: r.uom, Bin: r.bin, Flag: "REORDER" }));
}
function movementExportRows() {
  return state.movements.map((r) => ({ Date: r.created_at, "Item Code": r.item_code, Description: r.description, Bin: r.bin, "Qty Taken": r.qty_taken, "Qty Before": r.qty_before, "Qty After": r.qty_after, "Issued To": r.issued_to, "Work Order": r.work_order, Notes: r.notes }));
}

function exportTableExcel(type) {
  const maps = {
    inventory: ["Stack n Stock Inventory", inventoryExportRows()],
    quarantine: ["Stack n Stock Quarantine NCR", quarantineExportRows()],
    suppliers: ["Stack n Stock Suppliers", suppliersExportRows()],
    bins: ["Stack n Stock Bin Register", binExportRows()],
    reorder: ["Stack n Stock Reorder Point", reorderExportRows()],
    movements: ["Stack n Stock Production Issues", movementExportRows()],
  };
  const [name, rows] = maps[type];
  const wb = XLSX.utils.book_new();
  addSheet(wb, name.substring(0, 31), rows);
  XLSX.writeFile(wb, `${slug(name)}.xlsx`);
}

function exportWorkbookExcel() {
  const wb = XLSX.utils.book_new();
  addSheet(wb, "Inventory", inventoryExportRows());
  addSheet(wb, "Quarantine NCR", quarantineExportRows());
  addSheet(wb, "Suppliers", suppliersExportRows());
  addSheet(wb, "Bin Register", binExportRows());
  addSheet(wb, "Reorder Point", reorderExportRows());
  addSheet(wb, "Production Issues", movementExportRows());
  XLSX.writeFile(wb, `stacknstock_inventory_dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function addSheet(wb, sheetName, rows) {
  const data = rows.length ? rows : [{ Message: "No records" }];
  const ws = XLSX.utils.json_to_sheet(data);
  const headers = Object.keys(data[0]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 4, ...data.map((r) => String(r[h] ?? "").length).slice(0, 100)) }));
  ws["!autofilter"] = { ref: ws["!ref"] };
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function statusChip(status) { return `<span class="status ${escapeHtml(cleanStatus(status))}">${escapeHtml(cleanStatus(status))}</span>`; }
function emptyRow(cols) { return `<tr><td colspan="${cols}" class="muted">No matching records.</td></tr>`; }
function escapeHtml(v) { return String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m]); }

// ===== v5: production portal, request cart, ticket notifications, print slips =====
state.team = localStorage.getItem('sns_selected_team') || 'inventory';
state.tickets = [];
state.ticketLines = [];
state.cart = [];
state.prodSearch = '';
state.prodSort = 'item_code';
state.prodSupplier = '';

function normalizeTicket(row) {
  return {
    id: row.id || uid(),
    ticket_no: row.ticket_no || makeTicketNo(),
    status: (row.status || 'PENDING').toString().toUpperCase(),
    requested_by_user_id: row.requested_by_user_id || '',
    requested_by_email: row.requested_by_email || '',
    requested_by_name: row.requested_by_name || '',
    department: row.department || 'Production',
    work_order: row.work_order || '',
    request_ref: row.request_ref || '',
    return_expected: row.return_expected || 'N',
    received_by: row.received_by || '',
    issued_by: row.issued_by || '',
    notes: row.notes || '',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    issued_at: row.issued_at || null,
  };
}

function normalizeTicketLine(row) {
  return {
    id: row.id || uid(),
    ticket_id: row.ticket_id || '',
    item_id: row.item_id || '',
    item_code: row.item_code || '',
    part_no: row.part_no || '',
    description: row.description || '',
    lot_trace_id: row.lot_trace_id || '',
    from_bin: row.from_bin || '',
    uom: row.uom || '',
    qty_requested: Number(row.qty_requested || 0),
    qty_issued: Number(row.qty_issued || 0),
  };
}

function makeTicketNo() {
  const d = new Date();
  const y = d.getFullYear();
  const serial = String(Date.now()).slice(-4);
  return `ISS-${y}-${serial}`;
}

async function enterApp() {
  const savedTeam = localStorage.getItem('sns_selected_team');
  const selectedTeam = $('teamSelect')?.value;
  state.team = savedTeam || selectedTeam || state.team || 'inventory';
  if ($('teamSelect')) $('teamSelect').value = state.team;
  localStorage.setItem('sns_selected_team', state.team);
  $('authScreen').classList.add('hidden');
  if (state.team === 'production') {
    $('appShell').classList.add('hidden');
    $('productionPortal').classList.remove('hidden');
  } else {
    $('productionPortal').classList.add('hidden');
    $('appShell').classList.remove('hidden');
  }
  await refreshFromDatabase();
}

function showAuth() {
  $('appShell').classList.add('hidden');
  $('productionPortal')?.classList.add('hidden');
  $('authScreen').classList.remove('hidden');
  if ($('teamSelect')) $('teamSelect').value = localStorage.getItem('sns_selected_team') || state.team || 'inventory';
}

async function loadData() {
  if (state.dbReady) {
    const { data: sessionData } = await state.supabase.auth.getSession();
    state.user = sessionData.session?.user || null;
    if (!state.user) { showAuth(); return; }

    const [inv, ncr, bins, moves, tickets, lines] = await Promise.all([
      state.supabase.from('inventory_items').select('*', { count: 'exact' }).order('updated_at', { ascending: false }),
      state.supabase.from('quarantine_items').select('*', { count: 'exact' }).order('updated_at', { ascending: false }),
      state.supabase.from('bin_locations').select('*', { count: 'exact' }).order('bin_id', { ascending: true }),
      state.supabase.from('stock_movements').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(500),
      state.supabase.from('material_issue_tickets').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
      state.supabase.from('material_issue_ticket_lines').select('*', { count: 'exact' }),
    ]);

    if (inv.error) alert(`Inventory load error: ${inv.error.message}`);
    if (ncr.error) console.warn('Quarantine load error', ncr.error);
    if (bins.error) console.warn('Bin load error', bins.error);
    if (moves.error) console.warn('Movement load error', moves.error);
    if (tickets.error) console.warn('Ticket load skipped. Run v5 migration.', tickets.error);
    if (lines.error) console.warn('Ticket line load skipped. Run v5 migration.', lines.error);

    state.inventory = (inv.data || []).map(normalizeItem);
    state.quarantine = (ncr.data || []).map(normalizeNcr);
    state.binLocations = (bins.data || []).map(normalizeBin);
    state.movements = (moves.data || []).map(normalizeMovement);
    state.tickets = (tickets.data || []).map(normalizeTicket);
    state.ticketLines = (lines.data || []).map(normalizeTicketLine);

    if (state.inventory.length || state.quarantine.length || state.binLocations.length || state.tickets.length) persistLocal();
    return;
  }

  const cached = localStorage.getItem('sns_inventory_dashboard');
  if (cached) {
    const parsed = JSON.parse(cached);
    state.inventory = (parsed.inventory || []).map(normalizeItem);
    state.quarantine = (parsed.quarantine || []).map(normalizeNcr);
    state.binLocations = (parsed.binLocations || parsed.bin_locations || []).map(normalizeBin);
    state.movements = (parsed.movements || parsed.stock_movements || []).map(normalizeMovement);
    state.tickets = (parsed.tickets || []).map(normalizeTicket);
    state.ticketLines = (parsed.ticketLines || []).map(normalizeTicketLine);
    return;
  }
  const res = await fetch('sample-data.json');
  const seed = await res.json();
  state.inventory = (seed.inventory || []).map(normalizeItem);
  state.quarantine = (seed.quarantine || []).map(normalizeNcr);
  state.binLocations = (seed.bin_locations || seed.binLocations || []).map(normalizeBin);
  state.movements = (seed.stock_movements || seed.movements || []).map(normalizeMovement);
  state.tickets = [];
  state.ticketLines = [];
  persistLocal();
}

function persistLocal() {
  localStorage.setItem('sns_inventory_dashboard', JSON.stringify({
    inventory: state.inventory,
    quarantine: state.quarantine,
    binLocations: state.binLocations,
    movements: state.movements,
    tickets: state.tickets,
    ticketLines: state.ticketLines,
  }));
}

function renderAll() {
  renderSupplierFilter();
  renderDashboard();
  renderInventory();
  renderQuarantine();
  renderSuppliers();
  renderBins();
  renderReorder();
  renderTickets();
  renderMovements();
  renderProductionPortal();
  if (state.team === 'inventory') {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active-view'));
    const viewEl = $(`${state.view}View`);
    if (viewEl) viewEl.classList.add('active-view');
    $('pageTitle').textContent = { dashboard: 'Inventory Dashboard', inventory: 'Inventory Register', quarantine: 'Quarantine / NCR', suppliers: 'Supplier Metrics', bins: 'Bin Location Register', reorder: 'Reorder Point', tickets: 'Ticket Notifications', movements: 'Issue Logs', settings: 'Supabase Setup' }[state.view] || 'Inventory Dashboard';
  }
}

function renderInventory() {
  const rows = filteredInventory();
  $('inventoryRows').innerHTML = rows.map((x) => `<tr><td>${escapeHtml(x.supplier)}</td><td><strong>${escapeHtml(x.item_code)}</strong><br><span class="muted">${escapeHtml(x.part_no || '')}</span></td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.uom)}</td><td>${moneyish(x.qty)} ${isReorderItem(x) ? '<br><span class="reorder-chip">REORDER</span>' : ''}</td><td>${statusChip(x.status)}</td><td>${escapeHtml(x.bin)}</td><td><div class="row-actions"><button class="mini-btn" onclick="editItem('${x.id}')">Edit</button><button class="mini-btn danger" onclick="confirmDeleteItem('${x.id}')">Delete</button></div></td></tr>`).join('') || emptyRow(8);
}

function renderReorder() {
  if (!$('reorderRows')) return;
  const rows = reorderRows();
  $('reorderCount').textContent = `${rows.length} flagged`;
  $('reorderRows').innerHTML = rows.map((x) => `<tr><td><strong>${escapeHtml(x.item_code)}</strong></td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.supplier)}</td><td>${moneyish(x.qty)}</td><td>${state.reorderThreshold}</td><td>${escapeHtml(x.uom)}</td><td>${escapeHtml(x.bin)}</td><td><span class="reorder-chip">REORDER</span></td><td><span class="muted">Purchase follow-up</span></td></tr>`).join('') || emptyRow(9);
}

function ticketLines(ticketId) { return state.ticketLines.filter((x) => x.ticket_id === ticketId); }
function pendingTickets() { return state.tickets.filter((t) => t.status === 'PENDING' || t.status === 'REQUESTED'); }
function issuedTickets() { return state.tickets.filter((t) => t.status === 'ISSUED'); }

function renderTickets() {
  if (!$('ticketCards')) return;
  const rows = pendingTickets();
  $('ticketCount').textContent = `${rows.length} pending`;
  $('ticketCards').innerHTML = rows.map((t) => {
    const lines = ticketLines(t.id);
    const body = lines.map((l, i) => `<tr><td>${i + 1}</td><td><strong>${escapeHtml(l.item_code)}</strong><br><span class="muted">${escapeHtml(l.part_no)}</span></td><td>${escapeHtml(l.description)}</td><td>${escapeHtml(l.from_bin)}</td><td>${escapeHtml(l.uom)}</td><td>${moneyish(l.qty_requested)}</td><td>${availabilityText(l)}</td></tr>`).join('');
    return `<article class="ticket-card"><div class="ticket-head"><div><span class="status HOLD">PENDING</span><h3>${escapeHtml(t.ticket_no)}</h3><p class="muted">${new Date(t.created_at).toLocaleString()} · ${escapeHtml(t.department)} · ${escapeHtml(t.work_order || 'No work order')}</p></div><div class="row-actions"><button class="primary-btn compact" onclick="issueTicket('${t.id}')">Verify & Issue</button><button class="ghost-btn compact" onclick="printTicket('${t.id}')">Print</button><button class="mini-btn danger" onclick="rejectTicket('${t.id}')">Reject</button></div></div><div class="table-wrap"><table><thead><tr><th>S.No</th><th>Item Code</th><th>Description</th><th>From Bin</th><th>UOM</th><th>Req Qty</th><th>Available</th></tr></thead><tbody>${body || emptyRow(7)}</tbody></table></div><p class="muted">Requested by ${escapeHtml(t.requested_by_email || t.requested_by_name || '')}. Request ref: ${escapeHtml(t.request_ref || '-')}.</p></article>`;
  }).join('') || '<p class="muted">No pending production tickets.</p>';
}

function availabilityText(line) {
  const item = state.inventory.find((x) => x.id === line.item_id || x.item_code === line.item_code);
  if (!item) return '<span class="status REJECT">NOT FOUND</span>';
  const ok = Number(item.qty || 0) >= Number(line.qty_requested || 0);
  return `<span class="${ok ? 'muted' : 'reorder-chip'}">${moneyish(item.qty)} ${escapeHtml(item.uom || '')}</span>`;
}

function renderMovements() {
  if (!$('movementRows')) return;
  $('movementCount').textContent = `${state.movements.length} logs`;
  $('movementRows').innerHTML = state.movements.slice(0, 500).map((x) => `<tr><td>${new Date(x.created_at).toLocaleString()}</td><td><strong>${escapeHtml(x.item_code)}</strong><br><span class="muted">${escapeHtml(x.description)}</span></td><td>${escapeHtml(x.bin)}</td><td>${moneyish(x.qty_taken)}</td><td>${moneyish(x.qty_before)}</td><td>${moneyish(x.qty_after)}</td><td>${escapeHtml(x.issued_to)}</td><td>${escapeHtml(x.work_order)}</td><td>${escapeHtml(x.notes)}</td></tr>`).join('') || emptyRow(9);
}

function productionInventoryRows() {
  const q = state.prodSearch.toLowerCase();
  let rows = state.inventory.filter((x) => x.status === 'OK' && Number(x.qty || 0) > 0);
  rows = rows.filter((x) => {
    const blob = [x.item_code, x.description, x.supplier, x.bin, x.part_no].join(' ').toLowerCase();
    return (!q || blob.includes(q)) && (!state.prodSupplier || x.supplier === state.prodSupplier);
  });
  const s = state.prodSort;
  rows.sort((a, b) => {
    if (s === 'qty_desc') return Number(b.qty || 0) - Number(a.qty || 0);
    if (s === 'qty_asc') return Number(a.qty || 0) - Number(b.qty || 0);
    return String(a[s] || '').localeCompare(String(b[s] || ''));
  });
  return rows;
}

function renderProductionPortal() {
  if (!$('productionPortal')) return;
  renderProductionSupplierFilter();
  const rows = productionInventoryRows();
  if ($('prodRecordCount')) $('prodRecordCount').textContent = `${rows.length} available items`;
  if ($('prodInventoryRows')) $('prodInventoryRows').innerHTML = rows.map((x) => `<tr><td><strong>${escapeHtml(x.item_code)}</strong><br><span class="muted">${escapeHtml(x.part_no || '')}</span></td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.supplier)}</td><td>${moneyish(x.qty)}</td><td>${escapeHtml(x.uom)}</td><td>${escapeHtml(x.bin)}</td><td><button class="primary-btn compact" onclick="addToCart('${x.id}')">Add to Cart</button></td></tr>`).join('') || emptyRow(7);
  renderCart();
}

function renderProductionSupplierFilter() {
  if (!$('prodSupplierFilter')) return;
  const current = state.prodSupplier;
  const suppliers = [...new Set(state.inventory.map((x) => x.supplier).filter(Boolean))].sort();
  $('prodSupplierFilter').innerHTML = `<option value="">All suppliers</option>` + suppliers.map((s) => `<option ${s === current ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
}

function renderCart() {
  if (!$('cartRows')) return;
  $('cartBadge').textContent = state.cart.length;
  $('cartRows').innerHTML = state.cart.map((c) => {
    const item = state.inventory.find((x) => x.id === c.item_id);
    if (!item) return '';
    return `<tr><td><strong>${escapeHtml(item.item_code)}</strong><br><span class="muted">${escapeHtml(item.part_no || '')}</span></td><td>${escapeHtml(item.description)}</td><td>${moneyish(item.qty)} ${escapeHtml(item.uom)}</td><td><input class="qty-input" type="number" min="0.01" step="0.01" max="${Number(item.qty || 0)}" value="${c.qty_requested}" onchange="updateCartQty('${item.id}', this.value)" /></td><td>${escapeHtml(item.bin)}</td><td><button class="mini-btn danger" onclick="removeFromCart('${item.id}')">Remove</button></td></tr>`;
  }).join('') || emptyRow(6);
}

window.addToCart = (id) => {
  const item = state.inventory.find((x) => x.id === id);
  if (!item || Number(item.qty || 0) <= 0) return alert('This item is not available.');
  const found = state.cart.find((x) => x.item_id === id);
  if (found) found.qty_requested = Math.min(Number(item.qty || 0), Number(found.qty_requested || 0) + 1);
  else state.cart.push({ item_id: id, qty_requested: 1 });
  renderCart();
};
window.updateCartQty = (id, qty) => {
  const item = state.inventory.find((x) => x.id === id);
  const c = state.cart.find((x) => x.item_id === id);
  if (!item || !c) return;
  const q = Math.max(0, Math.min(Number(qty || 0), Number(item.qty || 0)));
  c.qty_requested = q;
  renderCart();
};
window.removeFromCart = (id) => { state.cart = state.cart.filter((x) => x.item_id !== id); renderCart(); };

function dbSafeTicket(ticket) {
  const clean = { ...ticket };
  if (!clean.requested_by_user_id) clean.requested_by_user_id = null;
  if (!clean.issued_at) clean.issued_at = null;
  if (!clean.created_at) clean.created_at = new Date().toISOString();
  if (!clean.updated_at) clean.updated_at = new Date().toISOString();
  return clean;
}

async function raiseTicket(e) {
  e.preventDefault();
  const valid = state.cart.filter((c) => Number(c.qty_requested || 0) > 0);
  if (!valid.length) return setTicketMsg('Add at least one item and enter required quantity.');
  for (const c of valid) {
    const item = state.inventory.find((x) => x.id === c.item_id);
    if (!item || Number(c.qty_requested) > Number(item.qty || 0)) return setTicketMsg(`Requested quantity exceeds available stock for ${item?.item_code || 'an item'}.`);
  }
  const ticket = normalizeTicket({
    id: uid(),
    ticket_no: makeTicketNo(),
    status: 'PENDING',
    requested_by_user_id: state.user?.id || null,
    requested_by_email: state.user?.email || '',
    requested_by_name: state.user?.email || '',
    department: $('ticketDepartment').value || 'Production',
    work_order: $('ticketWorkOrder').value,
    request_ref: $('ticketRequestRef').value,
    return_expected: $('ticketReturnExpected').value || 'N',
    received_by: $('ticketReceivedBy').value,
    notes: $('ticketNotes').value,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    issued_at: null
  });
  const lines = valid.map((c) => {
    const item = state.inventory.find((x) => x.id === c.item_id);
    return normalizeTicketLine({ id: uid(), ticket_id: ticket.id, item_id: item.id, item_code: item.item_code, part_no: item.part_no, description: item.description, lot_trace_id: '', from_bin: item.bin, uom: item.uom, qty_requested: c.qty_requested, qty_issued: 0 });
  });
  state.tickets.unshift(ticket);
  state.ticketLines.push(...lines);
  persistLocal();
  if (state.dbReady) {
    const { error: tErr } = await state.supabase.from('material_issue_tickets').insert(dbSafeTicket(ticket));
    if (tErr) return setTicketMsg(`Ticket save failed: ${tErr.message}`);
    const { error: lErr } = await state.supabase.from('material_issue_ticket_lines').insert(lines);
    if (lErr) return setTicketMsg(`Ticket line save failed: ${lErr.message}`);
  }
  state.cart = [];
  $('ticketRequestForm').reset();
  $('ticketDepartment').value = 'Production';
  setTicketMsg(`Ticket ${ticket.ticket_no} raised. Stores will verify and issue.`);
  showProdInventory();
  renderAll();
}
function setTicketMsg(msg) { if ($('ticketRequestMessage')) $('ticketRequestMessage').textContent = msg; }
function showProdCart() { $('prodInventoryPanel').classList.add('hidden'); $('prodCartPanel').classList.remove('hidden'); renderCart(); }
function showProdInventory() { $('prodCartPanel').classList.add('hidden'); $('prodInventoryPanel').classList.remove('hidden'); }

window.issueTicket = async (ticketId) => {
  const ticket = state.tickets.find((x) => x.id === ticketId);
  if (!ticket) return;
  const lines = ticketLines(ticketId);
  for (const line of lines) {
    const item = state.inventory.find((x) => x.id === line.item_id || x.item_code === line.item_code);
    if (!item) return alert(`Item not found: ${line.item_code}`);
    if (Number(item.qty || 0) < Number(line.qty_requested || 0)) return alert(`Insufficient quantity for ${line.item_code}. Available ${moneyish(item.qty)}, requested ${moneyish(line.qty_requested)}.`);
  }
  if (!confirm(`Issue ${ticket.ticket_no} and deduct stock now?`)) return;
  const now = new Date().toISOString();
  const updatedItems = [];
  const movements = [];
  const updatedLines = [];
  for (const line of lines) {
    const item = state.inventory.find((x) => x.id === line.item_id || x.item_code === line.item_code);
    const before = Number(item.qty || 0);
    const taken = Number(line.qty_requested || 0);
    const after = before - taken;
    item.qty = after; item.updated_at = now;
    updatedItems.push(item);
    line.qty_issued = taken;
    updatedLines.push(line);
    movements.push(normalizeMovement({ id: uid(), item_id: item.id, item_code: item.item_code, description: item.description, bin: item.bin, qty_taken: taken, qty_before: before, qty_after: after, issued_to: ticket.department || 'Production', work_order: ticket.work_order, notes: `Ticket ${ticket.ticket_no}`, movement_type: 'PRODUCTION_TICKET_ISSUE', created_at: now }));
  }
  ticket.status = 'ISSUED'; ticket.issued_by = state.user?.email || 'Stores'; ticket.issued_at = now; ticket.updated_at = now;
  state.movements.unshift(...movements);
  persistLocal();
  if (state.dbReady) {
    for (const item of updatedItems) await state.supabase.from('inventory_items').upsert(item);
    for (const line of updatedLines) await state.supabase.from('material_issue_ticket_lines').upsert(line);
    await state.supabase.from('stock_movements').insert(movements);
    await state.supabase.from('material_issue_tickets').upsert(dbSafeTicket(ticket));
  }
  renderAll();
  printTicket(ticketId);
};

window.rejectTicket = async (ticketId) => {
  const ticket = state.tickets.find((x) => x.id === ticketId);
  if (!ticket || !confirm(`Reject ${ticket.ticket_no}?`)) return;
  ticket.status = 'REJECTED'; ticket.updated_at = new Date().toISOString();
  persistLocal();
  if (state.dbReady) await state.supabase.from('material_issue_tickets').upsert(dbSafeTicket(ticket));
  renderAll();
};

window.printTicket = (ticketId) => {
  const ticket = state.tickets.find((x) => x.id === ticketId);
  if (!ticket) return;
  const lines = ticketLines(ticketId);
  const w = window.open('', '_blank', 'width=980,height=760');
  w.document.write(ticketPrintHtml(ticket, lines));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
};

function ticketPrintHtml(ticket, lines) {
  const lineRows = [...lines, ...Array(Math.max(0, 8 - lines.length)).fill({})].map((l, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(l.item_code || '')}</td><td>${escapeHtml(l.part_no || '')}</td><td>${escapeHtml(l.description || '')}</td><td>${escapeHtml(l.lot_trace_id || '')}</td><td>${escapeHtml(l.from_bin || '')}</td><td>${escapeHtml(l.uom || '')}</td><td>${moneyish(l.qty_issued || l.qty_requested || '')}</td></tr>`).join('');
  return `<!doctype html><html><head><title>${escapeHtml(ticket.ticket_no)}</title><style>body{font-family:Arial,sans-serif;color:#111;margin:24px}.ticket{max-width:980px;margin:auto;border:2px solid #111;padding:18px}.title{text-align:center;font-weight:800;font-size:20px;margin-bottom:14px}.grid{display:grid;grid-template-columns:190px 1fr 190px 1fr;border-top:1px solid #111;border-left:1px solid #111}.grid div{padding:8px;border-right:1px solid #111;border-bottom:1px solid #111}.label{font-weight:700;background:#f1f1f1}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #111;padding:7px;font-size:12px;vertical-align:top}th{background:#f1f1f1}.sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:28px}.sign div{border-top:1px solid #111;padding-top:8px;text-align:center}.note{font-size:11px;margin-top:12px}@media print{button{display:none}.ticket{border:2px solid #000}}</style></head><body><div class="ticket"><div class="title">MATERIAL ISSUE TICKET (Issue Slip) — print / sign / file</div><div class="grid"><div class="label">Issue No (ISS-YYYY-####)</div><div>${escapeHtml(ticket.ticket_no)}</div><div class="label">Issue Date</div><div>${new Date(ticket.issued_at || ticket.created_at).toLocaleDateString()}</div><div class="label">Work Order / Job</div><div>${escapeHtml(ticket.work_order)}</div><div class="label">Department</div><div>${escapeHtml(ticket.department)}</div><div class="label">Request Ref (MR/Kit)</div><div>${escapeHtml(ticket.request_ref)}</div><div class="label">Return Expected? (Y/N)</div><div>${escapeHtml(ticket.return_expected)}</div><div class="label">Issued By (Stores)</div><div>${escapeHtml(ticket.issued_by)}</div><div class="label">Received By (Production)</div><div>${escapeHtml(ticket.received_by)}</div></div><table><thead><tr><th>S.No</th><th>Item Code</th><th>Part No</th><th>Description</th><th>Lot/Trace ID</th><th>From Bin</th><th>UOM</th><th>Qty Issued</th></tr></thead><tbody>${lineRows}</tbody></table><div class="sign"><div>Stores Signature</div><div>Production Signature</div><div>Verified By</div></div><p class="note">Generated from Stack n Stock Inventory OS. Status: ${escapeHtml(ticket.status)}. Notes: ${escapeHtml(ticket.notes)}</p></div></body></html>`;
}

function ticketExportRows() {
  return state.tickets.map((t) => ({ 'Ticket No': t.ticket_no, Status: t.status, Date: t.created_at, Department: t.department, 'Work Order': t.work_order, 'Request Ref': t.request_ref, 'Requested By': t.requested_by_email, 'Line Count': ticketLines(t.id).length, 'Issued By': t.issued_by, 'Issued At': t.issued_at }));
}

function movementExportRows() {
  return state.movements.map((r) => ({ Date: r.created_at, 'Ticket/Note': r.notes, 'Item Code': r.item_code, Description: r.description, Bin: r.bin, 'Qty Taken': r.qty_taken, 'Qty Before': r.qty_before, 'Qty After': r.qty_after, 'Issued To': r.issued_to, 'Work Order': r.work_order }));
}

function exportTableExcel(type) {
  const maps = {
    inventory: ['Stack n Stock Inventory', inventoryExportRows()],
    quarantine: ['Stack n Stock Quarantine NCR', quarantineExportRows()],
    suppliers: ['Stack n Stock Suppliers', suppliersExportRows()],
    bins: ['Stack n Stock Bin Register', binExportRows()],
    reorder: ['Stack n Stock Reorder Point', reorderExportRows()],
    movements: ['Stack n Stock Issue Logs', movementExportRows()],
    tickets: ['Stack n Stock Issue Tickets', ticketExportRows()],
  };
  const [name, rows] = maps[type];
  const wb = XLSX.utils.book_new();
  addSheet(wb, name.substring(0, 31), rows);
  XLSX.writeFile(wb, `${slug(name)}.xlsx`);
}

function exportWorkbookExcel() {
  const wb = XLSX.utils.book_new();
  addSheet(wb, 'Inventory', inventoryExportRows());
  addSheet(wb, 'Quarantine NCR', quarantineExportRows());
  addSheet(wb, 'Suppliers', suppliersExportRows());
  addSheet(wb, 'Bin Register', binExportRows());
  addSheet(wb, 'Reorder Point', reorderExportRows());
  addSheet(wb, 'Issue Tickets', ticketExportRows());
  addSheet(wb, 'Issue Logs', movementExportRows());
  XLSX.writeFile(wb, `stacknstock_inventory_dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function bindEvents() {
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.addEventListener('click', () => { state.view = btn.dataset.view; document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active')); btn.classList.add('active'); renderAll(); }));
  $('searchInput').addEventListener('input', (e) => { state.search = e.target.value; renderAll(); });
  $('statusFilter').addEventListener('change', (e) => { state.status = e.target.value; renderAll(); });
  $('supplierFilter').addEventListener('change', (e) => { state.supplier = e.target.value; renderAll(); });
  $('openItemModal').addEventListener('click', () => openItemModal());
  $('openNcrModal').addEventListener('click', () => openNcrModal());
  document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => $(btn.dataset.close).close()));
  document.querySelectorAll('[data-export-table]').forEach((btn) => btn.addEventListener('click', () => exportTableExcel(btn.dataset.exportTable)));
  $('itemForm').addEventListener('submit', handleItemSubmit);
  $('ncrForm').addEventListener('submit', handleNcrSubmit);
  $('binForm')?.addEventListener('submit', handleBinSubmit);
  $('openBinModal')?.addEventListener('click', () => openBinModal());
  $('exportExcelBtn').addEventListener('click', exportWorkbookExcel);
  $('refreshDataBtn')?.addEventListener('click', refreshFromDatabase);
  $('authForm').addEventListener('submit', handleSignIn);
  $('teamSelect')?.addEventListener('change', (e) => { state.team = e.target.value; localStorage.setItem('sns_selected_team', state.team); });
  $('signUpBtn').addEventListener('click', handleSignUp);
  $('signOutBtn').addEventListener('click', handleSignOut);
  $('prodSignOutBtn')?.addEventListener('click', handleSignOut);
  $('prodRefreshBtn')?.addEventListener('click', refreshFromDatabase);
  $('prodSearchInput')?.addEventListener('input', (e) => { state.prodSearch = e.target.value; renderProductionPortal(); });
  $('prodSortSelect')?.addEventListener('change', (e) => { state.prodSort = e.target.value; renderProductionPortal(); });
  $('prodSupplierFilter')?.addEventListener('change', (e) => { state.prodSupplier = e.target.value; renderProductionPortal(); });
  $('prodCartBtn')?.addEventListener('click', showProdCart);
  $('backToProdInventory')?.addEventListener('click', showProdInventory);
  $('ticketRequestForm')?.addEventListener('submit', raiseTicket);
}


// ===== v5.2: grouped issue logs, mandatory cart fields, bin sorting/overview, editable reorder points =====
state.binSortKey = state.binSortKey || 'bin_id';
state.binSortDir = state.binSortDir || 'asc';
state.reorderSettings = JSON.parse(localStorage.getItem('sns_reorder_settings') || '{}');

function itemKey(row){ return row.id || row.item_code; }
function getReorderPoint(row){
  const cfg = state.reorderSettings[itemKey(row)] || {};
  return Number(cfg.point || state.reorderThreshold || 3);
}
function isReorderFlagEnabled(row){
  const cfg = state.reorderSettings[itemKey(row)] || {};
  return cfg.enabled !== false;
}
function saveReorderSettings(){ localStorage.setItem('sns_reorder_settings', JSON.stringify(state.reorderSettings)); }
function isReorderItem(row){ return isReorderFlagEnabled(row) && Number(row.qty || 0) < getReorderPoint(row); }

window.setReorderPoint = function(id, value){
  const item = state.inventory.find((x) => x.id === id || x.item_code === id);
  if (!item) return;
  const key = itemKey(item);
  state.reorderSettings[key] = state.reorderSettings[key] || {};
  state.reorderSettings[key].point = Math.max(0, Number(value || 0));
  saveReorderSettings();
  renderAll();
};
window.toggleReorderFlag = function(id, checked){
  const item = state.inventory.find((x) => x.id === id || x.item_code === id);
  if (!item) return;
  const key = itemKey(item);
  state.reorderSettings[key] = state.reorderSettings[key] || {};
  state.reorderSettings[key].enabled = !!checked;
  saveReorderSettings();
  renderAll();
};

function reorderRows() {
  return state.inventory
    .filter((x) => Number(x.qty || 0) < getReorderPoint(x) || state.reorderSettings[itemKey(x)])
    .sort((a, b) => Number(a.qty || 0) - Number(b.qty || 0));
}

function renderReorder() {
  if (!$('reorderRows')) return;
  const rows = reorderRows();
  const flagged = rows.filter(isReorderItem).length;
  $('reorderCount').textContent = `${flagged} flagged`;
  $('reorderRows').innerHTML = rows.map((x) => {
    const point = getReorderPoint(x);
    const enabled = isReorderFlagEnabled(x);
    const flaggedNow = isReorderItem(x);
    return `<tr><td><strong>${escapeHtml(x.item_code)}</strong></td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.supplier)}</td><td>${moneyish(x.qty)}</td><td><input class="reorder-input" type="number" min="0" step="1" value="${point}" onchange="setReorderPoint('${x.id}', this.value)" /></td><td>${escapeHtml(x.uom)}</td><td>${escapeHtml(x.bin)}</td><td><label><input class="flag-toggle" type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleReorderFlag('${x.id}', this.checked)" /> ${flaggedNow ? '<span class="reorder-chip">REORDER</span>' : '<span class="muted">No flag</span>'}</label></td><td><span class="muted">Purchase follow-up</span></td></tr>`;
  }).join('') || emptyRow(9);
}

function filteredBins() {
  const q = (state.search || '').toLowerCase();
  const rows = state.binLocations.filter((x) => {
    const blob = [x.bin_id, x.zone, x.area_room, x.rack_no, x.level, x.bin_no, x.bin_type, x.status, x.allowed_category, x.current_item_codes, x.notes].join(' ').toLowerCase();
    return !q || blob.includes(q);
  });
  const key = state.binSortKey || 'bin_id';
  const dir = state.binSortDir === 'desc' ? -1 : 1;
  return rows.sort((a, b) => String(a[key] || '').localeCompare(String(b[key] || ''), undefined, { numeric: true }) * dir);
}

function renderBinOverview(rows){
  if (!$('binOverview')) return;
  const active = rows.filter((x) => String(x.status || '').toLowerCase() === 'active').length;
  const used = rows.filter((x) => String(x.current_item_codes || '').trim()).length;
  const quarantine = rows.filter((x) => String(x.bin_type || '').toLowerCase().includes('quarantine')).length;
  const areas = new Set(rows.map((x) => x.area_room).filter(Boolean)).size;
  $('binOverview').innerHTML = `<article class="overview-card"><span>Total Bins</span><strong>${rows.length}</strong></article><article class="overview-card"><span>Active Bins</span><strong>${active}</strong></article><article class="overview-card"><span>Occupied Bins</span><strong>${used}</strong></article><article class="overview-card"><span>Areas / Rooms</span><strong>${areas}</strong></article><article class="overview-card"><span>Quarantine Bins</span><strong>${quarantine}</strong></article>`;
}

function renderBins() {
  if (!$('binRows')) return;
  const rows = filteredBins();
  $('binCount').textContent = `${rows.length} bins`;
  renderBinOverview(rows);
  document.querySelectorAll('[data-bin-sort]').forEach((th) => {
    const marker = state.binSortKey === th.dataset.binSort ? (state.binSortDir === 'asc' ? ' ▲' : ' ▼') : '';
    th.textContent = th.textContent.replace(/\s[▲▼]$/, '') + marker;
  });
  $('binRows').innerHTML = rows.map((x) => `<tr><td><strong>${escapeHtml(x.bin_id)}</strong></td><td>${escapeHtml(x.area_room)}</td><td>${escapeHtml(x.rack_no)}</td><td>${escapeHtml(x.level)}</td><td>${escapeHtml(x.bin_no)}</td><td>${escapeHtml(x.bin_type)}</td><td>${statusChip(x.status || 'Active')}</td><td>${escapeHtml(x.allowed_category)}</td><td>${escapeHtml(x.current_item_codes)}</td><td>${escapeHtml(x.label_posted)}</td><td><div class="row-actions"><button class="mini-btn" onclick="editBin('${x.id}')">Edit</button><button class="mini-btn danger" onclick="confirmDeleteBin('${x.id}')">Delete</button></div></td></tr>`).join('') || emptyRow(11);
}

function ticketNoFromMovement(m){
  const match = String(m.notes || '').match(/ISS-\d{4}-\d{4,}/i);
  return match ? match[0].toUpperCase() : (m.work_order ? `WO-${m.work_order}` : `LOG-${m.id}`);
}
function issueLogGroups(){
  const map = new Map();
  for (const m of state.movements) {
    const no = ticketNoFromMovement(m);
    if (!map.has(no)) map.set(no, { ticket_no: no, movements: [], ticket: state.tickets.find((t) => t.ticket_no === no) });
    map.get(no).movements.push(m);
  }
  return [...map.values()].sort((a,b) => new Date(b.movements[0]?.created_at || 0) - new Date(a.movements[0]?.created_at || 0));
}
function renderMovements() {
  if (!$('movementRows')) return;
  const groups = issueLogGroups();
  $('movementCount').textContent = `${groups.length} logs`;
  $('movementRows').innerHTML = groups.map((g) => {
    const first = g.movements[0] || {};
    const total = g.movements.reduce((sum, x) => sum + Number(x.qty_taken || 0), 0);
    const status = g.ticket?.status || 'ISSUED';
    return `<tr class="log-row" onclick="openIssueLog('${escapeHtml(g.ticket_no)}')"><td><strong>${escapeHtml(g.ticket_no)}</strong></td><td>${first.created_at ? new Date(first.created_at).toLocaleString() : ''}</td><td>${escapeHtml(g.ticket?.work_order || first.work_order || '')}</td><td>${escapeHtml(g.ticket?.department || first.issued_to || '')}</td><td>${g.movements.length}</td><td>${moneyish(total)}</td><td>${statusChip(status)}</td><td><button class="ghost-btn compact" onclick="event.stopPropagation(); openIssueLog('${escapeHtml(g.ticket_no)}')">View / Print</button></td></tr>`;
  }).join('') || emptyRow(8);
}

window.openIssueLog = function(ticketNo){
  const group = issueLogGroups().find((g) => g.ticket_no === ticketNo);
  if (!group) return;
  const ticket = group.ticket || {};
  $('issueLogTitle').textContent = `Issue Log - ${ticketNo}`;
  const first = group.movements[0] || {};
  const total = group.movements.reduce((sum, x) => sum + Number(x.qty_taken || 0), 0);
  $('issueLogMeta').innerHTML = `<div><span>Ticket No</span><strong>${escapeHtml(ticketNo)}</strong></div><div><span>Issue Date</span><strong>${first.created_at ? new Date(first.created_at).toLocaleString() : '-'}</strong></div><div><span>Job / Work Order</span><strong>${escapeHtml(ticket.work_order || first.work_order || '-')}</strong></div><div><span>Issued To</span><strong>${escapeHtml(ticket.department || first.issued_to || '-')}</strong></div><div><span>Received By</span><strong>${escapeHtml(ticket.received_by || '-')}</strong></div><div><span>Total Qty</span><strong>${moneyish(total)}</strong></div>`;
  $('issueLogDetailRows').innerHTML = group.movements.map((m, i) => `<tr><td>${i+1}</td><td><strong>${escapeHtml(m.item_code)}</strong></td><td>${escapeHtml(m.description)}</td><td>${escapeHtml(m.bin)}</td><td>${moneyish(m.qty_taken)}</td><td>${moneyish(m.qty_before)}</td><td>${moneyish(m.qty_after)}</td></tr>`).join('') || emptyRow(7);
  $('issueLogPrintBtn').onclick = () => printIssueLog(ticketNo);
  $('issueLogModal').showModal();
};

window.printIssueLog = function(ticketNo){
  const group = issueLogGroups().find((g) => g.ticket_no === ticketNo);
  if (!group) return;
  if (group.ticket) { printTicket(group.ticket.id); return; }
  const w = window.open('', '_blank', 'width=980,height=760');
  const rows = group.movements.map((m,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(m.item_code)}</td><td>${escapeHtml(m.description)}</td><td>${escapeHtml(m.bin)}</td><td>${moneyish(m.qty_taken)}</td><td>${moneyish(m.qty_before)}</td><td>${moneyish(m.qty_after)}</td></tr>`).join('');
  w.document.write(`<!doctype html><html><head><title>${escapeHtml(ticketNo)}</title><style>body{font-family:Arial;margin:24px;color:#111}.box{border:2px solid #111;padding:18px}h1{text-align:center;font-size:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #111;padding:7px;font-size:12px}th{background:#eee}.grid{display:grid;grid-template-columns:180px 1fr 180px 1fr;margin-bottom:14px}.grid div{border:1px solid #111;padding:7px}.label{font-weight:bold;background:#eee}</style></head><body><div class="box"><h1>MATERIAL ISSUE LOG</h1><div class="grid"><div class="label">Ticket / Log No</div><div>${escapeHtml(ticketNo)}</div><div class="label">Issue Date</div><div>${new Date(group.movements[0]?.created_at || Date.now()).toLocaleString()}</div></div><table><thead><tr><th>S.No</th><th>Item Code</th><th>Description</th><th>Bin</th><th>Qty Issued</th><th>Before</th><th>After</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>w.print(),300);
};

function renderCart() {
  if (!$('cartRows')) return;
  $('cartBadge').textContent = state.cart.length;
  const totalQty = state.cart.reduce((sum,c)=>sum+Number(c.qty_requested||0),0);
  const rows = state.cart.map((c) => {
    const item = state.inventory.find((x) => x.id === c.item_id);
    if (!item) return '';
    return `<tr><td><strong>${escapeHtml(item.item_code)}</strong><br><span class="muted">${escapeHtml(item.part_no || '')}</span></td><td>${escapeHtml(item.description)}</td><td>${moneyish(item.qty)} ${escapeHtml(item.uom)}</td><td><input class="qty-input" type="number" min="0.01" step="0.01" max="${Number(item.qty || 0)}" value="${c.qty_requested}" onchange="updateCartQty('${item.id}', this.value)" required /></td><td>${escapeHtml(item.bin)}</td><td><button class="mini-btn danger" onclick="removeFromCart('${item.id}')">Remove</button></td></tr>`;
  }).join('');
  $('cartRows').innerHTML = rows || emptyRow(6);
  const existing = $('cartSummary');
  if (existing) existing.remove();
  const summary = document.createElement('div');
  summary.id = 'cartSummary';
  summary.className = 'cart-summary';
  summary.innerHTML = `<strong>${state.cart.length} item(s)</strong><span>Total requested qty: ${moneyish(totalQty)}</span>`;
  $('ticketRequestForm')?.parentNode?.insertBefore(summary, $('ticketRequestForm'));
}

async function raiseTicket(e) {
  e.preventDefault();
  const valid = state.cart.filter((c) => Number(c.qty_requested || 0) > 0);
  if (!valid.length) return setTicketMsg('Add at least one item and enter required quantity.', false);
  const requiredFields = [
    ['ticketWorkOrder', 'Work Order / Job'],
    ['ticketDepartment', 'Department'],
    ['ticketReceivedBy', 'Received By'],
    ['ticketNotes', 'Notes'],
  ];
  for (const [id,label] of requiredFields) {
    if (!String($(id)?.value || '').trim()) { $(id)?.focus(); return setTicketMsg(`${label} is mandatory.`, false); }
  }
  for (const c of valid) {
    const item = state.inventory.find((x) => x.id === c.item_id);
    if (!item || Number(c.qty_requested) > Number(item.qty || 0)) return setTicketMsg(`Requested quantity exceeds available stock for ${item?.item_code || 'an item'}.`, false);
  }
  const ticket = normalizeTicket({
    id: uid(), ticket_no: makeTicketNo(), status: 'PENDING', requested_by_user_id: state.user?.id || null,
    requested_by_email: state.user?.email || '', requested_by_name: state.user?.email || '', department: $('ticketDepartment').value.trim(),
    work_order: $('ticketWorkOrder').value.trim(), request_ref: '', return_expected: $('ticketReturnExpected').value || 'N',
    received_by: $('ticketReceivedBy').value.trim(), notes: $('ticketNotes').value.trim(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), issued_at: null
  });
  const lines = valid.map((c) => { const item = state.inventory.find((x) => x.id === c.item_id); return normalizeTicketLine({ id: uid(), ticket_id: ticket.id, item_id: item.id, item_code: item.item_code, part_no: item.part_no, description: item.description, lot_trace_id: '', from_bin: item.bin, uom: item.uom, qty_requested: c.qty_requested, qty_issued: 0 }); });
  state.tickets.unshift(ticket); state.ticketLines.push(...lines); persistLocal();
  if (state.dbReady) {
    const { error: tErr } = await state.supabase.from('material_issue_tickets').insert(dbSafeTicket(ticket));
    if (tErr) return setTicketMsg(`Ticket save failed: ${tErr.message}`, false);
    const { error: lErr } = await state.supabase.from('material_issue_ticket_lines').insert(lines);
    if (lErr) return setTicketMsg(`Ticket line save failed: ${lErr.message}`, false);
  }
  state.cart = [];
  $('ticketRequestForm').reset(); $('ticketDepartment').value = 'Production'; renderCart();
  setTicketMsg(`Success: Ticket ${ticket.ticket_no} raised for Job ${ticket.work_order}. Total items: ${lines.length}. Stores will verify and issue.`, true);
  renderAll();
}
function setTicketMsg(msg, success=false) { if ($('ticketRequestMessage')) { $('ticketRequestMessage').textContent = msg; $('ticketRequestMessage').classList.toggle('success', !!success); } }

document.addEventListener('click', (e) => {
  const th = e.target.closest('[data-bin-sort]');
  if (!th) return;
  const key = th.dataset.binSort;
  if (state.binSortKey === key) state.binSortDir = state.binSortDir === 'asc' ? 'desc' : 'asc';
  else { state.binSortKey = key; state.binSortDir = 'asc'; }
  renderBins();
});

function ticketPrintHtml(ticket, lines) {
  const lineRows = [...lines, ...Array(Math.max(0, 8 - lines.length)).fill({})].map((l, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(l.item_code || '')}</td><td>${escapeHtml(l.part_no || '')}</td><td>${escapeHtml(l.description || '')}</td><td>${escapeHtml(l.lot_trace_id || '')}</td><td>${escapeHtml(l.from_bin || '')}</td><td>${escapeHtml(l.uom || '')}</td><td>${moneyish(l.qty_issued || l.qty_requested || '')}</td></tr>`).join('');
  return `<!doctype html><html><head><title>${escapeHtml(ticket.ticket_no)}</title><style>body{font-family:Arial,sans-serif;color:#111;margin:24px}.ticket{max-width:980px;margin:auto;border:2px solid #111;padding:18px}.title{text-align:center;font-weight:800;font-size:20px;margin-bottom:14px}.grid{display:grid;grid-template-columns:190px 1fr 190px 1fr;border-top:1px solid #111;border-left:1px solid #111}.grid div{padding:8px;border-right:1px solid #111;border-bottom:1px solid #111}.label{font-weight:700;background:#f1f1f1}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #111;padding:7px;font-size:12px;vertical-align:top}th{background:#f1f1f1}.sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:28px}.sign div{border-top:1px solid #111;padding-top:8px;text-align:center}.note{font-size:11px;margin-top:12px}@media print{button{display:none}.ticket{border:2px solid #000}}</style></head><body><div class="ticket"><div class="title">MATERIAL ISSUE TICKET / ISSUE LOG</div><div class="grid"><div class="label">Issue No</div><div>${escapeHtml(ticket.ticket_no)}</div><div class="label">Issue Date</div><div>${new Date(ticket.issued_at || ticket.created_at).toLocaleDateString()}</div><div class="label">Work Order / Job</div><div>${escapeHtml(ticket.work_order)}</div><div class="label">Department</div><div>${escapeHtml(ticket.department)}</div><div class="label">Return Expected? (Y/N)</div><div>${escapeHtml(ticket.return_expected)}</div><div class="label">Status</div><div>${escapeHtml(ticket.status)}</div><div class="label">Issued By (Stores)</div><div>${escapeHtml(ticket.issued_by)}</div><div class="label">Received By (Production)</div><div>${escapeHtml(ticket.received_by)}</div></div><table><thead><tr><th>S.No</th><th>Item Code</th><th>Part No</th><th>Description</th><th>Lot/Trace ID</th><th>From Bin</th><th>UOM</th><th>Qty Issued</th></tr></thead><tbody>${lineRows}</tbody></table><div class="sign"><div>Stores Signature</div><div>Production Signature</div><div>Verified By</div></div><p class="note">Generated from Stack n Stock Inventory OS. Notes: ${escapeHtml(ticket.notes)}</p></div></body></html>`;
}

init();
