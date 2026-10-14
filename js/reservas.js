/* ==========================================================================
   reservas.js · Reservas online SIN servidor
   --------------------------------------------------------------------------
   · Calcula los turnos libres de cada actividad (horarios y plazas en datos.js)
   · Gestiona los bonos de 5 clases (compra, uso, caducidad y devolución)
   · Guarda las reservas en este navegador (localStorage)
   · Prepara el mensaje para enviar la solicitud al club por WhatsApp o email
   · Pinta la página "Mis reservas"
   La parte 1 son reglas "puras" (no tocan la página) y la parte 2 es la interfaz.
   ========================================================================== */

/* ======================= 1. REGLAS DE LAS RESERVAS ======================= */

function buscarActividad(id) {
  return CLUB.actividades.find(function (a) { return a.id === id; }) || null;
}

// Horas de inicio programadas para una actividad un día concreto
function horasProgramadas(actividad, iso) {
  const dia = isoAFecha(iso).getDay();          // 0 = domingo … 6 = sábado
  if (dia === 1) return [];                      // lunes: cerrado
  if (dia === 0) return actividad.horario.domingo || [];
  if (dia === 6) return actividad.horario.sabado || [];
  return actividad.horario.martesAViernes || [];
}

// Devuelve un texto si el club está cerrado ese día, o '' si abre
function motivoCierre(iso) {
  if (CLUB.reservas.diasCerrado.indexOf(iso) !== -1) return 'Ese día el club está cerrado por festivo.';
  if (isoAFecha(iso).getDay() === 1) return 'Los lunes el club está cerrado: es el día de descanso de los caballos.';
  return '';
}

// Plazas que "ya han reservado otras personas" (solo es una simulación para la demostración)
function plazasOcupadasSimuladas(actividad, iso, hora) {
  if (!CLUB.reservas.simularOcupacion) return 0;
  const numero = numeroDesdeTexto(actividad.id + iso + hora) % 100;
  if (numero < 10) return actividad.capacidad;   // 1 de cada 10 turnos aparece completo
  return numero % actividad.capacidad;           // el resto, con alguna plaza ocupada
}

// Reservas activas guardadas en este navegador para un turno
function reservasEnTurno(datos, actividadId, iso, hora) {
  return datos.reservas.filter(function (r) {
    return r.estado === 'activa' && r.actividadId === actividadId && r.fecha === iso && r.hora === hora;
  }).length;
}

// Turnos de un día con sus plazas libres: { aviso: '', turnos: [{ hora, fin, libres, estado }] }
// estado: 'libre' | 'completo' | 'pasado' (ya no se puede reservar por la antelación mínima)
function turnosDelDia(actividad, iso, datos, momento) {
  const cierre = motivoCierre(iso);
  if (cierre) return { aviso: cierre, turnos: [] };

  const horas = horasProgramadas(actividad, iso);
  if (horas.length === 0) {
    return {
      aviso: 'No hay turnos de ' + actividad.nombre + ' los ' + NOMBRES_DIAS_PLURAL[isoAFecha(iso).getDay()] + '. Prueba con otro día.',
      turnos: []
    };
  }

  const limite = new Date(momento.getTime() + CLUB.reservas.horasAntelacionMin * 3600000);
  const turnos = horas.map(function (hora) {
    const ocupadas = plazasOcupadasSimuladas(actividad, iso, hora) + reservasEnTurno(datos, actividad.id, iso, hora);
    const libres = Math.max(0, actividad.capacidad - ocupadas);
    let estado = 'libre';
    if (fechaHora(iso, hora) < limite) estado = 'pasado';
    else if (libres === 0) estado = 'completo';
    return { hora: hora, fin: sumarMinutos(hora, actividad.duracion), libres: libres, estado: estado };
  });
  return { aviso: '', turnos: turnos };
}

// Situación de un bono. Las clases usadas se cuentan a partir de sus reservas activas,
// así que al cancelar una reserva la clase vuelve sola al bono.
function situacionBono(bono, datos, hoy) {
  const usadas = datos.reservas.filter(function (r) {
    return r.bonoId === bono.id && r.estado === 'activa';
  }).length;
  const restantes = Math.max(0, bono.clases - usadas);
  let estado = 'activo';
  if (bono.caduca < hoy) estado = 'caducado';
  else if (restantes === 0) estado = 'agotado';
  return { usadas: usadas, restantes: restantes, estado: estado };
}

// Bonos que se pueden usar ahora para una actividad
function bonosUsables(datos, actividadId, hoy) {
  return datos.bonos.filter(function (b) {
    return b.actividadId === actividadId && situacionBono(b, datos, hoy).estado === 'activo';
  });
}

function esReservaPasada(reserva, momento) {
  return fechaHora(reserva.fecha, reserva.hora) < momento;
}

// Solo se puede cancelar online con la antelación que marca datos.js (24 h)
function puedeCancelar(reserva, momento) {
  if (reserva.estado !== 'activa') return false;
  const horasQueFaltan = (fechaHora(reserva.fecha, reserva.hora) - momento) / 3600000;
  return horasQueFaltan >= CLUB.reservas.horasCancelacionMin;
}

// Comprueba una solicitud. Devuelve { campo: 'mensaje de error' } (vacío si todo está bien)
function validarSolicitud(solicitud, datos, momento) {
  const errores = {};
  const hoy = fechaAISO(momento);
  const actividad = buscarActividad(solicitud.actividadId);
  if (!actividad) {
    errores.actividad = 'Elige una clase o una ruta.';
  }

  // Modalidad (solo las clases tienen bono)
  let bono = null;
  if (actividad && solicitud.modalidad === 'bono') {
    bono = datos.bonos.find(function (b) { return b.id === solicitud.bonoId; }) || null;
    if (!bono || bono.actividadId !== actividad.id || situacionBono(bono, datos, hoy).estado !== 'activo') {
      errores.modalidad = 'Ese bono no se puede usar para esta actividad.';
      bono = null;
    }
  } else if (actividad && solicitud.modalidad === 'bono-nuevo' && !actividad.bono) {
    errores.modalidad = 'Esta actividad no tiene bono.';
  }

  // Día
  const fechaMaxima = sumarDias(hoy, CLUB.reservas.diasAntelacionMax);
  if (!esISOValida(solicitud.fecha)) {
    errores.fecha = 'Elige el día.';
  } else if (solicitud.fecha < hoy) {
    errores.fecha = 'Esa fecha ya ha pasado.';
  } else if (solicitud.fecha > fechaMaxima) {
    errores.fecha = 'Se puede reservar como mucho hasta el ' + fechaCorta(fechaMaxima) + '.';
  } else if (bono && solicitud.fecha > bono.caduca) {
    errores.fecha = 'Tu bono caduca el ' + fechaCorta(bono.caduca) + '. Elige un día anterior.';
  } else if (motivoCierre(solicitud.fecha)) {
    errores.fecha = motivoCierre(solicitud.fecha);
  }

  // Hora (se vuelve a comprobar al enviar, por si el turno se ha llenado mientras tanto)
  if (actividad && !errores.fecha) {
    const resultado = turnosDelDia(actividad, solicitud.fecha, datos, momento);
    const turno = resultado.turnos.find(function (t) { return t.hora === solicitud.hora; });
    if (resultado.aviso) errores.fecha = resultado.aviso;
    else if (!solicitud.hora) errores.hora = 'Elige una hora.';
    else if (!turno) errores.hora = 'Esa hora no está disponible.';
    else if (turno.estado === 'pasado') errores.hora = 'Hay que reservar con al menos ' + CLUB.reservas.horasAntelacionMin + ' horas de antelación.';
    else if (turno.estado === 'completo') errores.hora = 'Ese turno se acaba de completar. Elige otra hora.';
  }

  // Datos del jinete
  const jinete = solicitud.jinete;
  if (jinete.nombre.length < 3) errores.nombre = 'Escribe el nombre y apellidos del jinete.';

  const edad = Number(jinete.edad);
  if (!jinete.edad || !Number.isInteger(edad) || edad < 1 || edad > 99) {
    errores.edad = 'Escribe la edad en años.';
  } else if (actividad && edad < actividad.edadMin) {
    errores.edad = actividad.nombre + ' es a partir de ' + actividad.edadMin + ' años.';
  } else if (actividad && actividad.edadMax && edad > actividad.edadMax) {
    errores.edad = actividad.nombre + ' es para jinetes de ' + actividad.edadMin + ' a ' + actividad.edadMax + ' años.';
  }
  if (!errores.edad && edad < 18 && jinete.tutor.length < 3) {
    errores.tutor = 'Para menores de edad, escribe el nombre del padre, madre o tutor/a.';
  }

  if (jinete.telefono.replace(/\D/g, '').length < 9) errores.telefono = 'Escribe un teléfono de contacto (9 cifras).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(jinete.email)) errores.email = 'Escribe un email válido, por ejemplo nombre@correo.es.';
  if (!solicitud.privacidad) errores.privacidad = 'Debes aceptar la política de privacidad para enviar la solicitud.';

  // La misma persona no puede reservar dos veces a la misma hora
  if (!errores.fecha && !errores.hora && !errores.nombre) {
    const nombre = normalizarTexto(jinete.nombre);
    const repetida = datos.reservas.some(function (r) {
      return r.estado === 'activa' && r.fecha === solicitud.fecha && r.hora === solicitud.hora &&
        normalizarTexto(r.jinete.nombre) === nombre;
    });
    if (repetida) errores.hora = 'Ya hay una reserva a esa hora a nombre de ' + jinete.nombre + '.';
  }
  return errores;
}

// Crea la reserva (y el bono, si se compra uno) y la añade a los datos
function crearReserva(solicitud, datos, momento) {
  const actividad = buscarActividad(solicitud.actividadId);
  const hoy = fechaAISO(momento);
  const reserva = {
    id: generarCodigo('LH', datos.reservas.map(function (r) { return r.id; })),
    creada: marcaDeTiempo(),
    actividadId: actividad.id,
    actividadNombre: actividad.nombre,
    tipo: actividad.tipo,
    duracion: actividad.duracion,
    fecha: solicitud.fecha,
    hora: solicitud.hora,
    modalidad: actividad.bono ? solicitud.modalidad : 'suelta',   // 'suelta' | 'bono-nuevo' | 'bono'
    bonoId: null,
    precio: actividad.precio,                                     // importe de ESTA reserva
    jinete: {
      nombre: solicitud.jinete.nombre,
      edad: parseInt(solicitud.jinete.edad, 10),
      telefono: solicitud.jinete.telefono,
      email: solicitud.jinete.email,
      tutor: solicitud.jinete.tutor,
      notas: solicitud.jinete.notas
    },
    estado: 'activa',            // 'activa' | 'cancelada'
    canceladaEl: null,
    enviadaPor: null             // null | 'whatsapp' | 'email'
  };

  if (reserva.modalidad === 'bono-nuevo') {
    const bono = {
      id: generarCodigo('BN', datos.bonos.map(function (b) { return b.id; })),
      actividadId: actividad.id,
      actividadNombre: actividad.nombre,
      titular: reserva.jinete.nombre,
      clases: actividad.bono.clases,
      precio: actividad.bono.precio,
      compra: hoy,
      caduca: sumarDias(hoy, CLUB.bonos.validezDias)
    };
    datos.bonos.push(bono);
    reserva.bonoId = bono.id;
    reserva.precio = bono.precio;
  } else if (reserva.modalidad === 'bono') {
    reserva.bonoId = solicitud.bonoId;
    reserva.precio = 0;
  }

  datos.reservas.push(reserva);
  return reserva;
}

/* ---------- Textos de los mensajes para el club ---------- */

function buscarBono(datos, id) {
  return datos.bonos.find(function (b) { return b.id === id; }) || null;
}

function textoModalidad(reserva, datos) {
  const bono = buscarBono(datos, reserva.bonoId);
  const quedan = bono ? situacionBono(bono, datos, hoyISO()).restantes : null;
  if (reserva.modalidad === 'bono-nuevo') {
    return 'Compra de bono de ' + (bono ? bono.clases : 5) + ' clases (' + reserva.bonoId + '), 1.ª clase';
  }
  if (reserva.modalidad === 'bono') {
    return 'Clase de mi bono ' + reserva.bonoId + (quedan !== null ? ' (quedan ' + quedan + ')' : '');
  }
  return reserva.tipo === 'ruta' ? 'Plaza para 1 jinete' : 'Clase suelta';
}

function textoImporte(reserva, datos) {
  if (reserva.modalidad === 'bono') return 'Incluida en el bono';
  if (reserva.modalidad === 'bono-nuevo') {
    const bono = buscarBono(datos, reserva.bonoId);
    return euros(reserva.precio) + ' por el bono de ' + (bono ? bono.clases : 5) + ' clases (pago en el club)';
  }
  return euros(reserva.precio) + ' (pago en el club)';
}

// Lista de [etiqueta, valor] con los datos de una reserva
function lineasReserva(reserva, datos) {
  const lineas = [
    ['Código', reserva.id],
    ['Actividad', reserva.actividadNombre + ' (' + textoDuracion(reserva.duracion) + ')'],
    ['Fecha', fechaLarga(reserva.fecha)],
    ['Hora', reserva.hora + ' – ' + sumarMinutos(reserva.hora, reserva.duracion)],
    ['Modalidad', textoModalidad(reserva, datos)],
    ['Importe', textoImporte(reserva, datos)],
    ['Jinete', reserva.jinete.nombre + ' (' + reserva.jinete.edad + ' años)']
  ];
  if (reserva.jinete.tutor) lineas.push(['Tutor/a legal', reserva.jinete.tutor]);
  lineas.push(['Teléfono', reserva.jinete.telefono]);
  lineas.push(['Email', reserva.jinete.email]);
  if (reserva.jinete.notas) lineas.push(['Observaciones', reserva.jinete.notas]);
  return lineas;
}

// formato: 'whatsapp' (con *negritas*) o 'email' (texto normal)
function mensajeReserva(reserva, datos, formato) {
  const n = formato === 'whatsapp' ? '*' : '';
  const cuerpo = lineasReserva(reserva, datos).map(function (linea) {
    return n + linea[0] + ':' + n + ' ' + linea[1];
  }).join('\n');
  return 'Hola, quiero solicitar esta reserva en el ' + CLUB.nombre + ':\n\n' + cuerpo +
    '\n\n¿Me confirmáis la plaza? ¡Gracias!' + (formato === 'email' ? '\n\n' + reserva.jinete.nombre : '');
}

function asuntoReserva(reserva) {
  return 'Solicitud de reserva ' + reserva.id + ' – ' + reserva.actividadNombre + ' – ' +
    fechaCorta(reserva.fecha) + ' ' + reserva.hora;
}

function mensajeCancelacion(reserva, formato) {
  const n = formato === 'whatsapp' ? '*' : '';
  return 'Hola, quiero CANCELAR esta reserva en el ' + CLUB.nombre + ':\n\n' +
    n + 'Código:' + n + ' ' + reserva.id + '\n' +
    n + 'Actividad:' + n + ' ' + reserva.actividadNombre + '\n' +
    n + 'Fecha:' + n + ' ' + fechaLarga(reserva.fecha) + ', a las ' + reserva.hora + '\n' +
    n + 'Jinete:' + n + ' ' + reserva.jinete.nombre + '\n\nGracias.';
}

function asuntoCancelacion(reserva) {
  return 'Cancelación de reserva ' + reserva.id;
}

/* ======================= 2. INTERFAZ ======================= */

let datosReservas = datosVacios();   // copia de trabajo de lo guardado en el navegador
let modalidadPreferida = 'suelta';   // la que llega en el enlace, p. ej. #reservas?modalidad=bono-nuevo

const CAMPOS_RESERVA = ['actividad', 'modalidad', 'fecha', 'hora', 'nombre', 'edad', 'tutor', 'telefono', 'email', 'privacidad'];

function iniciarReservas() {
  datosReservas = cargarDatos();
  const formulario = document.getElementById('form-reserva');
  if (formulario) prepararFormularioReserva(formulario);

  document.addEventListener('click', alPulsarAccionReserva);

  // Si se cambian las reservas en otra pestaña, se actualiza esta
  window.addEventListener('storage', function (evento) {
    if (evento.key === CLAVE_ALMACEN) {
      datosReservas = cargarDatos();
      refrescarReservas();
    }
  });

  GANCHOS_PAGINA.reservas = abrirPaginaReservas;
  GANCHOS_PAGINA['mis-reservas'] = pintarMisReservas;
  refrescarReservas();
}

// Recarga desde el navegador (salvo que no se pueda guardar: entonces se usa la copia en memoria)
function recargarDatosReservas() {
  if (almacenDisponible) datosReservas = cargarDatos();
}

function refrescarReservas() {
  if (document.getElementById('form-reserva')) {
    pintarModalidades();
    pintarHoras();
    pintarResumen();
  }
  pintarMisReservas();
  actualizarContadorReservas();
  mostrarAvisoAlmacen();
}

/* ---------- Formulario ---------- */

function prepararFormularioReserva(formulario) {
  // Lista de actividades, agrupadas en clases y rutas
  const lista = document.getElementById('r-actividad');
  lista.innerHTML = '<option value="">Elige una clase o una ruta…</option>' +
    grupoDeOpciones('Clases', 'clase') + grupoDeOpciones('Rutas a caballo', 'ruta');

  ajustarLimitesFecha();

  lista.addEventListener('change', alCambiarActividad);
  document.getElementById('r-modalidades').addEventListener('change', alCambiarModalidad);
  document.getElementById('r-fecha').addEventListener('change', function () {
    limpiarErrorReserva('fecha');
    pintarHoras();
    pintarResumen();
  });
  document.getElementById('r-horas').addEventListener('change', function () {
    limpiarErrorReserva('hora');
    pintarResumen();
  });
  document.getElementById('r-edad').addEventListener('input', mostrarCampoTutor);
  formulario.addEventListener('input', function (evento) {
    if (evento.target.name) limpiarErrorReserva(evento.target.name);
  });
  formulario.addEventListener('submit', alEnviarReserva);
}

function grupoDeOpciones(etiqueta, tipo) {
  const opciones = CLUB.actividades.filter(function (a) { return a.tipo === tipo; }).map(function (a) {
    return '<option value="' + a.id + '">' + a.nombre + ' · ' + euros(a.precio) + (tipo === 'ruta' ? ' por persona' : '') + '</option>';
  }).join('');
  return '<optgroup label="' + etiqueta + '">' + opciones + '</optgroup>';
}

function actividadElegida() {
  return buscarActividad(document.getElementById('r-actividad').value);
}

function horaElegida() {
  const marcada = document.querySelector('#r-horas input:checked');
  return marcada ? marcada.value : '';
}

function valorModalidad() {
  const marcada = document.querySelector('#r-modalidades input:checked');
  return marcada ? marcada.value : '';
}

// 'bono:BN-XXXXX' -> { modalidad: 'bono', bonoId: 'BN-XXXXX' }
function leerModalidad() {
  const valor = valorModalidad() || 'suelta';
  if (valor.indexOf('bono:') === 0) return { modalidad: 'bono', bonoId: valor.slice(5) };
  return { modalidad: valor, bonoId: null };
}

function elegirModalidad(valor) {
  const opcion = Array.from(document.querySelectorAll('#r-modalidades input')).find(function (i) {
    return i.value === valor;
  });
  if (opcion) opcion.checked = true;
  return Boolean(opcion);
}

function alCambiarActividad() {
  limpiarErrorReserva('actividad');
  limpiarErrorReserva('modalidad');
  const actividad = actividadElegida();
  const info = document.getElementById('r-actividad-info');
  if (actividad) {
    const partes = [textoDuracion(actividad.duracion), 'grupos de máximo ' + actividad.capacidad, textoEdad(actividad).toLowerCase()];
    if (actividad.requisito) partes.push('requisito: ' + actividad.requisito.charAt(0).toLowerCase() + actividad.requisito.slice(1));
    info.textContent = partes.join(' · ');
  } else {
    info.textContent = '';
  }
  pintarModalidades();
  ajustarLimitesFecha();
  pintarHoras();
  pintarResumen();
}

function alCambiarModalidad() {
  limpiarErrorReserva('modalidad');
  const modalidad = leerModalidad();
  if (modalidad.modalidad === 'bono') {
    // Al usar un bono, se rellena el nombre del titular si está vacío
    const bono = buscarBono(datosReservas, modalidad.bonoId);
    const nombre = document.getElementById('r-nombre');
    if (bono && !nombre.value.trim()) nombre.value = bono.titular;
  }
  ajustarLimitesFecha();
  pintarHoras();
  pintarResumen();
}

// El calendario solo deja elegir desde hoy hasta 60 días (o hasta que caduque el bono)
function ajustarLimitesFecha() {
  const fecha = document.getElementById('r-fecha');
  const hoy = hoyISO();
  let maximo = sumarDias(hoy, CLUB.reservas.diasAntelacionMax);
  const modalidad = leerModalidad();
  if (modalidad.modalidad === 'bono') {
    const bono = buscarBono(datosReservas, modalidad.bonoId);
    if (bono && bono.caduca < maximo) maximo = bono.caduca;
  }
  fecha.min = hoy;
  fecha.max = maximo;
}

function pintarModalidades() {
  const grupo = document.getElementById('r-modalidad-grupo');
  const contenedor = document.getElementById('r-modalidades');
  const actividad = actividadElegida();
  if (!actividad || !actividad.bono) {
    grupo.hidden = true;
    contenedor.innerHTML = '';
    return;
  }
  const anterior = valorModalidad();
  const hoy = hoyISO();
  const sinBono = actividad.precio * actividad.bono.clases;

  let html = opcionModalidad('suelta', 'Clase suelta', euros(actividad.precio) + ' por clase');
  html += opcionModalidad('bono-nuevo',
    'Bono ' + actividad.bono.clases + ' clases <span class="etiqueta-mini">Oferta</span>',
    euros(actividad.bono.precio) + ' · ' + euros(actividad.bono.precio / actividad.bono.clases) +
    ' por clase · ahorras ' + euros(sinBono - actividad.bono.precio));
  bonosUsables(datosReservas, actividad.id, hoy).forEach(function (bono) {
    const situacion = situacionBono(bono, datosReservas, hoy);
    html += opcionModalidad('bono:' + bono.id, 'Usar mi bono ' + bono.id,
      'Quedan ' + situacion.restantes + ' de ' + bono.clases + ' clases · caduca el ' + fechaCorta(bono.caduca) +
      ' · titular: ' + escaparHTML(bono.titular));
  });
  contenedor.innerHTML = html;
  grupo.hidden = false;

  // Se mantiene la opción elegida si sigue existiendo
  if (!(anterior && elegirModalidad(anterior)) && !elegirModalidad(modalidadPreferida)) {
    elegirModalidad('suelta');
  }
}

function opcionModalidad(valor, titulo, detalle) {
  return '<label class="opcion">' +
    '<input type="radio" name="modalidad" value="' + valor + '">' +
    '<span class="opcion__titulo">' + titulo + '</span>' +
    '<span class="opcion__detalle">' + detalle + '</span>' +
    '</label>';
}

function pintarHoras() {
  const contenedor = document.getElementById('r-horas');
  const actividad = actividadElegida();
  const campoFecha = document.getElementById('r-fecha');
  const iso = campoFecha.value;
  const anterior = horaElegida();

  if (!actividad || !esISOValida(iso)) {
    contenedor.innerHTML = '<p class="campo__ayuda">Elige la actividad y el día para ver las horas libres.</p>';
    return;
  }
  if (iso < hoyISO()) {
    contenedor.innerHTML = '<p class="aviso aviso--info">Ese día ya ha pasado. Elige otra fecha.</p>';
    return;
  }
  if (campoFecha.max && iso > campoFecha.max) {
    contenedor.innerHTML = '<p class="aviso aviso--info">Se puede reservar como mucho hasta el ' + fechaCorta(campoFecha.max) + '.</p>';
    return;
  }

  const resultado = turnosDelDia(actividad, iso, datosReservas, ahora());
  if (resultado.aviso) {
    contenedor.innerHTML = '<p class="aviso aviso--info">' + resultado.aviso + '</p>';
    return;
  }

  contenedor.innerHTML = resultado.turnos.map(function (t) {
    const libre = t.estado === 'libre';
    let plazas = t.libres === 1 ? '¡Última plaza!' : t.libres + ' plazas';
    if (t.estado === 'completo') plazas = 'Completo';
    if (t.estado === 'pasado') plazas = 'Ya no disponible';
    return '<label class="turno' + (libre ? '' : ' turno--no') + '">' +
      '<input type="radio" name="hora" value="' + t.hora + '"' +
      (libre ? '' : ' disabled') + (libre && t.hora === anterior ? ' checked' : '') + '>' +
      '<span class="turno__hora">' + t.hora + '</span>' +
      '<span class="turno__plazas">' + plazas + '</span>' +
      '</label>';
  }).join('');

  const hayLibres = resultado.turnos.some(function (t) { return t.estado === 'libre'; });
  if (!hayLibres) {
    contenedor.insertAdjacentHTML('beforeend', '<p class="aviso aviso--info">No quedan plazas este día. Prueba con otra fecha.</p>');
  }
}

function pintarResumen() {
  const lista = document.getElementById('r-resumen');
  if (!lista) return;
  const actividad = actividadElegida();
  const iso = document.getElementById('r-fecha').value;
  const hora = horaElegida();
  const modalidad = leerModalidad();

  const filas = [
    ['Actividad', actividad ? actividad.nombre : '—'],
    ['Día', esISOValida(iso) ? fechaLarga(iso) : '—'],
    ['Hora', actividad && hora ? hora + ' – ' + sumarMinutos(hora, actividad.duracion) : '—']
  ];
  let total = '—';
  if (actividad) {
    total = euros(actividad.precio);
    if (actividad.bono) {
      let texto = 'Clase suelta';
      if (modalidad.modalidad === 'bono-nuevo') {
        texto = 'Bono ' + actividad.bono.clases + ' clases (incluye esta clase)';
        total = euros(actividad.bono.precio);
      } else if (modalidad.modalidad === 'bono') {
        texto = 'Clase de mi bono ' + modalidad.bonoId;
        total = euros(0);
      }
      filas.push(['Modalidad', texto]);
    }
  }
  lista.innerHTML = filas.map(function (f) {
    return '<div><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>';
  }).join('');
  document.getElementById('r-total').textContent = total;
  document.getElementById('r-pago').textContent = CLUB.reservas.formaPago;
}

function mostrarCampoTutor() {
  const edad = parseInt(document.getElementById('r-edad').value, 10);
  document.getElementById('r-tutor-campo').hidden = !(edad > 0 && edad < 18);
}

function leerFormularioReserva() {
  const actividad = actividadElegida();
  const modalidad = leerModalidad();
  return {
    actividadId: actividad ? actividad.id : '',
    modalidad: actividad && actividad.bono ? modalidad.modalidad : 'suelta',
    bonoId: modalidad.bonoId,
    fecha: document.getElementById('r-fecha').value,
    hora: horaElegida(),
    privacidad: document.getElementById('r-privacidad').checked,
    jinete: {
      nombre: valorCampo('r-nombre'),
      edad: valorCampo('r-edad'),
      telefono: valorCampo('r-telefono'),
      email: valorCampo('r-email'),
      tutor: document.getElementById('r-tutor-campo').hidden ? '' : valorCampo('r-tutor'),
      notas: valorCampo('r-notas')
    }
  };
}

/* ---------- Errores del formulario ---------- */

function limpiarErrorReserva(campo) {
  const mensaje = document.getElementById('e-' + campo);
  if (mensaje) mensaje.textContent = '';
  const control = document.getElementById('r-' + campo);
  if (control) control.removeAttribute('aria-invalid');
}

function mostrarErroresReserva(errores) {
  CAMPOS_RESERVA.forEach(limpiarErrorReserva);
  const resumen = document.getElementById('r-errores');
  const campos = CAMPOS_RESERVA.filter(function (c) { return errores[c]; });
  if (campos.length === 0) {
    resumen.hidden = true;
    return;
  }
  campos.forEach(function (campo) {
    document.getElementById('e-' + campo).textContent = errores[campo];
    const control = document.getElementById('r-' + campo);
    if (control) control.setAttribute('aria-invalid', 'true');
  });
  resumen.textContent = campos.length === 1
    ? 'Revisa el campo marcado en rojo.'
    : 'Revisa los ' + campos.length + ' campos marcados en rojo.';
  resumen.hidden = false;

  // El foco va al primer campo con error
  const primero = campos[0];
  let destino = document.getElementById('r-' + primero);
  if (primero === 'hora') destino = document.querySelector('#r-horas input:not([disabled])') || document.getElementById('r-fecha');
  if (primero === 'modalidad') destino = document.querySelector('#r-modalidades input');
  if (destino) destino.focus();
}

/* ---------- Enviar la solicitud ---------- */

function alEnviarReserva(evento) {
  evento.preventDefault();
  recargarDatosReservas();               // por si se ha reservado algo en otra pestaña
  const momento = ahora();
  const solicitud = leerFormularioReserva();
  const errores = validarSolicitud(solicitud, datosReservas, momento);

  if (Object.keys(errores).length > 0) {
    pintarHoras();                       // por si algún turno se ha llenado
    mostrarErroresReserva(errores);
    return;
  }

  mostrarErroresReserva({});
  const reserva = crearReserva(solicitud, datosReservas, momento);
  guardarDatos(datosReservas);
  mostrarAvisoAlmacen();
  actualizarContadorReservas();
  pintarMisReservas();
  mostrarConfirmacion(reserva);
}

function mostrarConfirmacion(reserva) {
  const caja = document.getElementById('r-confirmacion');
  const textoEmail = mensajeReserva(reserva, datosReservas, 'email');
  const datosLista = lineasReserva(reserva, datosReservas).slice(1).map(function (linea) {
    return '<div><dt>' + linea[0] + '</dt><dd>' + escaparHTML(linea[1]) + '</dd></div>';
  }).join('');

  caja.innerHTML =
    '<div class="confirmacion__cabecera">' + icono('check', 'confirmacion__icono') +
      '<div><p class="antetitulo">Solicitud creada</p>' +
      '<h2 id="t-confirmacion" tabindex="-1">¡Ya casi está, ' + escaparHTML(primerNombre(reserva.jinete.nombre)) + '!</h2></div>' +
    '</div>' +
    '<p>Tu código de reserva es <strong class="codigo">' + reserva.id + '</strong>' +
      (reserva.modalidad === 'bono-nuevo' ? ' y el de tu bono, <strong class="codigo">' + reserva.bonoId + '</strong>' : '') + '.</p>' +
    '<dl class="lista-datos">' + datosLista + '</dl>' +
    '<div class="aviso aviso--importante"><p><strong>Último paso: envía la solicitud al club.</strong> ' +
      'La reserva se ha guardado en este navegador, pero el club solo la recibe cuando se la envías. ' +
      'Te confirmaremos la plaza por el mismo medio.</p></div>' +
    (almacenDisponible ? '' : '<p class="aviso aviso--error">No se ha podido guardar en este navegador: envíala ahora para no perderla.</p>') +
    '<div class="acciones">' +
      '<a class="boton boton--whatsapp" href="' + escaparHTML(enlaceWhatsApp(mensajeReserva(reserva, datosReservas, 'whatsapp'))) +
        '" target="_blank" rel="noopener" data-enviada="whatsapp" data-reserva="' + reserva.id + '">' + icono('whatsapp') + 'Enviar por WhatsApp</a>' +
      '<a class="boton boton--primario" href="' + escaparHTML(enlaceEmail(asuntoReserva(reserva), textoEmail)) +
        '" data-enviada="email" data-reserva="' + reserva.id + '">' + icono('email') + 'Enviar por email</a>' +
      '<button class="boton boton--secundario" type="button" data-copiar="' + reserva.id + '">' + icono('copiar') + 'Copiar mensaje</button>' +
    '</div>' +
    '<p class="estado-copia" role="status" data-estado-copia></p>' +
    '<details class="mensaje-previo"><summary>Ver el mensaje que se enviará</summary><pre>' + escaparHTML(textoEmail) + '</pre></details>' +
    '<div class="acciones acciones--secundarias">' +
      '<a class="boton boton--secundario" href="#mis-reservas">' + icono('lista') + 'Ver mis reservas</a>' +
      '<button class="boton boton--texto" type="button" data-otra-reserva>Hacer otra reserva</button>' +
    '</div>';

  document.getElementById('r-paso-formulario').hidden = true;
  caja.hidden = false;
  const titulo = document.getElementById('t-confirmacion');
  titulo.focus({ preventScroll: true });
  caja.scrollIntoView({ block: 'start' });
}

// Vuelve al formulario conservando los datos del jinete
function otraReserva() {
  const ultima = datosReservas.reservas[datosReservas.reservas.length - 1];
  document.getElementById('r-confirmacion').hidden = true;
  document.getElementById('r-paso-formulario').hidden = false;
  document.getElementById('r-notas').value = '';
  const marcada = document.querySelector('#r-horas input:checked');
  if (marcada) marcada.checked = false;
  pintarModalidades();
  // Si acaba de comprar un bono, se propone usarlo en la siguiente clase
  if (ultima && ultima.bonoId) elegirModalidad('bono:' + ultima.bonoId);
  ajustarLimitesFecha();
  pintarHoras();
  pintarResumen();
  document.getElementById('r-fecha').focus();
}

// Se ejecuta cada vez que se abre la página de reservas
function abrirPaginaReservas(parametros) {
  document.getElementById('r-confirmacion').hidden = true;
  document.getElementById('r-paso-formulario').hidden = false;
  recargarDatosReservas();

  const actividad = parametros.get('actividad');
  const modalidad = parametros.get('modalidad');
  const bono = parametros.get('bono');
  if (modalidad === 'bono' && bono) modalidadPreferida = 'bono:' + bono;
  else if (modalidad === 'bono-nuevo' || modalidad === 'suelta') modalidadPreferida = modalidad;

  if (actividad && buscarActividad(actividad)) {
    document.getElementById('r-actividad').value = actividad;
  }
  alCambiarActividad();
  if (modalidad && elegirModalidad(modalidadPreferida)) alCambiarModalidad();
}

/* ---------- Botones de las reservas (confirmación y "Mis reservas") ---------- */

function alPulsarAccionReserva(evento) {
  const enviar = evento.target.closest('[data-enviada]');
  if (enviar) {
    marcarComoEnviada(enviar.getAttribute('data-reserva'), enviar.getAttribute('data-enviada'));
    return;
  }
  const copiar = evento.target.closest('[data-copiar]');
  if (copiar) {
    copiarMensajeReserva(copiar);
    return;
  }
  const cancelar = evento.target.closest('[data-cancelar]');
  if (cancelar) {
    cancelarReserva(cancelar.getAttribute('data-cancelar'));
    return;
  }
  if (evento.target.closest('[data-otra-reserva]')) {
    otraReserva();
    return;
  }
  if (evento.target.closest('[data-borrar-datos]')) {
    borrarMisDatos();
  }
}

function buscarReserva(id) {
  return datosReservas.reservas.find(function (r) { return r.id === id; }) || null;
}

function marcarComoEnviada(id, medio) {
  const reserva = buscarReserva(id);
  if (!reserva) return;
  reserva.enviadaPor = medio;
  guardarDatos(datosReservas);
  // Se repinta después, para no interrumpir la apertura del enlace
  setTimeout(pintarMisReservas, 0);
}

function copiarMensajeReserva(boton) {
  const reserva = buscarReserva(boton.getAttribute('data-copiar'));
  if (!reserva) return;
  const estado = boton.closest('.confirmacion').querySelector('[data-estado-copia]');
  copiarTexto(mensajeReserva(reserva, datosReservas, 'email')).then(function (copiado) {
    estado.textContent = copiado
      ? 'Mensaje copiado. Pégalo en un correo a ' + CLUB.contacto.email + ' o en un WhatsApp al ' + CLUB.contacto.telefono + '.'
      : 'No se ha podido copiar. Abre «Ver el mensaje que se enviará» y cópialo a mano.';
    boton.focus();
  });
}

function cancelarReserva(id) {
  const reserva = buscarReserva(id);
  if (!reserva) return;
  if (!puedeCancelar(reserva, ahora())) {
    window.alert('Esta reserva ya no se puede cancelar online. Llama al club: ' + CLUB.contacto.telefono);
    return;
  }
  const pregunta = '¿Seguro que quieres cancelar la reserva ' + reserva.id + ' (' + reserva.actividadNombre + ', ' +
    fechaLarga(reserva.fecha) + ' a las ' + reserva.hora + ')?' +
    (reserva.bonoId ? '\n\nLa clase volverá a tu bono.' : '');
  if (!window.confirm(pregunta)) return;

  reserva.estado = 'cancelada';
  reserva.canceladaEl = marcaDeTiempo();
  guardarDatos(datosReservas);
  refrescarReservas();

  const estado = document.getElementById('mis-reservas-estado');
  estado.innerHTML = '<p><strong>Reserva ' + reserva.id + ' cancelada' + (reserva.bonoId ? ' y clase devuelta a tu bono' : '') + '.</strong> ' +
    (reserva.enviadaPor ? 'Como ya la habías enviado al club, avísales de la cancelación:' : 'Si ya se la habías enviado al club, avísales:') + '</p>' +
    '<div class="acciones">' +
      '<a class="boton boton--whatsapp boton--peq" target="_blank" rel="noopener" href="' +
        escaparHTML(enlaceWhatsApp(mensajeCancelacion(reserva, 'whatsapp'))) + '">' + icono('whatsapp') + 'Avisar por WhatsApp</a>' +
      '<a class="boton boton--secundario boton--peq" href="' +
        escaparHTML(enlaceEmail(asuntoCancelacion(reserva), mensajeCancelacion(reserva, 'email'))) + '">' + icono('email') + 'Avisar por email</a>' +
    '</div>';
  estado.hidden = false;
  estado.focus();
}

function borrarMisDatos() {
  const pregunta = 'Se borrarán todas tus reservas y bonos guardados en este navegador. ' +
    'Esto no avisa al club. ¿Quieres continuar?';
  if (!window.confirm(pregunta)) return;
  datosReservas = datosVacios();
  guardarDatos(datosReservas);
  document.getElementById('mis-reservas-estado').hidden = true;
  refrescarReservas();
}

/* ---------- Página "Mis reservas" ---------- */

function ordenarPorFecha(a, b) {
  const x = a.fecha + ' ' + a.hora;
  const y = b.fecha + ' ' + b.hora;
  return x < y ? -1 : (x > y ? 1 : 0);
}

function pintarMisReservas() {
  const contenedor = document.getElementById('mis-reservas-contenido');
  if (!contenedor) return;
  const momento = ahora();
  const hoy = fechaAISO(momento);
  const todas = datosReservas.reservas.slice();
  const proximas = todas.filter(function (r) { return r.estado === 'activa' && !esReservaPasada(r, momento); }).sort(ordenarPorFecha);
  const historial = todas.filter(function (r) { return r.estado !== 'activa' || esReservaPasada(r, momento); })
    .sort(function (a, b) { return ordenarPorFecha(b, a); });
  const bonos = datosReservas.bonos.slice().sort(function (a, b) { return a.compra < b.compra ? 1 : -1; });

  if (todas.length === 0 && bonos.length === 0) {
    contenedor.innerHTML = '<div class="vacio">' + icono('calendario', 'vacio__icono') +
      '<h2>Todavía no tienes reservas</h2>' +
      '<p>Cuando reserves una clase o una ruta, aparecerá aquí.</p>' +
      '<a class="boton boton--primario" href="#reservas">Reservar una clase</a></div>';
    return;
  }

  let html = '<section class="bloque-mis" aria-labelledby="t-proximas"><h2 id="t-proximas">Próximas reservas</h2>';
  html += proximas.length
    ? '<div class="lista-reservas">' + proximas.map(function (r) { return tarjetaReserva(r, momento); }).join('') + '</div>'
    : '<p>No tienes reservas próximas. <a href="#reservas">Reserva una clase</a>.</p>';
  html += '</section>';

  if (bonos.length) {
    html += '<section class="bloque-mis" aria-labelledby="t-mis-bonos"><h2 id="t-mis-bonos">Mis bonos</h2>' +
      '<div class="rejilla rejilla--2">' + bonos.map(function (b) { return tarjetaBonoPropio(b, hoy); }).join('') + '</div></section>';
  }
  if (historial.length) {
    html += '<details class="historial"><summary>Historial: reservas pasadas y canceladas (' + historial.length + ')</summary>' +
      '<div class="lista-reservas">' + historial.map(function (r) { return tarjetaReserva(r, momento); }).join('') + '</div></details>';
  }
  html += '<p class="borrar-datos"><button class="boton boton--texto" type="button" data-borrar-datos>' +
    icono('papelera') + 'Borrar mis datos de este navegador</button></p>';
  contenedor.innerHTML = html;
}

function tarjetaReserva(reserva, momento) {
  const pasada = esReservaPasada(reserva, momento);
  let estado = '<span class="chip chip--aviso">Sin enviar al club</span>';
  if (reserva.estado === 'cancelada') estado = '<span class="chip chip--gris">Cancelada</span>';
  else if (pasada) estado = '<span class="chip chip--gris">Realizada</span>';
  else if (reserva.enviadaPor) {
    estado = '<span class="chip chip--ok">' + icono('check') + 'Enviada por ' + (reserva.enviadaPor === 'whatsapp' ? 'WhatsApp' : 'email') + '</span>';
  }

  let acciones = '';
  if (reserva.estado === 'activa' && !pasada) {
    acciones = '<div class="acciones">' +
      '<a class="boton boton--whatsapp boton--peq" target="_blank" rel="noopener" href="' +
        escaparHTML(enlaceWhatsApp(mensajeReserva(reserva, datosReservas, 'whatsapp'))) +
        '" data-enviada="whatsapp" data-reserva="' + reserva.id + '">' + icono('whatsapp') + (reserva.enviadaPor ? 'Reenviar' : 'Enviar') + ' por WhatsApp</a>' +
      '<a class="boton boton--secundario boton--peq" href="' +
        escaparHTML(enlaceEmail(asuntoReserva(reserva), mensajeReserva(reserva, datosReservas, 'email'))) +
        '" data-enviada="email" data-reserva="' + reserva.id + '">' + icono('email') + 'Por email</a>' +
      (puedeCancelar(reserva, momento)
        ? '<button class="boton boton--peligro boton--peq" type="button" data-cancelar="' + reserva.id + '">' + icono('cerrar') + 'Cancelar</button>'
        : '<span class="nota">Faltan menos de ' + CLUB.reservas.horasCancelacionMin + ' h: para cancelar, <a href="' + enlaceTelefono() + '">llama al club</a>.</span>') +
      '</div>';
  }

  return '<article class="reserva-tarjeta' + (reserva.estado === 'cancelada' ? ' reserva-tarjeta--cancelada' : '') + '">' +
    '<div class="reserva-tarjeta__cabecera"><span class="codigo">' + reserva.id + '</span>' + estado + '</div>' +
    '<h3>' + escaparHTML(reserva.actividadNombre) + '</h3>' +
    '<p class="reserva-tarjeta__cuando">' + icono('calendario') + fechaLarga(reserva.fecha) + ' · ' +
      reserva.hora + ' – ' + sumarMinutos(reserva.hora, reserva.duracion) + '</p>' +
    '<p class="reserva-tarjeta__detalle">Jinete: <strong>' + escaparHTML(reserva.jinete.nombre) + '</strong> · ' +
      escaparHTML(textoModalidad(reserva, datosReservas)) + ' · ' + escaparHTML(textoImporte(reserva, datosReservas)) + '</p>' +
    acciones + '</article>';
}

function tarjetaBonoPropio(bono, hoy) {
  const s = situacionBono(bono, datosReservas, hoy);
  const chips = {
    activo: '<span class="chip chip--ok">Activo</span>',
    agotado: '<span class="chip chip--gris">Agotado</span>',
    caducado: '<span class="chip chip--error">Caducado</span>'
  };
  return '<article class="tarjeta tarjeta--cosida bono-propio">' +
    '<div class="reserva-tarjeta__cabecera"><span class="codigo">' + bono.id + '</span>' + chips[s.estado] + '</div>' +
    '<h3>Bono ' + bono.clases + ' clases · ' + escaparHTML(bono.actividadNombre) + '</h3>' +
    '<p class="nota">Titular: ' + escaparHTML(bono.titular) + ' · ' + euros(bono.precio) + ' · comprado el ' + fechaCorta(bono.compra) + '</p>' +
    '<progress max="' + bono.clases + '" value="' + s.usadas + '" aria-label="Clases reservadas del bono">' + s.usadas + ' de ' + bono.clases + '</progress>' +
    '<p><strong>' + s.usadas + ' de ' + bono.clases + '</strong> clases reservadas · quedan <strong>' + s.restantes + '</strong> · caduca el ' + fechaCorta(bono.caduca) + '</p>' +
    (s.estado === 'activo'
      ? '<a class="boton boton--primario boton--peq" href="#reservas?actividad=' + bono.actividadId + '&amp;modalidad=bono&amp;bono=' + bono.id + '">Reservar con este bono</a>'
      : '') +
    '</article>';
}

function actualizarContadorReservas() {
  const contador = document.getElementById('contador-reservas');
  if (!contador) return;
  const momento = ahora();
  const cuantas = datosReservas.reservas.filter(function (r) {
    return r.estado === 'activa' && !esReservaPasada(r, momento);
  }).length;
  contador.innerHTML = cuantas + '<span class="solo-lectores"> ' + (cuantas === 1 ? 'reserva próxima' : 'reservas próximas') + '</span>';
  contador.hidden = cuantas === 0;
}

function mostrarAvisoAlmacen() {
  const aviso = document.getElementById('aviso-almacen');
  if (aviso) aviso.hidden = almacenDisponible;
}
