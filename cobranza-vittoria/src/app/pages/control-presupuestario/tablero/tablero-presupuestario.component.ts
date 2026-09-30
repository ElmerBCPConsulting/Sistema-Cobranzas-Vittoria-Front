import { ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlPresupuestarioService } from '../../../core/services/control-presupuestario.service';

/** Segmento de la dona: los 5 rubros con más gasto y el resto agrupado en "Otros". */
interface Segmento {
  nombre: string;
  monto: number;
  porcentaje: number;
  color: string;
  path: string;
}

interface Punto { x: number; y: number; }

/**
 * Dashboard presupuestario de un centro de costo.
 *
 * 1. Distribución del gasto por rubro: dona (5 rubros + "Otros", el máximo que
 *    se lee de un vistazo) y tabla con todos los rubros, que además es la vista
 *    accesible y el alivio de contraste de los colores claros.
 * 2. Evolución semanal del gasto real acumulado frente al presupuesto acumulado
 *    (un solo eje, misma unidad), con crosshair y tabla de datos.
 *
 * Colores: categórica validada con el script de la guía de visualización
 * (adyacentes CVD ΔE ≥ 9.1, visión normal ≥ 19.6). El texto nunca usa el color
 * de la serie; la identidad la lleva la marca de color al lado.
 */
@Component({
  standalone: true,
  selector: 'app-tablero-presupuestario',
  imports: [CommonModule],
  templateUrl: './tablero-presupuestario.component.html',
  styleUrl: './tablero-presupuestario.component.css'
})
export class TableroPresupuestarioComponent implements OnChanges {
  @Input({ required: true }) idCentroCosto!: number;
  @Input() idPresupuesto: number | null = null;

  /** Orden fijo de la paleta categórica; "Otros" siempre en gris neutro. */
  static readonly COLORES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
  static readonly COLOR_OTROS = '#a9a79f';
  static readonly MAX_SEGMENTOS = 5;

  datos: any = null;
  cargando = false;
  error = '';

  segmentos: Segmento[] = [];
  segmentoActivo: Segmento | null = null;
  verTablaSemanal = false;

  // Geometría del gráfico de líneas (en unidades del viewBox).
  readonly ancho = 720;
  readonly alto = 300;
  readonly margen = { arriba: 16, derecha: 16, abajo: 36, izquierda: 64 };
  rutaReal = '';
  rutaPlan = '';
  areaEntreCurvas = '';
  areaSobrePlan = '';
  ticksY: { valor: number; y: number }[] = [];
  ticksX: { semana: number; x: number }[] = [];
  puntoFinReal: Punto | null = null;
  /** Hay al menos una semana con el gasto real por encima del presupuesto acumulado. */
  hayExceso = false;
  hover: { x: number; punto: any; izquierda: boolean } | null = null;
  private puntosX: { x: number; punto: any }[] = [];

  private readonly compacto = new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 });

  constructor(private cp: ControlPresupuestarioService, private cdr: ChangeDetectorRef) { }

  ngOnChanges(): void {
    if (!this.idCentroCosto) return;
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.cp.dashboard(this.idCentroCosto, this.idPresupuesto).subscribe({
      next: datos => {
        this.datos = datos;
        this.cargando = false;
        this.construirDona();
        this.construirLineas();
        this.cdr.detectChanges();
      },
      error: err => {
        // Se conserva el render anterior (atenuado) y se informa el motivo.
        this.cargando = false;
        this.error = err?.error?.message || 'No se pudo cargar el dashboard.';
        this.cdr.detectChanges();
      }
    });
  }

  get simbolo(): string {
    return this.datos?.encabezado?.simboloMoneda || this.datos?.encabezado?.codigoMoneda || '';
  }

  /** Rubros con gasto, en el orden de la dona; los que van en "Otros" llevan su color gris. */
  get rubrosConGasto(): any[] {
    return (this.datos?.rubros ?? []).filter((r: any) => Number(r.ejecutado) !== 0);
  }

  colorRubro(indice: number): string {
    return indice < TableroPresupuestarioComponent.MAX_SEGMENTOS
      ? TableroPresupuestarioComponent.COLORES[indice]
      : TableroPresupuestarioComponent.COLOR_OTROS;
  }

  formatoCompacto(valor: number): string {
    return this.compacto.format(valor);
  }

  // ------------------------------------------------------------------ dona

  private construirDona(): void {
    const rubros = this.rubrosConGasto;
    const total = rubros.reduce((acc, r) => acc + Number(r.ejecutado), 0);
    this.segmentoActivo = null;
    if (total <= 0) {
      this.segmentos = [];
      return;
    }
    const max = TableroPresupuestarioComponent.MAX_SEGMENTOS;
    const base = rubros.slice(0, max).map((r, i) => ({
      nombre: r.nombre, monto: Number(r.ejecutado), color: TableroPresupuestarioComponent.COLORES[i]
    }));
    const resto = rubros.slice(max).reduce((acc, r) => acc + Number(r.ejecutado), 0);
    if (resto !== 0) base.push({ nombre: 'Otros', monto: resto, color: TableroPresupuestarioComponent.COLOR_OTROS });

    let angulo = -Math.PI / 2;
    this.segmentos = base.map(s => {
      const fraccion = s.monto / total;
      const inicio = angulo;
      angulo += fraccion * 2 * Math.PI;
      return { ...s, porcentaje: fraccion * 100, path: this.arco(inicio, angulo, 90, 58) };
    });
  }

  /** Sector de anillo; con un solo segmento se dibuja el anillo completo en dos mitades. */
  private arco(inicio: number, fin: number, rExt: number, rInt: number): string {
    if (fin - inicio >= 2 * Math.PI - 1e-6) {
      return this.arco(inicio, inicio + Math.PI, rExt, rInt) + ' ' + this.arco(inicio + Math.PI, fin, rExt, rInt);
    }
    const c = 100;
    const p = (r: number, a: number) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
    const grande = fin - inicio > Math.PI ? 1 : 0;
    return `M ${p(rExt, inicio)} A ${rExt} ${rExt} 0 ${grande} 1 ${p(rExt, fin)} `
      + `L ${p(rInt, fin)} A ${rInt} ${rInt} 0 ${grande} 0 ${p(rInt, inicio)} Z`;
  }

  // ---------------------------------------------------------------- líneas

  private construirLineas(): void {
    const semanas: any[] = this.datos?.semanas ?? [];
    this.hover = null;
    if (!semanas.length) {
      this.rutaReal = this.rutaPlan = this.areaEntreCurvas = this.areaSobrePlan = '';
      this.ticksX = this.ticksY = [];
      this.puntoFinReal = null;
      return;
    }
    const { arriba, derecha, abajo, izquierda } = this.margen;
    const ancho = this.ancho - izquierda - derecha;
    const alto = this.alto - arriba - abajo;
    const maxSemana = Math.max(1, ...semanas.map(s => Number(s.semana)));
    const valores = semanas.flatMap(s => [s.realAcumulado, s.presupuestoAcumulado])
      .filter((v: any) => v !== null && v !== undefined).map(Number);
    const { paso: pasoY, techo: maxValor } = this.escalaLimpia(Math.max(1, ...valores));
    const x = (semana: number) => izquierda + (semana / maxSemana) * ancho;
    const y = (valor: number) => arriba + alto - (valor / maxValor) * alto;

    const reales = semanas.filter(s => s.realAcumulado !== null)
      .map(s => ({ x: x(Number(s.semana)), y: y(Number(s.realAcumulado)) }));
    const plan = semanas.filter(s => s.presupuestoAcumulado !== null)
      .map(s => ({ x: x(Number(s.semana)), y: y(Number(s.presupuestoAcumulado)) }));
    this.rutaReal = this.ruta(reales);
    this.rutaPlan = this.ruta(plan);
    this.puntoFinReal = reales.length ? reales[reales.length - 1] : null;

    // Sombreado de la desviación: la franja entre curvas, recortada a donde el real va por encima.
    const conAmbos = semanas.filter(s => s.realAcumulado !== null && s.presupuestoAcumulado !== null);
    this.hayExceso = conAmbos.some(s => Number(s.realAcumulado) > Number(s.presupuestoAcumulado));
    if (conAmbos.length > 1) {
      const sup = conAmbos.map(s => `${x(Number(s.semana)).toFixed(1)},${y(Number(s.realAcumulado)).toFixed(1)}`);
      const inf = [...conAmbos].reverse()
        .map(s => `${x(Number(s.semana)).toFixed(1)},${y(Number(s.presupuestoAcumulado)).toFixed(1)}`);
      this.areaEntreCurvas = [...sup, ...inf].join(' ');
      const planPts = plan.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      this.areaSobrePlan = [...planPts, `${plan[plan.length - 1].x.toFixed(1)},${arriba}`,
        `${plan[0].x.toFixed(1)},${arriba}`].join(' ');
    } else {
      this.areaEntreCurvas = this.areaSobrePlan = '';
    }

    this.ticksY = [];
    for (let v = 0; v <= maxValor + pasoY / 2; v += pasoY) this.ticksY.push({ valor: v, y: y(v) });
    const paso = maxSemana > 30 ? 4 : maxSemana > 12 ? 2 : 1;
    this.ticksX = [];
    for (let s = 0; s <= maxSemana; s += paso) this.ticksX.push({ semana: s, x: x(s) });
    this.puntosX = semanas.map(s => ({ x: x(Number(s.semana)), punto: s }));
  }

  private ruta(puntos: Punto[]): string {
    return puntos.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  /**
   * Escala del eje Y con marcas redondas: unas 3-5 divisiones cuyo paso es 1, 2,
   * 2.5 o 5 × 10^n, y el techo es el primer múltiplo del paso que cubre el máximo.
   */
  private escalaLimpia(maximo: number): { paso: number; techo: number } {
    const bruto = maximo / 5;
    const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
    const paso = ([1, 2, 2.5, 5, 10].find(p => bruto <= p * potencia) ?? 10) * potencia;
    return { paso, techo: Math.ceil(maximo / paso) * paso };
  }

  /** Crosshair: la línea vertical busca la semana más cercana al puntero. */
  onMoverPuntero(evento: PointerEvent, svg: Element): void {
    if (!this.puntosX.length) return;
    const rect = svg.getBoundingClientRect();
    const xVista = ((evento.clientX - rect.left) / rect.width) * this.ancho;
    let cercano = this.puntosX[0];
    for (const p of this.puntosX) if (Math.abs(p.x - xVista) < Math.abs(cercano.x - xVista)) cercano = p;
    this.hover = { x: cercano.x, punto: cercano.punto, izquierda: cercano.x > this.ancho * 0.6 };
  }

  onSalirPuntero(): void {
    this.hover = null;
  }

  porcentajeX(x: number): number {
    return (x / this.ancho) * 100;
  }

  desviacionDe(punto: any): number | null {
    return punto?.realAcumulado !== null && punto?.presupuestoAcumulado !== null
      ? Number(punto.realAcumulado) - Number(punto.presupuestoAcumulado)
      : null;
  }

  /** Los cinco rubros que más se desvían (la tabla lateral); el total suma todos. */
  get topDesviaciones(): any[] {
    return (this.datos?.desviacionPorRubro ?? []).slice(0, 5);
  }

  /** El signo lo da la flecha (▲ sobre, ▼ debajo): el monto se muestra sin signo. */
  abs(valor: number): number {
    return Math.abs(Number(valor) || 0);
  }

  get totalDesviacionRubros(): number {
    return (this.datos?.desviacionPorRubro ?? []).reduce((acc: number, r: any) => acc + Number(r.desviacion), 0);
  }
}
