import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const { return_id } = await req.json();

    if (!return_id) {
      return new Response(JSON.stringify({ error: "return_id is required" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SNS_SERVICE_ROLE_KEY");
    const zohoWebhookUrl = Deno.env.get("ZOHO_RETURN_APPROVAL_WEBHOOK_URL");

    if (!supabaseUrl) throw new Error("SUPABASE_URL secret missing");
    if (!serviceRoleKey) throw new Error("SNS_SERVICE_ROLE_KEY secret missing");
    if (!zohoWebhookUrl) throw new Error("ZOHO_RETURN_APPROVAL_WEBHOOK_URL secret missing");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: ret, error: retErr } = await supabase
      .from("return_logs")
      .select("*")
      .eq("id", return_id)
      .single();

    if (retErr || !ret) {
      throw new Error(retErr?.message || "Return log not found");
    }

    if (!ret.returned_by_email) {
      throw new Error("Returned By Email is missing in return_logs");
    }

    const { data: lines, error: lineErr } = await supabase
      .from("return_log_lines")
      .select("*")
      .eq("return_id", return_id)
      .order("created_at", { ascending: true });

    if (lineErr) throw new Error(lineErr.message);

    const items = lines || [];

    const items_html = items.length
      ? items
          .map((x, i) => {
            return `${i + 1}. ${x.item_code || "-"} - ${x.description || "-"} | Qty Returned: ${x.qty_returned || 0} | Bin: ${x.from_bin || "-"}`;
          })
          .join("\n")
      : "No item lines found.";

    const payload = {
      return_id: ret.id,
      return_no: ret.return_no,
      return_date: ret.return_date,
      source_ticket_no: ret.source_ticket_no,
      returned_by: ret.returned_by,
      returned_by_email: ret.returned_by_email,
      received_by: ret.received_by,
      notes: ret.notes,
      total_qty: ret.total_qty,
      items,
      items_html,
      subject: `Approved Return Log - ${ret.return_no}`,
    };

    const zohoResponse = await fetch(zohoWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!zohoResponse.ok) {
      const body = await zohoResponse.text();

      await supabase
        .from("return_logs")
        .update({
          approval_mail_sent: false,
          approval_mail_error: `Zoho Flow failed: ${zohoResponse.status} ${body}`,
        })
        .eq("id", return_id);

      throw new Error(`Zoho Flow failed: ${zohoResponse.status} ${body}`);
    }

    await supabase
      .from("return_logs")
      .update({
        approval_mail_sent: true,
        approval_mail_sent_at: new Date().toISOString(),
        approval_mail_error: null,
      })
      .eq("id", return_id);

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Approval email sent through Zoho Flow",
        return_no: ret.return_no,
        sent_to: ret.returned_by_email,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: String(err?.message || err),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});