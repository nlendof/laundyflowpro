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

// Default configurations for new laundries
const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Lavado', order: 0, isActive: true },
  { id: '2', name: 'Planchado', order: 1, isActive: true },
  { id: '3', name: 'Especializado', order: 2, isActive: true },
  { id: '4', name: 'Ropa Superior', order: 3, isActive: true },
  { id: '5', name: 'Ropa Inferior', order: 4, isActive: true },
  { id: '6', name: 'Hogar', order: 5, isActive: true },
];

const DEFAULT_OPERATIONS = [
  { id: '1', key: 'pending_pickup', name: 'Pendiente de Recogida', icon: 'Clock', color: 'bg-amber-500', isActive: true, isRequired: true, order: 0 },
  { id: '2', key: 'in_store', name: 'En Local', icon: 'Store', color: 'bg-blue-500', isActive: true, isRequired: true, order: 1 },
  { id: '3', key: 'washing', name: 'Lavando', icon: 'Waves', color: 'bg-cyan-500', isActive: true, isRequired: false, order: 2 },
  { id: '4', key: 'drying', name: 'Secando', icon: 'Wind', color: 'bg-purple-500', isActive: true, isRequired: false, order: 3 },
  { id: '5', key: 'ironing', name: 'Terminación', icon: 'Flame', color: 'bg-orange-500', isActive: true, isRequired: false, order: 4 },
  { id: '6', key: 'ready_delivery', name: 'Listo para Entrega', icon: 'Package', color: 'bg-emerald-500', isActive: true, isRequired: true, order: 5 },
  { id: '7', key: 'in_transit', name: 'En Camino', icon: 'Truck', color: 'bg-indigo-500', isActive: true, isRequired: false, order: 6 },
  { id: '8', key: 'delivered', name: 'Entregado', icon: 'CheckCircle', color: 'bg-green-600', isActive: true, isRequired: true, order: 7 },
];

const DEFAULT_ZONES = [
  { id: '1', name: 'Centro', price: 0, isActive: true },
  { id: '2', name: 'Zona Norte', price: 25, isActive: true },
  { id: '3', name: 'Zona Sur', price: 30, isActive: true },
];

const DEFAULT_EXTRAS = [
  { id: '1', name: 'Desmanchado', price: 3.00, isActive: true },
  { id: '2', name: 'Suavizante Premium', price: 2.00, isActive: true },
  { id: '3', name: 'Express (24h)', price: 10.00, isActive: true },
];

const DEFAULT_PAYMENTS = [
  { id: '1', name: 'Efectivo', isActive: true, commission: 0 },
  { id: '2', name: 'Tarjeta de Crédito', isActive: true, commission: 3.5 },
  { id: '3', name: 'Transferencia', isActive: true, commission: 0 },
];

const DEFAULT_TICKET_SETTINGS = {
  logoUrl: '',
  showLogo: false,
  showPrices: true,
  showQR: true,
  qrContent: 'ticket_code',
  customQrUrl: '',
  footerText: 'Conserve este ticket para recoger su pedido',
  showFooter: true,
  thankYouMessage: '¡Gracias por su preferencia!',
};

// Default services for new laundries
const DEFAULT_SERVICES = [
  { name: 'Lavado por Libra', category: 'Lavado', price: 50, unit: 'lb', description: 'Lavado estándar por peso' },
  { name: 'Lavado Delicado', category: 'Lavado', price: 80, unit: 'lb', description: 'Para prendas delicadas' },
  { name: 'Planchado por Pieza', category: 'Planchado', price: 25, unit: 'pieza', description: 'Planchado profesional' },
  { name: 'Lavado en Seco', category: 'Especializado', price: 150, unit: 'pieza', description: 'Limpieza en seco' },
];

// Default example articles for new laundries
const DEFAULT_ARTICLES = [
  { name: 'Detergente Líquido', category: 'Insumos', price: 250, cost: 180, stock: 10, min_stock: 3, description: 'Detergente concentrado', track_inventory: true },
  { name: 'Suavizante', category: 'Insumos', price: 150, cost: 100, stock: 8, min_stock: 2, description: 'Suavizante de telas', track_inventory: true },
];

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

    // Link user to laundry (owner/technician don't have laundry_id in profile)
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

    // NOTE: Do NOT set laundry_id on owner/technician profiles
    // They access laundries through laundry_users table and should not appear as employees

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

    // Create default system configuration for the new laundry
    const defaultConfigs = [
      { key: 'categories', value: DEFAULT_CATEGORIES, laundry_id: laundry.id },
      { key: 'operations', value: DEFAULT_OPERATIONS, laundry_id: laundry.id },
      { key: 'delivery_zones', value: DEFAULT_ZONES, laundry_id: laundry.id },
      { key: 'extra_services', value: DEFAULT_EXTRAS, laundry_id: laundry.id },
      { key: 'payment_methods', value: DEFAULT_PAYMENTS, laundry_id: laundry.id },
      { key: 'business', value: { 
        name: requestData.name, 
        slogan: '', 
        phone: requestData.phone || '', 
        email: requestData.email || '', 
        address: requestData.address || '',
        website: '',
        openTime: '08:00',
        closeTime: '20:00',
        workDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        taxRate: 18,
        currency: 'DOP',
      }, laundry_id: laundry.id },
      { key: 'ticket_settings', value: DEFAULT_TICKET_SETTINGS, laundry_id: laundry.id },
    ];

    for (const config of defaultConfigs) {
      const { error: configError } = await adminClient
        .from("system_config")
        .insert(config);
      if (configError) {
        console.error(`Error creating ${config.key} config:`, configError);
      }
    }
    console.log("Default configuration created");

    // Create default services
    for (const service of DEFAULT_SERVICES) {
      await adminClient.from("catalog_services").insert({
        ...service,
        laundry_id: laundry.id,
        is_active: true,
      });
    }
    console.log("Default services created");

    // Create example articles
    for (const article of DEFAULT_ARTICLES) {
      await adminClient.from("catalog_articles").insert({
        ...article,
        laundry_id: laundry.id,
        is_active: true,
      });
    }
    console.log("Example articles created");

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
