import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeguridadService } from '../../core/services/seguridad.service';
import { NotificationService } from '../../core/services/notification.service';
import { Permiso } from '../../models/permisos.models';
import { extraerMensajeError } from '../../core/utils/api-error.util';

@Component({
  standalone: true,
  selector: 'app-roles-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.page.html',
  styleUrl: './roles.page.css'
})
export class RolesPage implements OnInit {
  modalOpen = false;

  abrirModalNuevo(): void {
    this.reset();
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.modalOpen = false;
    this.cdr.detectChanges();
  }

  rows: any[] = [];
  permisos: Permiso[] = [];
  permisosAsignados: Permiso[] = [];
  idsPermisosSeleccionados: number[] = [];
  guardandoPermisos = false;
  filtroBusqueda = '';

  private normalizarBusqueda(valor: any): string {
    return (valor ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  get rowsFiltradas(): any[] {
    const termino = this.normalizarBusqueda(this.filtroBusqueda);
    if (!termino) return this.rows ?? [];

    return (this.rows ?? []).filter(row =>
      this.normalizarBusqueda(Object.values(row ?? {}).join(' ')).includes(termino)
    );
  }

  filtroActivo: boolean | null = null;
  msg = '';
  form: any = { idRol: null, nombreRol: '', descripcion: '', activo: true };

  constructor(
    private seguridad: SeguridadService,
    private notifyService: NotificationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.load();
    this.loadPermisos();
  }

  loadPermisos(): void {
    this.seguridad.permisos(true).subscribe({
      next: response => {
        this.permisos = response.permisos ?? [];
        this.cdr.detectChanges();
      },
      error: error => this.notifyService.show(extraerMensajeError(error, 'No se pudieron cargar los permisos.'), 'error')
    });
  }

  load() {
    this.seguridad.roles(this.filtroActivo).subscribe(x => {
      this.rows = x || [];
      this.cdr.detectChanges();
    });
  }

  edit(row: any) {
    this.modalOpen = true;
    this.form = {
      idRol: row.idRol ?? null,
      nombreRol: row.nombreRol ?? row.nombre ?? '',
      descripcion: row.descripcion ?? '',
      activo: row.activo ?? true
    };
    // La lista de roles puede incluir permisos; si no los incluye, la UI parte vacía y
    // conserva localmente las asignaciones realizadas durante esta edición.
    const asignados = Array.isArray(row.permisos)
      ? row.permisos
      : Array.isArray(row.Permisos) ? row.Permisos : [];
    const ids = asignados
      .map((permiso: any) => Number(permiso?.idPermiso ?? permiso?.IdPermiso ?? permiso))
      .filter((id: number) => id > 0);
    this.permisosAsignados = this.permisos.filter(permiso => ids.includes(permiso.idPermiso));
    this.idsPermisosSeleccionados = [...ids];
  }

  reset() {
    this.form = { idRol: null, nombreRol: '', descripcion: '', activo: true };
    this.msg = '';
    this.permisosAsignados = [];
    this.idsPermisosSeleccionados = [];
  }

  save() {
    const payload = {
      idRol: this.form.idRol ? Number(this.form.idRol) : null,
      nombreRol: (this.form.nombreRol ?? '').toString().trim(),
      descripcion: (this.form.descripcion ?? '').toString().trim(),
      activo: !!this.form.activo
    };

    if (!payload.nombreRol) {
      this.msg = 'Debes ingresar el nombre del rol.';
      this.notifyService.show(this.msg, 'error');
      return;
    }

    this.seguridad.guardarRol(payload).subscribe({
      next: () => {
        this.msg = payload.idRol ? 'Rol actualizado correctamente.' : 'Rol guardado correctamente.';
        this.notifyService.show(this.msg, 'success');
        this.reset();
        this.cerrarModal();
        this.load();
        this.cdr.detectChanges();
      },
      error: e => {
        this.msg = e?.error?.message || 'No se pudo guardar el rol.';
        this.notifyService.show(this.msg, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  permisoSeleccionado(idPermiso: number): boolean {
    return this.idsPermisosSeleccionados.includes(idPermiso);
  }

  togglePermiso(idPermiso: number, selected: boolean): void {
    this.idsPermisosSeleccionados = selected
      ? Array.from(new Set([...this.idsPermisosSeleccionados, idPermiso]))
      : this.idsPermisosSeleccionados.filter(id => id !== idPermiso);
  }

  asignarPermisos(): void {
    const idRol = Number(this.form.idRol);
    if (!idRol || !this.idsPermisosSeleccionados.length || this.guardandoPermisos) {
      this.notifyService.show('Selecciona al menos un permiso.', 'info');
      return;
    }

    this.guardandoPermisos = true;
    this.seguridad.asignarPermisosRol(idRol, this.idsPermisosSeleccionados).subscribe({
      next: () => {
        this.guardandoPermisos = false;
        this.permisosAsignados = this.permisos.filter(permiso =>
          this.idsPermisosSeleccionados.includes(permiso.idPermiso)
        );
        this.notifyService.show('Permisos asignados. Vuelve a iniciar sesión para actualizar los claims.', 'success', 5000);
        this.cdr.detectChanges();
      },
      error: error => {
        this.guardandoPermisos = false;
        this.notifyService.show(extraerMensajeError(error, 'No se pudieron asignar los permisos.'), 'error');
        this.cdr.detectChanges();
      }
    });
  }

  quitarPermiso(permiso: Permiso): void {
    const idRol = Number(this.form.idRol);
    if (!idRol || !permiso.idPermiso) return;

    this.seguridad.quitarPermisoRol(idRol, permiso.idPermiso).subscribe({
      next: () => {
        this.permisosAsignados = this.permisosAsignados.filter(item => item.idPermiso !== permiso.idPermiso);
        this.idsPermisosSeleccionados = this.idsPermisosSeleccionados.filter(id => id !== permiso.idPermiso);
        this.notifyService.show('Permiso retirado. Vuelve a iniciar sesión para actualizar los claims.', 'success', 5000);
        this.cdr.detectChanges();
      },
      error: error => this.notifyService.show(extraerMensajeError(error, 'No se pudo retirar el permiso.'), 'error')
    });
  }
}
