import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingResult {
  trialsExpired: number;
  subscriptionsSuspended: number;
  notificationsSent: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const result: ProcessingResult = {
      trialsExpired: 0,
      subscriptionsSuspended: 0,
      notificationsSent: 0,
      errors: [],
    };

    // 1. Process trial expirations
    const { data: expiredTrials, error: trialsError } = await supabase
      .from('branch_subscriptions')
      .select(`
        id,
        branch_id,
        trial_ends_at,
        branch:branches(name, laundry_id)
      `)
      .eq('status', 'trial')
      .lt('trial_ends_at', new Date().toISOString());

    if (trialsError) {
      result.errors.push(`Error fetching expired trials: ${trialsError.message}`);
    } else if (expiredTrials && expiredTrials.length > 0) {
      for (const trial of expiredTrials) {
        const { error: updateError } = await supabase
          .from('branch_subscriptions')
          .update({
            status: 'past_due',
            past_due_since: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', trial.id);

        if (updateError) {
          result.errors.push(`Error updating trial ${trial.id}: ${updateError.message}`);
        } else {
          result.trialsExpired++;
        }
      }
    }

    // 2. Process past_due to suspended (after grace period)
    const { data: pastDueSubscriptions, error: pastDueError } = await supabase
      .from('branch_subscriptions')
      .select(`
        id,
        branch_id,
        past_due_since,
        plan:subscription_plans(grace_period_days),
        branch:branches(name, laundry_id)
      `)
      .eq('status', 'past_due');

    if (pastDueError) {
      result.errors.push(`Error fetching past_due subscriptions: ${pastDueError.message}`);
    } else if (pastDueSubscriptions) {
      for (const sub of pastDueSubscriptions) {
        const graceDays = (sub.plan as any)?.grace_period_days || 5;
        const pastDueDate = new Date(sub.past_due_since!);
        const suspensionDate = new Date(pastDueDate.getTime() + graceDays * 24 * 60 * 60 * 1000);

        if (new Date() > suspensionDate) {
          const { error: suspendError } = await supabase
            .from('branch_subscriptions')
            .update({
              status: 'suspended',
              suspended_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id);

          if (suspendError) {
            result.errors.push(`Error suspending ${sub.id}: ${suspendError.message}`);
          } else {
            result.subscriptionsSuspended++;

            // Send suspension notification
            if (resendApiKey) {
              await sendNotification(
                supabase,
                resendApiKey,
                sub.branch_id,
                sub.id,
                'suspension',
                (sub.branch as any)?.name || 'Sucursal'
              );
              result.notificationsSent++;
            }
          }
        }
      }
    }

    // 3. Send reminder notifications for trials ending soon
    const reminderDays = [7, 3, 1];
    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();

      const { data: expiringTrials } = await supabase
        .from('branch_subscriptions')
        .select(`
          id,
          branch_id,
          trial_ends_at,
          branch:branches(name, laundry_id)
        `)
        .eq('status', 'trial')
        .gte('trial_ends_at', startOfDay)
        .lte('trial_ends_at', endOfDay);

      if (expiringTrials && resendApiKey) {
        for (const trial of expiringTrials) {
          // Check if we already sent this notification today
          const { data: existingNotification } = await supabase
            .from('subscription_notifications')
            .select('id')
            .eq('subscription_id', trial.id)
            .eq('notification_type', `trial_ending_${days}`)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .single();

          if (!existingNotification) {
            await sendNotification(
              supabase,
              resendApiKey,
              trial.branch_id,
              trial.id,
              `trial_ending_${days}`,
              (trial.branch as any)?.name || 'Sucursal',
              days
            );
            result.notificationsSent++;
          }
        }
      }
    }

    // 4. Update the scheduled job last run time
    await supabase
      .from('scheduled_jobs')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('job_name', 'subscription_notifications');

    console.log('Processing complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing subscriptions:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendNotification(
  supabase: any,
  resendApiKey: string,
  branchId: string,
  subscriptionId: string,
  notificationType: string,
  branchName: string,
  daysRemaining?: number
) {
  // Get branch admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (!admins || admins.length === 0) return;

  let subject = '';
  let body = '';

  switch (notificationType) {
    case 'trial_ending_7':
    case 'trial_ending_3':
    case 'trial_ending_1':
      subject = `⏰ Tu período de prueba termina en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}`;
      body = `
        <h2>Hola,</h2>
        <p>Tu período de prueba para <strong>${branchName}</strong> termina en <strong>${daysRemaining} día${daysRemaining === 1 ? '' : 's'}</strong>.</p>
        <p>Para continuar usando todos los servicios sin interrupción, configura tu método de pago ahora.</p>
        <p>Visita la sección de Configuración > Suscripción en tu panel de control.</p>
        <br>
        <p>Saludos,<br>El equipo de LaundryFlow</p>
      `;
      break;
    case 'suspension':
      subject = '🚫 Tu servicio ha sido suspendido';
      body = `
        <h2>Hola,</h2>
        <p>Lamentamos informarte que el servicio para <strong>${branchName}</strong> ha sido suspendido por falta de pago.</p>
        <p>Para reactivar tu servicio inmediatamente, realiza el pago pendiente en la sección de Configuración > Suscripción.</p>
        <br>
        <p>Saludos,<br>El equipo de LaundryFlow</p>
      `;
      break;
    default:
      return;
  }

  for (const admin of admins) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'LaundryFlow <notificaciones@laundryflow.com>',
          to: [admin.email],
          subject,
          html: body,
        }),
      });

      // Log the notification
      await supabase.from('subscription_notifications').insert({
        subscription_id: subscriptionId,
        branch_id: branchId,
        notification_type: notificationType,
        channel: 'email',
        recipient_email: admin.email,
        subject,
        body,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error sending email to ${admin.email}:`, error);
    }
  }
}
