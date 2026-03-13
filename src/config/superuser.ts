// Configuración del Superusuario Administrador
export const SUPERUSER_CONFIG = {
  email: 'rauliazespejo@gmail.com',
  password: '123456',
  name: 'Raul Azespejo',
  role: 'admin',
  isActive: true,
  createdAt: new Date().toISOString(),
  permissions: {
    canManageUsers: true,
    canManageDocuments: true,
    canManageAudit: true,
    canManageSystem: true,
    canAccessAllDocuments: true
  }
};

// Función para verificar si es el superusuario
export function isSuperuser(email: string): boolean {
  return email === SUPERUSER_CONFIG.email;
}

// Función para obtener credenciales del superusuario
export function getSuperuserCredentials() {
  return {
    email: SUPERUSER_CONFIG.email,
    password: SUPERUSER_CONFIG.password,
    name: SUPERUSER_CONFIG.name
  };
}
