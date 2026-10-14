# Club Hípico La Herradura · Web del centro hípico

**Ver la web online:** https://orianacejas-tech.github.io/club-hipico-la-herradura/

Web de un centro hípico (proyecto de ejemplo con datos ficticios) con:

- **Clases y tarifas**: iniciación infantil, equitación avanzada, doma clásica y salto, con precio por clase.
- **Bonos de 5 clases** (la oferta): cada clase sale más barata y el ahorro se calcula solo.
- **Pupilaje** (la «guardería de caballos»): tres planes mensuales y servicios extra.
- **Excursiones a caballo**: cuatro rutas, desde un paseo de 1 hora hasta un día completo.
- **Conócenos**: historia del club, equipo, caballos de la escuela e instalaciones con galería de fotos.
- **Menú lateral izquierdo con 3 desplegables**: *Menú* (categorías), *Reserva tu clase online* y *Contacto*.
- **Reservas online** con calendario, horas libres, bonos y página «Mis reservas».
- **Newsletter**: formulario para suscribirse y para darse de baja. La lista de suscriptores se guarda en una base de datos de **Supabase**.

## Cómo abrir la web

1. Entra en la carpeta `club-hipico-la-herradura`.
2. Haz **doble clic en `index.html`**. Se abre en el navegador; mejor con Chrome o Edge.

No hay que instalar nada. Si usas Visual Studio Code, también puedes abrirla con la extensión *Live Server*.

Necesita internet solo para cuatro cosas: las tipografías (sin internet se usan otras parecidas), el mapa de Google, los enlaces de WhatsApp y la newsletter.

## Estructura de carpetas

```
club-hipico-la-herradura/
├── index.html          ← todas las páginas, el menú lateral y los textos
├── css/estilos.css     ← colores, tipografías y diseño
├── js/datos.js         ← PRECIOS, HORARIOS, PLAZAS Y CONTACTO (lo que más se cambia)
├── js/utilidades.js    ← funciones de ayuda (fechas, euros, guardado…)
├── js/reservas.js      ← reservas online, bonos y «Mis reservas»
├── js/newsletter.js    ← formularios de alta y baja de la newsletter (hablan con Supabase)
├── js/principal.js     ← navegación, menú desplegable, galería y formulario de contacto
├── supabase/newsletter.sql ← crea la base de datos de la newsletter (se pega en Supabase)
├── img/                ← fotos, logotipo y CREDITOS.txt
└── README.md
```

## Cambiar precios, horarios o datos de contacto

Todo está en **`js/datos.js`**. Al cambiar un dato se actualizan solas las tarjetas, las tablas, el menú lateral, el formulario de reserva y el pie de página.

Ejemplo: para que la clase de salto cueste 42 € y su bono 180 €:

```js
precio: 42,
bono: { clases: 5, precio: 180 },
```

En ese archivo también están:

- `contacto`: teléfono, WhatsApp, email, dirección y horario. Las líneas marcadas con **CAMBIAR** tienen datos de ejemplo.
- `horario` de cada actividad: horas de martes a viernes, sábados y domingos. Los lunes el club está cerrado.
- `reservas.diasCerrado`: festivos en los que no se puede reservar (formato `AAAA-MM-DD`).
- `reservas.simularOcupacion`: con `true` la web simula que otras personas ya han reservado plazas, para la demostración. **Pon `false` si el club la usa de verdad.**

## Cambiar textos

Los textos están en `index.html`. Cada página empieza con un comentario como `<!-- ===================== PÁGINA: HISTORIA ===================== -->` para encontrarla fácilmente.

## Cambiar las fotos

Las fotos están en la carpeta `img/`. Para poner una foto real, **guárdala con el mismo nombre** que la que quieres sustituir; por ejemplo, `instalaciones-guadarnes.jpg`. Lo ideal es que sean horizontales, de unos 1600 × 1067 píxeles.

Si falta alguna foto, la web muestra un marco de «Foto pendiente» en su lugar.

Las fotos actuales son de Wikimedia Commons y tienen licencia libre. Los autores y las licencias están en `img/CREDITOS.txt` y en la página «Privacidad, aviso legal y créditos» de la web. Las fotos con licencia CC BY o CC BY-SA obligan a citar al autor: si sustituyes una por una foto propia, borra su fila de la tabla de créditos en `index.html`.

## Cambiar colores y tipografías

Al principio de `css/estilos.css`, en el bloque `:root`, están todos los colores (`--cuero`, `--nogal`, `--crema`…) y las tipografías.

## Cómo funcionan las reservas online (sin servidor)

1. La persona elige actividad, modalidad (clase suelta, bono de 5 clases o una clase de su bono), día y hora libre, y rellena sus datos.
2. Se crea una **solicitud de reserva** con un código (por ejemplo `LH-7K3QF`). Se guarda **en el navegador** y aparece en «Mis reservas».
3. Con los botones **«Enviar por WhatsApp»** o **«Enviar por email»** se abre la aplicación con el mensaje ya escrito, que se envía al club.

Lo que tienes que saber:

- Las reservas **solo se guardan en el navegador y en el ordenador** donde se hicieron. El club no las recibe hasta que se las envías por WhatsApp o email.
- Para que las reservas lleguen solas a una base de datos del club haría falta un servidor (por ejemplo con Node.js). Esta web está preparada para funcionar sin él.
- Los bonos duran 90 días. Si cancelas una clase con 24 horas de antelación, vuelve al bono.
- Para empezar de cero en las pruebas: «Mis reservas» → «Borrar mis datos de este navegador».

## La newsletter (base de datos en Supabase)

[Supabase](https://supabase.com) es un servicio que da una base de datos en internet, con un plan gratuito. La web guarda ahí la lista de la newsletter.

**Cómo funciona:**

1. En la página **Newsletter** (o desde la banda de Inicio y el pie), la persona escribe su email, elige temas y acepta la privacidad.
2. La web llama a la función `suscribirse` de la base de datos, que comprueba los datos y guarda el email en la tabla `suscriptores`.
3. Para darse de baja, se escribe el email en «Darse de baja» y la función `darse_de_baja` lo borra de la lista. El enlace `…/index.html#baja?email=nombre@correo.es` abre ese formulario con el email ya escrito, para ponerlo en los correos.

**Ver la lista de suscriptores:** entra en supabase.com → tu proyecto → **Table Editor** → `suscriptores`. Para descargarla y abrirla en Excel: en la lista de tablas de la izquierda, pulsa los tres puntos (⋯) junto a `suscriptores` → **Export data** → **Export table as CSV**.

**Seguridad:**

- La web usa la clave **publishable**, que es pública. Con ella **no se puede leer la lista**: solo apuntarse y darse de baja. Por eso puede estar en `js/datos.js` y en GitHub.
- La clave **secret** da acceso total. **Nunca** la pongas en la web ni en GitHub. Si la pones por error, la web se niega a usarla.
- El formulario tiene un campo invisible para robots y la base de datos acepta como mucho 30 altas nuevas por minuto.

**Conectar la web con Supabase** (solo se hace una vez):

1. Crea un proyecto en supabase.com, en una región de Europa.
2. Abre **SQL Editor**, pega todo el archivo `supabase/newsletter.sql` y pulsa **Run**.
3. Copia la *Project URL* (en **Project Settings → Data API**) y la clave *publishable* (en **Project Settings → API Keys**), y ponlas en `js/datos.js`, en el bloque `newsletter`.

**Enviar la newsletter:** de momento la web solo recoge los emails. Para enviar los correos, descarga la lista en CSV, o conecta más adelante un servicio de envío (por ejemplo Brevo o Resend).

## Problemas frecuentes

- **La newsletter dice «todavía no está conectada»**: faltan la URL o la clave de Supabase en `js/datos.js`.
- **La newsletter dice «No se ha podido completar»**: lo más habitual es que Supabase haya **pausado el proyecto**. Los proyectos gratuitos se pausan si pasan 7 días sin usarse. Entra en supabase.com, abre el proyecto y pulsa **Restore project**. Si no es eso, pulsa F12 en el navegador y mira el error en la pestaña «Consola».

- **No se ven los precios ni el menú de reservas**: el navegador tiene JavaScript desactivado, o falta algún archivo de la carpeta `js/`.
- **«Enviar por email» no hace nada**: el ordenador no tiene un programa de correo configurado. Usa «Copiar mensaje» y pégalo en tu correo.
- **Las letras se ven distintas**: no hay internet y se están usando las tipografías del sistema.
