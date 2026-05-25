import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let grnId = "";
  let supabase: ReturnType<typeof createClient> | null = null;

  const updateMailStatus = async (patch: Record<string, unknown>) => {
    if (!supabase || !grnId) return;
    await supabase.from("grn_headers").update(patch).eq("id", grnId);
  };

  try {
    if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

    const body = await req.json();
    grnId = body?.grn_id || "";
    if (!grnId) return json({ ok: false, error: "grn_id is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SNS_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const zohoWebhookUrl = Deno.env.get("ZOHO_GRN_WEBHOOK_URL");

    if (!supabaseUrl) throw new Error("SUPABASE_URL secret missing");
    if (!serviceRoleKey) throw new Error("SNS_SERVICE_ROLE_KEY secret missing");
    if (!zohoWebhookUrl) throw new Error("ZOHO_GRN_WEBHOOK_URL secret missing");

    supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: grn, error: grnErr } = await supabase
      .from("grn_headers")
      .select("*")
      .eq("id", grnId)
      .single();

    if (grnErr || !grn) throw new Error(grnErr?.message || "GRN not found");

    const { data: lines, error: lineErr } = await supabase
      .from("grn_lines")
      .select("*")
      .eq("grn_id", grnId)
      .order("created_at", { ascending: true });

    if (lineErr) throw new Error(lineErr.message);

    const items = lines || [];
    const items_html = items.length
      ? items
          .map((item, index) => {
            return `${index + 1}. ${item.item_code || "-"} - ${item.description || "-"} | UOM: ${item.uom || "-"} | Received: ${item.received_qty || 0} | Accepted: ${item.accepted_qty || 0} | Hold: ${item.hold_qty || 0} | Rejected: ${item.rejected_qty || 0} | Bin: ${item.putaway_bin || "-"} | Rate: ${item.unit_rate || 0}`;
          })
          .join("\n")
      : "No GRN lines found.";

    const firstLine = items[0] || {};
    const payload = {
      grn_id: grn.id,
      grn_no: grn.grn_no,
      grn_date: grn.grn_date,
      supplier: grn.supplier,
      po_no: grn.po_no,
      invoice_no: grn.invoice_no,
      received_by: grn.received_by,
      qc_status: grn.qc_status,
      remarks: grn.remarks,
      created_by_email: grn.created_by_email,
      item_code: firstLine.item_code || "",
      description: firstLine.description || "",
      uom: firstLine.uom || "",
      received_qty: firstLine.received_qty || 0,
      accepted_qty: firstLine.accepted_qty || 0,
      hold_qty: firstLine.hold_qty || 0,
      rejected_qty: firstLine.rejected_qty || 0,
      putaway_bin: firstLine.putaway_bin || "",
      unit_rate: firstLine.unit_rate || 0,
      landed_cost: firstLine.landed_cost || 0,
      items,
      items_html,
      subject: `New GRN Created - ${grn.grn_no}`,
    };

    const zohoResponse = await fetch(zohoWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!zohoResponse.ok) {
      const responseBody = await zohoResponse.text();
      const message = `Zoho Flow failed: ${zohoResponse.status} ${responseBody}`;
      await updateMailStatus({
        grn_mail_status: "FAILED",
        grn_mail_sent: false,
        grn_mail_error: message,
      });
      throw new Error(message);
    }

    const sentAt = new Date().toISOString();
    await updateMailStatus({
      grn_mail_status: "SENT",
      grn_mail_sent: true,
      grn_mail_sent_at: sentAt,
      grn_mail_error: null,
    });

    return json({
      ok: true,
      message: "GRN email sent through Zoho Flow",
      grn_no: grn.grn_no,
      sent_at: sentAt,
    });
  } catch (err) {
    const message = String(err?.message || err);
    await updateMailStatus({
      grn_mail_status: "FAILED",
      grn_mail_sent: false,
      grn_mail_error: message,
    });
    return json({ ok: false, error: message }, 500);
  }
});
