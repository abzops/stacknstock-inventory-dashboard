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
  priceSupabase: null,
  priceDbReady: false,
  dbReady: false,
  user: null,
};

const $ = (id) => document.getElementById(id);
const cleanStatus = (s) => (s || "OK").toString().trim().toUpperCase();
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const moneyish = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const errMsg = (err) => err?.message || String(err || "Something went wrong.");
const dbTimeoutMs = () => Number(window.SNS_DB_TIMEOUT_MS || 12000);
const printLogoSrc = () => new URL("assets/full color-01.png?v=20260523-print-logo-full-color", window.location.href).href;

function printDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function printMetaGrid(rows) {
  return `<div class="meta-grid">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "")}</strong></div>`).join("")}</div>`;
}

function printTable(headers, rows) {
  return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function printSignatures(labels = ["Prepared By", "Checked By", "Approved By"]) {
  return `<div class="signatures">${labels.map((label) => `<div><span>${escapeHtml(label)}</span></div>`).join("")}</div>`;
}

function printDocumentHtml(title, subtitle, content) {
  return `<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;background:#fff}.sheet{max-width:1040px;margin:0 auto;border:2px solid #111;padding:18px;min-height:calc(297mm - 28mm)}.doc-head{display:grid;grid-template-columns:220px 1fr 170px;align-items:center;border-bottom:2px solid #111;padding-bottom:12px;gap:14px}.doc-head img{max-width:210px;max-height:66px;object-fit:contain}.doc-title{text-align:center}.doc-title h1{font-size:20px;margin:0;text-transform:uppercase;letter-spacing:.06em}.doc-title p{margin:5px 0 0;font-size:12px;color:#444}.print-meta{text-align:right;font-size:11px;color:#444}.meta-grid{display:grid;grid-template-columns:repeat(4,1fr);border-left:1px solid #111;border-top:1px solid #111;margin:16px 0}.meta-grid div{min-height:48px;border-right:1px solid #111;border-bottom:1px solid #111;padding:7px}.meta-grid span{display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#555;letter-spacing:.06em}.meta-grid strong{display:block;margin-top:4px;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #111;padding:7px;font-size:12px;vertical-align:top}th{background:#efefef;text-transform:uppercase;font-size:11px;letter-spacing:.04em}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:42px}.signatures div{border-top:1px solid #111;text-align:center;padding-top:8px;font-size:12px}.label-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.store-label{break-inside:avoid;border:2px solid #111;padding:12px;min-height:148mm}.store-label h2{font-size:16px;margin:0 0 10px;text-align:center}.store-label .meta-grid{grid-template-columns:130px 1fr 130px 1fr;margin:8px 0}.store-label .meta-grid div{min-height:42px}.printbar{text-align:right;margin-bottom:10px}@media print{.printbar{display:none}.sheet{border:2px solid #000}.store-label{page-break-inside:avoid}}</style></head><body><div class="printbar"><button onclick="window.print()">Print</button></div><div class="sheet"><header class="doc-head"><img data-print-logo src="${printLogoSrc()}" alt="Stack n Stock" /><div class="doc-title"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle || "Generated from Stack n Stock Inventory OS")}</p></div><div class="print-meta">Printed<br>${new Date().toLocaleString()}</div></header>${content}</div></body></html>`;
}

function openPrintDocument(title, subtitle, content) {
  const w = window.open("", "_blank", "width=1040,height=780");
  if (!w) return alert("Allow pop-ups to print this document.");
  w.document.write(printDocumentHtml(title, subtitle, content));
  w.document.close();
  w.focus();
  const printReady = () => setTimeout(() => w.print(), 120);
  const logo = w.document.querySelector("[data-print-logo]");
  if (logo && !logo.complete) {
    let printed = false;
    const safePrint = () => {
      if (printed) return;
      printed = true;
      printReady();
    };
    logo.addEventListener("load", safePrint, { once: true });
    logo.addEventListener("error", safePrint, { once: true });
    setTimeout(safePrint, 1500);
  } else {
    printReady();
  }
}

function showWorkflowMessage(message, ok = true) {
  if (!message) return;
  const openDialog = document.querySelector("dialog[open]");
  const host = openDialog || document.body;
  let region = host.querySelector(":scope > .workflow-toast-region");
  if (!region) {
    region = document.createElement("div");
    region.className = "workflow-toast-region";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    host.prepend(region);
  }
  const toast = document.createElement("div");
  toast.className = `workflow-toast ${ok ? "success" : "error"}`;
  toast.textContent = message;
  region.appendChild(toast);
  setTimeout(() => toast.remove(), ok ? 4200 : 7000);
}

function placeMessageAtTop(el) {
  if (!el) return;
  const form = el.closest("form");
  const head = form?.querySelector(".modal-head");
  if (head && head.nextElementSibling !== el) head.insertAdjacentElement("afterend", el);
}

function setFormMessage(id, message, ok = true) {
  const el = $(id);
  if (!el) return;
  placeMessageAtTop(el);
  el.textContent = message || "";
  el.classList.toggle("hidden", !message);
  el.classList.toggle("success", !!ok);
  el.classList.toggle("error", !ok);
}

function closeDialogAfterSuccess(dialogId, delay = 450) {
  setTimeout(() => {
    const dlg = $(dialogId);
    if (dlg?.open) dlg.close();
  }, delay);
}

function setSubmitBusy(form, busy, label = "Saving...") {
  const btn = form?.querySelector('button[type="submit"]');
  if (!btn) return;
  if (busy) {
    btn.dataset.originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    delete btn.dataset.originalText;
  }
}

function userProfileKey() {
  const id = state.user?.id || state.user?.email || "local";
  return `sns_user_profile_${id}`;
}

function storedUserProfile() {
  try { return JSON.parse(localStorage.getItem(userProfileKey()) || "{}"); }
  catch (_) { return {}; }
}

function currentUserProfile() {
  const meta = state.user?.user_metadata || {};
  const stored = storedUserProfile();
  const email = state.user?.email || "";
  const name = stored.name || meta.display_name || meta.full_name || meta.name || email.split("@")[0] || "User";
  return { name, email, avatarData: stored.avatarData || meta.avatar_url || "" };
}

function initialsFor(name) {
  return String(name || "U").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "U";
}

function paintAvatar(el, profile) {
  if (!el) return;
  const avatar = profile?.avatarData || "";
  el.textContent = initialsFor(profile?.name);
  el.classList.toggle("has-image", !!avatar);
  el.style.backgroundImage = avatar ? `url("${avatar}")` : "";
}

function renderUserIdentity() {
  if (!state.user) return;
  const profile = currentUserProfile();
  if ($("userDisplayName")) $("userDisplayName").textContent = profile.name;
  paintAvatar($("userAvatar"), profile);
}

function openUserSettings() {
  if (!state.user) return;
  const profile = currentUserProfile();
  $("profileName").value = profile.name;
  $("profileEmail").value = profile.email;
  $("profilePassword").value = "";
  $("profilePasswordConfirm").value = "";
  state.pendingProfileAvatarData = profile.avatarData || "";
  paintAvatar($("profileAvatarPreview"), profile);
  setFormMessage("profileMessage", "", true);
  $("userSettingsModal")?.showModal();
}

function readResizedProfileImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!/^image\//.test(file.type || "")) return reject(new Error("Select an image file for the profile pic."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read profile pic."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load profile pic."));
      img.onload = () => {
        const max = 180;
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleProfilePicChange(e) {
  try {
    state.pendingProfileAvatarData = await readResizedProfileImage(e.target.files?.[0]);
    paintAvatar($("profileAvatarPreview"), { name: $("profileName")?.value, avatarData: state.pendingProfileAvatarData });
    setFormMessage("profileMessage", "Profile pic ready. Save profile to apply it.", true);
  } catch (err) {
    setFormMessage("profileMessage", errMsg(err), false);
  }
}

async function saveUserSettings(e) {
  e.preventDefault();
  if (!state.user) return;
  const form = e.currentTarget;
  const name = $("profileName").value.trim() || currentUserProfile().name;
  const email = $("profileEmail").value.trim();
  const password = $("profilePassword").value;
  const confirmPassword = $("profilePasswordConfirm").value;
  if (password && password !== confirmPassword) return setFormMessage("profileMessage", "Passwords do not match.", false);
  if (password && password.length < 6) return setFormMessage("profileMessage", "Password must be at least 6 characters.", false);
  setSubmitBusy(form, true, "Saving...");
  setFormMessage("profileMessage", "Saving profile...", true);
  try {
    const avatarData = state.pendingProfileAvatarData || currentUserProfile().avatarData || "";
    const stored = { name, avatarData };
    localStorage.setItem(userProfileKey(), JSON.stringify(stored));
    if (state.dbReady && state.supabase?.auth?.updateUser) {
      const attributes = { data: { ...(state.user.user_metadata || {}), display_name: name, full_name: name, avatar_url: avatarData } };
      if (email && email !== state.user.email) attributes.email = email;
      if (password) attributes.password = password;
      const { data, error } = await state.supabase.auth.updateUser(attributes);
      if (error) throw error;
      state.user = data?.user || state.user;
    }
    renderUserIdentity();
    setFormMessage("profileMessage", "Profile saved. Email changes may require confirmation.", true);
    showWorkflowMessage("Profile saved.", true);
    setTimeout(() => $("userSettingsModal")?.close(), 500);
  } catch (err) {
    setFormMessage("profileMessage", errMsg(err), false);
    showWorkflowMessage(errMsg(err), false);
  } finally {
    setSubmitBusy(form, false);
  }
}

async function withDbTimeout(operation, label = "Database request") {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const request = controller && operation && typeof operation.abortSignal === "function"
    ? operation.abortSignal(controller.signal)
    : operation;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller?.abort();
      reject(new Error(`${label} timed out. Check the connection and try again.`));
    }, dbTimeoutMs());
  });
  try {
    return await Promise.race([request, timeout]);
  } catch (err) {
    if (/maximum call stack size exceeded/i.test(err?.message || "")) {
      throw new Error(`${label} failed before reaching the database. Refresh the page and try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function formMessageTarget(form) {
  return {
    itemForm: "itemMessage",
    ncrForm: "ncrMessage",
    binForm: "binMessage",
    issueForm: "issueMessage",
    ticketRequestForm: "ticketRequestMessage",
    returnForm: "returnMessage",
    grnForm: "grnMessage",
    mivForm: "mivMessage",
    dcForm: "dcMessage",
    jobWorkForm: "jobWorkMessage",
    wipForm: "wipMessage",
    scrapForm: "scrapMessage",
    authForm: "authMessage",
  }[form?.id];
}

function fieldLabel(input) {
  const label = input.closest("label");
  if (!label) return input.id || input.name || "This field";
  return [...label.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s*\*\s*$/, "") || input.id || "This field";
}

function showValidationMessage(input) {
  const form = input.form;
  if (!form || form.dataset.validationNotified === "1") return;
  form.dataset.validationNotified = "1";
  setTimeout(() => { delete form.dataset.validationNotified; }, 250);
  const msg = `${fieldLabel(input)}: ${input.validationMessage || "Check this value."}`;
  const target = formMessageTarget(form);
  if (target === "ticketRequestMessage" && typeof setTicketMsg === "function") setTicketMsg(msg, false);
  else if (target === "returnMessage" && typeof setReturnMsg === "function") setReturnMsg(msg, false);
  else if (["grnMessage", "mivMessage", "dcMessage", "jobWorkMessage", "wipMessage", "scrapMessage"].includes(target) && typeof setV7Msg === "function") setV7Msg(target, msg, false);
  else if (target === "authMessage" && typeof setAuthMessage === "function") { setAuthMessage(msg); showWorkflowMessage(msg, false); }
  else { setFormMessage(target, msg, false); showWorkflowMessage(msg, false); }
}

function installFormValidationMessages() {
  if (document.body.dataset.workflowValidationInstalled) return;
  document.body.dataset.workflowValidationInstalled = "1";
  document.addEventListener("invalid", (event) => showValidationMessage(event.target), true);
}

function normalizeItem(row) {
  return {
    id: row.id || uid(),
    supplier: row.supplier || "",
    item_code: row.item_code || "",
    description: row.description || "",
    uom: row.uom || "",
    qty: Number(row.qty || 0),
    price: Number(row.price || 0),
    po_no: row.po_no || "",
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

async function checkItemHasTransactionHistory(itemId) {
  if (!state.dbReady) return false;

  try {
    // Check stock movements
    const { data: movements } = await state.supabase
      .from("stock_movements")
      .select("id")
      .eq("item_id", itemId)
      .limit(1);

    if (movements && movements.length > 0) return true;

    // Check material issue ticket lines
    const { data: ticketLines } = await state.supabase
      .from("material_issue_ticket_lines")
      .select("id")
      .eq("item_id", itemId)
      .limit(1);

    if (ticketLines && ticketLines.length > 0) return true;

    // Check MIV lines
    const { data: mivLines } = await state.supabase
      .from("miv_lines")
      .select("id")
      .eq("item_id", itemId)
      .limit(1);

    if (mivLines && mivLines.length > 0) return true;

    // Check GRN lines
    const { data: grnLines } = await state.supabase
      .from("grn_lines")
      .select("id")
      .eq("item_code", "") // We'll need to get the item_code first
      .limit(1);

    if (grnLines && grnLines.length > 0) return true;

    // Check WIP conversion lines
    const { data: wipLines } = await state.supabase
      .from("wip_conversion_lines")
      .select("id")
      .eq("item_code", "") // We'll need to get the item_code first
      .limit(1);

    if (wipLines && wipLines.length > 0) return true;

    // Check delivery challan lines
    const { data: dcLines } = await state.supabase
      .from("delivery_challan_lines")
      .select("id")
      .eq("item_code", "") // We'll need to get the item_code first
      .limit(1);

    if (dcLines && dcLines.length > 0) return true;

    // Check scrap register
    const { data: scrapLines } = await state.supabase
      .from("scrap_register")
      .select("id")
      .eq("item_code", "") // We'll need to get the item_code first
      .limit(1);

    if (scrapLines && scrapLines.length > 0) return true;

    // Get item details for code-based checks
    const { data: itemData } = await state.supabase
      .from("inventory_items")
      .select("item_code")
      .eq("id", itemId)
      .single();

    if (itemData) {
      const itemCode = itemData.item_code;

      // Re-check code-based tables with actual item code
      const { data: grnLinesByCode } = await state.supabase
        .from("grn_lines")
        .select("id")
        .eq("item_code", itemCode)
        .limit(1);

      if (grnLinesByCode && grnLinesByCode.length > 0) return true;

      const { data: wipLinesByCode } = await state.supabase
        .from("wip_conversion_lines")
        .select("id")
        .eq("item_code", itemCode)
        .limit(1);

      if (wipLinesByCode && wipLinesByCode.length > 0) return true;

      const { data: dcLinesByCode } = await state.supabase
        .from("delivery_challan_lines")
        .select("id")
        .eq("item_code", itemCode)
        .limit(1);

      if (dcLinesByCode && dcLinesByCode.length > 0) return true;

      const { data: scrapLinesByCode } = await state.supabase
        .from("scrap_register")
        .select("id")
        .eq("item_code", itemCode)
        .limit(1);

      if (scrapLinesByCode && scrapLinesByCode.length > 0) return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking transaction history:", error);
    // If we can't check, assume it has history to be safe
    return true;
  }
}

async function cleanBinRegisterReferences(itemId) {
  if (!state.dbReady) return;

  try {
    // Get item details
    const { data: itemData } = await state.supabase
      .from("inventory_items")
      .select("item_code")
      .eq("id", itemId)
      .single();

    if (!itemData) return;

    const itemCode = itemData.item_code;

    // Find bins that reference this item
    const { data: bins } = await state.supabase
      .from("bin_locations")
      .select("id, current_item_codes");

    if (!bins || bins.length === 0) return;

    // Update bins to remove references to deleted item
    const updates = [];
    for (const bin of bins) {
      let currentCodes = bin.current_item_codes || "";
      const codesArray = currentCodes
        .split(",")
        .map((code) => code.trim())
        .filter((code) => code && code !== itemCode);

      const newCodes = codesArray.join(", ").trim();

      if (newCodes !== currentCodes) {
        updates.push(
          state.supabase
            .from("bin_locations")
            .update({ current_item_codes: newCodes, updated_at: new Date().toISOString() })
            .eq("id", bin.id)
        );
      }
    }

    // Execute all updates
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    // Also check for bins that have become empty (no item codes) and mark them as inactive
    await checkAndMarkEmptyBinsInactive();
  } catch (error) {
    console.error("Error cleaning bin register references:", error);
  }
}

async function checkAndMarkEmptyBinsInactive() {
  if (!state.dbReady) {
    // Work with local state if no DB connection
    let updated = false;

    for (const bin of state.binLocations) {
      const currentCodes = bin.current_item_codes || "";
      const hasCodes = currentCodes.trim() !== "";

      if (!hasCodes && bin.status !== 'Inactive') {
        bin.status = 'Inactive';
        bin.updated_at = new Date().toISOString();
        updated = true;
      }
    }

    if (updated) {
      persistLocal();
      renderAll();
    }
    return;
  }

  try {
    // Get all bins from database
    const { data: bins, error } = await state.supabase
      .from("bin_locations")
      .select("id, current_item_codes, status");

    if (error) throw error;

    let updatePromises = [];
    let emptyBinCount = 0;

    for (const bin of bins) {
      const currentCodes = bin.current_item_codes || "";
      const hasCodes = currentCodes.trim() !== "";

      if (!hasCodes && bin.status !== 'Inactive') {
        emptyBinCount++;
        const updatedBin = {
          ...bin,
          status: 'Inactive',
          updated_at: new Date().toISOString()
        };
        updatePromises.push(
          state.supabase
            .from("bin_locations")
            .update(updatedBin)
            .eq("id", bin.id)
        );
      }
    }

    if (updatePromises.length > 0) {
      // Execute all updates
      await Promise.all(updatePromises);

      // Update local state
      state.binLocations = state.binLocations.map(bin => {
        const currentCodes = bin.current_item_codes || "";
        const hasCodes = currentCodes.trim() !== "";
        if (!hasCodes && bin.status !== 'Inactive') {
          return { ...bin, status: 'Inactive', updated_at: new Date().toISOString() };
        }
        return bin;
      });

      persistLocal();
      renderAll();
      // Note: Not showing a message here to avoid spam during item deletion
    }
  } catch (error) {
    console.error('Error checking and marking empty bins inactive:', error);
  }
}

async function init() {
  setupSupabase();
  bindEvents();

  if (state.dbReady) {
    await restoreSupabaseSession(true);

    state.supabase.auth.onAuthStateChange((event, session) => {
      state.user = session?.user || null;
      setTimeout(() => {
        if (event === "SIGNED_OUT" || !state.user) {
          showAuth();
          return;
        }
        enterApp().catch((err) => {
          const msg = errMsg(err);
          setAuthMessage(msg);
          showWorkflowMessage(msg, false);
          if (!state.user) showAuth();
        });
      }, 0);
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
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage }
    });
    state.dbReady = true;
    $("connectionStatus").textContent = "Supabase connected";
    $("connectionHelp").textContent = "Connected to Supabase. Inventory changes sync with the database.";
  }
}

async function restoreSupabaseSession(showErrors = false) {
  if (!state.dbReady || !state.supabase?.auth) return null;
  try {
    const { data, error } = await state.supabase.auth.getSession();
    if (error && showErrors) setAuthMessage(error.message);
    let session = data?.session || null;
    if (!session) {
      const refreshed = await state.supabase.auth.refreshSession().catch((err) => ({ error: err, data: null }));
      if (refreshed.error && showErrors && !/session.*missing/i.test(refreshed.error.message || "")) setAuthMessage(refreshed.error.message);
      session = refreshed.data?.session || null;
    }
    state.user = session?.user || null;
    return session;
  } catch (err) {
    if (showErrors) setAuthMessage(errMsg(err));
    state.user = null;
    return null;
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
    renderUserIdentity();
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
    const session = await restoreSupabaseSession();
    state.user = session?.user || null;
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
  if (state.dbReady) {
    const { error } = await withDbTimeout(state.supabase.from("inventory_items").upsert(item), "Item save");
    if (error) throw new Error(`Item save failed: ${error.message}`);
  }
  const i = state.inventory.findIndex((x) => x.id === item.id);
  if (i >= 0) state.inventory[i] = item;
  else state.inventory.unshift(item);
  persistLocal();
  renderAll();
  return item;
}

async function deleteItem(id) {
  // Check if item has transaction history
  const hasTransactionHistory = await checkItemHasTransactionHistory(id);

  if (hasTransactionHistory) {
    // Item has transaction history - mark as REJECTED instead of deleting
    const itemToUpdate = state.inventory.find(x => x.id === id);
    if (itemToUpdate) {
      const updatedItem = { ...itemToUpdate, status: 'REJECT', updated_at: new Date().toISOString() };

      // Update local state
      state.inventory = state.inventory.map(x =>
        x.id === id ? updatedItem : x
      );

      persistLocal();

      if (state.dbReady) {
        const { error } = await withDbTimeout(
          state.supabase.from("inventory_items").upsert(updatedItem),
          "Item status update"
        );
        if (error) alert(`Update failed: ${error.message}`);
      }

      // Clean bin register references
      await cleanBinRegisterReferences(id);

      renderAll();
      showWorkflowMessage("Item marked as rejected due to transaction history.", true);
      return;
    }
  }

  // Item has no transaction history - safe to delete completely
  state.inventory = state.inventory.filter((x) => x.id !== id);
  persistLocal();

  if (state.dbReady) {
    const { error } = await state.supabase.from("inventory_items").delete().eq("id", id);
    if (error) alert(`Delete failed: ${error.message}`);
  }

  // Clean bin register references
  await cleanBinRegisterReferences(id);

  renderAll();
}

async function saveNcr(row) {
  row.updated_at = new Date().toISOString();
  if (state.dbReady) {
    const { error } = await withDbTimeout(state.supabase.from("quarantine_items").upsert(row), "NCR save");
    if (error) throw new Error(`NCR save failed: ${error.message}`);
  }
  const i = state.quarantine.findIndex((x) => x.id === row.id);
  if (i >= 0) state.quarantine[i] = row;
  else state.quarantine.unshift(row);
  persistLocal();
  renderAll();
  return row;
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
  if (state.dbReady) {
    const { error } = await withDbTimeout(state.supabase.from("bin_locations").upsert(row), "Bin save");
    if (error) throw new Error(`Bin save failed: ${error.message}`);
  }
  const i = state.binLocations.findIndex((x) => x.id === row.id);
  if (i >= 0) state.binLocations[i] = row;
  else state.binLocations.unshift(row);
  persistLocal();
  renderAll();
  return row;
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

async function makeVacuumBinsInactive() {
  if (!state.dbReady) {
    // Work with local state if no DB connection
    const bins = state.binLocations;
    let updated = false;

    for (const bin of bins) {
      if (bin.bin_type && String(bin.bin_type).toLowerCase().includes('vacuum')) {
        if (bin.status !== 'Inactive') {
          bin.status = 'Inactive';
          bin.updated_at = new Date().toISOString();
          updated = true;
        }
      }
    }

    if (updated) {
      persistLocal();
      renderAll();
      showWorkflowMessage('Vacuum bins marked as inactive.', true);
    } else {
      showWorkflowMessage('No vacuum bins found or already inactive.', true);
    }
    return;
  }

  try {
    // Get all bins from database
    const { data: bins, error } = await state.supabase
      .from("bin_locations")
      .select("*");

    if (error) throw error;

    let updatePromises = [];
    let vacuumBinCount = 0;

    for (const bin of bins) {
      if (bin.bin_type && String(bin.bin_type).toLowerCase().includes('vacuum')) {
        vacuumBinCount++;
        if (bin.status !== 'Inactive') {
          const updatedBin = {
            ...bin,
            status: 'Inactive',
            updated_at: new Date().toISOString()
          };
          updatePromises.push(
            state.supabase
              .from("bin_locations")
              .update(updatedBin)
              .eq("id", bin.id)
          );
        }
      }
    }

    if (updatePromises.length > 0) {
      // Execute all updates
      await Promise.all(updatePromises);

      // Update local state
      state.binLocations = state.binLocations.map(bin => {
        if (bin.bin_type && String(bin.bin_type).toLowerCase().includes('vacuum') && bin.status !== 'Inactive') {
          return { ...bin, status: 'Inactive', updated_at: new Date().toISOString() };
        }
        return bin;
      });

      // Also check for bins that have become empty (no item codes) and mark them as inactive
      await checkAndMarkEmptyBinsInactive();

      persistLocal();
      renderAll();
      showWorkflowMessage(`Marked ${updatePromises.length} vacuum bins as inactive.`, true);
    } else {
      showWorkflowMessage(`No vacuum bins found to update (found ${vacuumBinCount} vacuum bins, all already inactive).`, true);
    }
  } catch (error) {
    console.error('Error making vacuum bins inactive:', error);
    showWorkflowMessage(`Failed to update vacuum bins: ${error.message}`, false);
  }
}

async function issueToProduction(item, qtyTaken, issuedTo, workOrder, notes) {
  const before = Number(item.qty || 0);
  const taken = Math.max(0, Number(qtyTaken || 0));
  if (!taken) throw new Error("Enter a quantity greater than 0.");
  if (taken > before) throw new Error("Issue quantity cannot be greater than available quantity.");
  const after = Math.max(0, before - taken);
  const updated = normalizeItem({ ...item, qty: after, updated_at: new Date().toISOString() });
  const movement = normalizeMovement({
    id: uid(), item_id: item.id, item_code: item.item_code, description: item.description,
    bin: item.bin, qty_taken: taken, qty_before: before, qty_after: after, issued_to: issuedTo || "Production",
    work_order: workOrder || "", notes: notes || "", movement_type: "PRODUCTION_ISSUE", created_at: new Date().toISOString(),
  });
  if (state.dbReady) {
    const [{ error: itemError }, { error: moveError }] = await Promise.all([
      withDbTimeout(state.supabase.from("inventory_items").upsert(updated), "Stock update"),
      withDbTimeout(state.supabase.from("stock_movements").insert(movement), "Movement log"),
    ]);
    if (itemError) throw new Error(`Stock update failed: ${itemError.message}`);
    if (moveError) throw new Error(`Movement log failed: ${moveError.message}`);
  }
  const i = state.inventory.findIndex((x) => x.id === item.id);
  if (i >= 0) state.inventory[i] = updated;
  state.movements.unshift(movement);
  persistLocal();
  renderAll();
  return { item: updated, movement, belowReorder: after < state.reorderThreshold };
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
  installFormValidationMessages();
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
  $("userProfileBtn")?.addEventListener("click", openUserSettings);
  $("userSettingsForm")?.addEventListener("submit", saveUserSettings);
  $("profilePicInput")?.addEventListener("change", handleProfilePicChange);
}

function openItemModal(item = null) {
  setFormMessage("itemMessage", "", true);
  $("itemModalTitle").textContent = item ? "Edit Inventory Item" : "Add Inventory Item";
  $("itemId").value = item?.id || "";
  $("supplier").value = item?.supplier || "";
  $("itemCode").value = item?.item_code || "";
  $("description").value = item?.description || "";
  $("uom").value = item?.uom || "";
  $("qty").value = item?.qty ?? "";
  $("price").value = item?.price ?? "";
  $("poNo").value = item?.po_no || "";
  $("status").value = item?.status || "OK";
  $("bin").value = item?.bin || "";
  $("partNo").value = item?.part_no || "";
  $("itemModal").showModal();
}

function openNcrModal(row = null) {
  setFormMessage("ncrMessage", "", true);
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
  setFormMessage("binMessage", "", true);
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
  setFormMessage("issueMessage", "", true);
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

async function handleItemSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  setSubmitBusy(form, true);
  setFormMessage("itemMessage", "Saving item...", true);
  try {
    const item = await saveItem(normalizeItem({ id: $("itemId").value || uid(), supplier: $("supplier").value, item_code: $("itemCode").value, description: $("description").value, uom: $("uom").value, qty: $("qty").value, price: $("price").value, po_no: $("poNo").value, status: $("status").value, bin: $("bin").value, part_no: $("partNo").value }));
    const msg = `Success: ${item.item_code} saved.`;
    setFormMessage("itemMessage", msg, true);
    showWorkflowMessage(msg, true);
    closeDialogAfterSuccess("itemModal");
  } catch (err) {
    const msg = errMsg(err);
    setFormMessage("itemMessage", msg, false);
    showWorkflowMessage(msg, false);
  } finally {
    setSubmitBusy(form, false);
  }
}

async function handleNcrSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  setSubmitBusy(form, true);
  setFormMessage("ncrMessage", "Saving NCR...", true);
  try {
    const row = await saveNcr(normalizeNcr({ id: $("ncrId").value || uid(), ncr_no: $("ncrNo").value, po_ref: $("poRef").value, supplier: $("ncrSupplier").value, item_code: $("ncrItemCode").value, description: $("ncrDescription").value, qty_hold: $("qtyHold").value, status: $("ncrStatus").value, reason: $("reason").value, owner: $("owner").value, target_close: $("targetClose").value }));
    const msg = `Success: NCR ${row.ncr_no || row.item_code} saved.`;
    setFormMessage("ncrMessage", msg, true);
    showWorkflowMessage(msg, true);
    closeDialogAfterSuccess("ncrModal");
  } catch (err) {
    const msg = errMsg(err);
    setFormMessage("ncrMessage", msg, false);
    showWorkflowMessage(msg, false);
  } finally {
    setSubmitBusy(form, false);
  }
}

async function handleBinSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  setSubmitBusy(form, true);
  setFormMessage("binMessage", "Saving bin...", true);
  try {
    const row = await saveBin(normalizeBin({
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
    const msg = `Success: Bin ${row.bin_id} saved.`;
    setFormMessage("binMessage", msg, true);
    showWorkflowMessage(msg, true);
    closeDialogAfterSuccess("binModal");
  } catch (err) {
    const msg = errMsg(err);
    setFormMessage("binMessage", msg, false);
    showWorkflowMessage(msg, false);
  } finally {
    setSubmitBusy(form, false);
  }
}

async function handleIssueSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const item = state.inventory.find((x) => x.id === $('issueItemId').value);
  if (!item) {
    const msg = 'Item not found. Refresh data and try again.';
    setFormMessage("issueMessage", msg, false);
    showWorkflowMessage(msg, false);
    return;
  }
  setSubmitBusy(form, true, "Issuing...");
  setFormMessage("issueMessage", "Issuing stock...", true);
  try {
    const result = await issueToProduction(item, $('issueQty').value, $('issueTo').value, $('issueWorkOrder').value, $('issueNotes').value);
    const msg = `Success: Issued ${moneyish(result.movement.qty_taken)} ${result.item.uom || ""} of ${result.item.item_code}.`;
    setFormMessage("issueMessage", msg, true);
    showWorkflowMessage(result.belowReorder ? `${msg} Item is below reorder point.` : msg, true);
    closeDialogAfterSuccess("issueModal");
  } catch (err) {
    const msg = errMsg(err);
    setFormMessage("issueMessage", msg, false);
    showWorkflowMessage(msg, false);
  } finally {
    setSubmitBusy(form, false);
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  if (!state.dbReady) return setAuthMessage("Add Supabase keys in config.js first.");
  state.team = $('teamSelect')?.value || state.team || 'inventory';
  localStorage.setItem('sns_selected_team', state.team);
  setAuthMessage("Signing in...");
  try {
    const { data, error } = await state.supabase.auth.signInWithPassword({ email: $("authEmail").value, password: $("authPassword").value });
    if (error) return setAuthMessage(error.message);
    state.user = data?.session?.user || data?.user || null;
    setAuthMessage("Signed in. Loading dashboard...");
    await enterApp();
    setAuthMessage("");
  } catch (err) {
    const msg = errMsg(err);
    setAuthMessage(msg);
    showWorkflowMessage(msg, false);
  }
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
  return filteredInventory().map((r) => ({ Supplier: r.supplier, "Item Code": r.item_code, Description: r.description, UOM: r.uom, Qty: r.qty, Price: r.price, "PO No": r.po_no, Status: r.status, Bin: r.bin, "Part No": r.part_no }));
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
  if (state.enterAppPromise) return state.enterAppPromise;
  state.enterAppPromise = (async () => {
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
    renderUserIdentity();
    await refreshFromDatabase();
  })();
  try {
    return await state.enterAppPromise;
  } finally {
    state.enterAppPromise = null;
  }
}

function showAuth() {
  $('appShell').classList.add('hidden');
  $('productionPortal')?.classList.add('hidden');
  $('authScreen').classList.remove('hidden');
  if ($('teamSelect')) $('teamSelect').value = localStorage.getItem('sns_selected_team') || state.team || 'inventory';
}

async function loadData() {
  if (state.dbReady) {
    const session = await restoreSupabaseSession();
    state.user = session?.user || null;
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
  $('inventoryRows').innerHTML = rows.map((x) => `<tr><td>${escapeHtml(x.supplier)}</td><td><strong>${escapeHtml(x.item_code)}</strong><br><span class="muted">${escapeHtml(x.part_no || '')}</span></td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.uom)}</td><td>${moneyish(x.qty)} ${isReorderItem(x) ? '<br><span class="reorder-chip">REORDER</span>' : ''}</td><td>${moneyish(x.price)}</td><td>${escapeHtml(x.po_no)}</td><td>${statusChip(x.status)}</td><td>${escapeHtml(x.bin)}</td><td><div class="row-actions"><button class="mini-btn" onclick="editItem('${x.id}')">Edit</button><button class="mini-btn danger" onclick="confirmDeleteItem('${x.id}')">Delete</button></div></td></tr>`).join('') || emptyRow(10);
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
  if ($('prodInventoryRows')) $('prodInventoryRows').innerHTML = rows.map((x) => {
    const enhancedItem = typeof itemWithGrnPurchaseInfo === 'function' ? itemWithGrnPurchaseInfo(x) : x;
    return `<tr><td><strong>${escapeHtml(enhancedItem.item_code)}</strong><br><span class="muted">${escapeHtml(enhancedItem.part_no || '')}</span></td><td>${escapeHtml(enhancedItem.description)}</td><td>${escapeHtml(enhancedItem.supplier)}</td><td>${escapeHtml(enhancedItem.po_no || '-')}</td><td>${moneyish(enhancedItem.qty)}</td><td>${escapeHtml(enhancedItem.uom)}</td><td>${escapeHtml(enhancedItem.bin)}</td><td><button class="primary-btn compact" onclick="addToCart('${enhancedItem.id}')">Add to Cart</button></td></tr>`;
  }).join('') || emptyRow(8);
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
    const { error: tErr } = await withDbTimeout(state.supabase.from('material_issue_tickets').insert(dbSafeTicket(ticket)), "Ticket save").catch((err) => ({ error: err }));
    if (tErr) return setTicketMsg(`Ticket save failed: ${tErr.message}`);
    const { error: lErr } = await withDbTimeout(state.supabase.from('material_issue_ticket_lines').insert(lines), "Ticket line save").catch((err) => ({ error: err }));
    if (lErr) return setTicketMsg(`Ticket line save failed: ${lErr.message}`);
  }
  state.cart = [];
  $('ticketRequestForm').reset();
  $('ticketDepartment').value = 'Production';
  setTicketMsg(`Ticket ${ticket.ticket_no} raised. Stores will verify and issue.`);
  showProdInventory();
  renderAll();
}
function setTicketMsg(msg) { if ($('ticketRequestMessage')) $('ticketRequestMessage').textContent = msg; if (msg) showWorkflowMessage(msg, false); }
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
    for (const item of updatedItems) await withDbTimeout(state.supabase.from('inventory_items').upsert(item), "Ticket inventory update");
    for (const line of updatedLines) await withDbTimeout(state.supabase.from('material_issue_ticket_lines').upsert(line), "Ticket line update");
    await withDbTimeout(state.supabase.from('stock_movements').insert(movements), "Ticket movement save");
    await withDbTimeout(state.supabase.from('material_issue_tickets').upsert(dbSafeTicket(ticket)), "Ticket status update");
  }
  renderAll();
  printTicket(ticketId);
};

window.rejectTicket = async (ticketId) => {
  const ticket = state.tickets.find((x) => x.id === ticketId);
  if (!ticket || !confirm(`Reject ${ticket.ticket_no}?`)) return;
  ticket.status = 'REJECTED'; ticket.updated_at = new Date().toISOString();
  persistLocal();
  if (state.dbReady) await withDbTimeout(state.supabase.from('material_issue_tickets').upsert(dbSafeTicket(ticket)), "Ticket reject update");
  renderAll();
};

window.printTicket = (ticketId) => {
  const ticket = state.tickets.find((x) => x.id === ticketId);
  if (!ticket) return;
  const lines = ticketLines(ticketId);
  openPrintDocument(ticket.ticket_no, "Material Issue Ticket", ticketPrintHtml(ticket, lines));
};

function ticketPrintHtml(ticket, lines) {
  const rows = [...lines, ...Array(Math.max(0, 8 - lines.length)).fill({})].map((l, i) => [i + 1, l.item_code || "", l.part_no || "", l.description || "", l.lot_trace_id || "", l.from_bin || "", l.uom || "", l.qty_issued || l.qty_requested || ""]);
  return `${printMetaGrid([
    ["Issue No", ticket.ticket_no],
    ["Issue Date", printDate(ticket.issued_at || ticket.created_at)],
    ["Work Order / Job", ticket.work_order],
    ["Department", ticket.department],
    ["Request Ref", ticket.request_ref],
    ["Return Expected", ticket.return_expected],
    ["Issued By", ticket.issued_by],
    ["Received By", ticket.received_by],
  ])}${printTable(["S.No", "Item Code", "Part No", "Description", "Lot/Trace ID", "From Bin", "UOM", "Qty Issued"], rows)}${printSignatures(["Stores Signature", "Production Signature", "Verified By"])}<p class="note">Status: ${escapeHtml(ticket.status)}. Notes: ${escapeHtml(ticket.notes || "")}</p>`;
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
  installFormValidationMessages();
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

function isIssueLogMovement(m){
  const type = String(m.movement_type || '').toUpperCase();
  const docText = [m.ticket_no, m.source_doc_no, m.work_order, m.notes].map((x) => String(x || '')).join(' ');
  if (type === 'MIV_ISSUE' || /MIV[/-]\d{4}[/-]\d+/i.test(docText)) return false;
  return ['PRODUCTION_ISSUE', 'PRODUCTION_TICKET_ISSUE'].includes(type);
}

function issueLogGroups(){
  const map = new Map();
  for (const m of state.movements.filter(isIssueLogMovement)) {
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
  const first = group.movements[0] || {};
  const total = group.movements.reduce((sum, m) => sum + Number(m.qty_taken || 0), 0);
  const rows = group.movements.map((m, i) => [i + 1, m.item_code, m.description, m.bin, moneyish(m.qty_taken), moneyish(m.qty_before), moneyish(m.qty_after)]);
  const content = `${printMetaGrid([
    ["Ticket / Log No", ticketNo],
    ["Issue Date", printDate(first.created_at || Date.now())],
    ["Issued To", first.issued_to || ""],
    ["Work Order", first.work_order || ""],
    ["Line Count", group.movements.length],
    ["Total Qty", moneyish(total)],
  ])}${printTable(["S.No", "Item Code", "Description", "Bin", "Qty Issued", "Before", "After"], rows)}${printSignatures(["Stores Signature", "Production Signature", "Verified By"])}`;
  openPrintDocument(ticketNo, "Material Issue Log", content);
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
    const { error: tErr } = await withDbTimeout(state.supabase.from('material_issue_tickets').insert(dbSafeTicket(ticket)), "Ticket save").catch((err) => ({ error: err }));
    if (tErr) return setTicketMsg(`Ticket save failed: ${tErr.message}`, false);
    const { error: lErr } = await withDbTimeout(state.supabase.from('material_issue_ticket_lines').insert(lines), "Ticket line save").catch((err) => ({ error: err }));
    if (lErr) return setTicketMsg(`Ticket line save failed: ${lErr.message}`, false);
  }
  state.cart = [];
  $('ticketRequestForm').reset(); $('ticketDepartment').value = 'Production'; renderCart();
  setTicketMsg(`Success: Ticket ${ticket.ticket_no} raised for Job ${ticket.work_order}. Total items: ${lines.length}. Stores will verify and issue.`, true);
  renderAll();
}
function setTicketMsg(msg, success=false) { if ($('ticketRequestMessage')) { $('ticketRequestMessage').textContent = msg; $('ticketRequestMessage').classList.toggle('success', !!success); $('ticketRequestMessage').classList.toggle('error', !success && !!msg); } if (msg) showWorkflowMessage(msg, success); }

document.addEventListener('click', (e) => {
  const th = e.target.closest('[data-bin-sort]');
  if (!th) return;
  const key = th.dataset.binSort;
  if (state.binSortKey === key) state.binSortDir = state.binSortDir === 'asc' ? 'desc' : 'asc';
  else { state.binSortKey = key; state.binSortDir = 'asc'; }
  renderBins();
});



// ===== v6.5: return logs =====
function normalizeReturnLog(row){
  return {
    id: row.id || uid(),
    return_no: row.return_no || makeReturnNo(),
    return_date: row.return_date || new Date().toISOString().slice(0,10),
    source_ticket_no: row.source_ticket_no || '',
    returned_by: row.returned_by || '',
    returned_by_email: row.returned_by_email || '',
    received_by: row.received_by || '',
    notes: row.notes || '',
    total_qty: Number(row.total_qty || 0),
    approval_mail_sent: !!row.approval_mail_sent,
    approval_mail_sent_at: row.approval_mail_sent_at || null,
    approval_mail_error: row.approval_mail_error || '',
    created_by: row.created_by || null,
    created_by_email: row.created_by_email || '',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}
function normalizeReturnLogLine(row){
  return {
    id: row.id || uid(),
    return_id: row.return_id || '',
    source_ticket_no: row.source_ticket_no || '',
    item_id: row.item_id || '',
    item_code: row.item_code || '',
    description: row.description || '',
    from_bin: row.from_bin || '',
    uom: row.uom || '',
    qty_issued: Number(row.qty_issued || 0),
    qty_already_returned: Number(row.qty_already_returned || 0),
    qty_returnable: Number(row.qty_returnable || 0),
    qty_returned: Number(row.qty_returned || 0),
    remarks: row.remarks || '',
  };
}
function makeReturnNo(){ return `RET-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}`; }
function returnLogLinesFor(returnId){ return state.returnLogLines.filter((x)=>x.return_id===returnId); }
function returnExportRows(){ return state.returnLogs.map((r)=>({ ReturnNo:r.return_no, Date:r.return_date, SourceTicket:r.source_ticket_no, ReturnedBy:r.returned_by, ReturnedByEmail:r.returned_by_email, ReceivedBy:r.received_by, TotalQty:r.total_qty, ApprovalMailSent:r.approval_mail_sent ? 'Yes' : 'No', ApprovalMailSentAt:r.approval_mail_sent_at || '', ApprovalMailError:r.approval_mail_error || '', Notes:r.notes })); }
function issueLogGroups(){
  const map = new Map();
  const issueMoves = state.movements.filter(isIssueLogMovement);
  for (const m of issueMoves) {
    const no = ticketNoFromMovement(m);
    if (!map.has(no)) map.set(no, { ticket_no: no, movements: [], ticket: state.tickets.find((t) => t.ticket_no === no) });
    map.get(no).movements.push(m);
  }
  return [...map.values()].sort((a,b) => new Date(b.movements[0]?.created_at || 0) - new Date(a.movements[0]?.created_at || 0));
}

function aggregateIssueSource(ticketNo){
  const group = issueLogGroups().find((g)=>g.ticket_no===ticketNo);
  if (!group) return [];
  const map = new Map();
  for (const m of group.movements) {
    const key = `${m.item_id || ''}__${m.item_code}__${m.bin || ''}`;
    if (!map.has(key)) map.set(key, { item_id:m.item_id || '', item_code:m.item_code || '', description:m.description || '', from_bin:m.bin || '', uom:(state.inventory.find((x)=>x.id===m.item_id || x.item_code===m.item_code)?.uom) || '', qty_issued:0 });
    map.get(key).qty_issued += Number(m.qty_taken || 0);
  }
  return [...map.values()];
}
function alreadyReturnedQty(ticketNo, itemCode, fromBin){
  return state.returnLogLines
    .filter((x)=>x.source_ticket_no===ticketNo && x.item_code===itemCode && (x.from_bin||'')===(fromBin||''))
    .reduce((sum,x)=>sum + Number(x.qty_returned || 0), 0);
}
function returnSourceOptions(selected=''){
  const groups = issueLogGroups();
  return `<option value="">Select source issue ticket</option>` + groups.map((g)=>`<option value="${escapeHtml(g.ticket_no)}" ${g.ticket_no===selected?'selected':''}>${escapeHtml(g.ticket_no)} - ${escapeHtml(g.ticket?.work_order || g.movements[0]?.issued_to || '')}</option>`).join('');
}
function buildReturnDraftLines(ticketNo){
  state.returnDraftLines = aggregateIssueSource(ticketNo).map((row)=>{
    const returned = alreadyReturnedQty(ticketNo, row.item_code, row.from_bin);
    const returnable = Math.max(0, Number(row.qty_issued || 0) - Number(returned || 0));
    return normalizeReturnLogLine({ id: uid(), source_ticket_no: ticketNo, item_id: row.item_id, item_code: row.item_code, description: row.description, from_bin: row.from_bin, uom: row.uom || 'Nos', qty_issued: row.qty_issued, qty_already_returned: returned, qty_returnable: returnable, qty_returned: returnable > 0 ? returnable : 0 });
  }).filter((x)=>Number(x.qty_returnable || 0) > 0);
}
function setReturnMsg(msg, success=false){ if ($('returnMessage')) { $('returnMessage').textContent = msg || ''; $('returnMessage').classList.toggle('success', !!success); $('returnMessage').classList.toggle('error', !success && !!msg); } if (msg) showWorkflowMessage(msg, success); }
window.onReturnSourceChange = function(ticketNo){ buildReturnDraftLines(ticketNo); renderReturnDraftLines(); };
window.updateReturnDraftLine = function(id, value){ const line = state.returnDraftLines.find((x)=>x.id===id); if (!line) return; const num = Math.max(0, Math.min(Number(line.qty_returnable || 0), Number(value || 0))); line.qty_returned = num; renderReturnDraftLines(); };
function renderReturnDraftLines(){
  if (!$('returnLineRows')) return;
  const rows = state.returnDraftLines.map((l)=>`<div class="return-line-card"><div class="return-line-main"><div class="meta"><strong>${escapeHtml(l.item_code)}${l.uom ? ` • ${escapeHtml(l.uom)}` : ''}</strong><span>${escapeHtml(l.description || '-')}</span></div><div class="return-line-bin"><b>Bin</b><span>${escapeHtml(l.from_bin || '-')}</span></div><div class="return-inline-help">Select how many units are being returned back into inventory for this line.</div></div><div class="return-stat-grid"><div class="return-stat"><small>Issued</small><div class="pill">${moneyish(l.qty_issued)}</div></div><div class="return-stat"><small>Already Returned</small><div class="pill">${moneyish(l.qty_already_returned)}</div></div><div class="return-stat"><small>Returnable</small><div class="pill">${moneyish(l.qty_returnable)}</div></div><label class="return-input-block"><span>Qty Returning</span><input type="number" min="0" max="${l.qty_returnable}" step="0.01" value="${l.qty_returned}" onchange="updateReturnDraftLine('${l.id}', this.value)" /></label></div></div>`).join('');
  $('returnLineRows').innerHTML = rows || `<div class="return-empty-state">No returnable lines found for the selected issue ticket. Choose a source issue ticket that still has balance available for return.</div>`;
}
function openReturnModal(sourceTicket=''){
  $('returnForm')?.reset();
  if ($('returnNo')) $('returnNo').value = makeReturnNo();
  if ($('returnDate')) $('returnDate').value = new Date().toISOString().slice(0,10);
  const groups = issueLogGroups();
  const chosenTicket = sourceTicket || groups[0]?.ticket_no || '';
  if ($('returnSourceTicket')) $('returnSourceTicket').innerHTML = returnSourceOptions(chosenTicket);
  if ($('returnedBy')) $('returnedBy').value = '';
  if ($('returnedByEmail')) $('returnedByEmail').value = '';
  if ($('approvalMailStatus')) $('approvalMailStatus').value = 'Will send after save';
  if ($('receivedBy')) $('receivedBy').value = state.user?.email || '';
  state.returnDraftLines = [];
  if (chosenTicket) buildReturnDraftLines(chosenTicket);
  renderReturnDraftLines();
  setReturnMsg(groups.length ? '' : 'No issue tickets are currently available for return. Create / issue a ticket first.', false);
  $('returnModal')?.showModal();
}
window.openReturnModal = openReturnModal;
window.openReturnLogBySource = openReturnModal;

async function sendReturnApprovalMailWithTimeout(returnId, timeoutMs = 12000) {
  if (!state.dbReady || !state.supabase?.functions) {
    return { error: new Error('Supabase functions are not available') };
  }

  const mailPromise = state.supabase.functions.invoke(
    'send-return-approval-mail',
    { body: { return_id: returnId } }
  );

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({ error: new Error('Approval mail request timed out') });
    }, timeoutMs);
  });

  return Promise.race([mailPromise, timeoutPromise]);
}

async function saveReturnLog(e){
  e.preventDefault();
  if (state.returnSaveInProgress) return;
  state.returnSaveInProgress = true;
  const saveBtn = $('saveReturnLogBtn');
  const originalText = saveBtn?.textContent || 'Save Return Log';
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
  try {
    const sourceTicket = $('returnSourceTicket')?.value || '';
    if (!sourceTicket) return setReturnMsg('Select the MIV No / Issue Ticket No.', false);
    const returnedByEmail = $('returnedByEmail')?.value?.trim() || '';
    if (!returnedByEmail) return setReturnMsg('Returned By Email is mandatory.', false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(returnedByEmail)) return setReturnMsg('Enter a valid Returned By Email address.', false);
    const valid = state.returnDraftLines.filter((x)=>Number(x.qty_returned || 0) > 0);
    if (!valid.length) return setReturnMsg('Enter at least one return quantity greater than 0.', false);
    for (const l of valid) {
      if (Number(l.qty_returned || 0) > Number(l.qty_returnable || 0)) return setReturnMsg(`Return qty exceeds available balance for ${l.item_code}.`, false);
    }

    const totalQty = valid.reduce((sum,x)=>sum + Number(x.qty_returned || 0), 0);
    const now = new Date().toISOString();
    const ret = normalizeReturnLog({
      id: uid(),
      return_no: $('returnNo').value.trim(),
      return_date: $('returnDate').value,
      source_ticket_no: sourceTicket,
      returned_by: $('returnedBy').value.trim(),
      returned_by_email: returnedByEmail,
      received_by: $('receivedBy').value.trim(),
      notes: $('returnNotes').value.trim(),
      total_qty: totalQty,
      approval_mail_sent: false,
      approval_mail_sent_at: null,
      approval_mail_error: null,
      created_by: state.user?.id || null,
      created_by_email: state.user?.email || '',
      created_at: now,
      updated_at: now,
    });
    const lines = valid.map((l)=>normalizeReturnLogLine({ ...l, id: uid(), return_id: ret.id, qty_returned: Number(l.qty_returned || 0) }));

    const updatedItemMap = new Map();
    const movements = [];
    const ledgerReturnLines = [];
    for (const line of lines) {
      const item = state.inventory.find((x)=>x.id===line.item_id || x.item_code===line.item_code);
      if (!item) return setReturnMsg(`Inventory item not found for ${line.item_code}.`, false);
      const itemKey = item.id || item.item_code;
      const currentItem = updatedItemMap.get(itemKey) || item;
      const before = Number(currentItem.qty || 0);
      const after = before + Number(line.qty_returned || 0);
      const updatedItem = normalizeItem({ ...currentItem, qty: after, updated_at: now });
      updatedItemMap.set(itemKey, updatedItem);
      movements.push(normalizeMovement({
        id: uid(),
        item_id: item.id,
        item_code: item.item_code,
        description: item.description,
        bin: item.bin || line.from_bin,
        qty_taken: Number(line.qty_returned || 0),
        qty_before: before,
        qty_after: after,
        issued_to: ret.returned_by || 'Return',
        work_order: ret.source_ticket_no,
        notes: `Return ${ret.return_no} from ${ret.source_ticket_no}`,
        movement_type: 'PRODUCTION_RETURN',
        created_at: ret.created_at,
      }));
      ledgerReturnLines.push({ line, item, qty: Number(line.qty_returned || 0) });
    }
    const updatedItems = [...updatedItemMap.values()];

    if (state.dbReady) {
      const { error: r1 } = await withDbTimeout(state.supabase.from('return_logs').insert(ret), "Return log save");
      if (r1) return setReturnMsg(`Return log save failed: ${r1.message}`, false);

      const { error: r2 } = await withDbTimeout(state.supabase.from('return_log_lines').insert(lines), "Return line save");
      if (r2) return setReturnMsg(`Return lines save failed: ${r2.message}`, false);

      const { error: r3 } = await withDbTimeout(state.supabase.from('stock_movements').insert(movements), "Return movement save");
      if (r3) return setReturnMsg(`Stock movement save failed: ${r3.message}`, false);

      for (const item of updatedItems) {
        const { error: itemErr } = await withDbTimeout(state.supabase.from('inventory_items').upsert(item), "Return inventory update");
        if (itemErr) return setReturnMsg(`Inventory update failed: ${itemErr.message}`, false);
      }
    }

    if (typeof postLedgerEntry === 'function' && Array.isArray(state.stockLedger)) {
      for (const { line, item, qty } of ledgerReturnLines) {
        const hasLedgerHistory = state.stockLedger.some((entry) => String(entry.item_code || '').toUpperCase() === String(item.item_code || line.item_code || '').toUpperCase());
        if (!hasLedgerHistory) continue;
        await postLedgerEntry({
          movement_type: 'MRN_RETURN',
          source_doc_type: 'MRN',
          source_doc_no: ret.return_no,
          source_line_id: line.id,
          item_id: item.id,
          item_code: item.item_code,
          description: item.description || line.description,
          uom: item.uom || line.uom,
          in_qty: qty,
          to_bin: line.from_bin || item.bin,
          work_order: ret.source_ticket_no,
          department: ret.returned_by || 'Return',
          remarks: ret.notes || `Return from ${ret.source_ticket_no}`,
          created_by: state.user?.id || null,
          created_by_email: state.user?.email || '',
          created_at: ret.created_at,
        });
      }
    }

    if (state.dbReady) {
      if ($('approvalMailStatus')) $('approvalMailStatus').value = 'Sending approval mail...';
      try {
        const { error: mailErr } = await sendReturnApprovalMailWithTimeout(ret.id, 12000);

        if (mailErr) {
          ret.approval_mail_sent = false;
          ret.approval_mail_error = mailErr.message || String(mailErr);
          await withDbTimeout(state.supabase
            .from('return_logs')
            .update({
              approval_mail_sent: false,
              approval_mail_error: ret.approval_mail_error,
            })
            .eq('id', ret.id), "Return mail status update");
          if ($('approvalMailStatus')) $('approvalMailStatus').value = 'Mail failed';
          setReturnMsg(`Return log ${ret.return_no} saved, but approval email failed: ${ret.approval_mail_error}`, false);
        } else {
          ret.approval_mail_sent = true;
          ret.approval_mail_sent_at = new Date().toISOString();
          ret.approval_mail_error = null;
          if ($('approvalMailStatus')) $('approvalMailStatus').value = 'Mail sent';
          setReturnMsg(`Return log ${ret.return_no} saved and approval email sent to ${ret.returned_by_email}.`, true);
        }
      } catch (mailErr) {
        ret.approval_mail_sent = false;
        ret.approval_mail_error = mailErr?.message || String(mailErr);
        await withDbTimeout(state.supabase
          .from('return_logs')
          .update({
            approval_mail_sent: false,
            approval_mail_error: ret.approval_mail_error,
          })
          .eq('id', ret.id), "Return mail status update");
        if ($('approvalMailStatus')) $('approvalMailStatus').value = 'Mail failed';
        setReturnMsg(`Return log ${ret.return_no} saved, but approval email failed/timed out.`, false);
      }
    }

    for (const updated of updatedItems) {
      const idx = state.inventory.findIndex((x)=>x.id===updated.id || x.item_code===updated.item_code);
      if (idx >= 0) state.inventory[idx] = normalizeItem(updated);
    }
    state.returnLogs.unshift(ret);
    state.returnLogLines.push(...lines);
    state.movements.unshift(...movements);
    persistLocal();
    if (!state.dbReady) {
      setReturnMsg(`Return log ${ret.return_no} saved locally. Quantity returned: ${moneyish(totalQty)}.`, true);
    }
    renderAll();
    setTimeout(() => $('returnModal')?.close(), 350);
  } catch (err) {
    setReturnMsg(errMsg(err), false);
  } finally {
    state.returnSaveInProgress = false;
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalText; }
  }
}
function returnLogHtml(ret, lines){
  const rows = lines.map((l, i) => [i + 1, l.item_code, l.description, l.from_bin || "", moneyish(l.qty_issued), moneyish(l.qty_returned)]);
  return `${printMetaGrid([
    ["Return No", ret.return_no],
    ["Return Date", printDate(ret.return_date)],
    ["Source Ticket", ret.source_ticket_no],
    ["Returned By", ret.returned_by],
    ["Returned By Email", ret.returned_by_email],
    ["Received By", ret.received_by],
    ["Total Qty", moneyish(ret.total_qty)],
    ["Generated By", ret.created_by_email || ""],
  ])}${printTable(["S.No", "Item Code", "Description", "Bin", "Issued Qty", "Returned Qty"], rows)}${printSignatures(["Returned By", "Inventory Received By", "Checked By"])}<p class="note">Notes: ${escapeHtml(ret.notes || "")}</p>`;
}
window.viewReturnLog = function(id){
  const ret = state.returnLogs.find((x)=>x.id===id); if (!ret) return;
  const lines = returnLogLinesFor(id);
  $('returnDetailTitle').textContent = `Return Log - ${ret.return_no}`;
  $('returnDetailMeta').innerHTML = `<div><span>Return No</span><strong>${escapeHtml(ret.return_no)}</strong></div><div><span>Date</span><strong>${escapeHtml(ret.return_date)}</strong></div><div><span>Source Ticket</span><strong>${escapeHtml(ret.source_ticket_no)}</strong></div><div><span>Returned By</span><strong>${escapeHtml(ret.returned_by)}</strong></div><div><span>Returned By Email</span><strong>${escapeHtml(ret.returned_by_email || '-')}</strong></div><div><span>Received By</span><strong>${escapeHtml(ret.received_by)}</strong></div><div><span>Total Qty</span><strong>${moneyish(ret.total_qty)}</strong></div><div><span>Approval Mail</span><strong>${ret.approval_mail_sent ? 'Sent' : (ret.approval_mail_error ? 'Failed' : 'Not sent')}</strong></div>`;
  $('returnDetailRows').innerHTML = lines.map((l,i)=>`<tr><td>${i+1}</td><td><strong>${escapeHtml(l.item_code)}</strong></td><td>${escapeHtml(l.description)}</td><td>${escapeHtml(l.from_bin || '')}</td><td>${moneyish(l.qty_issued)}</td><td>${moneyish(l.qty_returned)}</td></tr>`).join('') || emptyRow(6);
  $('returnPrintBtn').onclick = ()=>printReturnLog(id);
  $('returnDetailModal')?.showModal();
};
window.printReturnLog = function(id){
  const ret = state.returnLogs.find((x)=>x.id===id);
  if (!ret) return;
  const lines = returnLogLinesFor(id);
  openPrintDocument(ret.return_no, "Material Return Log", returnLogHtml(ret, lines));
};
window.deleteReturnLog = async function(id){
  const ret = state.returnLogs.find((x)=>x.id===id);
  if (!ret) return;
  const lines = returnLogLinesFor(id);
  const lineCount = lines.length;
  const totalQty = moneyish(ret.total_qty);
  const ok = window.confirm(`Delete return log ${ret.return_no}?

This will:
- remove the return log
- delete its return lines
- remove linked reverse stock movement entries
- subtract ${totalQty} back out of inventory

This cannot be undone.`);
  if (!ok) return;
  if (state.returnDeleteInProgress) return;
  state.returnDeleteInProgress = id;
  try {
    const now = new Date().toISOString();
    const updatedItemMap = new Map();
    for (const line of lines) {
      const item = state.inventory.find((x)=>x.id===line.item_id || x.item_code===line.item_code);
      if (!item) continue;
      const itemKey = item.id || item.item_code;
      const currentItem = updatedItemMap.get(itemKey) || item;
      const after = Math.max(0, Number(currentItem.qty || 0) - Number(line.qty_returned || 0));
      updatedItemMap.set(itemKey, normalizeItem({ ...currentItem, qty: after, updated_at: now }));
    }
    const updatedItems = [...updatedItemMap.values()];
    const movementMatcher = (m) => String(m.movement_type || '').toUpperCase() === 'PRODUCTION_RETURN' && String(m.notes || '').startsWith(`Return ${ret.return_no} from `) && String(m.work_order || '') === String(ret.source_ticket_no || '');
    const movementIds = state.movements.filter(movementMatcher).map((m)=>m.id);
    const ledgerMatcher = (l) => String(l.source_doc_type || '').toUpperCase() === 'MRN' && String(l.source_doc_no || '') === String(ret.return_no || '');
    const ledgerIds = Array.isArray(state.stockLedger) ? state.stockLedger.filter(ledgerMatcher).map((l)=>l.id) : [];

    if (state.dbReady) {
      for (const item of updatedItems) {
        const { error: itemErr } = await state.supabase.from('inventory_items').upsert(item);
        if (itemErr) throw new Error(`Inventory rollback failed: ${itemErr.message}`);
      }

      let moveDelete = state.supabase.from('stock_movements').delete().eq('movement_type', 'PRODUCTION_RETURN').like('notes', `Return ${ret.return_no}%`);
      if (ret.source_ticket_no) moveDelete = moveDelete.eq('work_order', ret.source_ticket_no);
      const { error: movementErr } = await moveDelete;
      if (movementErr) throw new Error(`Movement delete failed: ${movementErr.message}`);

      if (Array.isArray(state.stockLedger)) {
        const { error: ledgerErr } = await state.supabase.from('stock_ledger').delete().eq('source_doc_type', 'MRN').eq('source_doc_no', ret.return_no);
        if (ledgerErr && !/does not exist|schema cache|not found/i.test(ledgerErr.message || '')) throw new Error(`Ledger delete failed: ${ledgerErr.message}`);
      }

      const { error: logErr } = await state.supabase.from('return_logs').delete().eq('id', id);
      if (logErr) throw new Error(`Return log delete failed: ${logErr.message}`);
    }

    for (const item of updatedItems) {
      const idx = state.inventory.findIndex((x)=>x.id===item.id || x.item_code===item.item_code);
      if (idx >= 0) state.inventory[idx] = item;
    }
    state.returnLogs = state.returnLogs.filter((x)=>x.id !== id);
    state.returnLogLines = state.returnLogLines.filter((x)=>x.return_id !== id);
    state.movements = state.movements.filter((m)=>!movementIds.includes(m.id));
    if (Array.isArray(state.stockLedger)) state.stockLedger = state.stockLedger.filter((l)=>!ledgerIds.includes(l.id));
    persistLocal();
    renderAll();
    alert(`Deleted return log ${ret.return_no}. Removed ${lineCount} line(s) and reversed ${totalQty} qty from inventory.`);
  } catch (err) {
    console.error(err);
    alert(err?.message || 'Failed to delete return log.');
  } finally {
    state.returnDeleteInProgress = null;
  }
};
function renderReturns(){
  if (!$('returnRows')) return;
  $('returnCount').textContent = `${state.returnLogs.length} logs`;
  $('returnRows').innerHTML = state.returnLogs.map((r)=>{ const lines = returnLogLinesFor(r.id); return `<tr><td><strong>${escapeHtml(r.return_no)}</strong></td><td>${escapeHtml(r.return_date)}</td><td>${escapeHtml(r.source_ticket_no)}</td><td>${escapeHtml(r.returned_by)}<br><span class="muted">${escapeHtml(r.returned_by_email || '')}</span></td><td>${lines.length}</td><td>${moneyish(r.total_qty)}</td><td>${r.approval_mail_sent ? '<span class="status OK">MAIL SENT</span>' : (r.approval_mail_error ? '<span class="status REJECT">MAIL FAILED</span>' : '<span class="muted">Not sent</span>')}</td><td><div class="return-action-row"><button class="ghost-btn compact" onclick="viewReturnLog('${r.id}')">View</button><button class="mini-btn" onclick="printReturnLog('${r.id}')">Print</button><button class="mini-btn danger" onclick="deleteReturnLog('${r.id}')">Delete</button></div></td></tr>`; }).join('') || emptyRow(8);
}

const __v65_loadData = loadData;
loadData = async function(){
  await __v65_loadData();
  if (state.dbReady && state.user) {
    const [logsRes, linesRes] = await Promise.all([
      state.supabase.from('return_logs').select('*').order('created_at', { ascending: false }),
      state.supabase.from('return_log_lines').select('*')
    ]);
    if (logsRes.error) console.warn('Return logs skipped. Run v6.5 migration.', logsRes.error);
    if (linesRes.error) console.warn('Return log lines skipped. Run v6.5 migration.', linesRes.error);
    state.returnLogs = (logsRes.data || []).map(normalizeReturnLog);
    state.returnLogLines = (linesRes.data || []).map(normalizeReturnLogLine);
  } else {
    const cached = JSON.parse(localStorage.getItem('sns_inventory_dashboard') || '{}');
    state.returnLogs = (cached.returnLogs || []).map(normalizeReturnLog);
    state.returnLogLines = (cached.returnLogLines || []).map(normalizeReturnLogLine);
  }
};
persistLocal = function(){
  localStorage.setItem('sns_inventory_dashboard', JSON.stringify({
    inventory: state.inventory,
    quarantine: state.quarantine,
    binLocations: state.binLocations,
    movements: state.movements,
    tickets: state.tickets,
    ticketLines: state.ticketLines,
    returnLogs: state.returnLogs,
    returnLogLines: state.returnLogLines,
  }));
};
const __v65_renderAll = renderAll;
renderAll = function(){
  __v65_renderAll();
  renderReturns();
  if (state.team === 'inventory' && $('pageTitle')) {
    const t = { returns: 'Return Logs', movements: 'Issue Logs' };
    if (t[state.view]) $('pageTitle').textContent = t[state.view];
  }
};
renderMovements = function() {
  if (!$('movementRows')) return;
  const groups = issueLogGroups();
  $('movementCount').textContent = `${groups.length} logs`;
  $('movementRows').innerHTML = groups.map((g) => {
    const first = g.movements[0] || {};
    const total = g.movements.reduce((sum, x) => sum + Number(x.qty_taken || 0), 0);
    const status = g.ticket?.status || 'ISSUED';
    return `<tr class="log-row" onclick="openIssueLog('${escapeHtml(g.ticket_no)}')"><td><strong>${escapeHtml(g.ticket_no)}</strong></td><td>${first.created_at ? new Date(first.created_at).toLocaleString() : ''}</td><td>${escapeHtml(g.ticket?.work_order || first.work_order || '')}</td><td>${escapeHtml(g.ticket?.department || first.issued_to || '')}</td><td>${g.movements.length}</td><td>${moneyish(total)}</td><td>${statusChip(status)}</td><td><div class="return-action-row"><button class="ghost-btn compact" onclick="event.stopPropagation(); openIssueLog('${escapeHtml(g.ticket_no)}')">View / Print</button><button class="mini-btn" onclick="event.stopPropagation(); openReturnLogBySource('${escapeHtml(g.ticket_no)}')">Create Return</button></div></td></tr>`;
  }).join('') || emptyRow(8);
};
const __v65_bindEvents = bindEvents;
bindEvents = function(){
  __v65_bindEvents();
  $('openReturnModalBtn')?.addEventListener('click', ()=>openReturnModal());
  $('returnSourceTicket')?.addEventListener('change', (e)=>onReturnSourceChange(e.target.value));
  $('returnItemCode')?.addEventListener('input', onReturnItemChange);
  $('returnItemCode')?.addEventListener('change', onReturnItemChange);
  $('returnForm')?.addEventListener('submit', saveReturnLog);
};
const __v65_exportTableExcel = exportTableExcel;
exportTableExcel = function(type){
  if (type === 'returns') {
    const wb = XLSX.utils.book_new();
    addSheet(wb, 'Return Logs', returnExportRows());
    XLSX.writeFile(wb, 'stacknstock_return_logs.xlsx');
    return;
  }
  return __v65_exportTableExcel(type);
};


// v6.5.1: robust return modal opening even if earlier event binding was missed
window.forceOpenReturnModal = function(){
  try {
    if (typeof openReturnModal === 'function') openReturnModal();
    else document.getElementById('returnModal')?.showModal();
  } catch (err) {
    console.error('Return modal open failed', err);
    alert(`Return modal open failed: ${err.message}`);
  }
};
document.addEventListener('click', function(e){
  const btn = e.target.closest && e.target.closest('#openReturnModalBtn');
  if (btn) {
    e.preventDefault();
    window.forceOpenReturnModal();
  }
});
document.addEventListener('click', function(e){
  const closeBtn = e.target.closest && e.target.closest('[data-close]');
  if (closeBtn) {
    const dlg = document.getElementById(closeBtn.dataset.close);
    if (dlg && typeof dlg.close === 'function') dlg.close();
  }
});

// ===== v7: ledger-first inventory control, GRN, MIV, job work, WIP, scrap, costing =====
// Init is called from v7-module.js after the V7 overrides are registered.
