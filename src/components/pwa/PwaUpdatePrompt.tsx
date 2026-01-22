import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

/**
 * Evita que usuarios queden “pegados” a una versión anterior:
 * - Detecta nueva versión del Service Worker
 * - Ofrece recargar para tomar el build más reciente
 */
export function PwaUpdatePrompt() {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<null | ((reloadPage?: boolean) => Promise<void> | void)>(null);

  useEffect(() => {
    // registerSW devuelve una función para disparar el update.
    updateSWRef.current = registerSW({
      immediate: true,
      onOfflineReady() {
        setOfflineReady(true);
      },
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisterError(error) {
        console.error("[PWA] Error registrando Service Worker:", error);
      },
    });
  }, []);

  useEffect(() => {
    if (offlineReady) {
      toast.message("Listo para uso offline", {
        description: "La app quedó almacenada localmente.",
      });
      setOfflineReady(false);
    }
  }, [offlineReady]);

  const open = needRefresh;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Nueva versión disponible</AlertDialogTitle>
          <AlertDialogDescription>
            Para evitar ver un menú incompleto o módulos faltantes, actualiza para cargar la versión más reciente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setNeedRefresh(false)}>Más tarde</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              // true => recarga la página una vez activado el nuevo SW
              void updateSWRef.current?.(true);
            }}
          >
            Actualizar ahora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
