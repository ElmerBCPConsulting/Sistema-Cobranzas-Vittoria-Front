export type EstadoRequerimiento =
  | 'Registrado'
  | 'EnviadoAlmacen'
  | 'ValidadoAlmacen'
  | 'AprobadoCoordinador'
  | 'Rechazado'
  | 'EnviadoOC'
  | 'GeneradoOC'
  | 'Anulado';

export type ResultadoValidacionAlmacen = 'Conforme' | 'Observado';

export interface RequerimientoFilters {
  estado?: EstadoRequerimiento | '';
  idEspecialidad?: number | null;
  idProyecto?: number | null;
}

export interface RequerimientoItemRequest {
  idMaterial: number;
  cantidad: number;
  observacion?: string | null;
}

export interface RequerimientoRequest {
  numeroRequerimiento: string;
  fechaRequerimiento: string;
  idEspecialidad: number;
  idProyecto: number;
  descripcion: string;
  fechaEntrega: string;
  observacion?: string | null;
  items: RequerimientoItemRequest[];
}

export interface RequerimientoResumen {
  idRequerimiento: number;
  numeroRequerimiento: string;
  fechaRequerimiento: string;
  especialidades?: string | null;
  idProyecto: number;
  nombreProyecto?: string | null;
  solicitante?: string | null;
  estado: EstadoRequerimiento;
}

export interface Requerimiento extends RequerimientoResumen {
  idEspecialidad: number;
  especialidad?: string | null;
  descripcion?: string | null;
  fechaEntrega: string;
  observacion?: string | null;
  idUsuarioSolicitante?: number;
}

export interface RequerimientoDetalleItem {
  idRequerimientoDetalle?: number;
  idMaterial: number;
  idEspecialidad?: number;
  especialidad?: string | null;
  material: string;
  unidadMedida?: string | null;
  unidad?: string | null;
  cantidad: number;
  observacion?: string | null;
}

export interface ValidacionRequerimiento {
  resultado?: ResultadoValidacionAlmacen | string;
  observacion?: string | null;
  fecha?: string;
  usuario?: string;
}

export interface RequerimientoGetResponse {
  requerimiento: Requerimiento;
  items: RequerimientoDetalleItem[];
  validaciones: ValidacionRequerimiento[];
  puedeEditar: boolean;
}

export interface RequerimientoCreadoResponse {
  idRequerimiento: number;
}

export interface RequerimientoActionResponse {
  ok: true;
}

export interface RequerimientoObservacionRequest {
  observacion: string | null;
}

export interface ValidacionAlmacenRequest extends RequerimientoObservacionRequest {
  resultado: ResultadoValidacionAlmacen;
}
