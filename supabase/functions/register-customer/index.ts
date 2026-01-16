import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterRequest {
  userId: string;
  name: string;
  email: string;
  phone: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Register customer function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request has authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user's identity
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData: RegisterRequest = await req.json();

    // Security: Ensure the userId matches the authenticated user
    if (requestData.userId !== user.id) {
      return new Response(
        JSON.stringify({ error: "User ID mismatch - unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already has a role assigned
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingRole) {
      return new Response(
        JSON.stringify({ error: "User already has a role assigned" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create customer profile
    const { error: profileError } = await adminClient
      .from("customer_profiles")
      .insert({
        id: user.id,
        phone: requestData.phone,
      });

    if (profileError) {
      console.error("Error creating customer profile:", profileError);
      // Continue if profile already exists
    }

    // Assign cliente role (server-side only)
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "cliente",
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to assign customer role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create customer record
    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .insert({
        name: requestData.name,
        email: requestData.email,
        phone: requestData.phone,
        user_id: user.id,
      })
      .select()
      .single();

    if (customerError) {
      console.error("Error creating customer:", customerError);
      return new Response(
        JSON.stringify({ error: "Failed to create customer record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Customer registered successfully:", customer.id);

    return new Response(
      JSON.stringify({
        success: true,
        customerId: customer.id,
        message: "Customer registered successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
