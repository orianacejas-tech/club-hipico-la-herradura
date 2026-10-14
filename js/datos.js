/* ==========================================================================
   datos.js · Club Hípico La Herradura
   --------------------------------------------------------------------------
   ESTE ES EL ÚNICO ARCHIVO QUE HAY QUE TOCAR PARA CAMBIAR:
     · los precios de las clases, los bonos, las rutas y el pupilaje
     · los horarios y las plazas de cada actividad
     · los datos de contacto (teléfono, WhatsApp, email, dirección, horario)
   La web "pinta" estos datos automáticamente en todas las páginas: tarjetas,
   tablas de precios, menú lateral, formulario de reservas y pie de página.

   Los precios son ORIENTATIVOS e inventados para este proyecto de ejemplo.
   ========================================================================== */

const CLUB = {
  nombre: 'Club Hípico La Herradura',
  fundacion: 1987,

  /* ---------- CONTACTO ---------- */
  contacto: {
    telefono: '600 000 000',                      // CAMBIAR: número tal y como se ve en la web
    telefonoEnlace: '+34600000000',               // CAMBIAR: el mismo número, para el botón "Llamar"
    whatsapp: '34600000000',                      // CAMBIAR: 34 + número, sin "+" ni espacios
    email: 'info@clubhipicolaherradura.example',  // CAMBIAR: correo real del club
    direccion: ['Camino de la Dehesa, km 2', 'Sierra de Guadarrama (Madrid)'], // dirección FICTICIA
    mapa: 'Sierra de Guadarrama, Madrid',         // lo que se busca en Google Maps
    horario: [
      { dias: 'Martes a viernes', horas: '9:00 – 21:00' },
      { dias: 'Sábados', horas: '9:00 – 20:00' },
      { dias: 'Domingos', horas: '9:00 – 15:00' },
      { dias: 'Lunes', horas: 'Cerrado (descanso de los caballos)' }
    ],
    horarioTelefono: 'Martes a sábado, de 10:00 a 14:00 y de 16:00 a 20:00',
    redes: {
      instagram: 'https://www.instagram.com/',    // CAMBIAR por el perfil del club ('' = no se muestra)
      facebook: 'https://www.facebook.com/'       // CAMBIAR por la página del club ('' = no se muestra)
    }
  },

  /* ---------- BONOS ---------- */
  bonos: {
    validezDias: 90,
    condiciones: [
      'Válido durante 90 días desde la compra.',
      'Personal e intransferible, para un solo tipo de clase.',
      'Se compra al reservar la primera clase y se paga en el club.',
      'Si cancelas con 24 horas de antelación, la clase vuelve a tu bono.'
    ]
  },

  /* ---------- CLASES Y RUTAS ----------
     tipo: 'clase' o 'ruta'
     duracion: en minutos · precio: en euros por persona
     bono: { clases, precio } o null si no hay bono
     capacidad: plazas por turno · edadMin / edadMax (null = sin límite)
     horario: horas de inicio de cada turno. Los lunes el club está cerrado. */
  actividades: [
    {
      id: 'infantil',
      tipo: 'clase',
      nombre: 'Iniciación infantil',
      nivel: 'Sin experiencia',
      resumen: 'Los primeros pasos a caballo para los más pequeños: ponis muy mansos, juegos para ganar confianza y mucho cariño por los animales.',
      incluye: [
        'Ponis tranquilos y acostumbrados a niños',
        'Monitora titulada durante toda la clase',
        'Casco y chaleco de protección incluidos',
        'Aprenden también a cepillar y cuidar al poni'
      ],
      requisito: '',
      duracion: 45,
      precio: 25,
      bono: { clases: 5, precio: 110 },
      capacidad: 4,
      edadMin: 4,
      edadMax: 12,
      imagen: 'img/clase-iniciacion-infantil.jpg',
      alt: 'Niño pequeño con casco montando un poni guiado por una monitora por un camino rural',
      horario: {
        martesAViernes: ['17:00', '18:00'],
        sabado: ['10:00', '11:00', '12:00'],
        domingo: ['10:00', '11:00']
      }
    },
    {
      id: 'avanzada',
      tipo: 'clase',
      nombre: 'Equitación avanzada',
      nivel: 'Nivel medio y alto',
      resumen: 'Para jinetes que ya montan solos: perfeccionamos la posición, las ayudas y el galope, en pista y también en el campo.',
      incluye: [
        'Trabajo de posición, asiento y ayudas',
        'Galope, transiciones y figuras de pista',
        'Salidas al campo con el profesor',
        'Caballo de la escuela incluido'
      ],
      requisito: 'Montar con soltura al paso, al trote y al galope',
      duracion: 60,
      precio: 35,
      bono: { clases: 5, precio: 150 },
      capacidad: 4,
      edadMin: 10,
      edadMax: null,
      imagen: 'img/clase-equitacion-avanzada.jpg',
      alt: 'Joven amazona con casco galopando sobre un caballo castaño oscuro en una pista cubierta',
      horario: {
        martesAViernes: ['18:00', '19:00', '20:00'],
        sabado: ['10:00', '12:00', '17:00'],
        domingo: ['11:00', '12:00']
      }
    },
    {
      id: 'doma',
      tipo: 'clase',
      nombre: 'Doma clásica',
      nivel: 'Nivel medio',
      resumen: 'Precisión, equilibrio y comunicación con el caballo: transiciones, figuras y reprises en nuestra pista de doma de 20 × 60 m.',
      incluye: [
        'Profesora Técnico Deportivo Superior',
        'Caballos de pura raza española formados en doma',
        'Preparación de reprises y concursos (opcional)',
        'Grupos muy reducidos'
      ],
      requisito: 'Galope seguro y equilibrado',
      duracion: 60,
      precio: 45,
      bono: { clases: 5, precio: 195 },
      capacidad: 3,
      edadMin: 12,
      edadMax: null,
      imagen: 'img/clase-doma-clasica.jpg',
      alt: 'Amazona de doma con chaqueta negra trotando un caballo negro en una pista de arena',
      horario: {
        martesAViernes: ['17:00', '19:00'],
        sabado: ['09:00', '11:00'],
        domingo: []
      }
    },
    {
      id: 'salto',
      tipo: 'clase',
      nombre: 'Salto',
      nivel: 'Nivel medio',
      resumen: 'Técnica de salto progresiva y segura: barras en el suelo, cruzadas, verticales y pequeños recorridos adaptados a tu nivel.',
      incluye: [
        'Altura adaptada a cada jinete',
        'Obstáculos de seguridad homologados',
        'Chaleco de protección incluido',
        'Caballos con experiencia en salto'
      ],
      requisito: 'Galope seguro y buen equilibrio',
      duracion: 60,
      precio: 40,
      bono: { clases: 5, precio: 170 },
      capacidad: 4,
      edadMin: 12,
      edadMax: null,
      imagen: 'img/clase-salto.jpg',
      alt: 'Amazona saltando un obstáculo de madera con un caballo castaño oscuro',
      horario: {
        martesAViernes: ['18:00', '19:30'],
        sabado: ['12:00', '17:00'],
        domingo: ['10:00']
      }
    },
    {
      id: 'ruta-paseo',
      tipo: 'ruta',
      nombre: 'Paseo a caballo',
      nivel: 'Sin experiencia',
      resumen: 'Un paseo tranquilo al paso por los caminos de la finca. Perfecto para un primer contacto con los caballos o para venir en familia.',
      incluye: [
        'Guía durante todo el paseo',
        'Explicación previa de seguridad',
        'Casco incluido'
      ],
      requisito: '',
      duracion: 60,
      precio: 30,
      bono: null,
      capacidad: 6,
      edadMin: 8,
      edadMax: null,
      imagen: 'img/excursion-ruta-campo.jpg',
      alt: 'Grupo de jinetes con casco cabalgando en fila por un sendero entre matorrales',
      horario: {
        martesAViernes: ['11:00', '17:00'],
        sabado: ['10:00', '12:00', '17:00'],
        domingo: ['10:00', '12:00']
      }
    },
    {
      id: 'ruta-monte',
      tipo: 'ruta',
      nombre: 'Ruta por el monte',
      nivel: 'Nivel básico',
      resumen: 'Dos horas entre encinas y robles con vistas a la sierra, alternando el paso con algún trote suave.',
      incluye: [
        'Guía ecuestre titulado',
        'Parada en el arroyo para que beban los caballos',
        'Casco incluido'
      ],
      requisito: 'Saber parar, girar y trotar',
      duracion: 120,
      precio: 50,
      bono: null,
      capacidad: 6,
      edadMin: 12,
      edadMax: null,
      imagen: 'img/excursion-bosque.jpg',
      alt: 'Dos jinetes a caballo por un camino de hayedo con jacintos en flor',
      horario: {
        martesAViernes: [],
        sabado: ['10:00'],
        domingo: ['10:00']
      }
    },
    {
      id: 'ruta-atardecer',
      tipo: 'ruta',
      nombre: 'Ruta al atardecer',
      nivel: 'Nivel básico',
      resumen: 'Salimos con la luz dorada de la tarde y vemos la puesta de sol desde el mirador, con merienda incluida.',
      incluye: [
        'Merienda en el mirador',
        'Guía ecuestre titulado',
        'Casco incluido'
      ],
      requisito: 'Saber parar, girar y trotar',
      duracion: 120,
      precio: 55,
      bono: null,
      capacidad: 8,
      edadMin: 14,
      edadMax: null,
      imagen: 'img/excursion-atardecer.jpg',
      alt: 'Siluetas de jinetes cabalgando al atardecer, con el sol en el horizonte',
      horario: {
        martesAViernes: [],
        sabado: ['18:00'],
        domingo: []
      }
    },
    {
      id: 'ruta-dia',
      tipo: 'ruta',
      nombre: 'Ruta de día completo',
      nivel: 'Nivel medio',
      resumen: 'Una jornada entera a caballo por la sierra, con comida campestre a la sombra y vuelta por el valle.',
      incluye: [
        'Comida campestre y bebida',
        'Guía y vehículo de apoyo',
        'Casco incluido'
      ],
      requisito: 'Trote y galope seguros en el campo',
      duracion: 420,
      precio: 120,
      bono: null,
      capacidad: 8,
      edadMin: 16,
      edadMax: null,
      imagen: 'img/excursion-dia-completo.jpg',
      alt: 'Grupo de jinetes recorriendo un sendero de montaña entre laderas de matorral',
      horario: {
        martesAViernes: [],
        sabado: ['09:30'],
        domingo: []
      }
    }
  ],

  /* ---------- PUPILAJE (precios al mes) ---------- */
  pupilaje: {
    planes: [
      {
        id: 'paddock',
        nombre: 'Pupilaje en paddock',
        precioMes: 220,
        destacado: false,
        resumen: 'Vida al aire libre, en grupo y con mucho espacio para moverse.',
        imagen: 'img/pupilaje-paddock.jpg',
        alt: 'Caballos blancos en un prado con margaritas, vistos a través de una valla de madera',
        incluye: [
          'Paddock de 1000 m² con refugio y sombra',
          'Heno de calidad dos veces al día',
          'Agua limpia con bebedero automático',
          'Revisión diaria del estado del caballo',
          'Uso de pistas e instalaciones'
        ]
      },
      {
        id: 'box',
        nombre: 'Pupilaje en box',
        precioMes: 380,
        destacado: true,
        resumen: 'Box individual con cama limpia cada día y salida diaria al paddock.',
        imagen: 'img/pupilaje-boxes.jpg',
        alt: 'Caballo negro asomando la cabeza por la puerta de su box',
        incluye: [
          'Box de 3,5 × 3,5 m con cama de viruta',
          'Pienso y heno tres veces al día',
          'Limpieza diaria del box',
          'Salida diaria al paddock',
          'Taquilla en el guadarnés',
          'Uso de pistas, duchas y caminador'
        ]
      },
      {
        id: 'completo',
        nombre: 'Pupilaje completo con trabajo',
        precioMes: 590,
        destacado: false,
        resumen: 'Nos ocupamos de todo, también de mantener a tu caballo en forma.',
        imagen: 'img/pupilaje-cuidados.jpg',
        alt: 'Mujer cepillando a un caballo castaño junto a la puerta de la cuadra',
        incluye: [
          'Todo lo del pupilaje en box',
          'Trabajo del caballo 3 días por semana con un profesional',
          'Cepillado, cascos y mantas cada día',
          'Coordinación con veterinario y herrador',
          'Informe mensual del estado del caballo'
        ]
      }
    ],
    extras: [
      { nombre: 'Herrado completo (4 herraduras)', precio: 80, unidad: 'servicio' },
      { nombre: 'Recorte y arreglo de cascos', precio: 35, unidad: 'servicio' },
      { nombre: 'Fisioterapia equina', precio: 55, unidad: 'sesión' },
      { nombre: 'Esquilado', precio: 70, unidad: 'servicio' },
      { nombre: 'Trabajo a la cuerda', precio: 15, unidad: 'sesión' },
      { nombre: 'Clase particular con tu propio caballo', precio: 30, unidad: 'clase' },
      { nombre: 'Poner y quitar mantas', precio: 20, unidad: 'mes' }
    ],
    nota: 'Veterinario, vacunas y desparasitaciones: se cobra solo el coste del profesional, sin recargos.'
  },

  /* ---------- REGLAS DE LAS RESERVAS ONLINE ---------- */
  reservas: {
    diasAntelacionMax: 60,      // se puede reservar como mucho con 60 días de antelación
    horasAntelacionMin: 2,      // ...y como poco, 2 horas antes de la clase
    horasCancelacionMin: 24,    // cancelar online: hasta 24 horas antes
    diasCerrado: ['2026-12-25', '2027-01-01', '2027-01-06'],  // festivos cerrados (AAAA-MM-DD)
    simularOcupacion: true,     // true = la web simula que otras personas ya han reservado plazas
                                // (para la demostración). Pon false cuando el club la use de verdad.
    formaPago: 'Pago en el club el día de la clase: efectivo, tarjeta o Bizum.'
  }
};
