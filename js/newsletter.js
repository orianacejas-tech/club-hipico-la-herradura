/* ==========================================================================
   newsletter.js · Suscripción a la newsletter (la lista está en Supabase)
   --------------------------------------------------------------------------
   · El formulario de alta llama a la función «suscribirse» de la base de datos
   · El formulario de baja llama a la función «darse_de_baja»
   · La web NO puede leer la lista de suscriptores: solo se ve dentro de Supabase
   · Los datos de conexión están en js/datos.js (CLUB.newsletter) y la base de
     datos se crea con el archivo supabase/newsletter.sql
   ========================================================================== */

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ESPERA_MAXIMA_MS = 15000;   // si Supabase no responde en 15 segundos, se avisa

/* ======================= 1. CONEXIÓN CON SUPABASE ======================= */

// La clave secreta da acceso total a la base de datos: nunca debe estar en la web
function esClaveSecreta(clave) {
  if (clave.indexOf('sb_secret_') === 0) return true;
  try {
    // Claves antiguas (JWT): la parte central dice qué papel tiene la clave
    const datos = JSON.parse(atob(clave.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return datos.role === 'service_role';
  } catch (error) {
    return false;
  }
}

// Comprueba que js/datos.js tiene bien puestos los datos de Supabase. Si no, lo explica.
function comprobarConexion(idEstado) {
  const n = CLUB.newsletter;
  if (n && n.supabaseClave && esClaveSecreta(n.supabaseClave)) {
    mostrarEstado(idEstado, 'error', 'La web tiene puesta la clave secreta de Supabase y no se puede usar. ' +
      'Cámbiala por la clave publishable en js/datos.js.');
    return false;
  }
  if (!n || !n.supabaseUrl || !n.supabaseClave) {
    mostrarEstado(idEstado, 'importante', 'La newsletter todavía no está conectada a la base de datos, ' +
      'así que no se ha guardado nada. Vuelve a intentarlo más adelante.');
    return false;
  }
  return true;
}

// Llama a una función de la base de datos (por ejemplo 'suscribirse') y devuelve su respuesta.
// Si falla, el error lleva un «tipo»: 'sin-conexion', 'datos', 'limite' o 'servidor'.
function llamarSupabase(funcion, parametros) {
  const n = CLUB.newsletter;
  const cabeceras = { 'Content-Type': 'application/json', apikey: n.supabaseClave };
  // Las claves antiguas (anon) van también en Authorization; las nuevas (sb_…) no
  if (n.supabaseClave.indexOf('sb_') !== 0) cabeceras.Authorization = 'Bearer ' + n.supabaseClave;

  const control = new AbortController();
  const temporizador = setTimeout(function () { control.abort(); }, ESPERA_MAXIMA_MS);

  // Sirve igual 'https://xxx.supabase.co' que 'https://xxx.supabase.co/rest/v1/'
  const base = n.supabaseUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  return fetch(base + '/rest/v1/rpc/' + funcion, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify(parametros),
    signal: control.signal
  }).then(function (respuesta) {
    clearTimeout(temporizador);
    return respuesta.json().catch(function () { return null; }).then(function (datos) {
      if (respuesta.ok) return datos;
      const codigo = datos && datos.code;
      throw errorNewsletter(codigo === '22023' ? 'datos' : codigo === '54000' ? 'limite' : 'servidor', datos);
    });
  }, function (fallo) {
    clearTimeout(temporizador);
    throw errorNewsletter('sin-conexion', fallo);
  });
}

function errorNewsletter(tipo, detalle) {
  // El detalle se ve en la consola del navegador (F12): ayuda a encontrar el problema
  if (detalle) console.error('Newsletter (' + tipo + '):', detalle);
  const error = new Error(tipo);
  error.tipo = tipo;
  return error;
}

function mensajeError(tipo) {
  if (tipo === 'sin-conexion') return 'No hemos podido conectar con el servidor. Comprueba tu conexión a internet e inténtalo de nuevo.';
  if (tipo === 'datos') return 'Revisa el email: parece que no es válido.';
  if (tipo === 'limite') return 'Ahora mismo estamos recibiendo muchas suscripciones. Espera un minuto e inténtalo de nuevo.';
  return 'No se ha podido completar. Inténtalo de nuevo en unos minutos o escríbenos a ' + CLUB.contacto.email + '.';
}

/* ======================= 2. FORMULARIOS DE ALTA Y BAJA ======================= */

function iniciarNewsletter() {
  const alta = document.getElementById('form-newsletter');
  const baja = document.getElementById('form-baja');
  if (alta) alta.addEventListener('submit', enviarSuscripcion);
  if (baja) baja.addEventListener('submit', enviarBaja);
  [alta, baja].forEach(function (formulario) {
    if (formulario) formulario.addEventListener('input', limpiarError);
  });

  // #baja?email=nombre@correo.es (el enlace de los correos) -> se rellena el email
  GANCHOS_PAGINA.newsletter = function (parametros) {
    const email = parametros.get('email');
    if (email && location.hash.indexOf('#baja') === 0) document.getElementById('b-email').value = email;
  };
}

// El mensaje de error de cada campo tiene el mismo id con una «e» delante: n-email -> en-email
function limpiarError(evento) {
  const error = document.getElementById('e' + evento.target.id);
  if (error) error.textContent = '';
  evento.target.removeAttribute('aria-invalid');
}

// Pone o quita los mensajes de error de los campos. Devuelve true si no hay ninguno.
function marcarErrores(errores, campos) {
  campos.forEach(function (id) {
    const control = document.getElementById(id);
    document.getElementById('e' + id).textContent = errores[id] || '';
    if (errores[id]) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  });
  const primero = campos.find(function (id) { return errores[id]; });
  if (primero) document.getElementById(primero).focus();
  return !primero;
}

// tipo: 'ok', 'error' o 'importante' · con texto vacío, el aviso se oculta
function mostrarEstado(id, tipo, texto) {
  const estado = document.getElementById(id);
  estado.className = 'aviso aviso--' + tipo;
  estado.textContent = texto;
  estado.hidden = !texto;
}

// Mientras se espera a Supabase, el botón se desactiva para no enviar dos veces
function marcarOcupado(formulario, ocupado) {
  const boton = formulario.querySelector('[type="submit"]');
  const texto = boton.querySelector('span');
  if (!texto.dataset.original) texto.dataset.original = texto.textContent;
  texto.textContent = ocupado ? 'Enviando…' : texto.dataset.original;
  boton.disabled = ocupado;
  formulario.setAttribute('aria-busy', String(ocupado));
}

function enviarSuscripcion(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const nombre = valorCampo('n-nombre');
  const email = valorCampo('n-email').toLowerCase();
  const errores = {};
  if (!EMAIL_VALIDO.test(email)) errores['n-email'] = 'Escribe un email válido, por ejemplo nombre@correo.es.';
  if (!document.getElementById('n-privacidad').checked) errores['n-privacidad'] = 'Para suscribirte tienes que aceptar la política de privacidad.';

  mostrarEstado('n-estado', 'ok', '');
  if (!marcarErrores(errores, ['n-email', 'n-privacidad'])) return;

  // Campo trampa: las personas no lo ven; si llega relleno es un robot y no se guarda nada
  if (valorCampo('n-web')) {
    suscripcionHecha(formulario, nombre, email);
    return;
  }
  if (!comprobarConexion('n-estado')) return;

  const temas = Array.from(formulario.querySelectorAll('input[name="tema"]:checked')).map(function (casilla) {
    return casilla.value;
  });
  marcarOcupado(formulario, true);
  llamarSupabase('suscribirse', {
    p_email: email,
    p_nombre: nombre || null,
    p_intereses: temas,
    p_acepta_privacidad: true
  }).then(function () {
    suscripcionHecha(formulario, nombre, email);
  }, function (error) {
    mostrarEstado('n-estado', 'error', mensajeError(error.tipo));
  }).finally(function () {
    marcarOcupado(formulario, false);
    document.getElementById('n-estado').focus();
  });
}

function suscripcionHecha(formulario, nombre, email) {
  formulario.reset();
  mostrarEstado('n-estado', 'ok', (nombre ? '¡Gracias, ' + primerNombre(nombre) + '! ' : '¡Gracias! ') +
    'Ya estás en la lista: te escribiremos a ' + email + ' con las novedades del club. ' +
    'Si ya estabas en la lista, hemos actualizado tus temas.');
}

function enviarBaja(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const email = valorCampo('b-email').toLowerCase();
  const errores = EMAIL_VALIDO.test(email) ? {} : { 'b-email': 'Escribe el email con el que te suscribiste.' };

  mostrarEstado('b-estado', 'ok', '');
  if (!marcarErrores(errores, ['b-email'])) return;
  if (!comprobarConexion('b-estado')) return;

  marcarOcupado(formulario, true);
  llamarSupabase('darse_de_baja', { p_email: email }).then(function () {
    formulario.reset();
    mostrarEstado('b-estado', 'ok', 'Hecho. Si ' + email + ' estaba en la lista, lo hemos borrado y ya no recibirá la newsletter.');
  }, function (error) {
    mostrarEstado('b-estado', 'error', mensajeError(error.tipo));
  }).finally(function () {
    marcarOcupado(formulario, false);
    document.getElementById('b-estado').focus();
  });
}
