import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { CreatePermisoRequest, ListarPermisoResponse, Permiso, UpdatePermisoRequest } from '../../models/permisos.models';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SeguridadService {
  constructor(private api: ApiService) { }

  permisos(activo?: boolean | null) {
    const qs = activo === undefined || activo === null ? '' : `?activo=${activo}`;
    return this.api.http.get<ListarPermisoResponse>(`${this.api.baseUrl}/api/seguridad/permisos${qs}`);
  }

  permisoPorId(id: number) {
    return this.api.http.get<Permiso>(`${this.api.baseUrl}/api/seguridad/permisos/${id}`);
  }

  crearPermiso(dto: CreatePermisoRequest) {
    return this.api.http.post<Permiso>(`${this.api.baseUrl}/api/seguridad/permisos`, dto);
  }

  actualizarPermiso(id: number, dto: UpdatePermisoRequest) {
    return this.api.http.put<void>(`${this.api.baseUrl}/api/seguridad/permisos/${id}`, dto);
  }

  eliminarPermiso(id: number) {
    return this.api.http.delete<void>(`${this.api.baseUrl}/api/seguridad/permisos/${id}`);
  }

  roles(activo?: boolean | null) {
    const qs = activo === undefined || activo === null ? '' : `?activo=${activo}`;
    return this.api.http.get<unknown>(`${this.api.baseUrl}/api/seguridad/roles${qs}`).pipe(
      map(response => this.extractList(response, ['roles', 'Roles']))
    );
  }

  guardarRol(dto: any) {
    return dto.idRol
      ? this.api.http.put<any>(`${this.api.baseUrl}/api/seguridad/roles/${dto.idRol}`, dto)
      : this.api.http.post<any>(`${this.api.baseUrl}/api/seguridad/roles`, dto);
  }

  asignarPermisosRol(idRol: number, idPermisos: number[]) {
    // El backend normaliza repetidos; la UI además envía IDs únicos y nunca un arreglo vacío.
    const uniqueIds = Array.from(new Set(idPermisos));
    return this.api.http.post<void>(`${this.api.baseUrl}/api/seguridad/roles/${idRol}/permisos`, {
      idPermisos: uniqueIds
    });
  }

  quitarPermisoRol(idRol: number, idPermiso: number) {
    return this.api.http.delete<void>(`${this.api.baseUrl}/api/seguridad/roles/${idRol}/permisos/${idPermiso}`);
  }
  usuarios(activo?: boolean | null) {
    const qs = activo === undefined || activo === null ? '' : `?activo=${activo}`;
    return this.api.http.get<unknown>(`${this.api.baseUrl}/api/seguridad/usuarios${qs}`).pipe(
      map(response => this.extractList(response, ['usuarios', 'Usuarios']))
    );
  }
  usuario(id: number) { return this.api.http.get<any>(`${this.api.baseUrl}/api/seguridad/usuarios/${id}`); }
  crearUsuario(dto: any) { return this.api.http.post<any>(`${this.api.baseUrl}/api/seguridad/usuarios`, dto); }
  actualizarUsuario(id: number, dto: any) { return this.api.http.put<any>(`${this.api.baseUrl}/api/seguridad/usuarios/${id}`, dto); }
  asignarRol(id: number, idRol: number) {
    return this.api.http.post<any>(`${this.api.baseUrl}/api/seguridad/usuarios/${id}/roles`, { idUsuario: id, idRol });
  }

  private extractList(response: unknown, propertyNames: string[]): any[] {
    if (Array.isArray(response)) return response;
    if (!response || typeof response !== 'object') return [];

    const root = response as Record<string, unknown>;
    if (Array.isArray(root['data'])) return root['data'];
    const containers = [root, root['data']].filter(
      (value): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
    );

    // Se toleran las envolturas usadas por los controladores y `$values` de serialización .NET.
    for (const container of containers) {
      for (const name of [...propertyNames, 'items', 'Items', '$values']) {
        const value = container[name];
        if (Array.isArray(value)) return value;
      }
    }

    return [];
  }
}
