import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Mail, Calendar, History, Play, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BackupSchedule {
  id: string;
  is_enabled: boolean;
  frequency: string;
  day_of_week: number | null;
  time_of_day: string;
  notification_email: string | null;
  last_backup_at: string | null;
  next_backup_at: string | null;
  tables_to_backup: string[];
}

interface BackupHistoryItem {
  id: string;
  backup_date: string;
  status: string;
  tables_backed_up: string[] | null;
  file_size_bytes: number | null;
  error_message: string | null;
  email_sent: boolean;
  email_recipient: string | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

export const BackupScheduleSettings = () => {
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningManualBackup, setRunningManualBackup] = useState(false);

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [timeOfDay, setTimeOfDay] = useState("03:00");
  const [notificationEmail, setNotificationEmail] = useState("");

  useEffect(() => {
    loadScheduleAndHistory();
  }, []);

  const loadScheduleAndHistory = async () => {
    try {
      setLoading(true);
      
      // Load schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("backup_schedules")
        .select("*")
        .limit(1)
        .single();

      if (scheduleError && scheduleError.code !== "PGRST116") {
        console.error("Error loading schedule:", scheduleError);
      }

      if (scheduleData) {
        setSchedule(scheduleData as unknown as BackupSchedule);
        setIsEnabled(scheduleData.is_enabled);
        setFrequency(scheduleData.frequency);
        setDayOfWeek(scheduleData.day_of_week || 1);
        setTimeOfDay(scheduleData.time_of_day?.slice(0, 5) || "03:00");
        setNotificationEmail(scheduleData.notification_email || "");
      }

      // Load history
      const { data: historyData, error: historyError } = await supabase
        .from("backup_history")
        .select("*")
        .order("backup_date", { ascending: false })
        .limit(10);

      if (historyError) {
        console.error("Error loading history:", historyError);
      }

      if (historyData) {
        setHistory(historyData as unknown as BackupHistoryItem[]);
      }
    } catch (error) {
      console.error("Error loading backup settings:", error);
      toast.error("Error al cargar la configuración de backups");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);

      const updateData = {
        is_enabled: isEnabled,
        frequency,
        day_of_week: frequency === "weekly" ? dayOfWeek : null,
        time_of_day: `${timeOfDay}:00`,
        notification_email: notificationEmail || null,
      };

      if (schedule) {
        const { error } = await supabase
          .from("backup_schedules")
          .update(updateData)
          .eq("id", schedule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("backup_schedules")
          .insert(updateData);

        if (error) throw error;
      }

      toast.success("Configuración de backup guardada");
      loadScheduleAndHistory();
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleRunManualBackup = async () => {
    if (!notificationEmail) {
      toast.error("Configura un email de notificación primero");
      return;
    }

    try {
      setRunningManualBackup(true);
      toast.info("Iniciando backup manual...");

      const { data, error } = await supabase.functions.invoke("scheduled-backup", {
        body: {
          manual: true,
          email: notificationEmail,
        },
      });

      if (error) throw error;

      toast.success("Backup manual completado exitosamente");
      loadScheduleAndHistory();
    } catch (error) {
      console.error("Error running manual backup:", error);
      toast.error("Error al ejecutar el backup manual");
    } finally {
      setRunningManualBackup(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completado
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Fallido
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            En progreso
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programación de Backups Automáticos
          </CardTitle>
          <CardDescription>
            Configura la frecuencia y horario para los backups automáticos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="backup-enabled">Activar backups automáticos</Label>
              <p className="text-sm text-muted-foreground">
                Los backups se ejecutarán según la programación configurada
              </p>
            </div>
            <Switch
              id="backup-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Día de la semana</Label>
                <Select 
                  value={dayOfWeek.toString()} 
                  onValueChange={(v) => setDayOfWeek(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time-of-day" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora del backup
              </Label>
              <Input
                id="time-of-day"
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se recomienda programar en horarios de baja actividad
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email de notificación
              </Label>
              <Input
                id="notification-email"
                type="email"
                placeholder="admin@ejemplo.com"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Recibirás un email cuando se complete cada backup
              </p>
            </div>
          </div>

          {/* Last backup info */}
          {schedule?.last_backup_at && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Último backup:</span>{" "}
                {format(new Date(schedule.last_backup_at), "PPpp", { locale: es })}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSaveSchedule} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Configuración
            </Button>
            <Button
              variant="outline"
              onClick={handleRunManualBackup}
              disabled={runningManualBackup || !notificationEmail}
            >
              {runningManualBackup ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Ejecutar Backup Ahora
            </Button>
          </div>

          {!notificationEmail && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              Configura un email para poder ejecutar backups manuales con notificación
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Backups
          </CardTitle>
          <CardDescription>
            Últimos 10 backups realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay backups registrados aún
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Tablas</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {format(new Date(item.backup_date), "Pp", { locale: es })}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{formatFileSize(item.file_size_bytes)}</TableCell>
                    <TableCell>
                      {item.tables_backed_up?.length || 0} tablas
                    </TableCell>
                    <TableCell>
                      {item.email_sent ? (
                        <Badge variant="outline" className="text-green-600">
                          <Mail className="h-3 w-3 mr-1" />
                          Enviado
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
