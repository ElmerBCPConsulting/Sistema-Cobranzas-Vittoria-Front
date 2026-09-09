import { Session } from './session.models';

const CLAIMS = {
  id: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
} as const;

type JwtPayload = Record<string, unknown>;

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map(item => item.trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function firstValue(payload: JwtPayload, keys: string[]): unknown {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null) return payload[key];
  }
  return undefined;
}

export function decodeJwtPayload(token: string): JwtPayload {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return {};

    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;
  } catch {
    // Un JWT ilegible nunca debe romper el arranque; la API terminará rechazándolo.
    return {};
  }
}

export function sessionFromTokens(
  accessToken: string,
  refreshToken: string,
  expiration: string
): Session {
  // Se aceptan nombres largos de .NET y aliases cortos para desacoplar la UI del decoder JWT.
  const payload = decodeJwtPayload(accessToken);
  const rawId = firstValue(payload, [CLAIMS.id, 'nameid', 'sub']);
  const idUsuario = Number(rawId);

  return {
    accessToken,
    refreshToken,
    expiration,
    ...(Number.isFinite(idUsuario) && idUsuario > 0 ? { idUsuario } : {}),
    usuarioLogin: String(firstValue(payload, [CLAIMS.name, 'unique_name', 'name']) ?? '') || undefined,
    correo: String(firstValue(payload, [CLAIMS.email, 'email']) ?? '') || undefined,
    roles: asArray(firstValue(payload, [CLAIMS.role, 'role', 'roles'])),
    permisos: asArray(firstValue(payload, ['permission', 'permissions']))
  };
}
