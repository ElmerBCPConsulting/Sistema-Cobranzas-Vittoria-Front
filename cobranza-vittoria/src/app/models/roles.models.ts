export interface PermisoAsignadoResponse {
  idPermiso: number;
  codigo: string;
  nombre: string;
}

export interface RolConPermisosResponse {
  idRol: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  permisos: PermisoAsignadoResponse[];
}

export interface AsignarPermisosRolRequest {
  idPermisos: number[];
}
