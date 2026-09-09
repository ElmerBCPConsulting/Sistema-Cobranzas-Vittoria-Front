/** Contrato de creación de usuarios de la API de seguridad. */
export interface UsuarioCreateRequest {
  nombres: string;
  apellidos: string;
  correo: string;
  usuarioLogin: string;
  password: string;
}

export interface UsuarioUpdateRequest {
  nombres: string;
  apellidos: string;
  correo: string;
  usuarioLogin: string;
  activo: boolean;
  // Al editar, una contraseña vacía no se incluye y por tanto no se modifica.
  password?: string;
}

export interface AsignarRolesRequest {
  idRoles: number[];
}
