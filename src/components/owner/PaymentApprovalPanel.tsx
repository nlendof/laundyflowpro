import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Building2,
  Loader2,
  FileImage,
  FileText,
  Download,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface PendingPayment {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: string;
  receipt_url: string | null;
  receipt_uploaded_at: string | null;
  notes: string | null;
  created_at: string;
  uploaded_by: string | null;
  // Joined data
  branch_name?: string;
  laundry_name?: string;
  uploader_name?: string;
  uploader_email?: string;
}

export function PaymentApprovalPanel() {
  const { user } = useAuth();
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  
  // Review form state
  const [approvedAmount, setApprovedAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);

      // Fetch pending payments with receipts
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('status', 'pending')
        .not('receipt_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch additional data for each payment
      const paymentsWithDetails: PendingPayment[] = [];
      
      for (const payment of (data || [])) {
        // Get branch info via branch_id
        let branchName = 'Sucursal';
        let laundryName = 'Lavandería';
        let uploaderName = 'Usuario';
        let uploaderEmail = '';

        if (payment.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('name, laundries(name)')
            .eq('id', payment.branch_id)
            .single();
          
          if (branchData) {
            branchName = branchData.name;
            laundryName = (branchData.laundries as any)?.name || 'Lavandería';
          }
        }

        if (payment.uploaded_by) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', payment.uploaded_by)
            .single();
          
          if (profileData) {
            uploaderName = profileData.name || 'Usuario';
            uploaderEmail = profileData.email || '';
          }
        }

        paymentsWithDetails.push({
          ...payment,
          branch_name: branchName,
          laundry_name: laundryName,
          uploader_name: uploaderName,
          uploader_email: uploaderEmail,
        });
      }

      setPendingPayments(paymentsWithDetails);
    } catch (error: any) {
      console.error('Error fetching pending payments:', error);
      toast.error('Error al cargar pagos pendientes');
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setApprovedAmount(payment.amount > 0 ? payment.amount.toString() : '');
    setAdminNotes('');
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedPayment || !user) return;

    const amount = parseFloat(approvedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setApproving(true);

    try {
      // Update payment status to completed
      const { error: paymentError } = await supabase
        .from('subscription_payments')
        .update({
          status: 'completed',
          amount: amount,
          admin_notes: adminNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedPayment.id);

      if (paymentError) throw paymentError;

      // Update subscription status to active
      const { error: subError } = await supabase
        .from('branch_subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
          past_due_since: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPayment.subscription_id);

      if (subError) throw subError;

      toast.success('Pago aprobado correctamente');
      setReviewDialogOpen(false);
      fetchPendingPayments();

    } catch (error: any) {
      console.error('Error approving payment:', error);
      toast.error(`Error al aprobar pago: ${error.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !user) return;

    if (!adminNotes.trim()) {
      toast.error('Por favor indica el motivo del rechazo');
      return;
    }

    setRejecting(true);

    try {
      const { error } = await supabase
        .from('subscription_payments')
        .update({
          status: 'failed',
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast.success('Pago rechazado');
      setReviewDialogOpen(false);
      fetchPendingPayments();

    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error(`Error al rechazar pago: ${error.message}`);
    } finally {
      setRejecting(false);
    }
  };

  const isImageReceipt = (url: string | null) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pagos Pendientes de Aprobación
              </CardTitle>
              <CardDescription>
                Revisa y confirma los comprobantes de pago enviados
              </CardDescription>
            </div>
            {pendingPayments.length > 0 && (
              <Badge variant="destructive" className="text-sm">
                {pendingPayments.length} pendiente{pendingPayments.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No hay pagos pendientes de revisión</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Lavandería / Sucursal</TableHead>
                    <TableHead>Enviado por</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: es })}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), 'HH:mm')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{payment.laundry_name}</p>
                            <p className="text-sm text-muted-foreground">{payment.branch_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.uploader_name || 'Desconocido'}</p>
                          <p className="text-sm text-muted-foreground">{payment.uploader_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.receipt_url ? (
                          <div className="flex items-center gap-2">
                            {isImageReceipt(payment.receipt_url) ? (
                              <FileImage className="h-4 w-4 text-primary" />
                            ) : (
                              <FileText className="h-4 w-4 text-primary" />
                            )}
                            <a
                              href={payment.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm flex items-center gap-1"
                            >
                              Ver <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin comprobante</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => openReviewDialog(payment)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Revisar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Comprobante de Pago</DialogTitle>
            <DialogDescription>
              Verifica el comprobante y confirma o rechaza el pago
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Lavandería</p>
                  <p className="font-medium">{selectedPayment.laundry_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sucursal</p>
                  <p className="font-medium">{selectedPayment.branch_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enviado por</p>
                  <p className="font-medium">{selectedPayment.uploader_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de envío</p>
                  <p className="font-medium">
                    {format(new Date(selectedPayment.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
              </div>

              {/* Receipt Preview */}
              {selectedPayment.receipt_url && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label>Comprobante</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedPayment.receipt_url!, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Descargar
                    </Button>
                  </div>
                  {isImageReceipt(selectedPayment.receipt_url) ? (
                    <img
                      src={selectedPayment.receipt_url}
                      alt="Comprobante de pago"
                      className="max-h-64 mx-auto rounded-lg border"
                    />
                  ) : (
                    <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <span className="ml-2">Documento PDF</span>
                    </div>
                  )}
                </div>
              )}

              {/* User Notes */}
              {selectedPayment.notes && (
                <div>
                  <Label>Notas del usuario</Label>
                  <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-lg">
                    {selectedPayment.notes}
                  </p>
                </div>
              )}

              <Separator />

              {/* Approval Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto confirmado (DOP)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminNotes">Notas del administrador</Label>
                  <Textarea
                    id="adminNotes"
                    placeholder="Notas internas o motivo de rechazo..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={approving || rejecting}
            >
              {rejecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Rechazar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving || rejecting || !approvedAmount}
            >
              {approving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Aprobar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
