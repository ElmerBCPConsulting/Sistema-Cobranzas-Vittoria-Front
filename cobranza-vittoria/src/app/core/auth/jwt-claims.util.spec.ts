import { describe, expect, it } from 'vitest';
import { sessionFromTokens } from './jwt-claims.util';

function tokenFor(payload: Record<string, unknown>): string {
  const encoded = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${encoded}.signature`;
}

describe('sessionFromTokens', () => {
  it('normaliza claims largos y arreglos', () => {
    const token = tokenFor({
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '42',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'residente01',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['Residente', 'Comprador'],
      permission: ['requerimientos.ver', 'requerimientos.crear']
    });

    const session = sessionFromTokens(token, 'refresh', '2099-01-01T00:00:00Z');
    expect(session.idUsuario).toBe(42);
    expect(session.usuarioLogin).toBe('residente01');
    expect(session.roles).toEqual(['Residente', 'Comprador']);
    expect(session.permisos).toEqual(['requerimientos.ver', 'requerimientos.crear']);
  });

  it('convierte claims cortos únicos en arreglos', () => {
    const session = sessionFromTokens(
      tokenFor({ nameid: '7', unique_name: 'almacen01', role: 'Almacenero', permission: 'requerimientos.ver' }),
      'refresh',
      '2099-01-01T00:00:00Z'
    );

    expect(session.roles).toEqual(['Almacenero']);
    expect(session.permisos).toEqual(['requerimientos.ver']);
  });
});
