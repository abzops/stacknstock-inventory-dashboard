// Main Stack n Stock Inventory Supabase project
window.SNS_SUPABASE_URL = "https://oesikheuagxfqyefdflw.supabase.co";
window.SNS_SUPABASE_ANON_KEY = "sb_publishable_I8ZrCSUqYIFN7ADd56a5Mw_cPNuo4ri";

// Procurement Hub Supabase project for Delivery Challan product + price lookup
// Use anon/publishable key only. Do not use service_role or sb_secret keys in this frontend.
window.SNS_PRICE_SUPABASE_URL = "https://fvdzflaodzsdvpkizwtg.supabase.co";
window.SNS_PRICE_SUPABASE_ANON_KEY =
  "sb_publishable_FcFHsuEwduhV-23XmiiikQ_x8me8GU_";

// Procurement Hub product source mapping
window.SNS_PRICE_TABLE = "po_lines";
window.SNS_PRICE_ITEM_NAME_COLUMN = "item_desc";
window.SNS_PRICE_PRICE_COLUMN = "line_grand_total";
window.SNS_PRICE_TAX_COLUMN = "item_tax_percent";
window.SNS_PRICE_QTY_COLUMN = "quantity_ordered";
window.SNS_PRICE_ITEM_CODE_COLUMN = "line_id";
window.SNS_PRICE_PO_COLUMN = "po_number";
window.SNS_PRICE_VENDOR_COLUMN = "vendor_name";
