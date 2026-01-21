import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionWithBranch {
  id: string;
  branch_id: string;
  status: string;
  trial_ends_at: string | null;
  past_due_since: string | null;
  plan: { grace_period_days: number }[] | null;
  branch: { 
    name: string; 
    laundry_id: string;
    laundry: { name: string; email: string | null }[] | null;
  }[] | null;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "LaundryFlow Pro <noreply@laundryflow.app>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Failed to send email:", await res.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

async function createNotification(
  supabase: any,
  subscriptionId: string,
  branchId: string,
  type: string,
  recipientEmail: string,
  subject: string,
  body: string
) {
  const { error } = await supabase.from("subscription_notifications").insert({
    subscription_id: subscriptionId,
    branch_id: branchId,
    notification_type: type,
    recipient_email: recipientEmail,
    channel: "email",
    status: "pending",
    subject,
    body,
  });

  if (error) {
    console.error("Failed to create notification record:", error);
  }

  // Send email
  const sent = await sendEmail(recipientEmail, subject, body);

  // Update notification status
  if (sent) {
    await supabase
      .from("subscription_notifications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("subscription_id", subscriptionId)
      .eq("notification_type", type)
      .eq("status", "pending");
  }

  return sent;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const results = {
      trialEnding: 0,
      paymentDue: 0,
      pastDue: 0,
      suspended: 0,
    };

    // Get all subscriptions with their branch and laundry info
    const { data: subscriptions, error } = await supabase
      .from("branch_subscriptions")
      .select(`
        id,
        branch_id,
        status,
        trial_ends_at,
        past_due_since,
        plan:subscription_plans(grace_period_days),
        branch:branches(
          name,
          laundry_id,
          laundry:laundries(name, email)
        )
      `)
      .in("status", ["trial", "past_due"]);

    if (error) {
      throw error;
    }

    for (const sub of subscriptions as SubscriptionWithBranch[]) {
      const branch = sub.branch?.[0];
      const laundry = branch?.laundry?.[0];
      const email = laundry?.email;
      if (!email) continue;

      const branchName = branch?.name || "Sucursal";
      const laundryName = laundry?.name || "Lavandería";

      // Check trial ending (7 days, 3 days, 1 day before)
      if (sub.status === "trial" && sub.trial_ends_at) {
        const trialEnd = new Date(sub.trial_ends_at);
        const daysUntilEnd = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if ([7, 3, 1].includes(daysUntilEnd)) {
          const subject = `⏰ Tu período de prueba termina en ${daysUntilEnd} día(s) - ${branchName}`;
          const html = `
            <h2>Hola ${laundryName},</h2>
            <p>El período de prueba de la sucursal <strong>${branchName}</strong> termina en <strong>${daysUntilEnd} día(s)</strong>.</p>
            <p>Para continuar usando LaundryFlow Pro sin interrupciones, activa tu suscripción ahora.</p>
            <p><a href="https://laundyflowpro.lovable.app/settings?tab=subscription" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Activar Suscripción</a></p>
            <p>Gracias por usar LaundryFlow Pro.</p>
          `;

          await createNotification(
            supabase,
            sub.id,
            sub.branch_id,
            `trial_ending_${daysUntilEnd}d`,
            email,
            subject,
            html
          );
          results.trialEnding++;
        }
      }

      // Check past due (grace period warnings)
      if (sub.status === "past_due" && sub.past_due_since) {
        const pastDueDate = new Date(sub.past_due_since);
        const gracePeriodDays = sub.plan?.[0]?.grace_period_days || 5;
        const daysPastDue = Math.floor((now.getTime() - pastDueDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilSuspension = gracePeriodDays - daysPastDue;

        if (daysUntilSuspension > 0 && daysUntilSuspension <= 5) {
          const subject = `⚠️ Pago vencido - ${daysUntilSuspension} día(s) para suspensión - ${branchName}`;
          const html = `
            <h2>Hola ${laundryName},</h2>
            <p>El pago de la suscripción de la sucursal <strong>${branchName}</strong> está vencido.</p>
            <p>Tienes <strong>${daysUntilSuspension} día(s)</strong> para realizar el pago antes de que el servicio sea suspendido.</p>
            <p><a href="https://laundyflowpro.lovable.app/settings?tab=subscription" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Realizar Pago</a></p>
            <p>Si tienes dudas, contáctanos.</p>
          `;

          await createNotification(
            supabase,
            sub.id,
            sub.branch_id,
            `past_due_${daysUntilSuspension}d`,
            email,
            subject,
            html
          );
          results.pastDue++;
        }

        // Auto-suspend if grace period expired
        if (daysUntilSuspension <= 0) {
          await supabase
            .from("branch_subscriptions")
            .update({ 
              status: "suspended", 
              suspended_at: new Date().toISOString() 
            })
            .eq("id", sub.id);

          const subject = `🚫 Suscripción suspendida - ${branchName}`;
          const html = `
            <h2>Hola ${laundryName},</h2>
            <p>La suscripción de la sucursal <strong>${branchName}</strong> ha sido suspendida por falta de pago.</p>
            <p>No podrás crear pedidos ni realizar ventas hasta regularizar el pago.</p>
            <p><a href="https://laundyflowpro.lovable.app/settings?tab=subscription" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reactivar Ahora</a></p>
          `;

          await createNotification(
            supabase,
            sub.id,
            sub.branch_id,
            "suspended",
            email,
            subject,
            html
          );
          results.suspended++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription notifications processed",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error processing subscription notifications:", err);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
