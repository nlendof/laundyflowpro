import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteEmployeeRequest {
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify requester identity with their JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: requestingUser },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !requestingUser) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .maybeSingle();

    if (roleError || (roleData?.role !== 'admin' && roleData?.role !== 'owner')) {
      return new Response(JSON.stringify({ error: 'Solo administradores y propietarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: DeleteEmployeeRequest = await req.json();
    const userId = body.user_id;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (userId === requestingUser.id) {
      return new Response(JSON.stringify({ error: 'No puedes eliminar tu propia cuenta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete public data first (best-effort)
    const { error: laundryUserDeleteError } = await adminClient
      .from('laundry_users')
      .delete()
      .eq('user_id', userId);
    if (laundryUserDeleteError) console.error('laundryUserDeleteError', laundryUserDeleteError);

    const { error: permDeleteError } = await adminClient
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);
    if (permDeleteError) console.error('permDeleteError', permDeleteError);

    const { error: roleDeleteError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (roleDeleteError) console.error('roleDeleteError', roleDeleteError);

    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileDeleteError) console.error('profileDeleteError', profileDeleteError);

    // Delete auth user (revokes access)
    // If the user was already removed from the auth system, treat it as success.
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      const anyErr = authDeleteError as any;
      if (anyErr?.status === 404 || anyErr?.code === 'user_not_found') {
        console.warn('authDeleteError (already deleted):', authDeleteError);
      } else {
        console.error('authDeleteError', authDeleteError);
        return new Response(JSON.stringify({ error: 'No se pudo eliminar el usuario' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
