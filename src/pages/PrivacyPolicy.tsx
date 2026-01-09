import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Button asChild variant="ghost" className="mb-8">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>

        <h1 className="text-4xl font-bold mb-8">Política de Privacidad</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Información que Recopilamos</h2>
            <p>
              Recopilamos información que usted nos proporciona directamente al usar nuestro sistema:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Información de cuenta:</strong> Nombre, correo electrónico, número de teléfono</li>
              <li><strong>Datos de clientes:</strong> Información de contacto y direcciones de entrega</li>
              <li><strong>Información de pedidos:</strong> Detalles de servicios, pagos y entregas</li>
              <li><strong>Datos de empleados:</strong> Información laboral, horarios y nómina</li>
              <li><strong>Registros de uso:</strong> Acciones realizadas en el sistema para auditoría</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Cómo Utilizamos su Información</h2>
            <p>
              Utilizamos la información recopilada para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar y mantener nuestros servicios</li>
              <li>Procesar pedidos y pagos</li>
              <li>Gestionar entregas y rutas</li>
              <li>Comunicarnos con usted sobre su cuenta</li>
              <li>Generar reportes y estadísticas de negocio</li>
              <li>Mantener la seguridad del sistema</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Almacenamiento y Seguridad</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger su información:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encriptación de datos en tránsito y en reposo</li>
              <li>Control de acceso basado en roles</li>
              <li>Autenticación segura</li>
              <li>Copias de seguridad regulares</li>
              <li>Registro de auditoría de acciones</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Compartir Información</h2>
            <p>
              No vendemos ni alquilamos su información personal. Podemos compartir información con:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proveedores de servicios que nos ayudan a operar el sistema</li>
              <li>Autoridades legales cuando sea requerido por ley</li>
              <li>Otros usuarios autorizados dentro de su organización</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Retención de Datos</h2>
            <p>
              Conservamos su información mientras su cuenta esté activa o según sea necesario para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar servicios</li>
              <li>Cumplir con obligaciones legales y fiscales</li>
              <li>Resolver disputas</li>
              <li>Hacer cumplir nuestros acuerdos</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Sus Derechos</h2>
            <p>
              Usted tiene derecho a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acceder a su información personal</li>
              <li>Corregir datos inexactos</li>
              <li>Solicitar la eliminación de sus datos</li>
              <li>Oponerse al procesamiento de sus datos</li>
              <li>Solicitar la portabilidad de sus datos</li>
            </ul>
            <p>
              Para ejercer estos derechos, contacte al administrador del sistema.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Cookies y Tecnologías Similares</h2>
            <p>
              Utilizamos cookies y tecnologías similares para mantener su sesión activa y recordar sus preferencias. Estas son esenciales para el funcionamiento del sistema.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Cambios a esta Política</h2>
            <p>
              Podemos actualizar esta política de privacidad periódicamente. Le notificaremos sobre cambios significativos publicando la nueva política en el sistema.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Contacto</h2>
            <p>
              Si tiene preguntas sobre esta política de privacidad o sobre cómo manejamos su información, puede contactar al administrador del sistema a través de los canales de soporte disponibles.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
