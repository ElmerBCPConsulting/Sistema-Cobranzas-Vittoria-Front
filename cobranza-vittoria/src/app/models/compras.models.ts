
export interface Requerimiento {
  idRequerimiento: number;
  numeroRequerimiento: string;
  fechaRequerimiento: string;
  especialidad?: string | null;
  nombreProyecto?: string | null;
  descripcion?: string | null;
  fechaEntrega?: string | null;
  solicitante?: string | null;
  estado: string;
  observacion?: string | null;
}

export interface RequerimientoCreate {
  numeroRequerimiento: string;
  fechaRequerimiento: string;
  idEspecialidad: number;
  idProyecto: number;
  descripcion?: string | null;
  fechaEntrega?: string | null;
  // El backend deriva al solicitante desde el JWT; nunca debe enviarlo el formulario.
  observacion?: string | null;
  items: RequerimientoItemCreate[];
}

export interface RequerimientoItemCreate {
  idMaterial: number;
  cantidad: number;
  observacion?: string | null;
}

export interface OrdenCompra {
  idOrdenCompra: number;
  numeroOrdenCompra: string;
  numeroRequerimiento?: string | null;
  proveedor?: string | null;
  nombreProyecto?: string | null;
  fechaOrdenCompra: string;
  estado: string;
  total: number;
}

export interface Compra {
  idCompra: number;
  numeroCompra: string;
  numeroOrdenCompra?: string | null;
  proveedor?: string | null;
  fechaCompra: string;
  aceptada: boolean;
  montoTotal: number;
}
