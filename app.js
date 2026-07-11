// ==========================================================
//  app.js — Lógica de MAT//CALC
//  Depende de config.js (debe cargarse antes que este archivo)
// ==========================================================

// ---------- Almacenamiento con respaldo ----------
// Intenta localStorage (funciona si abrís el archivo directo en tu navegador).
// Si falla (p. ej. dentro de una vista previa embebida), usa memoria de sesión.
const memoria = {};
function guardar(clave, valor) {
  try { localStorage.setItem(clave, valor); }
  catch (e) { memoria[clave] = valor; }
}
function leer(clave) {
  try {
    const v = localStorage.getItem(clave);
    if (v !== null) return v;
  } catch (e) { /* no disponible */ }
  return memoria[clave] !== undefined ? memoria[clave] : null;
}

// ---------- Construcción de listas de materiales ----------
// Cada categoría se arma con sus materiales fijos (definidos en config.js)
// más los materiales personalizados guardados por el usuario.
function cargarPersonalizados(clave) {
  try {
    const guardados = leer(clave);
    return guardados ? JSON.parse(guardados) : [];
  } catch (e) {
    return [];
  }
}

const categorias = {
  general: {
    precioBase: CONFIG_MATERIALES.general.precioBase,
    storageKey: CONFIG_STORAGE_KEYS.personalizadosGeneral,
    tbodyId: 'tabla-general',
    materiales: []
  },
  taller: {
    precioBase: CONFIG_MATERIALES.taller.precioBase,
    storageKey: CONFIG_STORAGE_KEYS.personalizadosTaller,
    tbodyId: 'tabla-taller',
    materiales: []
  }
};

function inicializarMateriales(catKey) {
  const cat = categorias[catKey];
  const fijos = CONFIG_MATERIALES[catKey].items.map(nombre => ({
    nombre, personalizado: false, precioInicial: cat.precioBase
  }));
  const personalizados = cargarPersonalizados(cat.storageKey).map(m => ({
    nombre: m.nombre, personalizado: true, precioInicial: m.precio
  }));
  cat.materiales = [...fijos, ...personalizados];
}

inicializarMateriales('general');
inicializarMateriales('taller');

// ---------- Iconos de flechas para los spinners ----------
const flechaArriba = `<svg viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5L5 1L9 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const flechaAbajo = `<svg viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------- Renderizado de tablas ----------
function crearFila(catKey, mat, i) {
  const tr = document.createElement('tr');
  const idPrecio = `precio-${catKey}-${i}`;
  const idCant = `cant-${catKey}-${i}`;
  const idSub = `sub-${catKey}-${i}`;
  tr.innerHTML = `
    <td class="material">${mat.nombre}${mat.personalizado ? '<span class="tag-custom">NUEVO</span>' : ''}</td>
    <td>
      <div class="num-wrap">
        <input type="number" step="0.01" min="0" value="${mat.precioInicial}" id="${idPrecio}" onchange="calcular()">
        <div class="spin-btns">
          <button type="button" onclick="cambiar('${idPrecio}', 0.5, '${catKey}')">${flechaArriba}</button>
          <button type="button" onclick="cambiar('${idPrecio}', -0.5, '${catKey}')">${flechaAbajo}</button>
        </div>
      </div>
    </td>
    <td>
      <div class="num-wrap">
        <input type="number" step="1" min="0" value="0" id="${idCant}" onchange="calcular()">
        <div class="spin-btns">
          <button type="button" onclick="cambiar('${idCant}', 1, '${catKey}')">${flechaArriba}</button>
          <button type="button" onclick="cambiar('${idCant}', -1, '${catKey}')">${flechaAbajo}</button>
        </div>
      </div>
    </td>
    <td class="subtotal" id="${idSub}">$0.00</td>
    <td>${mat.personalizado ? `<button class="del-row" onclick="eliminarMaterial('${catKey}', ${i})">✕</button>` : ''}</td>
  `;
  return tr;
}

function renderTabla(catKey) {
  const cat = categorias[catKey];
  const tbody = document.getElementById(cat.tbodyId);
  tbody.innerHTML = '';
  cat.materiales.forEach((mat, i) => tbody.appendChild(crearFila(catKey, mat, i)));
}

function renderTodo() {
  renderTabla('general');
  renderTabla('taller');
  calcular();
}

function guardarPersonalizados(catKey) {
  const cat = categorias[catKey];
  const datos = cat.materiales
    .filter(m => m.personalizado)
    .map((m) => {
      const i = cat.materiales.indexOf(m);
      const precio = parseFloat(document.getElementById(`precio-${catKey}-${i}`)?.value);
      return { nombre: m.nombre, precio: isNaN(precio) ? m.precioInicial : precio };
    });
  guardar(cat.storageKey, JSON.stringify(datos));
}

// ---------- Añadir / eliminar materiales ----------
function agregarMaterial() {
  const nombreInput = document.getElementById('nuevo-nombre');
  const precioInput = document.getElementById('nuevo-precio');
  const categoriaInput = document.getElementById('nuevo-categoria');
  const nombre = nombreInput.value.trim();
  const precio = parseFloat(precioInput.value) || 0;
  const catKey = categoriaInput.value;

  if (!nombre) {
    nombreInput.style.borderColor = 'var(--danger)';
    nombreInput.placeholder = '⚠ Escribí un nombre primero';
    setTimeout(() => { nombreInput.style.borderColor = ''; nombreInput.placeholder = 'Ej: Titanio, Fibra óptica...'; }, 1800);
    return;
  }

  categorias[catKey].materiales.push({ nombre, personalizado: true, precioInicial: precio });
  renderTodo();
  guardarPersonalizados(catKey);

  nombreInput.value = '';
  precioInput.value = categorias[catKey].precioBase;
  nombreInput.focus();
}

function eliminarMaterial(catKey, i) {
  const cat = categorias[catKey];
  cat.materiales[i] = null;
  cat.materiales = cat.materiales.filter(m => m !== null);
  renderTodo();
  guardarPersonalizados(catKey);
}

// ---------- Cálculo ----------
function cambiar(id, delta, catKey) {
  const input = document.getElementById(id);
  let valor = (parseFloat(input.value) || 0) + delta;
  if (valor < 0) valor = 0;
  input.value = Number.isInteger(delta) ? valor : valor.toFixed(2);
  calcular();
  if (id.startsWith('precio-') && catKey) guardarPersonalizados(catKey);
}

function calcular() {
  let total = 0;
  Object.keys(categorias).forEach(catKey => {
    const cat = categorias[catKey];
    let subtotalCategoria = 0;
    cat.materiales.forEach((_, i) => {
      const precioEl = document.getElementById(`precio-${catKey}-${i}`);
      const cantEl = document.getElementById(`cant-${catKey}-${i}`);
      if (!precioEl || !cantEl) return;
      const precio = parseFloat(precioEl.value) || 0;
      const cantidad = parseFloat(cantEl.value) || 0;
      const subtotal = precio * cantidad;
      subtotalCategoria += subtotal;
      total += subtotal;
      const subEl = document.getElementById(`sub-${catKey}-${i}`);
      if (subEl) subEl.textContent = `$${subtotal.toFixed(2)}`;
    });
    const subtotalCatEl = document.getElementById(`subtotal-${catKey}`);
    if (subtotalCatEl) subtotalCatEl.textContent = `$${subtotalCategoria.toFixed(2)}`;
  });
  document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

function resetear() {
  Object.keys(categorias).forEach(catKey => {
    const cat = categorias[catKey];
    cat.materiales.forEach((_, i) => {
      const cantEl = document.getElementById(`cant-${catKey}-${i}`);
      if (cantEl) cantEl.value = 0;
    });
  });
  calcular();
}

// ---------- Discord ----------
const webhookInput = document.getElementById('webhook-url');
const nombreUsuarioInput = document.getElementById('nombre-usuario');

function inicializarDiscord() {
  webhookInput.value = leer(CONFIG_STORAGE_KEYS.webhookUrl) || '';
  nombreUsuarioInput.value = leer(CONFIG_STORAGE_KEYS.nombreUsuario) || '';
  webhookInput.addEventListener('change', () => guardar(CONFIG_STORAGE_KEYS.webhookUrl, webhookInput.value.trim()));
  nombreUsuarioInput.addEventListener('change', () => guardar(CONFIG_STORAGE_KEYS.nombreUsuario, nombreUsuarioInput.value.trim()));
}

function alternarVisibilidad() {
  const btn = document.querySelector('.toggle-visibility');
  if (webhookInput.type === 'password') {
    webhookInput.type = 'text';
    btn.textContent = 'Ocultar';
  } else {
    webhookInput.type = 'password';
    btn.textContent = 'Mostrar';
  }
}

function mostrarEstado(mensaje, tipo) {
  const el = document.getElementById('status-msg');
  el.textContent = mensaje;
  el.className = `status-msg ${tipo}`;
}

const etiquetasCategoria = { general: 'Inventario general', taller: 'Materiales de talleres' };

async function registrarEnDiscord() {
  const url = webhookInput.value.trim();
  guardar(CONFIG_STORAGE_KEYS.webhookUrl, url);
  guardar(CONFIG_STORAGE_KEYS.nombreUsuario, nombreUsuarioInput.value.trim());

  if (!url) {
    mostrarEstado('⚠ Poné la URL del webhook primero.', 'err');
    return;
  }

  const nombre = nombreUsuarioInput.value.trim();
  let total = 0;
  const embeds = [];

  Object.keys(categorias).forEach(catKey => {
    const cat = categorias[catKey];
    const campos = [];
    cat.materiales.forEach((mat, i) => {
      const precio = parseFloat(document.getElementById(`precio-${catKey}-${i}`)?.value) || 0;
      const cantidad = parseFloat(document.getElementById(`cant-${catKey}-${i}`)?.value) || 0;
      const subtotal = precio * cantidad;
      total += subtotal;
      if (cantidad > 0) {
        campos.push({
          name: mat.nombre,
          value: `Cantidad: ${cantidad} · Precio unit: $${precio.toFixed(2)} · Subtotal: **$${subtotal.toFixed(2)}**`,
          inline: false
        });
      }
    });
    if (campos.length > 0) {
      embeds.push({
        title: `🧾 ${etiquetasCategoria[catKey].toUpperCase()}`,
        color: CONFIG_DISCORD.colorEmbed,
        fields: campos
      });
    }
  });

  if (embeds.length === 0) {
    mostrarEstado('⚠ No hay cantidades cargadas para registrar.', 'err');
    return;
  }

  embeds[embeds.length - 1].footer = { text: `Operador: ${nombre || 'Anónimo'}` };
  embeds[embeds.length - 1].timestamp = new Date().toISOString();

  const payload = {
    username: 'MAT//CALC',
    embeds,
    content: `**TOTAL GENERAL: $${total.toFixed(2)}**`
  };

  const btn = document.getElementById('btn-registrar');
  btn.disabled = true;
  mostrarEstado('▸ transmitiendo...', 'loading');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      mostrarEstado('✔ registrado correctamente en discord.', 'ok');
    } else {
      mostrarEstado(`✕ discord respondió con error (${res.status}). revisá la url.`, 'err');
    }
  } catch (e) {
    mostrarEstado('✕ no se pudo conectar. revisá la url o tu conexión.', 'err');
  } finally {
    btn.disabled = false;
  }
}

// ---------- Modal de configuración ----------
function abrirModal() {
  document.getElementById('modal-overlay').classList.add('abierto');
}
function cerrarModal() {
  document.getElementById('modal-overlay').classList.remove('abierto');
}
function cerrarModalFondo(evento) {
  if (evento.target.id === 'modal-overlay') cerrarModal();
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarModal();
});

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', () => {
  renderTodo();
  inicializarDiscord();
});