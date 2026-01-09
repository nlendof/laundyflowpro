import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Button asChild variant="ghost" className="mb-8">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>

        <h1 className="text-4xl font-bold mb-8">Términos y Condiciones</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar este sistema de gestión de lavandería ("el Sistema"), usted acepta estar sujeto a estos términos y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar el Sistema.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Descripción del Servicio</h2>
            <p>
              El Sistema proporciona herramientas para la gestión de operaciones de lavandería, incluyendo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Gestión de pedidos y clientes</li>
              <li>Control de inventario</li>
              <li>Registro de caja y finanzas</li>
              <li>Gestión de empleados y nómina</li>
              <li>Reportes y estadísticas</li>
              <li>Servicios de entrega</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Cuentas de Usuario</h2>
            <p>
              Para utilizar el Sistema, debe crear una cuenta proporcionando información precisa y completa. Usted es responsable de:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mantener la confidencialidad de sus credenciales de acceso</li>
              <li>Todas las actividades realizadas bajo su cuenta</li>
              <li>Notificar inmediatamente cualquier uso no autorizado de su cuenta</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Uso Aceptable</h2>
            <p>
              Usted acepta no utilizar el Sistema para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cualquier propósito ilegal o no autorizado</li>
              <li>Transmitir virus o código malicioso</li>
              <li>Intentar acceder a sistemas o datos sin autorización</li>
              <li>Interferir con el funcionamiento del Sistema</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Propiedad Intelectual</h2>
            <p>
              Todo el contenido del Sistema, incluyendo pero no limitado a texto, gráficos, logos, iconos y software, es propiedad del operador del Sistema y está protegido por las leyes de propiedad intelectual.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Limitación de Responsabilidad</h2>
            <p>
              El Sistema se proporciona "tal cual" sin garantías de ningún tipo. No seremos responsables por:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pérdida de datos o información</li>
              <li>Interrupciones del servicio</li>
              <li>Daños indirectos o consecuentes</li>
              <li>Errores u omisiones en el contenido</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación. El uso continuado del Sistema constituye la aceptación de los términos modificados.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Contacto</h2>
            <p>
              Si tiene preguntas sobre estos términos, puede contactarnos a través de los canales de soporte disponibles en el Sistema.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
