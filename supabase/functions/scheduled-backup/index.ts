import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackupRequest {
  manual?: boolean;
  email?: string;
  tables?: string[];
}

const BACKUP_TABLES = [
  { key: "customers", table: "customers" },
  { key: "orders", table: "orders" },
  { key: "order_items", table: "order_items" },
  { key: "inventory", table: "inventory" },
  { key: "catalog_services", table: "catalog_services" },
  { key: "catalog_articles", table: "catalog_articles" },
  { key: "catalog_extras", table: "catalog_extras" },
  { key: "cash_register", table: "cash_register" },
  { key: "profiles", table: "profiles" },
  { key: "system_config", table: "system_config" },
];

const handler = async (req: Request): Promise<Response> => {
  console.log("Scheduled backup function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let requestData: BackupRequest = {};
    
    try {
      requestData = await req.json();
    } catch {
      // No body, that's fine for scheduled calls
    }

    const isManual = requestData.manual || false;
    let notificationEmail = requestData.email;
    let tablesToBackup = requestData.tables;

    // If not manual, get schedule configuration
    if (!isManual) {
      const { data: schedule, error: scheduleError } = await supabase
        .from("backup_schedules")
        .select("*")
        .limit(1)
        .single();

      if (scheduleError || !schedule) {
        console.log("No backup schedule found or error:", scheduleError);
        return new Response(
          JSON.stringify({ message: "No backup schedule configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!schedule.is_enabled) {
        console.log("Backup schedule is disabled");
        return new Response(
          JSON.stringify({ message: "Backup schedule is disabled" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      notificationEmail = schedule.notification_email;
      tablesToBackup = schedule.tables_to_backup;
    }

    console.log("Starting backup process...");
    console.log("Tables to backup:", tablesToBackup);
    console.log("Notification email:", notificationEmail);

    // Create history record
    const { data: historyRecord, error: historyError } = await supabase
      .from("backup_history")
      .insert({
        status: "in_progress",
        email_recipient: notificationEmail,
      })
      .select()
      .single();

    if (historyError) {
      console.error("Error creating history record:", historyError);
      throw historyError;
    }

    // Collect backup data
    const backupData: Record<string, unknown[]> = {};
    const tablesToProcess = tablesToBackup || BACKUP_TABLES.map(t => t.key);
    
    for (const tableKey of tablesToProcess) {
      const tableConfig = BACKUP_TABLES.find(t => t.key === tableKey);
      if (!tableConfig) continue;

      console.log(`Backing up table: ${tableConfig.table}`);
      
      const { data, error } = await supabase
        .from(tableConfig.table)
        .select("*");

      if (error) {
        console.error(`Error fetching ${tableConfig.table}:`, error);
        continue;
      }

      backupData[tableConfig.key] = data || [];
    }

    const backup = {
      version: "1.0",
      createdAt: new Date().toISOString(),
      tables: backupData,
    };

    const backupJson = JSON.stringify(backup, null, 2);
    const fileSizeBytes = new Blob([backupJson]).size;

    console.log(`Backup completed. Size: ${fileSizeBytes} bytes`);

    // Update history record
    await supabase
      .from("backup_history")
      .update({
        status: "completed",
        tables_backed_up: tablesToProcess,
        file_size_bytes: fileSizeBytes,
      })
      .eq("id", historyRecord.id);

    // Update schedule with last backup time
    await supabase
      .from("backup_schedules")
      .update({
        last_backup_at: new Date().toISOString(),
      })
      .limit(1);

    // Send email notification if configured
    let emailSent = false;
    if (notificationEmail) {
      console.log(`Sending notification email to: ${notificationEmail}`);
      
      try {
        const tablesSummary = tablesToProcess
          .map(key => {
            const count = backupData[key]?.length || 0;
            return `<li>${key}: ${count} registros</li>`;
          })
          .join("");

        const emailResponse = await resend.emails.send({
          from: "Lavandería <onboarding@resend.dev>",
          to: [notificationEmail],
          subject: `✅ Backup ${isManual ? "manual" : "automático"} completado - ${new Date().toLocaleDateString("es-MX")}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #10b981;">✅ Backup Completado</h1>
              <p>El backup ${isManual ? "manual" : "automático programado"} se ha completado exitosamente.</p>
              
              <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin-top: 0;">Detalles del Backup</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><strong>Fecha:</strong> ${new Date().toLocaleString("es-MX")}</li>
                  <li><strong>Tamaño:</strong> ${(fileSizeBytes / 1024).toFixed(2)} KB</li>
                  <li><strong>Tipo:</strong> ${isManual ? "Manual" : "Automático"}</li>
                </ul>
              </div>
              
              <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin-top: 0;">Tablas respaldadas</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  ${tablesSummary}
                </ul>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                Para restaurar este backup, accede a Configuración → Backup en tu sistema.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                Este es un mensaje automático del sistema de backups.
              </p>
            </div>
          `,
        });

        console.log("Email sent successfully:", emailResponse);
        emailSent = true;

        // Update email sent status
        await supabase
          .from("backup_history")
          .update({ email_sent: true })
          .eq("id", historyRecord.id);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Backup completed successfully",
        backupId: historyRecord.id,
        fileSizeBytes,
        tablesBackedUp: tablesToProcess,
        emailSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Backup error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
