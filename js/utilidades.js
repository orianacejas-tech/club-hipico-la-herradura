/* ==========================================================================
   utilidades.js · Funciones de ayuda que usan los demás archivos
   (fechas, dinero, texto seguro, iconos, guardado en el navegador y enlaces)
   ========================================================================== */

/* ---------- 1. FECHAS ----------
   Las fechas se guardan como texto 'AAAA-MM-DD' en hora LOCAL.
   Importante: no se usa toISOString() ni new Date('AAAA-MM-DD'), porque
   trabajan en hora UTC y pueden devolver el día anterior o el siguiente. */

function dosCifras(numero) {
  return String(numero).padStart(2, '0');
}

// Date -> 'AAAA-MM-DD'
function fechaAISO(fecha) {
  return fecha.getFullYear() + '-' + dosCifras(fecha.getMonth() + 1) + '-' + dosCifras(fecha.getDate());
}

// 'AAAA-MM-DD' -> Date (a las 00:00, hora local)
function isoAFecha(iso) {
  const partes = iso.split('-').map(Number);
  return new Date(partes[0], partes[1] - 1, partes[2]);
}

// Comprueba que el texto es una fecha que existe (rechaza, por ejemplo, 2026-02-30)
function esISOValida(iso) {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) && fechaAISO(isoAFecha(iso)) === iso;
}

// Suma días a una fecha 'AAAA-MM-DD' (funciona con cambios de hora y fines de mes)
function sumarDias(iso, dias) {
  const fecha = isoAFecha(iso);
  fecha.setDate(fecha.getDate() + dias);
  return fechaAISO(fecha);
}

// 'AAAA-MM-DD' + 'HH:MM' -> Date
function fechaHora(iso, hhmm) {
  const f = iso.split('-').map(Number);
  const h = hhmm.split(':').map(Number);
  return new Date(f[0], f[1] - 1, f[2], h[0], h[1]);
}

// 'HH:MM' + minutos -> 'HH:MM'
function sumarMinutos(hhmm, minutos) {
  const h = hhmm.split(':').map(Number);
  const total = h[0] * 60 + h[1] + minutos;
  return dosCifras(Math.floor(total / 60) % 24) + ':' + dosCifras(total % 60);
}

// Único sitio donde se lee la hora actual (así es fácil de cambiar en las pruebas)
function ahora() {
  return new Date();
}

function hoyISO() {
  return fechaAISO(ahora());
}

// Marca de tiempo local 'AAAA-MM-DDTHH:MM'
function marcaDeTiempo() {
  const momento = ahora();
  return fechaAISO(momento) + 'T' + dosCifras(momento.getHours()) + ':' + dosCifras(momento.getMinutes());
}

// 'AAAA-MM-DD' -> 'Sábado, 18 de octubre de 2026'
function fechaLarga(iso) {
  const texto = isoAFecha(iso).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// 'AAAA-MM-DD' -> '18/10/2026'
function fechaCorta(iso) {
  const p = iso.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

// 45 -> '45 min' · 120 -> '2 h' · 90 -> '1 h 30 min'
function textoDuracion(minutos) {
  if (minutos < 60) return minutos + ' min';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return horas + ' h' + (resto ? ' ' + resto + ' min' : '');
}

const NOMBRES_DIAS_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

/* ---------- 2. DINERO ---------- */

const FORMATO_EUROS = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0
});
const FORMATO_EUROS_DECIMALES = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
});
const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 0 });

// 25 -> '25 €' · 29.8 -> '29,80 €'
function euros(cantidad) {
  return Number.isInteger(cantidad) ? FORMATO_EUROS.format(cantidad) : FORMATO_EUROS_DECIMALES.format(cantidad);
}

// 0.15 -> '15 %'
function porcentaje(fraccion) {
  return FORMATO_PORCENTAJE.format(fraccion);
}

/* ---------- 3. TEXTOS ---------- */

// Escapa lo que escribe el usuario antes de meterlo en el HTML (evita inyectar código)
function escaparHTML(texto) {
  return String(texto === undefined || texto === null ? '' : texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 'Lucía  Pérez ' -> 'lucia perez' (para comparar nombres sin tildes ni mayúsculas)
function normalizarTexto(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

// 'Lucía Pérez Gómez' -> 'Lucía'
function primerNombre(nombreCompleto) {
  return String(nombreCompleto).trim().split(/\s+/)[0];
}

// Edad de una actividad en texto: 'De 4 a 12 años' o 'Desde 12 años'
function textoEdad(actividad) {
  return actividad.edadMax
    ? 'De ' + actividad.edadMin + ' a ' + actividad.edadMax + ' años'
    : 'Desde ' + actividad.edadMin + ' años';
}

// Devuelve el HTML de un icono del "sprite" que hay al principio de index.html
function icono(nombre, claseExtra) {
  return '<svg class="icono' + (claseExtra ? ' ' + claseExtra : '') + '" aria-hidden="true" focusable="false">' +
    '<use href="#i-' + nombre + '"></use></svg>';
}

/* ---------- 4. CÓDIGOS ---------- */

// Crea un código como 'LH-7K3QF' que no esté repetido (sin 0/O ni 1/I para no confundirse)
function generarCodigo(prefijo, codigosUsados) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo;
  do {
    codigo = prefijo + '-';
    for (let i = 0; i < 5; i++) {
      codigo += letras.charAt(Math.floor(Math.random() * letras.length));
    }
  } while (codigosUsados.indexOf(codigo) !== -1);
  return codigo;
}

// Convierte un texto en un número que siempre es el mismo para el mismo texto
// (se usa para simular plazas ocupadas de forma estable)
function numeroDesdeTexto(texto) {
  let numero = 5381;
  for (let i = 0; i < texto.length; i++) {
    numero = ((numero * 33) ^ texto.charCodeAt(i)) >>> 0;
  }
  return numero;
}

/* ---------- 5. GUARDADO EN EL NAVEGADOR (localStorage) ----------
   Todo se guarda en una sola clave para que una reserva y su bono
   se guarden siempre juntos. */

const CLAVE_ALMACEN = 'lh_datos_v1';
let almacenDisponible = true;

function datosVacios() {
  return { version: 1, reservas: [], bonos: [] };
}

// Lee las reservas y los bonos guardados. Si algo falla, empieza vacío sin romper la web.
function cargarDatos() {
  let texto = null;
  try {
    texto = localStorage.getItem(CLAVE_ALMACEN);
  } catch (error) {
    almacenDisponible = false;      // el navegador no deja guardar (modo privado estricto, etc.)
    return datosVacios();
  }
  if (!texto) return datosVacios();
  try {
    const datos = JSON.parse(texto);
    if (datos && Array.isArray(datos.reservas) && Array.isArray(datos.bonos)) return datos;
  } catch (error) {
    // Datos dañados: se apartan en otra clave y se empieza de cero
  }
  try {
    localStorage.setItem(CLAVE_ALMACEN + '_danado', texto);
  } catch (error) {
    // sin espacio: no pasa nada
  }
  return datosVacios();
}

// Guarda las reservas y los bonos. Devuelve false si el navegador no lo permite.
function guardarDatos(datos) {
  try {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(datos));
    almacenDisponible = true;
    return true;
  } catch (error) {
    almacenDisponible = false;
    return false;
  }
}

/* ---------- 6. ENLACES DE CONTACTO ----------
   Se usa encodeURIComponent (y no URLSearchParams) para que los espacios
   no aparezcan como "+" en el correo. */

function enlaceTelefono() {
  return 'tel:' + CLUB.contacto.telefonoEnlace;
}

function enlaceWhatsApp(texto) {
  return 'https://wa.me/' + CLUB.contacto.whatsapp + (texto ? '?text=' + encodeURIComponent(texto) : '');
}

function enlaceEmail(asunto, cuerpo) {
  const partes = [];
  if (asunto) partes.push('subject=' + encodeURIComponent(asunto));
  if (cuerpo) partes.push('body=' + encodeURIComponent(cuerpo.replace(/\r?\n/g, '\r\n')));
  return 'mailto:' + CLUB.contacto.email + (partes.length ? '?' + partes.join('&') : '');
}

function enlaceComoLlegar() {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CLUB.contacto.mapa);
}

function enlaceMapaIncrustado() {
  return 'https://www.google.com/maps?q=' + encodeURIComponent(CLUB.contacto.mapa) + '&output=embed';
}

/* ---------- 7. COPIAR AL PORTAPAPELES ---------- */

function copiarTexto(texto) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(texto).then(
      function () { return true; },
      function () { return copiarTextoAntiguo(texto); }
    );
  }
  return Promise.resolve(copiarTextoAntiguo(texto));
}

// Plan B para navegadores que no permiten la forma moderna
function copiarTextoAntiguo(texto) {
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let copiado = false;
  try {
    copiado = document.execCommand('copy');
  } catch (error) {
    copiado = false;
  }
  area.remove();
  return copiado;
}

/* ---------- 8. GANCHOS DE PÁGINA ----------
   Cada página puede registrar aquí una función que se ejecuta al abrirla.
   Ejemplo: GANCHOS_PAGINA.reservas = function (parametros) { ... } */
const GANCHOS_PAGINA = {};

// Valor de un campo de formulario, sin espacios al principio ni al final
function valorCampo(id) {
  const campo = document.getElementById(id);
  return campo ? campo.value.trim() : '';
}
