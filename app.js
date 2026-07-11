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

// ---------- Renderizado de tablas ----------
function crearChipsPrecio(catKey, i, precioActual) {
  const botones = CONFIG_PRECIOS_BOTONES.map(p => {
    const activo = Number(precioActual) === p ? ' activo' : '';
    return `<button type="button" class="chip-precio${activo}" data-valor="${p}" onclick="setPrecio('${catKey}', ${i}, ${p})">$${p}</button>`;
  }).join('');
  return `<div class="precio-chips" id="chips-precio-${catKey}-${i}">${botones}</div>`;
}

function crearFila(catKey, mat, i) {
  const div = document.createElement('div');
  div.className = 'fila-material';
  const idPrecio = `precio-${catKey}-${i}`;
  const idCant = `cant-${catKey}-${i}`;
  const idSub = `sub-${catKey}-${i}`;
  div.innerHTML = `
    <div class="fila-top">
      <div class="fila-nombre">${mat.nombre}${mat.personalizado ? '<span class="tag-custom">NUEVO</span>' : ''}</div>
      <div class="fila-top-right">
        <span class="fila-subtotal" id="${idSub}">$0.00</span>
        ${mat.personalizado ? `<button class="del-row" onclick="eliminarMaterial('${catKey}', ${i})">✕</button>` : ''}
      </div>
    </div>
    <div class="fila-campo">
      <span class="fila-label">Precio</span>
      <div class="fila-campo-controles">
        ${crearChipsPrecio(catKey, i, mat.precioInicial)}
        <div class="precio-otro">
          <span>Otro:</span>
          <input type="number" step="0.5" min="0" value="${mat.precioInicial}" id="${idPrecio}" onchange="calcular(); registrarCambioValor('${idPrecio}'); guardarPersonalizados('${catKey}'); actualizarChipsActivos('${catKey}', ${i})">
        </div>
      </div>
    </div>
    <div class="fila-campo">
      <span class="fila-label">Cantidad</span>
      <div class="fila-campo-controles">
        <div class="cant-wrap">
          <button type="button" class="qty-btn qty-minus" onclick="cambiar('${idCant}', -1, '${catKey}')" aria-label="Restar uno">−</button>
          <input type="number" step="1" min="0" value="0" id="${idCant}" onchange="calcular(); registrarCambioValor('${idCant}')">
          <button type="button" class="qty-btn qty-plus" onclick="cambiar('${idCant}', 1, '${catKey}')" aria-label="Sumar uno">+</button>
        </div>
        <div class="qty-quick">
          <button type="button" onclick="cambiar('${idCant}', 5, '${catKey}')">+5</button>
          <button type="button" onclick="cambiar('${idCant}', 10, '${catKey}')">+10</button>
          <button type="button" onclick="cambiar('${idCant}', 25, '${catKey}')">+25</button>
        </div>
      </div>
    </div>
  `;
  return div;
}

function setPrecio(catKey, i, valor) {
  const idPrecio = `precio-${catKey}-${i}`;
  const input = document.getElementById(idPrecio);
  if (!input) return;
  input.value = valor;
  actualizarChipsActivos(catKey, i);
  calcular();
  registrarCambioValor(idPrecio);
  guardarPersonalizados(catKey);
}

function actualizarChipsActivos(catKey, i) {
  const idPrecio = `precio-${catKey}-${i}`;
  const input = document.getElementById(idPrecio);
  const contenedor = document.getElementById(`chips-precio-${catKey}-${i}`);
  if (!input || !contenedor) return;
  const valorActual = parseFloat(input.value);
  contenedor.querySelectorAll('.chip-precio').forEach(chip => {
    chip.classList.toggle('activo', parseFloat(chip.dataset.valor) === valorActual);
  });
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
  logConsola(`+ material añadido: "${nombre}" (${etiquetasCategoria[catKey]}) — $${precio.toFixed(2)}`, 'info');

  nombreInput.value = '';
  precioInput.value = categorias[catKey].precioBase;
  nombreInput.focus();
}

function eliminarMaterial(catKey, i) {
  const cat = categorias[catKey];
  const nombre = cat.materiales[i]?.nombre;
  cat.materiales[i] = null;
  cat.materiales = cat.materiales.filter(m => m !== null);
  renderTodo();
  guardarPersonalizados(catKey);
  logConsola(`- material eliminado: "${nombre}"`, 'err');
}

// ---------- Cálculo ----------
function registrarCambioValor(id) {
  const partes = id.split('-'); // ['precio'|'cant', catKey, i]
  const tipo = partes[0];
  const catKey = partes[1];
  const i = partes[2];
  const mat = categorias[catKey]?.materiales[i];
  const input = document.getElementById(id);
  if (!mat || !input) return;
  const valor = parseFloat(input.value) || 0;
  if (tipo === 'precio') {
    logConsola(`✎ precio de "${mat.nombre}" (${etiquetasCategoria[catKey]}) → $${valor.toFixed(2)}`, 'info');
  } else {
    logConsola(`✎ cantidad de "${mat.nombre}" (${etiquetasCategoria[catKey]}) → ${valor}`, 'info');
  }
}

function cambiar(id, delta, catKey) {
  const input = document.getElementById(id);
  let valor = (parseFloat(input.value) || 0) + delta;
  if (valor < 0) valor = 0;
  input.value = Number.isInteger(delta) ? valor : valor.toFixed(2);
  calcular();
  registrarCambioValor(id);
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
  actualizarResumen();
}

// ---------- Resumen en vivo (columna lateral) ----------
function actualizarResumen() {
  const contenedor = document.getElementById('lista-resumen');
  const totalEl = document.getElementById('resumen-total');
  if (!contenedor) return;

  const items = [];
  let total = 0;

  Object.keys(categorias).forEach(catKey => {
    const cat = categorias[catKey];
    cat.materiales.forEach((mat, i) => {
      const precioEl = document.getElementById(`precio-${catKey}-${i}`);
      const cantEl = document.getElementById(`cant-${catKey}-${i}`);
      if (!precioEl || !cantEl) return;
      const precio = parseFloat(precioEl.value) || 0;
      const cantidad = parseFloat(cantEl.value) || 0;
      if (cantidad > 0) {
        const subtotal = precio * cantidad;
        total += subtotal;
        items.push({ catKey, nombre: mat.nombre, cantidad, subtotal });
      }
    });
  });

  if (items.length === 0) {
    contenedor.innerHTML = '<div class="resumen-vacio">Sin materiales cargados aún.</div>';
  } else {
    contenedor.innerHTML = items.map(it => `
      <div class="resumen-item ${it.catKey}">
        <div>
          <span class="nombre">${it.nombre}</span>
          <span class="cat-badge">${etiquetasCategoria[it.catKey] || it.catKey}</span>
        </div>
        <span class="cant">${it.cantidad} · $${it.subtotal.toFixed(2)}</span>
      </div>
    `).join('');
  }

  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
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
  logConsola('↺ cantidades restablecidas a cero.');
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
    logConsola('⚠ falta configurar la URL del webhook.', 'err');
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
    logConsola('⚠ no hay cantidades cargadas, transmisión cancelada.', 'err');
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
  logConsola('▸ transmitiendo registro a Discord...', 'info');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      mostrarEstado('✔ registrado correctamente en discord.', 'ok');
      logConsola(`✔ registro enviado — total $${total.toFixed(2)}.`);
    } else {
      mostrarEstado(`✕ discord respondió con error (${res.status}). revisá la url.`, 'err');
      logConsola(`✕ discord respondió con error ${res.status}.`, 'err');
    }
  } catch (e) {
    mostrarEstado('✕ no se pudo conectar. revisá la url o tu conexión.', 'err');
    logConsola('✕ fallo de conexión al enviar a discord.', 'err');
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

// ---------- Modales genéricos (plantilla JSON / importar JSON) ----------
const IDS_MODALES = ['modal-overlay', 'modal-plantilla-overlay', 'modal-importar-overlay'];

function abrirModalOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('abierto');
}
function cerrarModalOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('abierto');
}
function cerrarModalFondoGenerico(evento, id) {
  if (evento.target.id === id) cerrarModalOverlay(id);
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') IDS_MODALES.forEach(cerrarModalOverlay);
});

// ---------- Plantilla JSON (exportar / importar cantidades) ----------
function construirDatosJSON() {
  const datos = {};
  Object.keys(categorias).forEach(catKey => {
    const cat = categorias[catKey];
    datos[catKey] = {};
    cat.materiales.forEach((mat, i) => {
      const cantEl = document.getElementById(`cant-${catKey}-${i}`);
      const cantidad = cantEl ? (parseFloat(cantEl.value) || 0) : 0;
      datos[catKey][mat.nombre] = cantidad;
    });
  });
  return datos;
}

function abrirModalPlantilla() {
  const datos = construirDatosJSON();
  const textarea = document.getElementById('texto-plantilla');
  textarea.value = JSON.stringify(datos, null, 2);
  const status = document.getElementById('status-plantilla');
  status.textContent = '';
  status.className = 'status-msg';
  abrirModalOverlay('modal-plantilla-overlay');
  logConsola('🧾 plantilla JSON generada con los materiales actuales.', 'info');
}

async function copiarPlantilla() {
  const textarea = document.getElementById('texto-plantilla');
  const status = document.getElementById('status-plantilla');
  textarea.focus();
  textarea.select();
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textarea.value);
    } else {
      document.execCommand('copy');
    }
    status.textContent = '✔ copiado al portapapeles.';
    status.className = 'status-msg ok';
    logConsola('✔ plantilla JSON copiada al portapapeles.');
  } catch (e) {
    status.textContent = '✕ no se pudo copiar. seleccioná el texto y copiá manualmente.';
    status.className = 'status-msg err';
    logConsola('✕ fallo al copiar la plantilla JSON.', 'err');
  }
}

function abrirModalImportar() {
  document.getElementById('texto-importar').value = '';
  const status = document.getElementById('status-importar');
  status.textContent = '';
  status.className = 'status-msg';
  abrirModalOverlay('modal-importar-overlay');
}

function aplicarJSONImportado() {
  const textarea = document.getElementById('texto-importar');
  const status = document.getElementById('status-importar');
  let datos;

  try {
    datos = JSON.parse(textarea.value);
  } catch (e) {
    status.textContent = '✕ JSON inválido. revisá el formato.';
    status.className = 'status-msg err';
    logConsola('✕ importación fallida: el JSON no es válido.', 'err');
    return;
  }

  if (typeof datos !== 'object' || datos === null) {
    status.textContent = '✕ el JSON debe ser un objeto con las categorías.';
    status.className = 'status-msg err';
    logConsola('✕ importación fallida: formato inesperado.', 'err');
    return;
  }

  let aplicados = 0;
  const noEncontrados = [];

  Object.keys(datos).forEach(catKey => {
    const cat = categorias[catKey];
    const seccion = datos[catKey];
    if (!cat || typeof seccion !== 'object' || seccion === null) return;

    Object.keys(seccion).forEach(nombreMat => {
      const valor = parseFloat(seccion[nombreMat]);
      if (isNaN(valor)) return;

      const i = cat.materiales.findIndex(
        m => m.nombre.trim().toLowerCase() === nombreMat.trim().toLowerCase()
      );
      if (i === -1) {
        noEncontrados.push(nombreMat);
        return;
      }

      const cantEl = document.getElementById(`cant-${catKey}-${i}`);
      if (cantEl) {
        cantEl.value = valor < 0 ? 0 : valor;
        aplicados++;
      }
    });
  });

  calcular();

  if (aplicados > 0) {
    status.textContent = `✔ ${aplicados} material(es) actualizados.` +
      (noEncontrados.length ? ` (${noEncontrados.length} sin coincidencia)` : '');
    status.className = 'status-msg ok';
    logConsola(`✔ JSON importado — ${aplicados} cantidades actualizadas.`);
    if (noEncontrados.length) {
      logConsola(`⚠ materiales no reconocidos al importar: ${noEncontrados.join(', ')}`, 'err');
    }
  } else {
    status.textContent = '⚠ no se encontraron materiales coincidentes en el JSON.';
    status.className = 'status-msg err';
    logConsola('⚠ importación sin coincidencias — revisá los nombres.', 'err');
  }
}

// ---------- Consola del sistema (con historial persistente) ----------
const consolaEl = document.getElementById('consola-output');
const MAX_LINEAS_CONSOLA = 300;

function cargarHistorialConsola() {
  try {
    const guardado = leer(CONFIG_STORAGE_KEYS.consolaHistorial);
    return guardado ? JSON.parse(guardado) : [];
  } catch (e) {
    return [];
  }
}
let historialConsola = cargarHistorialConsola();

function pintarLineaConsola(hora, mensaje, tipo) {
  if (!consolaEl) return;
  const linea = document.createElement('div');
  linea.className = `linea ${tipo || ''}`;
  linea.innerHTML = `<span class="marca-tiempo">[${hora}]</span>${mensaje}`;
  consolaEl.appendChild(linea);
}

function logConsola(mensaje, tipo = '') {
  const hora = new Date().toLocaleTimeString('es-ES', { hour12: false });
  historialConsola.push({ hora, mensaje, tipo });
  if (historialConsola.length > MAX_LINEAS_CONSOLA) {
    historialConsola = historialConsola.slice(-MAX_LINEAS_CONSOLA);
  }
  guardar(CONFIG_STORAGE_KEYS.consolaHistorial, JSON.stringify(historialConsola));
  pintarLineaConsola(hora, mensaje, tipo);
  if (consolaEl) consolaEl.scrollTop = consolaEl.scrollHeight;
}

function restaurarConsola() {
  historialConsola.forEach(entry => pintarLineaConsola(entry.hora, entry.mensaje, entry.tipo));
  if (consolaEl) consolaEl.scrollTop = consolaEl.scrollHeight;
}

// ---------- Bloqueo de clic derecho ----------
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  logConsola('⚠ intento de clic derecho bloqueado.', 'err');
});

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', () => {
  renderTodo();
  inicializarDiscord();
  restaurarConsola();
  logConsola('sesión iniciada — sistema REAVER MATERIALES.');
});