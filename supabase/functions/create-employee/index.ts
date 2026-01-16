import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface CreateEmployeeRequest {
  appUrl?: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'admin' | 'cajero' | 'operador' | 'delivery' | 'owner';
  permissions: string[];
  laundry_id?: string;
  branch_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request has valid auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to create users
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // First verify the requesting user is an admin using their token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user: requestingUser }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the requesting user is an admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .maybeSingle();

    // Allow owner and admin to create employees
    if (roleError || (roleData?.role !== 'admin' && roleData?.role !== 'owner')) {
      return new Response(
        JSON.stringify({ error: 'Solo los administradores y propietarios pueden crear empleados' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateEmployeeRequest = await req.json();
    const { appUrl, email, password, name, phone, role, permissions, laundry_id, branch_id } = body;

    // Validate input
    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: 'Datos incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user with admin client (service role)
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: { name }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      
      if (createError.message.includes('already') || createError.message.includes('exists')) {
        return new Response(
          JSON.stringify({ error: 'Este correo ya está registrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'No se pudo crear el usuario' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with additional data including laundry_id and branch_id
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        name,
        phone: phone || null,
        must_change_password: false,
        profile_completed: true,
        laundry_id: laundry_id || null,
        branch_id: branch_id || null,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    // If laundry_id provided, add user to laundry_users table
    if (laundry_id) {
      const { error: laundryUserError } = await adminClient
        .from('laundry_users')
        .insert({
          user_id: userId,
          laundry_id: laundry_id,
          is_primary: false,
        });

      if (laundryUserError) {
        console.error('Laundry user insert error:', laundryUserError);
      }
    }

    // Update the role
    const { error: roleUpdateError } = await adminClient
      .from('user_roles')
      .update({ role })
      .eq('user_id', userId);

    if (roleUpdateError) {
      console.error('Role update error:', roleUpdateError);
    }

    // Update permissions
    await adminClient
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    if (permissions && permissions.length > 0) {
      const { error: permError } = await adminClient
        .from('user_permissions')
        .insert(
          permissions.map((moduleKey) => ({
            user_id: userId,
            module_key: moduleKey,
          }))
        );

      if (permError) {
        console.error('Permissions error:', permError);
      }
    }

    // Send credentials email (best-effort)
    let emailSent = false;
    let emailError: string | null = null;

    const origin = appUrl || req.headers.get('origin') || '';
    const loginUrl = origin ? `${origin}/login` : '';

    if (resend) {
      try {
        const { error: sendError } = await resend.emails.send({
          from: 'LaundyFlow <onboarding@resend.dev>',
          to: [email],
          subject: 'Tus credenciales de acceso',
          html: `
            <div style="font-family: ui-sans-serif, system-ui; line-height: 1.6">
              <h2 style="margin: 0 0 12px">Bienvenido/a</h2>
              <p>Se creó tu cuenta en el sistema de la lavandería. Tus credenciales son:</p>
              <p><strong>Correo:</strong> ${email}<br />
                 <strong>Contraseña:</strong> ${password}</p>
              ${loginUrl ? `<p><a href="${loginUrl}" target="_blank">Ingresar al sistema</a></p>` : ''}
              <p>Luego de ingresar, si lo deseas puedes cambiar tu contraseña desde <strong>Mi Portal</strong> → <strong>Cambiar Contraseña</strong>.</p>
              <p style="color: #666; font-size: 12px">Si no solicitaste este acceso, ignora este correo y avisa al administrador.</p>
            </div>
          `,
        });

        if (sendError) throw sendError;
        emailSent = true;
      } catch (e) {
        console.error('Email send error:', e);
        emailError = e instanceof Error ? e.message : 'Error enviando email';
      }
    } else {
      emailError = 'RESEND_API_KEY no configurada';
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: 'Empleado creado exitosamente',
        emailSent,
        emailError,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
