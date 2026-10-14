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

## Cómo abrir la web

1. Entra en la carpeta `club-hipico-la-herradura`.
2. Haz **doble clic en `index.html`**. Se abre en el navegador; mejor con Chrome o Edge.

No hay que instalar nada. Si usas Visual Studio Code, también puedes abrirla con la extensión *Live Server*.

Necesita internet solo para tres cosas: las tipografías (sin internet se usan otras parecidas), el mapa de Google y los enlaces de WhatsApp.

## Estructura de carpetas

```
club-hipico-la-herradura/
├── index.html          ← todas las páginas, el menú lateral y los textos
├── css/estilos.css     ← colores, tipografías y diseño
├── js/datos.js         ← PRECIOS, HORARIOS, PLAZAS Y CONTACTO (lo que más se cambia)
├── js/utilidades.js    ← funciones de ayuda (fechas, euros, guardado…)
├── js/reservas.js      ← reservas online, bonos y «Mis reservas»
├── js/principal.js     ← navegación, menú desplegable, galería y formulario de contacto
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

## Problemas frecuentes

- **No se ven los precios ni el menú de reservas**: el navegador tiene JavaScript desactivado, o falta algún archivo de la carpeta `js/`.
- **«Enviar por email» no hace nada**: el ordenador no tiene un programa de correo configurado. Usa «Copiar mensaje» y pégalo en tu correo.
- **Las letras se ven distintas**: no hay internet y se están usando las tipografías del sistema.
