import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SeguridadService } from '../../core/services/seguridad.service';
import { NotificationService } from '../../core/services/notification.service';
import { UsuarioCreateRequest, UsuarioUpdateRequest } from '../../models/usuarios.models';
import { extraerMensajeError } from '../../core/utils/api-error.util';

type UsuarioForm = UsuarioCreateRequest & { idUsuario?: number; activo: boolean };

@Component({ standalone: true, selector: 'app-usuarios-page', imports: [CommonModule, FormsModule], templateUrl: './usuarios.page.html', styleUrl: './usuarios.page.css' })
export class UsuariosPage implements OnInit {
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
  roles: any[] = []; detalle: any = null; filtroActivo: boolean | null = null; roleId: number | null = null; msg = '';
  form: UsuarioForm = this.createEmptyForm();
  constructor(private seguridad: SeguridadService, private notifyService: NotificationService, private cdr: ChangeDetectorRef) { }
  ngOnInit() { this.seguridad.roles().subscribe(x => { this.roles = x; this.cdr.detectChanges(); }); this.load(); }
  load() { this.seguridad.usuarios(this.filtroActivo).subscribe(x => { this.rows = x; this.cdr.detectChanges(); }); }
  getRolId(rol: any): number | null {
    const id = Number(rol?.idRol ?? rol?.IdRol ?? 0);
    return id > 0 ? id : null;
  }
  getRolNombre(rol: any): string {
    // Los listados históricos usan `nombre`; los contratos recientes, `nombreRol`.
    return String(rol?.nombreRol ?? rol?.NombreRol ?? rol?.nombre ?? rol?.Nombre ?? '').trim() || 'Rol sin nombre';
  }
  select(row: any) {
    this.modalOpen = true;
    this.seguridad.usuario(row.idUsuario).subscribe(res => {
      const usuario = res?.usuario ?? res?.Usuario ?? res;
      this.detalle = res;
      // Nunca se reutiliza ni se muestra un hash en el formulario de edición.
      this.form = {
        idUsuario: Number(usuario?.idUsuario ?? usuario?.IdUsuario ?? row.idUsuario),
        nombres: String(usuario?.nombres ?? usuario?.Nombres ?? ''),
        apellidos: String(usuario?.apellidos ?? usuario?.Apellidos ?? ''),
        correo: String(usuario?.correo ?? usuario?.Correo ?? ''),
        usuarioLogin: String(usuario?.usuarioLogin ?? usuario?.UsuarioLogin ?? ''),
        password: '',
        activo: usuario?.activo ?? usuario?.Activo ?? true
      };
      this.cdr.detectChanges();
    });
  }

  reset() { this.detalle = null; this.form = this.createEmptyForm(); }

  save() {
    const createPayload: UsuarioCreateRequest = {
      nombres: this.form.nombres.trim(),
      apellidos: this.form.apellidos.trim(),
      correo: this.form.correo.trim(),
      usuarioLogin: this.form.usuarioLogin.trim(),
      password: this.form.password
    };
    const updatePayload: UsuarioUpdateRequest = {
      nombres: createPayload.nombres,
      apellidos: createPayload.apellidos,
      correo: createPayload.correo,
      usuarioLogin: createPayload.usuarioLogin,
      activo: this.form.activo,
      ...(createPayload.password ? { password: createPayload.password } : {})
    };

    const req = this.form.idUsuario
      ? this.seguridad.actualizarUsuario(this.form.idUsuario, updatePayload)
      : this.seguridad.crearUsuario(createPayload);
    req.subscribe({
      next: () => {
        this.msg = 'Usuario guardado correctamente.';
        this.notifyService.show(this.msg, 'success');
        this.reset();
        this.cerrarModal();
        this.load();
        this.cdr.detectChanges();
      },
      error: error => {
        this.msg = extraerMensajeError(error, 'No se pudo guardar el usuario.');
        this.notifyService.show(this.msg, 'error');
        this.cdr.detectChanges();
      }
    });
  }
  asignarRol() {
    if (!this.form.idUsuario || !this.roleId) return;
    // La API exige el arreglo idRoles aunque se asigne un único rol desde esta pantalla.
    this.seguridad.asignarRoles(this.form.idUsuario, [this.roleId]).subscribe({
      next: () => {
        this.msg = 'Rol asignado correctamente.';
        this.notifyService.show(this.msg, 'success');
        this.select({ idUsuario: this.form.idUsuario });
        this.cdr.detectChanges();
      },
      error: error => {
        this.msg = extraerMensajeError(error, 'No se pudo asignar el rol.');
        this.notifyService.show(this.msg, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  private createEmptyForm(): UsuarioForm {
    return { nombres: '', apellidos: '', correo: '', usuarioLogin: '', password: '', activo: true };
  }
}
