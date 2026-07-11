// ==========================================================
//  config.js — Materiales y configuración de MAT//CALC
//  Editá este archivo para cambiar materiales, precios base
//  o textos por defecto, sin tocar la lógica de la app.
// ==========================================================

const CONFIG_MATERIALES = {
  // Inventario general (chatarra / recolección)
  general: {
    precioBase: 8,
    items: [
      "Goma",
      "Plástico",
      "Cobre",
      "Latón",
      "Tequila",
     //  "Pólvora",
      "Madera",
      "Piezas de electrónica",
      "Chatarra electrónica",
      "Acero",
      "Aluminio"
    ]
  },

  // Materiales de talleres
  taller: {
    precioBase: 4,
    items: [
      "Hierro",
      "Cinta",
      "Vidrio",
      "Aceite",
      "Ácido",
      "Piezas electrónicas"
    ]
  }
};

// Botones de precio predefinidos que aparecen en cada fila.
// Agregá o quitá valores de esta lista para cambiar los botones.
const CONFIG_PRECIOS_BOTONES = [4, 5, 6, 8, 10, 12];

const CONFIG_DISCORD = {
  webhookPlaceholder: "https://discord.com/api/webhooks/...",
  nombreUsuarioPlaceholder: "¿Quién hizo el cálculo?",
  colorEmbed: 65522 // color de la barra lateral del embed en Discord
};

const CONFIG_STORAGE_KEYS = {
  personalizadosGeneral: "materiales-personalizados-general",
  personalizadosTaller: "materiales-personalizados-taller",
  webhookUrl: "discord-webhook-url",
  nombreUsuario: "discord-nombre-usuario",
  consolaHistorial: "consola-historial"
};