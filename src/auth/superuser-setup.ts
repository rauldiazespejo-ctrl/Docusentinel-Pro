import { SUPERUSER_CONFIG, isSuperuser } from '../config/superuser';

// Función para inicializar el superusuario en el sistema
export async function initializeSuperuser() {
  try {
    // Aquí iría la lógica para crear el usuario en la base de datos
    // Por ahora, el superusuario está definido en la configuración
    console.log('🎯 Superusuario configurado:', SUPERUSER_CONFIG.email);
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar superusuario:', error);
    return false;
  }
}

// Función para autenticar al superusuario
export function authenticateSuperuser(email: string, password: string): boolean {
  return email === SUPERUSER_CONFIG.email && password === SUPERUSER_CONFIG.password;
}
