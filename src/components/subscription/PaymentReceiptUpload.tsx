import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileImage,
  FileText,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Building2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useLaundryContext } from '@/contexts/LaundryContext';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

interface PaymentReceiptUploadProps {
  onSuccess?: () => void;
}

export function PaymentReceiptUpload({ onSuccess }: PaymentReceiptUploadProps) {
  const { user } = useAuth();
  const { subscription, refetch } = useSubscription();
  const { branches, selectedBranchId, effectiveLaundryId } = useLaundryContext();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentBranch = branches.find(b => b.id === selectedBranchId);

  const ACCEPTED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
  ];

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      toast.error('Tipo de archivo no permitido. Use imagen o PDF.');
      return;
    }

    // Validate file size
    if (selected.size > MAX_FILE_SIZE) {
      toast.error('El archivo es muy grande. Máximo 10MB.');
      return;
    }

    setFile(selected);

    // Create preview for images
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file || !subscription || !user) {
      toast.error('Falta información requerida');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${subscription.branch_id}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;

      setUploadProgress(20);

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(fileName);

      const receiptUrl = urlData.publicUrl;

      // Create payment record with receipt
      const paymentRecord = {
        branch_id: subscription.branch_id,
        amount: 0, // Will be set by owner when approving
        currency: 'DOP',
        payment_method: 'bank_transfer' as const,
        status: 'pending',
        receipt_url: receiptUrl,
        receipt_uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
        notes: notes || null,
      };

      const { data: paymentData, error: paymentError } = await supabase
        .from('subscription_payments')
        .insert(paymentRecord as any)
        .select()
        .single();

      if (paymentError) throw paymentError;

      setUploadProgress(100);
      
      toast.success('Comprobante enviado correctamente. El propietario lo revisará pronto.');
      
      // Clear form
      clearFile();
      setNotes('');
      
      // Refresh data
      refetch();
      onSuccess?.();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Error al subir comprobante: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="h-8 w-8 text-muted-foreground" />;
    if (file.type.startsWith('image/')) return <FileImage className="h-8 w-8 text-primary" />;
    return <FileText className="h-8 w-8 text-primary" />;
  };

  const needsReceipt = subscription?.status === 'trial' || 
                       subscription?.status === 'past_due' ||
                       subscription?.status === 'suspended';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir Comprobante de Pago
            </CardTitle>
            <CardDescription>
              Sube tu comprobante de transferencia para confirmar el pago
            </CardDescription>
          </div>
          {needsReceipt && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Esperando comprobante
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Branch Info */}
        {currentBranch && (
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertTitle>Pago para: {currentBranch.name}</AlertTitle>
            <AlertDescription>
              El comprobante será asociado a esta sucursal.
            </AlertDescription>
          </Alert>
        )}

        {/* File Upload Area */}
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
            ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
          `}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

          {preview ? (
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 rounded-lg mx-auto"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center gap-2">
              {getFileIcon()}
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Quitar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Click o arrastra tu comprobante aquí</p>
              <p className="text-sm text-muted-foreground">
                Formatos: JPG, PNG, PDF (máx. 10MB)
              </p>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium">Subiendo comprobante...</p>
              <Progress value={uploadProgress} className="w-48 mt-2" />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notas adicionales (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Ej: Transferencia desde Banco Popular, referencia #123456"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Instructions */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Importante</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              <li>Asegúrate de que el comprobante sea legible</li>
              <li>Incluye la fecha y monto de la transferencia</li>
              <li>El propietario revisará y confirmará tu pago en 24-48 horas</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Submit Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Enviar Comprobante
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
