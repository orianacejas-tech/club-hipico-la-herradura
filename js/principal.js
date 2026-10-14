/* ==========================================================================
   principal.js · Arranque de la web
   --------------------------------------------------------------------------
   · "Pinta" los precios, horarios y datos de contacto a partir de datos.js
   · Navegación entre páginas con # (por ejemplo index.html#clases)
   · Menú lateral desplegable y menú tipo cajón en el móvil
   · Visor de la galería de fotos y formulario de contacto
   ========================================================================== */

document.addEventListener('DOMContentLoaded', iniciarWeb);

let tituloOriginal = '';

function iniciarWeb() {
  tituloOriginal = document.title;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  pintarContenidos();
  prepararNavegacion();
  prepararCajon();
  prepararGaleria();
  prepararContacto();
  iniciarReservas();

  window.addEventListener('hashchange', function () { mostrarRuta(false); });
  mostrarRuta(true);

  // Si se entra directamente a una sección (#bonos), se recoloca cuando cargan las fotos
  window.addEventListener('load', function () {
    const ruta = location.hash.slice(1).split('?')[0];
    const objetivo = ruta ? document.getElementById(ruta) : null;
    if (objetivo && !objetivo.classList.contains('pagina') && objetivo.closest('.pagina')) {
      objetivo.scrollIntoView({ block: 'start' });
    }
  });
}

/* ======================= 1. CONTENIDOS DESDE datos.js ======================= */

function rellenar(id, html) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.innerHTML = html;
}

function pintarContenidos() {
  const clases = CLUB.actividades.filter(function (a) { return a.tipo === 'clase'; });
  const rutas = CLUB.actividades.filter(function (a) { return a.tipo === 'ruta'; });

  rellenar('tarjetas-clases', clases.map(tarjetaClase).join(''));
  rellenar('tabla-precios', tablaPrecios(clases));
  rellenar('tarjetas-bonos', clases.filter(function (c) { return c.bono; }).map(tarjetaBono).join(''));
  rellenar('condiciones-bonos', CLUB.bonos.condiciones.map(function (c) { return '<li>' + c + '</li>'; }).join(''));
  rellenar('tabla-horarios', tablaHorarios(clases, rutas));
  rellenar('oferta-inicio', ofertaInicio(clases));
  rellenar('planes-pupilaje', CLUB.pupilaje.planes.map(tarjetaPupilaje).join(''));
  rellenar('tabla-extras', tablaExtras(CLUB.pupilaje.extras));
  rellenar('nota-pupilaje', CLUB.pupilaje.nota);
  rellenar('tarjetas-rutas', rutas.map(tarjetaRuta).join(''));
  rellenar('menu-reservas', menuReservas(clases));
  rellenar('menu-contacto', menuContacto());
  rellenar('tarjetas-contacto', tarjetasContacto());
  rellenar('pie-contacto', pieContacto());
  rellenar('direccion-texto', CLUB.contacto.direccion.join(' · '));
  rellenar('anio-actual', String(ahora().getFullYear()));

  document.querySelectorAll('[data-horario]').forEach(function (lista) {
    lista.innerHTML = listaHorario();
  });

  const mapa = document.getElementById('mapa');
  if (mapa) mapa.src = enlaceMapaIncrustado();
  const comoLlegar = document.getElementById('enlace-como-llegar');
  if (comoLlegar) comoLlegar.href = enlaceComoLlegar();
}

/* ---------- Clases y bonos ---------- */

function tarjetaClase(a) {
  const bloqueBono = a.bono
    ? '<p class="precio-bono"><span class="etiqueta-mini">Bono ' + a.bono.clases + '</span>' +
        '<span><strong>' + euros(a.bono.precio) + '</strong> · ' + euros(a.bono.precio / a.bono.clases) + ' por clase · ' +
        '<span class="ahorro">ahorras ' + euros(a.precio * a.bono.clases - a.bono.precio) + '</span></span></p>'
    : '';
  const botonBono = a.bono
    ? '<a class="boton boton--secundario" href="#reservas?actividad=' + a.id + '&amp;modalidad=bono-nuevo">Comprar bono</a>'
    : '';
  return '<article class="tarjeta tarjeta--clase" id="clase-' + a.id + '">' +
    '<figure class="foto"><img src="' + a.imagen + '" alt="' + a.alt + '" loading="lazy"></figure>' +
    '<div class="tarjeta__cuerpo">' +
      '<p class="etiqueta">' + a.nivel + '</p>' +
      '<h3>' + a.nombre + '</h3>' +
      '<p>' + a.resumen + '</p>' +
      '<ul class="lista-check">' + a.incluye.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
      '<dl class="datos-clase">' +
        '<div><dt>Duración</dt><dd>' + textoDuracion(a.duracion) + '</dd></div>' +
        '<div><dt>Grupo</dt><dd>Máx. ' + a.capacidad + '</dd></div>' +
        '<div><dt>Edad</dt><dd>' + textoEdad(a) + '</dd></div>' +
      '</dl>' +
      (a.requisito ? '<p class="nota"><strong>Requisito:</strong> ' + a.requisito + '.</p>' : '') +
      '<div class="precios">' +
        '<p class="precio"><span class="precio__cifra">' + euros(a.precio) + '</span><span class="precio__unidad">/ clase</span></p>' +
        bloqueBono +
      '</div>' +
      '<div class="acciones">' +
        '<a class="boton boton--primario" href="#reservas?actividad=' + a.id + '">' + icono('calendario') + 'Reservar clase</a>' +
        botonBono +
      '</div>' +
    '</div>' +
  '</article>';
}

function tablaPrecios(clases) {
  const filas = clases.map(function (a) {
    let columnasBono = '<td class="num col-oferta">—</td><td class="num">—</td><td class="num">—</td>';
    if (a.bono) {
      const sinBono = a.precio * a.bono.clases;
      const ahorro = sinBono - a.bono.precio;
      columnasBono = '<td class="num col-oferta"><strong>' + euros(a.bono.precio) + '</strong></td>' +
        '<td class="num">' + euros(a.bono.precio / a.bono.clases) + '</td>' +
        '<td class="num ahorro">' + euros(ahorro) + ' (' + porcentaje(ahorro / sinBono) + ')</td>';
    }
    return '<tr>' +
      '<th scope="row">' + a.nombre + '<span class="tabla__nota">' + textoEdad(a) + '</span></th>' +
      '<td>' + textoDuracion(a.duracion) + '</td>' +
      '<td>Máx. ' + a.capacidad + '</td>' +
      '<td class="num">' + euros(a.precio) + '</td>' +
      columnasBono +
    '</tr>';
  }).join('');
  return '<table class="tabla">' +
    '<thead><tr>' +
      '<th scope="col">Clase</th><th scope="col">Duración</th><th scope="col">Grupo</th>' +
      '<th scope="col" class="num">Clase suelta</th>' +
      '<th scope="col" class="num col-oferta">Bono 5 clases</th>' +
      '<th scope="col" class="num">Por clase con bono</th>' +
      '<th scope="col" class="num">Ahorras</th>' +
    '</tr></thead><tbody>' + filas + '</tbody></table>';
}

function tarjetaBono(a) {
  const sinBono = a.precio * a.bono.clases;
  const ahorro = sinBono - a.bono.precio;
  return '<article class="tarjeta tarjeta--cosida bono-tarjeta">' +
    '<h3>' + a.nombre + '</h3>' +
    '<p class="bono-tarjeta__antes"><span class="solo-lectores">Precio sin bono: </span><s>' + euros(sinBono) + '</s></p>' +
    '<p class="bono-tarjeta__precio">' + euros(a.bono.precio) + '</p>' +
    '<p class="bono-tarjeta__por-clase">' + a.bono.clases + ' clases · ' + euros(a.bono.precio / a.bono.clases) + ' por clase</p>' +
    '<p class="bono-tarjeta__ahorro">Ahorras ' + euros(ahorro) + ' (' + porcentaje(ahorro / sinBono) + ')</p>' +
    '<a class="boton boton--primario" href="#reservas?actividad=' + a.id + '&amp;modalidad=bono-nuevo">Comprar bono</a>' +
  '</article>';
}

function ofertaInicio(clases) {
  const conBono = clases.filter(function (c) { return c.bono; });
  if (!conBono.length) return '';
  const maxAhorro = Math.max.apply(null, conBono.map(function (c) { return 1 - c.bono.precio / (c.precio * c.bono.clases); }));
  const minPorClase = Math.min.apply(null, conBono.map(function (c) { return c.bono.precio / c.bono.clases; }));
  return '<div class="oferta-destacada">' +
    '<span class="etiqueta-oferta">Oferta</span>' +
    '<p class="oferta-destacada__cifra">−' + porcentaje(maxAhorro) + '</p>' +
    '<div>' +
      '<h2>Bono de 5 clases</h2>' +
      '<p>Paga menos por cada clase: desde <strong>' + euros(minPorClase) + ' por clase</strong> y hasta un <strong>' +
        porcentaje(maxAhorro) + ' de ahorro</strong>. Válido ' + CLUB.bonos.validezDias + ' días.</p>' +
    '</div>' +
    '<a class="boton boton--primario boton--grande" href="#bonos">Ver los bonos</a>' +
  '</div>';
}

function tablaHorarios(clases, rutas) {
  const dias = ['martesAViernes', 'sabado', 'domingo'];
  function fila(a) {
    return '<tr><th scope="row">' + a.nombre + '</th>' + dias.map(function (d) {
      const horas = a.horario[d] || [];
      return '<td>' + (horas.length ? horas.join(' · ') : '<span aria-hidden="true">—</span><span class="solo-lectores">Sin turnos</span>') + '</td>';
    }).join('') + '</tr>';
  }
  return '<table class="tabla tabla--horarios">' +
    '<thead><tr><th scope="col">Actividad</th><th scope="col">Martes a viernes</th><th scope="col">Sábado</th><th scope="col">Domingo</th></tr></thead>' +
    '<tbody>' +
      '<tr class="tabla__grupo"><th colspan="4" scope="colgroup">Clases</th></tr>' + clases.map(fila).join('') +
      '<tr class="tabla__grupo"><th colspan="4" scope="colgroup">Rutas a caballo</th></tr>' + rutas.map(fila).join('') +
    '</tbody></table>';
}

/* ---------- Pupilaje y rutas ---------- */

function tarjetaPupilaje(p) {
  return '<article class="tarjeta plan' + (p.destacado ? ' plan--destacado' : '') + '">' +
    (p.destacado ? '<span class="etiqueta-oferta plan__sello">El más elegido</span>' : '') +
    '<figure class="foto"><img src="' + p.imagen + '" alt="' + p.alt + '" loading="lazy"></figure>' +
    '<div class="tarjeta__cuerpo">' +
      '<h3>' + p.nombre + '</h3>' +
      '<p>' + p.resumen + '</p>' +
      '<p class="precio"><span class="precio__cifra">' + euros(p.precioMes) + '</span><span class="precio__unidad">/ mes</span></p>' +
      '<ul class="lista-check">' + p.incluye.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
      '<a class="boton ' + (p.destacado ? 'boton--primario' : 'boton--secundario') + '" href="#contacto?asunto=pupilaje&amp;plan=' + p.id + '">Pedir información</a>' +
    '</div>' +
  '</article>';
}

function tablaExtras(extras) {
  return '<table class="tabla">' +
    '<thead><tr><th scope="col">Servicio</th><th scope="col" class="num">Precio</th></tr></thead><tbody>' +
    extras.map(function (e) {
      return '<tr><th scope="row">' + e.nombre + '</th><td class="num">' + euros(e.precio) + ' / ' + e.unidad + '</td></tr>';
    }).join('') +
    '</tbody></table>';
}

function diasDeActividad(a) {
  const partes = [];
  if (a.horario.martesAViernes.length) partes.push('Martes a viernes: ' + a.horario.martesAViernes.join(', '));
  if (a.horario.sabado.length) partes.push('Sábados: ' + a.horario.sabado.join(', '));
  if (a.horario.domingo.length) partes.push('Domingos: ' + a.horario.domingo.join(', '));
  return partes.join(' · ');
}

function tarjetaRuta(r) {
  return '<article class="tarjeta ruta">' +
    '<figure class="foto"><img src="' + r.imagen + '" alt="' + r.alt + '" loading="lazy"></figure>' +
    '<div class="tarjeta__cuerpo">' +
      '<h3>' + r.nombre + '</h3>' +
      '<ul class="chips">' +
        '<li class="chip chip--gris">' + icono('reloj') + textoDuracion(r.duracion) + '</li>' +
        '<li class="chip chip--gris">' + r.nivel + '</li>' +
        '<li class="chip chip--gris">' + textoEdad(r) + '</li>' +
      '</ul>' +
      '<p>' + r.resumen + '</p>' +
      '<ul class="lista-check">' + r.incluye.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
      (r.requisito ? '<p class="nota"><strong>Requisito:</strong> ' + r.requisito + '.</p>' : '') +
      '<p class="nota ruta__dias">' + icono('calendario') + '<span>' + diasDeActividad(r) + '</span></p>' +
      '<div class="ruta__pie">' +
        '<p class="precio"><span class="precio__cifra">' + euros(r.precio) + '</span><span class="precio__unidad">por persona</span></p>' +
        '<a class="boton boton--primario" href="#reservas?actividad=' + r.id + '">' + icono('calendario') + 'Reservar ruta</a>' +
      '</div>' +
    '</div>' +
  '</article>';
}

/* ---------- Menú lateral: desplegables de reservas y contacto ---------- */

function menuReservas(clases) {
  return '<li><a class="enlace-lateral enlace-lateral--boton" href="#reservas">' + icono('calendario') + 'Ir al formulario de reserva</a></li>' +
    '<li class="grupo__subtitulo" aria-hidden="true">Reserva directa</li>' +
    clases.map(function (c) {
      return '<li><a class="enlace-lateral" href="#reservas?actividad=' + c.id + '">' + c.nombre +
        '<span class="enlace-lateral__precio">' + euros(c.precio) + '</span></a></li>';
    }).join('') +
    '<li><a class="enlace-lateral" href="#reservas?modalidad=bono-nuevo">Comprar bono 5 clases <span class="etiqueta-mini">Oferta</span></a></li>' +
    '<li><a class="enlace-lateral" href="#excursiones">Reservar una ruta a caballo</a></li>' +
    '<li><a class="enlace-lateral" href="#mis-reservas">' + icono('lista') + 'Mis reservas <span class="contador" id="contador-reservas" hidden></span></a></li>';
}

function itemContacto(enlace, nombreIcono, titulo, detalle, externo) {
  return '<li><a class="enlace-lateral" href="' + escaparHTML(enlace) + '"' + (externo ? ' target="_blank" rel="noopener"' : '') + '>' +
    icono(nombreIcono) +
    '<span><span class="enlace-lateral__titulo">' + titulo + '</span>' +
    '<span class="enlace-lateral__sub">' + escaparHTML(detalle) + '</span></span></a></li>';
}

function menuContacto() {
  const c = CLUB.contacto;
  let html =
    itemContacto(enlaceTelefono(), 'telefono', 'Llamar', c.telefono, false) +
    itemContacto(enlaceWhatsApp('Hola, quería información sobre el club.'), 'whatsapp', 'WhatsApp', 'Escríbenos un mensaje', true) +
    itemContacto(enlaceEmail('Información', ''), 'email', 'Email', c.email, false) +
    itemContacto(enlaceComoLlegar(), 'ubicacion', 'Cómo llegar', c.direccion.join(', '), true) +
    '<li class="lateral__horario">' + icono('reloj') +
      '<div><span class="enlace-lateral__titulo">Horario</span><dl class="horario horario--compacto">' + listaHorario() + '</dl></div></li>';

  const redes = [];
  if (c.redes.instagram) redes.push('<a href="' + c.redes.instagram + '" target="_blank" rel="noopener">' + icono('instagram') + '<span class="solo-lectores">Instagram</span></a>');
  if (c.redes.facebook) redes.push('<a href="' + c.redes.facebook + '" target="_blank" rel="noopener">' + icono('facebook') + '<span class="solo-lectores">Facebook</span></a>');
  if (redes.length) html += '<li class="lateral__redes">' + redes.join('') + '</li>';

  html += '<li><a class="enlace-lateral enlace-lateral--boton" href="#contacto">' + icono('email') + 'Formulario de contacto y mapa</a></li>';
  return html;
}

function listaHorario() {
  return CLUB.contacto.horario.map(function (h) {
    return '<div><dt>' + h.dias + '</dt><dd>' + h.horas + '</dd></div>';
  }).join('');
}

/* ---------- Página de contacto y pie ---------- */

function tarjetaContacto(nombreIcono, titulo, cuerpo, accion) {
  return '<article class="tarjeta tarjeta--cosida contacto-tarjeta">' +
    icono(nombreIcono, 'contacto-tarjeta__icono') +
    '<h2 class="contacto-tarjeta__titulo">' + titulo + '</h2>' + cuerpo +
    (accion ? '<div class="acciones">' + accion + '</div>' : '') +
  '</article>';
}

function tarjetasContacto() {
  const c = CLUB.contacto;
  return tarjetaContacto('telefono', 'Teléfono',
      '<p><a class="dato-grande" href="' + enlaceTelefono() + '">' + c.telefono + '</a></p><p class="nota">' + c.horarioTelefono + '</p>',
      '<a class="boton boton--primario" href="' + enlaceTelefono() + '">' + icono('telefono') + 'Llamar ahora</a>') +
    tarjetaContacto('whatsapp', 'WhatsApp',
      '<p>Escríbenos y te respondemos lo antes posible, también fuera del horario de oficina.</p>',
      '<a class="boton boton--whatsapp" target="_blank" rel="noopener" href="' + escaparHTML(enlaceWhatsApp('Hola, quería información sobre el club.')) + '">' + icono('whatsapp') + 'Abrir WhatsApp</a>') +
    tarjetaContacto('email', 'Email',
      // <wbr> permite partir la dirección después de la @ si no cabe
      '<p><a class="dato-largo" href="' + escaparHTML(enlaceEmail('Información', '')) + '">' + c.email.replace('@', '@<wbr>') + '</a></p>' +
      '<p class="nota">Respondemos en menos de 24 horas.</p>',
      '') +
    tarjetaContacto('ubicacion', 'Dirección',
      '<p>' + c.direccion.join('<br>') + '</p>',
      '<a class="boton boton--secundario" target="_blank" rel="noopener" href="' + escaparHTML(enlaceComoLlegar()) + '">' + icono('externo') + 'Cómo llegar</a>');
}

function pieContacto() {
  const c = CLUB.contacto;
  return '<li>' + icono('telefono') + '<a href="' + enlaceTelefono() + '">' + c.telefono + '</a></li>' +
    '<li>' + icono('whatsapp') + '<a href="' + escaparHTML(enlaceWhatsApp('')) + '" target="_blank" rel="noopener">WhatsApp</a></li>' +
    '<li>' + icono('email') + '<a href="mailto:' + c.email + '">' + c.email + '</a></li>' +
    '<li>' + icono('ubicacion') + '<span>' + c.direccion.join(', ') + '</span></li>';
}

/* ======================= 2. NAVEGACIÓN ENTRE PÁGINAS ======================= */

// Muestra la página que indica la dirección: #clases, #bonos, #reservas?actividad=salto…
function mostrarRuta(esInicial) {
  const partes = location.hash.slice(1).split('?');
  const ruta = partes[0] || 'inicio';
  const parametros = new URLSearchParams(partes[1] || '');

  let objetivo = document.getElementById(ruta);
  let pagina = objetivo ? objetivo.closest('.pagina') : null;   // la página, o la que contiene la sección (#bonos)
  if (!pagina) {
    pagina = document.getElementById('inicio');
    objetivo = pagina;
  }

  document.querySelectorAll('.pagina').forEach(function (p) {
    p.classList.toggle('activa', p === pagina);
  });
  document.title = pagina.id === 'inicio' ? tituloOriginal : pagina.getAttribute('data-titulo') + ' · ' + CLUB.nombre;
  marcarEnlaceActivo(pagina);
  cerrarCajon(false);

  if (GANCHOS_PAGINA[pagina.id]) GANCHOS_PAGINA[pagina.id](parametros);

  if (objetivo === pagina) window.scrollTo(0, 0);
  else objetivo.scrollIntoView({ block: 'start' });

  // Para teclado y lectores de pantalla: el foco pasa al título de la página nueva
  if (!esInicial) {
    const titulo = objetivo === pagina ? pagina.querySelector('h1') : (objetivo.querySelector('h2, h3') || objetivo);
    if (titulo) {
      if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1');
      titulo.focus({ preventScroll: true });
    }
  }
}

// Resalta en el menú lateral el enlace de la página actual y abre su desplegable
function marcarEnlaceActivo(pagina) {
  const hash = location.hash || '#inicio';
  const enlaces = Array.from(document.querySelectorAll('.lateral a[href^="#"]'));
  enlaces.forEach(function (a) { a.removeAttribute('aria-current'); });

  let activos = enlaces.filter(function (a) { return a.getAttribute('href') === hash; });
  if (!activos.length) activos = enlaces.filter(function (a) { return a.getAttribute('href') === '#' + pagina.id; });
  activos.forEach(function (a) {
    a.setAttribute('aria-current', 'page');
    const grupo = a.closest('details');
    if (grupo) grupo.open = true;
  });
}

function prepararNavegacion() {
  document.addEventListener('click', function (evento) {
    const enlace = evento.target.closest('a[href^="#"]');
    if (!enlace) return;
    const destino = enlace.getAttribute('href');

    // Enlace "Saltar al contenido": mueve el foco sin cambiar de página
    if (destino === '#contenido') {
      evento.preventDefault();
      document.getElementById('contenido').focus();
      return;
    }
    // Si se pulsa el enlace de la página en la que ya estamos, se vuelve a mostrar igualmente
    if (destino === location.hash || (destino === '#inicio' && !location.hash)) {
      evento.preventDefault();
      mostrarRuta(false);
    }
  });
}

/* ======================= 3. MENÚ TIPO CAJÓN (MÓVIL) ======================= */

function cajonAbierto() {
  return document.getElementById('lateral').classList.contains('lateral--abierta');
}

function abrirCajon() {
  const velo = document.getElementById('velo');
  document.getElementById('lateral').classList.add('lateral--abierta');
  velo.hidden = false;
  requestAnimationFrame(function () { velo.classList.add('velo--visible'); });
  document.getElementById('boton-menu').setAttribute('aria-expanded', 'true');
  ['contenido', 'pie', 'barra-movil'].forEach(function (id) { document.getElementById(id).inert = true; });
  document.body.classList.add('sin-scroll');
  document.getElementById('boton-cerrar-menu').focus();
}

function cerrarCajon(devolverFoco) {
  if (!cajonAbierto()) return;
  const velo = document.getElementById('velo');
  document.getElementById('lateral').classList.remove('lateral--abierta');
  velo.classList.remove('velo--visible');
  setTimeout(function () { if (!cajonAbierto()) velo.hidden = true; }, 300);
  document.getElementById('boton-menu').setAttribute('aria-expanded', 'false');
  ['contenido', 'pie', 'barra-movil'].forEach(function (id) { document.getElementById(id).inert = false; });
  document.body.classList.remove('sin-scroll');
  if (devolverFoco) document.getElementById('boton-menu').focus();
}

function prepararCajon() {
  const boton = document.getElementById('boton-menu');
  if (!boton) return;
  boton.addEventListener('click', abrirCajon);
  document.getElementById('boton-cerrar-menu').addEventListener('click', function () { cerrarCajon(true); });
  document.getElementById('velo').addEventListener('click', function () { cerrarCajon(true); });
  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape' && cajonAbierto()) cerrarCajon(true);
  });

  // Si la ventana se hace grande (menú fijo), se cierra el cajón
  const escritorio = window.matchMedia('(min-width: 64em)');
  const alCambiar = function () { if (escritorio.matches) cerrarCajon(false); };
  if (escritorio.addEventListener) escritorio.addEventListener('change', alCambiar);
  else escritorio.addListener(alCambiar);
}

/* ======================= 4. VISOR DE FOTOS ======================= */

function prepararGaleria() {
  const visor = document.getElementById('visor');
  const botones = Array.from(document.querySelectorAll('[data-galeria]'));
  if (!visor || !botones.length || typeof visor.showModal !== 'function') return;

  const imagen = visor.querySelector('.visor__imagen');
  const texto = visor.querySelector('.visor__texto');
  const contador = visor.querySelector('.visor__contador');
  let indice = 0;
  let origen = null;

  function mostrar(nuevo) {
    indice = (nuevo + botones.length) % botones.length;
    const miniatura = botones[indice].querySelector('img');
    imagen.src = miniatura.getAttribute('src');
    imagen.alt = miniatura.alt;
    texto.textContent = botones[indice].getAttribute('data-galeria');
    contador.textContent = (indice + 1) + ' / ' + botones.length;
  }

  botones.forEach(function (boton, i) {
    boton.addEventListener('click', function () {
      origen = boton;
      mostrar(i);
      visor.showModal();
    });
  });
  visor.querySelector('[data-visor="anterior"]').addEventListener('click', function () { mostrar(indice - 1); });
  visor.querySelector('[data-visor="siguiente"]').addEventListener('click', function () { mostrar(indice + 1); });
  visor.querySelector('[data-visor="cerrar"]').addEventListener('click', function () { visor.close(); });
  visor.addEventListener('keydown', function (evento) {
    if (evento.key === 'ArrowLeft') mostrar(indice - 1);
    if (evento.key === 'ArrowRight') mostrar(indice + 1);
  });
  // Pulsar fuera de la foto (en el fondo oscuro) cierra el visor
  visor.addEventListener('click', function (evento) {
    if (evento.target === visor) visor.close();
  });
  visor.addEventListener('close', function () {
    if (origen) origen.focus();
  });
}

/* ======================= 5. FORMULARIO DE CONTACTO ======================= */

function prepararContacto() {
  const formulario = document.getElementById('form-contacto');
  if (!formulario) return;

  formulario.addEventListener('submit', function (evento) { evento.preventDefault(); });
  formulario.addEventListener('input', function (evento) {
    const error = document.getElementById('ec-' + evento.target.id.replace('c-', ''));
    if (error) error.textContent = '';
    evento.target.removeAttribute('aria-invalid');
  });
  formulario.querySelectorAll('[data-enviar-contacto]').forEach(function (boton) {
    boton.addEventListener('click', function () { enviarContacto(boton.getAttribute('data-enviar-contacto')); });
  });

  // #contacto?asunto=pupilaje&plan=box -> se rellena el asunto y un mensaje de ejemplo
  GANCHOS_PAGINA.contacto = function (parametros) {
    const select = document.getElementById('c-asunto');
    const asunto = parametros.get('asunto');
    if (asunto && Array.from(select.options).some(function (o) { return o.value === asunto; })) select.value = asunto;

    const mensaje = document.getElementById('c-mensaje');
    if (mensaje.value.trim()) return;
    const plan = CLUB.pupilaje.planes.find(function (p) { return p.id === parametros.get('plan'); });
    if (plan) {
      mensaje.value = 'Hola, me interesa el ' + plan.nombre.charAt(0).toLowerCase() + plan.nombre.slice(1) +
        ' (' + euros(plan.precioMes) + ' al mes). ¿Podría visitar las instalaciones?';
    } else if (asunto === 'pupilaje') {
      mensaje.value = 'Hola, me gustaría recibir información sobre el pupilaje y visitar las instalaciones.';
    }
  };
}

function enviarContacto(medio) {
  const nombre = valorCampo('c-nombre');
  const mensaje = valorCampo('c-mensaje');
  const errores = {};
  if (nombre.length < 2) errores.nombre = 'Escribe tu nombre.';
  if (mensaje.length < 10) errores.mensaje = 'Escribe tu consulta (al menos 10 caracteres).';

  ['nombre', 'mensaje'].forEach(function (campo) {
    document.getElementById('ec-' + campo).textContent = errores[campo] || '';
    const control = document.getElementById('c-' + campo);
    if (errores[campo]) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  });
  if (errores.nombre || errores.mensaje) {
    document.getElementById(errores.nombre ? 'c-nombre' : 'c-mensaje').focus();
    return;
  }

  const select = document.getElementById('c-asunto');
  const asunto = select.options[select.selectedIndex].text;
  const datosContacto = [];
  if (valorCampo('c-telefono')) datosContacto.push('Mi teléfono: ' + valorCampo('c-telefono'));
  if (valorCampo('c-email')) datosContacto.push('Mi email: ' + valorCampo('c-email'));
  const texto = 'Hola, soy ' + nombre + '. Os escribo sobre: ' + asunto + '.\n\n' + mensaje +
    (datosContacto.length ? '\n\n' + datosContacto.join('\n') : '');

  const estado = document.getElementById('c-estado');
  if (medio === 'whatsapp') {
    window.open(enlaceWhatsApp(texto), '_blank', 'noopener');
    estado.textContent = 'Se ha abierto WhatsApp con tu mensaje: solo falta pulsar «Enviar».';
  } else {
    window.location.href = enlaceEmail('Consulta web: ' + asunto, texto + '\n\n' + nombre);
    estado.textContent = 'Se ha abierto tu programa de correo con el mensaje: solo falta pulsar «Enviar». ' +
      'Si no se abre nada, escríbenos a ' + CLUB.contacto.email + '.';
  }
  estado.hidden = false;
}
