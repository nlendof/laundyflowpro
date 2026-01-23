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
  const attemptedAutoUpdateRef = useRef(false);

  useEffect(() => {
    // registerSW devuelve una función para disparar el update.
    updateSWRef.current = registerSW({
      immediate: true,
      onOfflineReady() {
        setOfflineReady(true);
      },
      onNeedRefresh() {
        setNeedRefresh(true);

        // Máxima consistencia: si detectamos una versión nueva, forzamos el update y recargamos.
        // Esto evita que el usuario “entre” y vea una versión anterior.
        if (!attemptedAutoUpdateRef.current) {
          attemptedAutoUpdateRef.current = true;
          toast.message("Actualizando a la última versión…", {
            description: "Recargaremos automáticamente para aplicar el build más reciente.",
          });
          window.setTimeout(() => {
            void updateSWRef.current?.(true);
          }, 300);
        }
      },
      onRegisterError(error) {
        console.error("[PWA] Error registrando Service Worker:", error);
      },
    });
  }, []);

  // Cuando el usuario vuelve a la pestaña (después de un rato), revisamos updates.
  useEffect(() => {
    const checkForUpdates = () => {
      if (document.visibilityState === "visible") {
        void updateSWRef.current?.();
      }
    };

    document.addEventListener("visibilitychange", checkForUpdates);
    window.addEventListener("focus", checkForUpdates);

    return () => {
      document.removeEventListener("visibilitychange", checkForUpdates);
      window.removeEventListener("focus", checkForUpdates);
    };
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
