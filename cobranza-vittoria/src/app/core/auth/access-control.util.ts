import { AccessRule, Session } from './session.models';

export const ACCESS_RULES = {
  // El contrato solo garantiza autorización fina en Requerimientos en esta iteración.
  requerimientos: { anyPermission: ['requerimientos.ver'] },
  // Control de Acceso usa el rol Administrador como fachada temporal, no como garantía del backend.
  controlAccesos: { anyRole: ['Administrador'] }
} satisfies Record<string, AccessRule>;

export function canAccess(session: Session | null, rule?: AccessRule): boolean {
  if (!session) return false;
  if (!rule) return true;

  // Si una regla declara roles y permisos, basta cumplir cualquiera de los dos grupos.
  const roleMatch = rule.anyRole?.some(role => session.roles.includes(role)) ?? false;
  const permissionMatch = rule.anyPermission?.some(permission => session.permisos.includes(permission)) ?? false;
  return roleMatch || permissionMatch;
}
