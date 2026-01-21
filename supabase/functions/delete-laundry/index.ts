import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteLaundryRequest {
  laundry_id: string;
  action: "request_code" | "confirm_delete";
  confirmation_code?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Delete laundry function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is owner
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Only owners can delete laundries" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData: DeleteLaundryRequest = await req.json();

    if (!requestData.laundry_id) {
      return new Response(
        JSON.stringify({ error: "Laundry ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get laundry details
    const { data: laundry, error: laundryError } = await adminClient
      .from("laundries")
      .select("*")
      .eq("id", requestData.laundry_id)
      .single();

    if (laundryError || !laundry) {
      return new Response(
        JSON.stringify({ error: "Laundry not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get owner's email from profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, name")
      .eq("id", user.id)
      .single();

    const ownerEmail = profile?.email || user.email;
    const ownerName = profile?.name || "Propietario";

    if (requestData.action === "request_code") {
      // Generate 6-digit confirmation code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Delete any existing codes for this user/laundry
      await adminClient
        .from("deletion_confirmation_codes")
        .delete()
        .eq("user_id", user.id)
        .eq("laundry_id", requestData.laundry_id);
      
      // Store code in database with 10-minute expiration
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error: insertError } = await adminClient
        .from("deletion_confirmation_codes")
        .insert({
          user_id: user.id,
          laundry_id: requestData.laundry_id,
          code,
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error("Error storing confirmation code:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate confirmation code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send email with confirmation code
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        
        try {
          await resend.emails.send({
            from: "LaundryFlow <onboarding@resend.dev>",
            to: [ownerEmail!],
            subject: `Código de confirmación para eliminar ${laundry.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #dc2626; text-align: center;">⚠️ Confirmación de Eliminación</h1>
                
                <p>Hola <strong>${ownerName}</strong>,</p>
                
                <p>Has solicitado eliminar la lavandería <strong>${laundry.name}</strong> del sistema.</p>
                
                <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                  <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: bold;">Tu código de confirmación es:</p>
                  <h2 style="margin: 0; font-size: 36px; letter-spacing: 8px; color: #dc2626;">${code}</h2>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  <strong>⚠️ Advertencia:</strong> Esta acción es <strong>IRREVERSIBLE</strong>. 
                  Se eliminarán permanentemente:
                </p>
                <ul style="color: #666; font-size: 14px;">
                  <li>Todas las sucursales</li>
                  <li>Todos los pedidos e historial</li>
                  <li>Todos los clientes asociados</li>
                  <li>Todo el inventario y catálogo</li>
                  <li>Todos los registros de caja</li>
                </ul>
                
                <p style="color: #666; font-size: 14px;">
                  El código expira en <strong>10 minutos</strong>.
                </p>
                
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                  Si no solicitaste esta acción, ignora este correo.
                </p>
              </div>
            `,
          });
          console.log("Confirmation email sent to:", ownerEmail);
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Código enviado a ${ownerEmail}`,
          email: ownerEmail?.replace(/(.{2}).*(@.*)/, "$1***$2"), // Mask email
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requestData.action === "confirm_delete") {
      if (!requestData.confirmation_code) {
        return new Response(
          JSON.stringify({ error: "Confirmation code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch the stored code from database
      const { data: storedCode, error: fetchError } = await adminClient
        .from("deletion_confirmation_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("laundry_id", requestData.laundry_id)
        .single();

      if (fetchError || !storedCode) {
        return new Response(
          JSON.stringify({ error: "No pending confirmation. Request a new code." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date() > new Date(storedCode.expires_at)) {
        // Delete expired code
        await adminClient
          .from("deletion_confirmation_codes")
          .delete()
          .eq("id", storedCode.id);
        return new Response(
          JSON.stringify({ error: "Code expired. Request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (storedCode.code !== requestData.confirmation_code) {
        return new Response(
          JSON.stringify({ error: "Invalid confirmation code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Code is valid - delete the code from database
      await adminClient
        .from("deletion_confirmation_codes")
        .delete()
        .eq("id", storedCode.id);

      console.log("Starting deletion of laundry:", requestData.laundry_id);

      // Get all branches
      const { data: branches } = await adminClient
        .from("branches")
        .select("id")
        .eq("laundry_id", requestData.laundry_id);

      const branchIds = branches?.map(b => b.id) || [];

      // Get all orders
      const { data: orders } = await adminClient
        .from("orders")
        .select("id")
        .eq("laundry_id", requestData.laundry_id);

      const orderIds = orders?.map(o => o.id) || [];

      // Delete in order of dependencies
      if (orderIds.length > 0) {
        await adminClient.from("order_items").delete().in("order_id", orderIds);
        await adminClient.from("order_returns").delete().in("order_id", orderIds);
      }

      // Delete orders
      await adminClient.from("orders").delete().eq("laundry_id", requestData.laundry_id);

      // Delete customers
      await adminClient.from("customers").delete().eq("laundry_id", requestData.laundry_id);

      // Delete inventory
      const { data: inventory } = await adminClient
        .from("inventory")
        .select("id")
        .eq("laundry_id", requestData.laundry_id);
      
      if (inventory && inventory.length > 0) {
        await adminClient.from("inventory_movements").delete().in("inventory_id", inventory.map(i => i.id));
      }
      await adminClient.from("inventory").delete().eq("laundry_id", requestData.laundry_id);

      // Delete catalog
      await adminClient.from("catalog_services").delete().eq("laundry_id", requestData.laundry_id);
      await adminClient.from("catalog_articles").delete().eq("laundry_id", requestData.laundry_id);
      await adminClient.from("catalog_extras").delete().eq("laundry_id", requestData.laundry_id);

      // Delete cash register and closings
      await adminClient.from("cash_register").delete().eq("laundry_id", requestData.laundry_id);
      await adminClient.from("cash_closings").delete().eq("laundry_id", requestData.laundry_id);

      // Delete expenses
      await adminClient.from("expenses").delete().eq("laundry_id", requestData.laundry_id);

      // Delete purchases
      const { data: purchases } = await adminClient
        .from("purchases")
        .select("id")
        .eq("laundry_id", requestData.laundry_id);
      
      if (purchases && purchases.length > 0) {
        await adminClient.from("purchase_items").delete().in("purchase_id", purchases.map(p => p.id));
      }
      await adminClient.from("purchases").delete().eq("laundry_id", requestData.laundry_id);

      // Delete employee data
      await adminClient.from("attendance_records").delete().eq("laundry_id", requestData.laundry_id);
      await adminClient.from("employee_salaries").delete().eq("laundry_id", requestData.laundry_id);
      await adminClient.from("employee_loans").delete().eq("laundry_id", requestData.laundry_id);
      await adminClient.from("time_off_requests").delete().eq("laundry_id", requestData.laundry_id);
      await adminClient.from("payroll_records").delete().eq("laundry_id", requestData.laundry_id);

      // Delete backup data
      await adminClient.from("backup_history").delete().eq("laundry_id", requestData.laundry_id);
      await adminClient.from("backup_schedules").delete().eq("laundry_id", requestData.laundry_id);

      // Delete system config
      await adminClient.from("system_config").delete().eq("laundry_id", requestData.laundry_id);

      // Delete audit logs
      await adminClient.from("audit_logs").delete().eq("laundry_id", requestData.laundry_id);

      // Delete admin discount codes
      await adminClient.from("admin_discount_codes").delete().eq("laundry_id", requestData.laundry_id);

      // Delete laundry users
      await adminClient.from("laundry_users").delete().eq("laundry_id", requestData.laundry_id);

      // Update profiles to remove laundry_id reference
      await adminClient
        .from("profiles")
        .update({ laundry_id: null, branch_id: null })
        .eq("laundry_id", requestData.laundry_id);

      // Delete branches
      await adminClient.from("branches").delete().eq("laundry_id", requestData.laundry_id);

      // Finally, delete the laundry
      const { error: deleteError } = await adminClient
        .from("laundries")
        .delete()
        .eq("id", requestData.laundry_id);

      if (deleteError) {
        console.error("Error deleting laundry:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to delete laundry" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Laundry deleted successfully:", requestData.laundry_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Lavandería "${laundry.name}" eliminada permanentemente`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Delete laundry error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
