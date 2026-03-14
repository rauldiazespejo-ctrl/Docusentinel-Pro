/**
 * Configuración del Superusuario Administrador
 * La contraseña se configura via variable de entorno SUPERUSER_PASSWORD
 * o usa el valor por defecto para desarrollo local.
 */
export const SUPERUSER_CONFIG = {
  email: 'rauldiazespejo@gmail.com',
  // En producción: configurar via secret en Cloudflare Pages
  // wrangler pages secret put SUPERUSER_PASSWORD --project-name docusentinel-pro
  get password() {
    // En Workers, process.env no existe - la contraseña viene del env del Worker
    // Este valor se sobreescribe en authenticateSuperuser usando c.env.SUPERUSER_PASSWORD
    return 'DocuSentinel@2024!Admin';
  },
  name: 'Raul Diaz Espejo',
  role: 1,
  isActive: true,
  permissions: {
    canManageUsers: true,
    canManageDocuments: true,
    canManageAudit: true,
    canManageSystem: true,
    canAccessAllDocuments: true
  }
};

export function isSuperuser(email: string): boolean {
  return email === SUPERUSER_CONFIG.email;
}
