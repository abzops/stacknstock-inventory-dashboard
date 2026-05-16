/* Stack n Stock V9.2.2
   Same UI. Fixes source algorithms and dropdowns.
   - Direct MIV: dropdown from available inventory only.
   - Downstream flows (DC, Job Work, WIP, Scrap, Return): dropdown from MIV Register + Issue Logs only.
   - Blocks negative stock and invalid manual item codes.
*/
(function () {
  "use strict";

  const $id = (id) => document.getElementById(id);
  const n = (v) => Number(v || 0);
  const clean = (v) => String(v || "").trim();
  const up = (v) => clean(v).toUpperCase();
  const fmt = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const hasFn = (name) => typeof window[name] === "function" || typeof evalSafe(name) === "function";

  function evalSafe(name) {
    try { return Function(`return typeof ${name} !== "undefined" ? ${name} : undefined`)(); }
    catch (_) { return undefined; }
  }

  function call(name, ...args) {
    const fn = evalSafe(name);
    if (typeof fn === "function") return fn(...args);
    throw new Error(`${name} is not available yet.`);
  }

  function getState() {
    const st = evalSafe("state") || window.state || window.snsState;
    if (st && !window.snsState) window.snsState = st;
    if (st && !window.state) window.state = st;
    return st || {};
  }

  function itemByCodeSafe(code) {
    try {
      const fn = evalSafe("itemByCode");
      if (typeof fn === "function") return fn(code);
    } catch (_) {}
    const st = getState();
    return (st.inventory || []).find((x) => up(x.item_code) === up(code));
  }

  function balanceSafe(code) {
    try {
      const fn = evalSafe("calculateAvailableStock");
      if (typeof fn === "function") return n(fn(code));
    } catch (_) {}
    const st = getState();
    const ledger = st.stockLedger || [];
    const bal = ledger.filter((l) => up(l.item_code) === up(code)).reduce((s, l) => s + n(l.in_qty) - n(l.out_qty), 0);
    if (ledger.some((l) => up(l.item_code) === up(code))) return Math.max(0, bal);
    const item = (st.inventory || []).find((x) => up(x.item_code) === up(code));
    return Math.max(0, n(item && item.qty));
  }

  function descriptionOf(item) {
    return clean(item && (item.description || item.item_description || item.item_name || item.name));
  }

  function uomOf(item) {
    return clean(item && (item.uom || item.unit || item.usage_unit)) || "Nos";
  }

  function binOf(item) {
    return clean(item && (item.bin || item.bin_id || item.bin_location || item.putaway_bin));
  }

  function availableInventoryRows() {
    const st = getState();
    const map = new Map();
    (st.inventory || []).forEach((item) => {
      const code = up(item.item_code);
      if (!code) return;
      const qty = balanceSafe(code);
      if (qty <= 0) return;
      map.set(code, {
        item_code: code,
        description: descriptionOf(item),
        uom: uomOf(item),
        bin: binOf(item),
        available_qty: qty,
        source: "Inventory Master"
      });
    });
    return [...map.values()].sort((a, b) => a.item_code.localeCompare(b.item_code));
  }

  function sourceNoFromMovement(m) {
    const notes = clean(m.notes || m.remarks || "");
    const miv = notes.match(/MIV\/?\d{4}\/?\d{3,}/i) || notes.match(/MIV\/\d{4}\/\d{4}/i);
    if (miv) return miv[0].toUpperCase();
    const iss = notes.match(/ISS-\d{4}-\d+/i);
    if (iss) return iss[0].toUpperCase();
    if (m.source_doc_no) return clean(m.source_doc_no);
    if (m.ticket_no) return clean(m.ticket_no);
    if (m.work_order) return clean(m.work_order);
    return clean(m.id || "ISSUE-LOG");
  }

  function issuedRowsFromMivAndIssueLogs() {
    const st = getState();
    const rows = [];

    (st.mivLines || []).forEach((line) => {
      const miv = (st.mivs || []).find((h) => clean(h.id) === clean(line.miv_id)) || {};
      const code = up(line.item_code);
      if (!code) return;
      rows.push({
        source_doc_type: "MIV",
        source_doc_no: clean(miv.miv_no || line.miv_no || "MIV"),
        source_line_id: clean(line.id),
        item_id: clean(line.item_id),
        item_code: code,
        description: clean(line.description),
        uom: clean(line.uom) || "Nos",
        from_bin: clean(line.from_bin),
        qty_issued: n(line.qty_issued || line.qty || line.quantity),
        work_order: clean(miv.work_order),
        source_label: "MIV Register"
      });
    });

    (st.movements || []).forEach((m) => {
      const mt = up(m.movement_type);
      if (mt.includes("RETURN")) return;
      const code = up(m.item_code);
      const qty = n(m.qty_taken || m.qty_issued || m.out_qty || m.qty);
      if (!code || qty <= 0) return;
      const item = itemByCodeSafe(code) || {};
      rows.push({
        source_doc_type: "ISSUE_LOG",
        source_doc_no: sourceNoFromMovement(m),
        source_line_id: clean(m.id),
        item_id: clean(m.item_id || item.id),
        item_code: code,
        description: clean(m.description) || descriptionOf(item),
        uom: uomOf(item),
        from_bin: clean(m.bin || m.from_bin) || binOf(item),
        qty_issued: qty,
        work_order: clean(m.work_order),
        source_label: "Issue Logs"
      });
    });

    (st.ticketLines || []).forEach((line) => {
      const ticket = (st.tickets || []).find((h) => clean(h.id) === clean(line.ticket_id)) || {};
      const code = up(line.item_code);
      const qty = n(line.qty_issued || line.qty_requested);
      if (!code || qty <= 0 || up(ticket.status) !== "ISSUED") return;
      rows.push({
        source_doc_type: "ISSUE_TICKET",
        source_doc_no: clean(ticket.ticket_no || line.source_ticket_no || "ISSUE"),
        source_line_id: clean(line.id),
        item_id: clean(line.item_id),
        item_code: code,
        description: clean(line.description),
        uom: clean(line.uom) || "Nos",
        from_bin: clean(line.from_bin),
        qty_issued: qty,
        work_order: clean(ticket.work_order),
        source_label: "Issue Logs"
      });
    });

    const map = new Map();
    rows.forEach((r) => {
      const key = up(r.item_code);
      if (!map.has(key)) map.set(key, { ...r, qty_issued: 0, source_docs: new Set(), source_labels: new Set() });
      const x = map.get(key);
      x.description = x.description || r.description;
      x.uom = x.uom || r.uom;
      x.from_bin = x.from_bin || r.from_bin;
      x.qty_issued += n(r.qty_issued);
      if (r.source_doc_no) x.source_docs.add(r.source_doc_no);
      if (r.source_label) x.source_labels.add(r.source_label);
    });
    return [...map.values()].map((r) => ({ ...r, source_docs: [...r.source_docs], source_labels: [...r.source_labels] })).sort((a, b) => a.item_code.localeCompare(b.item_code));
  }

  function optionHtml(rows, placeholder, kind) {
    const empty = `<option value="">${placeholder}</option>`;
    if (!rows.length) return `<option value="">No ${kind} found</option>`;
    return empty + rows.map((r) => {
      const qtyText = kind === "available items" ? `Avail ${fmt(r.available_qty)}` : `Issued ${fmt(r.qty_issued)}`;
      const src = kind === "issued items" ? (r.source_labels || []).join(" + ") : r.source;
      const doc = kind === "issued items" ? (r.source_docs || []).join(", ") : "";
      const label = [r.item_code, r.description, r.uom, r.bin || r.from_bin, qtyText, src, doc].filter(Boolean).join(" | ");
      return `<option value="${escapeHtml(r.item_code)}" data-desc="${escapeHtml(r.description)}" data-uom="${escapeHtml(r.uom)}" data-bin="${escapeHtml(r.bin || r.from_bin)}" data-qty="${escapeHtml(r.available_qty || r.qty_issued)}">${escapeHtml(label)}</option>`;
    }).join("");
  }

  function fillSelect(id, rows, placeholder, kind) {
    const el = $id(id);
    if (!el || el.tagName !== "SELECT") return;
    const current = up(el.value);
    el.innerHTML = optionHtml(rows, placeholder, kind);
    if (current && rows.some((r) => up(r.item_code) === current)) el.value = current;
  }

  function applySelectedToFields(selectId, fields) {
    const el = $id(selectId);
    if (!el) return;
    const run = () => {
      const opt = el.selectedOptions && el.selectedOptions[0];
      if (!opt) return;
      if (fields.description && $id(fields.description)) $id(fields.description).value = opt.dataset.desc || "";
      if (fields.uom && $id(fields.uom)) $id(fields.uom).value = opt.dataset.uom || "";
      if (fields.bin && $id(fields.bin)) $id(fields.bin).value = opt.dataset.bin || "";
      if (fields.qty && $id(fields.qty)) {
        const q = n(opt.dataset.qty);
        $id(fields.qty).max = q || "";
        if (!$id(fields.qty).value && q > 0) $id(fields.qty).value = q >= 1 ? "1" : String(q);
      }
      if (fields.unitCost && $id(fields.unitCost)) {
        const costFn = evalSafe("latestUnitCost");
        if (typeof costFn === "function") {
          const cost = n(costFn(el.value));
          if (cost > 0 && !$id(fields.unitCost).value) $id(fields.unitCost).value = cost;
        }
      }
    };
    el.removeEventListener("change", el.__snsV922Run || (() => {}));
    el.__snsV922Run = run;
    el.addEventListener("change", run);
  }

  function refreshAllDropdowns() {
    const available = availableInventoryRows();
    const issued = issuedRowsFromMivAndIssueLogs();

    // Direct MIV creates the source issue; it must use available stock from inventory.
    fillSelect("mivItemCode", available, "Select available item code", "available items");
    applySelectedToFields("mivItemCode", { description: "mivDescription", uom: "mivUom", bin: "mivFromBin", qty: "mivQtyIssued" });

    // These modules consume / reference already issued material, so they use MIV Register + Issue Logs.
    ["returnItemCode", "dcItemCode", "jobWorkSourceItem", "wipInputItem", "scrapItemCode"].forEach((id) => {
      fillSelect(id, issued, "Select item from MIV / Issue Logs", "issued items");
    });
    applySelectedToFields("dcItemCode", { description: "dcDescription", uom: "dcUom", qty: "dcQty" });
    applySelectedToFields("jobWorkSourceItem", { description: "jobWorkSourceDesc", uom: "jobWorkUom", qty: "jobWorkQtySent" });
    applySelectedToFields("wipInputItem", { description: "wipInputDesc", uom: "wipInputUom", qty: "wipQtyUsed", unitCost: "wipUnitCost" });
    applySelectedToFields("scrapItemCode", { description: "scrapDescription", uom: "scrapUom", qty: "scrapQty" });
  }

  function installSafeMivSubmit() {
    const form = $id("mivForm");
    if (!form || form.dataset.snsV922SafeSubmit) return;
    form.dataset.snsV922SafeSubmit = "1";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      try {
        const now = new Date().toISOString();
        const code = up($id("mivItemCode")?.value);
        const qty = n($id("mivQtyIssued")?.value);
        const item = itemByCodeSafe(code);
        if (!code || !item) throw new Error("Select a valid available item code from the dropdown.");
        if (qty <= 0) throw new Error("Qty issued must be greater than zero.");
        const available = balanceSafe(code);
        if (qty > available) throw new Error(`Insufficient stock for ${code}. Available ${fmt(available)}, requested ${fmt(qty)}.`);

        const header = call("normalizeMiv", { id: call("uid"), miv_no: $id("mivNo").value.trim(), miv_date: $id("mivDate").value, issued_to: $id("mivIssuedTo").value, department: $id("mivDepartment").value, work_order: $id("mivWorkOrder").value, return_expected: $id("mivReturnExpected").value, issued_by: getState().user?.email || "Stores", received_by: $id("mivReceivedBy").value, remarks: $id("mivRemarks").value, created_by: getState().user?.id || null, created_by_email: getState().user?.email || "", created_at: now, updated_at: now });
        const line = call("normalizeMivLine", { id: call("uid"), miv_id: header.id, item_id: item.id || "", item_code: code, description: descriptionOf(item), uom: uomOf(item), from_bin: binOf(item), qty_requested: qty, qty_issued: qty, remarks: $id("mivRemarks").value, created_at: now });

        getState().mivs.unshift(header);
        getState().mivLines.push(line);
        await call("insertRows", "miv_headers", header);
        await call("insertRows", "miv_lines", [line]);
        await call("postLedgerEntry", { movement_type: "MIV_ISSUE", source_doc_type: "MIV", source_doc_no: header.miv_no, source_line_id: line.id, item_id: item.id || "", item_code: code, description: line.description, uom: line.uom, out_qty: qty, from_bin: line.from_bin, work_order: header.work_order, department: header.department, remarks: header.remarks });
        call("persistLocal");
        call("renderAll");
        call("setV7Msg", "mivMessage", `MIV ${header.miv_no} saved.`);
        setTimeout(() => $id("mivModal")?.close(), 250);
      } catch (err) {
        call("setV7Msg", "mivMessage", err.message || String(err), false);
      }
    }, true);
  }

  function patchLedgerGuard() {
    const old = evalSafe("postLedgerEntry");
    if (typeof old !== "function" || old.__snsV922Guarded) return;
    const guarded = async function(entry) {
      const code = up(entry.item_code);
      const outQty = n(entry.out_qty);
      if (outQty > 0) {
        const item = itemByCodeSafe(code);
        if (!item) throw new Error(`Cannot issue ${code}. Item does not exist in inventory master.`);
        const before = balanceSafe(code);
        if (before < outQty) throw new Error(`Insufficient stock for ${code}. Available ${fmt(before)}, requested ${fmt(outQty)}.`);
      }
      const row = await old(entry);
      if (n(row.qty_after) < 0) throw new Error(`Blocked negative stock for ${code}.`);
      return row;
    };
    guarded.__snsV922Guarded = true;
    try { Function("guarded", "postLedgerEntry = guarded;")(guarded); } catch (_) { window.postLedgerEntry = guarded; }
  }

  function install() {
    getState();
    patchLedgerGuard();
    refreshAllDropdowns();
    installSafeMivSubmit();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(install, 500));
  document.addEventListener("click", (e) => {
    if (e.target && (e.target.id === "openMivModal" || e.target.id === "openDcModal" || e.target.id === "openJobWorkModal" || e.target.id === "openWipModal" || e.target.id === "openScrapModal" || e.target.id === "openReturnModalBtn")) {
      setTimeout(install, 150);
      setTimeout(refreshAllDropdowns, 700);
    }
  }, true);
  document.addEventListener("change", (e) => {
    if (e.target && ["mivItemCode", "dcItemCode", "jobWorkSourceItem", "wipInputItem", "scrapItemCode", "returnItemCode"].includes(e.target.id)) {
      setTimeout(refreshAllDropdowns, 50);
    }
  }, true);

  window.SNS_V922_FLOW_FIX = {
    refresh: refreshAllDropdowns,
    availableInventoryRows,
    issuedRowsFromMivAndIssueLogs
  };
})();
