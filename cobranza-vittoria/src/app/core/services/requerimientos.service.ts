import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import {
  RequerimientoActionResponse,
  RequerimientoCreadoResponse,
  RequerimientoFilters,
  RequerimientoGetResponse,
  RequerimientoObservacionRequest,
  RequerimientoRequest,
  RequerimientoResumen,
  ValidacionAlmacenRequest
} from '../../models/requerimientos.models';

@Injectable({ providedIn: 'root' })
export class RequerimientosService {
  private readonly endpoint: string;

  constructor(private api: ApiService) {
    this.endpoint = `${this.api.baseUrl}/api/compras/requerimientos`;
  }

  listar(filters: RequerimientoFilters = {}) {
    let params = new HttpParams();
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.idEspecialidad != null) params = params.set('idEspecialidad', filters.idEspecialidad);
    if (filters.idProyecto != null) params = params.set('idProyecto', filters.idProyecto);
    return this.api.http.get<RequerimientoResumen[]>(this.endpoint, { params });
  }

  obtener(id: number) {
    return this.api.http.get<RequerimientoGetResponse>(`${this.endpoint}/${id}`);
  }

  crear(dto: RequerimientoRequest) {
    return this.api.http.post<RequerimientoCreadoResponse>(this.endpoint, dto);
  }

  actualizar(id: number, dto: RequerimientoRequest) {
    return this.api.http.put<RequerimientoActionResponse>(`${this.endpoint}/${id}`, dto);
  }

  enviar(id: number, dto: RequerimientoObservacionRequest) {
    return this.api.http.post<RequerimientoActionResponse>(`${this.endpoint}/${id}/enviar`, dto);
  }

  validarAlmacen(id: number, dto: ValidacionAlmacenRequest) {
    return this.api.http.post<RequerimientoActionResponse>(`${this.endpoint}/${id}/validacion-almacen`, dto);
  }

  aprobar(id: number, dto: RequerimientoObservacionRequest) {
    return this.api.http.post<RequerimientoActionResponse>(`${this.endpoint}/${id}/aprobar`, dto);
  }

  rechazar(id: number, dto: RequerimientoObservacionRequest) {
    return this.api.http.post<RequerimientoActionResponse>(`${this.endpoint}/${id}/rechazar`, dto);
  }

  enviarCompras(id: number, dto: RequerimientoObservacionRequest) {
    return this.api.http.post<RequerimientoActionResponse>(`${this.endpoint}/${id}/enviar-compras`, dto);
  }
}
