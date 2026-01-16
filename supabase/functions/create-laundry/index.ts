import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateLaundryRequest {
  name: string;
  slug?: string;
  phone?: string;
  email?: string;
  address?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Create laundry function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No valid authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role client to get user from token
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    const requestData: CreateLaundryRequest = await req.json();

    if (!requestData.name) {
      return new Response(
        JSON.stringify({ error: "Laundry name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate slug from name if not provided
    const slug = requestData.slug || requestData.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check if slug already exists
    const { data: existing } = await adminClient
      .from("laundries")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "A laundry with this name already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the laundry
    const { data: laundry, error: laundryError } = await adminClient
      .from("laundries")
      .insert({
        name: requestData.name,
        slug,
        phone: requestData.phone,
        email: requestData.email,
        address: requestData.address,
        is_active: true,
        subscription_status: "trial",
      })
      .select()
      .single();

    if (laundryError) {
      console.error("Error creating laundry:", laundryError);
      return new Response(
        JSON.stringify({ error: "Failed to create laundry" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Laundry created:", laundry.id);

    // Check if user already has owner role
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    if (!existingRole) {
      // Assign owner role if not exists
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "owner",
        });

      if (roleError) {
        console.error("Error assigning owner role:", roleError);
      } else {
        console.log("Owner role assigned");
      }
    }

    // Link user to laundry
    const { error: linkError } = await adminClient
      .from("laundry_users")
      .insert({
        laundry_id: laundry.id,
        user_id: user.id,
        is_primary: true,
      });

    if (linkError) {
      console.error("Error linking user to laundry:", linkError);
    } else {
      console.log("User linked to laundry");
    }

    // Update user's profile with laundry_id
    await adminClient
      .from("profiles")
      .update({ laundry_id: laundry.id })
      .eq("id", user.id);

    // Create default branch for the laundry
    const { error: branchError } = await adminClient
      .from("branches")
      .insert({
        name: "Sucursal Principal",
        code: "SP1",
        is_main: true,
        is_active: true,
        laundry_id: laundry.id,
      });

    if (branchError) {
      console.error("Error creating default branch:", branchError);
    } else {
      console.log("Default branch created");
    }

    console.log("Laundry created successfully:", laundry.id);

    return new Response(
      JSON.stringify({
        success: true,
        laundry,
        message: "Laundry created successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Create laundry error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
