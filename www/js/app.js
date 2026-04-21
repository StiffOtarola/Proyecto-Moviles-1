/**
 * app.js — Lógica principal de la aplicación "Gestor de Locales"
 * Curso: ITI-621, Universidad Técnica Nacional (UTN)
 *
 * Arquitectura: SPA (Single Page Application) con JavaScript vanilla.
 * Persistencia: localStorage del dispositivo (sin servidor backend).
 * Plugins Cordova: cordova-plugin-camera, cordova-plugin-geolocation.
 *
 * Flujo general:
 *  1. Se espera el evento "deviceready" (Cordova listo) o "DOMContentLoaded" (navegador).
 *  2. init() enlaza elementos del DOM, eventos, carga datos y renderiza la lista.
 *  3. El usuario interactúa con el formulario modal para crear, editar o eliminar locales.
 *  4. Cada operación CRUD persiste inmediatamente en localStorage y actualiza la vista.
 */

// ─────────────────────────────────────────────
// CONSTANTES Y ESTADO GLOBAL
// ─────────────────────────────────────────────

/** Clave bajo la cual se almacena el arreglo de registros en localStorage. */
const STORAGE_KEY = "locales_it621";

/**
 * Estado central de la aplicación.
 * Toda la información en memoria vive aquí; la UI se genera a partir de este objeto.
 *
 * @property {Array}   registros   - Lista de objetos "local" cargados desde localStorage.
 * @property {string|null} selectedId - ID del registro actualmente seleccionado, o null.
 * @property {string}  photoData   - Foto capturada en formato "data:image/jpeg;base64,…".
 * @property {boolean} formVisible - Indica si el modal del formulario está visible.
 */
const state = {
  registros: [],
  selectedId: null,
  photoData: "",
  formVisible: false
};

/**
 * Caché de referencias a elementos del DOM.
 * Se llena en bindElements() para evitar llamadas repetidas a getElementById.
 */
const ui = {};

// ─────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────

/**
 * "deviceready" es el evento nativo de Cordova que indica que todos los plugins
 * están cargados y listos para usarse (cámara, GPS, etc.).
 * Se usa como punto de entrada principal cuando la app corre en un dispositivo Android.
 */
document.addEventListener("deviceready", init, false);

/**
 * "DOMContentLoaded" se dispara cuando el HTML termina de parsear (sin esperar imágenes).
 * Se usa como fallback para pruebas en navegador de escritorio donde Cordova no existe.
 */
document.addEventListener("DOMContentLoaded", () => {
  if (!window.cordova) {
    // Si no hay objeto cordova (navegador normal), iniciar directamente.
    init();
  }
});

/**
 * Inicializa la aplicación: enlaza el DOM, registra eventos,
 * carga datos persistidos y renderiza la lista inicial.
 */
function init() {
  bindElements();       // Guarda referencias a nodos del DOM en `ui`
  bindEvents();         // Registra todos los listeners de eventos
  loadRegistros();      // Lee el arreglo guardado en localStorage
  renderList();         // Pinta la lista con los datos cargados
  clearForm();          // Deja el formulario vacío y en modo "nuevo registro"
  setFormVisibility(false); // Asegura que el modal inicia oculto
}

// ─────────────────────────────────────────────
// ENLACE DE ELEMENTOS Y EVENTOS
// ─────────────────────────────────────────────

/**
 * Obtiene y almacena en `ui` todas las referencias a elementos del DOM
 * que la aplicación necesita manipular durante su ciclo de vida.
 * Centralizar aquí evita repetir getElementById en cada función.
 */
function bindElements() {
  // Contenedor del modal y tarjeta del formulario
  ui.formModal     = document.getElementById("formModal");
  ui.formCard      = document.getElementById("formCard");

  // Campos del formulario
  ui.idLocal       = document.getElementById("idLocal");
  ui.descripcion   = document.getElementById("descripcion");
  ui.recomendacion = document.getElementById("recomendacion");
  ui.ubicacion     = document.getElementById("ubicacion");

  // Barra de búsqueda y zona de mensajes de retroalimentación
  ui.buscar        = document.getElementById("buscar");
  ui.mensaje       = document.getElementById("mensaje");

  // Contenedor donde se renderizan las tarjetas de registros
  ui.listaRegistros = document.getElementById("listaRegistros");

  // Área de previsualización de la foto capturada
  ui.photoPreview  = document.getElementById("photoPreview");

  // Indicadores del encabezado (contador y registro activo)
  ui.totalRegistros  = document.getElementById("totalRegistros");
  ui.registroActivo  = document.getElementById("registroActivo");

  // Botones de acción
  ui.btnTomarFoto          = document.getElementById("btnTomarFoto");
  ui.btnUbicacion          = document.getElementById("btnUbicacion");
  ui.btnAgregar            = document.getElementById("btnAgregar");
  ui.btnEditar             = document.getElementById("btnEditar");
  ui.btnEliminar           = document.getElementById("btnEliminar");
  ui.btnLimpiar            = document.getElementById("btnLimpiar");
  ui.btnNuevoLocal         = document.getElementById("btnNuevoLocal");
  ui.btnOcultarFormulario  = document.getElementById("btnOcultarFormulario");
}

/**
 * Registra todos los event listeners de la aplicación.
 * Se llama una única vez durante init() para evitar listeners duplicados.
 */
function bindEvents() {
  // Operaciones CRUD del formulario
  ui.btnAgregar.addEventListener("click", agregarRegistro);
  ui.btnEditar.addEventListener("click", editarRegistro);
  ui.btnEliminar.addEventListener("click", eliminarRegistro);
  ui.btnLimpiar.addEventListener("click", clearForm);

  // Plugins nativos
  ui.btnTomarFoto.addEventListener("click", tomarFoto);
  ui.btnUbicacion.addEventListener("click", obtenerUbicacion);

  // Filtrado en tiempo real: se dispara con cada tecla en la barra de búsqueda
  ui.buscar.addEventListener("input", renderList);

  // Abrir el modal con el formulario vacío
  ui.btnNuevoLocal.addEventListener("click", openNewForm);

  // Cerrar el modal con el botón "X"
  ui.btnOcultarFormulario.addEventListener("click", () => {
    setFormVisibility(false);
  });

  /**
   * Cierra el modal al hacer clic en el fondo oscuro (overlay).
   * event.target === ui.formModal verifica que el clic fue directamente
   * sobre el overlay y no sobre un elemento hijo (como la tarjeta del formulario).
   */
  ui.formModal.addEventListener("click", (event) => {
    if (event.target === ui.formModal) {
      setFormVisibility(false);
    }
  });

  /**
   * Cierra el modal al presionar la tecla Escape.
   * Solo actúa si el formulario está visible (state.formVisible).
   */
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.formVisible) {
      setFormVisibility(false);
    }
  });
}

// ─────────────────────────────────────────────
// VISIBILIDAD DEL FORMULARIO MODAL
// ─────────────────────────────────────────────

/**
 * Muestra u oculta el modal del formulario.
 * También actualiza state.formVisible y bloquea el scroll del body cuando está abierto.
 *
 * @param {boolean} show - true para mostrar, false para ocultar.
 */
function setFormVisibility(show) {
  state.formVisible = show;

  if (show) {
    ui.formModal.classList.remove("is-hidden");
    // Bloquea el scroll de fondo mientras el modal está abierto
    document.body.classList.add("modal-open");
    return;
  }

  ui.formModal.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

/**
 * Abre el modal en modo "nuevo registro":
 * limpia el formulario, borra mensajes previos y enfoca el primer campo.
 */
function openNewForm() {
  clearForm();
  setMessage("", "ok");
  setFormVisibility(true);
  ui.idLocal.focus(); // UX: el cursor queda listo para escribir el ID
}

// ─────────────────────────────────────────────
// PERSISTENCIA (localStorage)
// ─────────────────────────────────────────────

/**
 * Carga los registros almacenados en localStorage hacia state.registros.
 * Si no hay datos o el JSON está corrupto, inicializa con un arreglo vacío.
 */
function loadRegistros() {
  try {
    state.registros = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (err) {
    // JSON inválido o error de parseo: se descarta y se empieza desde cero
    state.registros = [];
  }
}

/**
 * Serializa state.registros a JSON y lo guarda en localStorage.
 * Se llama después de cada operación CRUD (agregar, editar, eliminar).
 */
function saveRegistros() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.registros));
}

// ─────────────────────────────────────────────
// MENSAJES DE RETROALIMENTACIÓN
// ─────────────────────────────────────────────

/**
 * Muestra un mensaje de retroalimentación debajo del formulario.
 * La clase CSS "ok" pinta en verde y "error" en rojo.
 *
 * @param {string} text     - Texto del mensaje a mostrar.
 * @param {string} [type="ok"] - Tipo visual: "ok" (éxito) o "error" (fallo).
 */
function setMessage(text, type = "ok") {
  ui.mensaje.textContent = text;
  ui.mensaje.className = `message ${type}`;
}

// ─────────────────────────────────────────────
// LECTURA Y VALIDACIÓN DEL FORMULARIO
// ─────────────────────────────────────────────

/**
 * Lee y normaliza los valores actuales del formulario.
 * El ID se convierte a mayúsculas para garantizar unicidad sin distinguir case.
 *
 * @returns {{ id, descripcion, recomendacion, ubicacion, foto }}
 */
function getFormValues() {
  return {
    id:            ui.idLocal.value.trim().toUpperCase(),
    descripcion:   ui.descripcion.value.trim(),
    recomendacion: ui.recomendacion.value.trim(),
    ubicacion:     ui.ubicacion.value.trim(),
    foto:          state.photoData  // Base64 capturado por la cámara
  };
}

/**
 * Escapa caracteres especiales de HTML para prevenir inyección de código (XSS)
 * al insertar datos del usuario directamente en innerHTML.
 *
 * @param {string} text - Texto sin procesar proveniente del usuario.
 * @returns {string} Texto con entidades HTML escapadas.
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g,  "&amp;")   // & → &amp;
    .replace(/</g,  "&lt;")    // < → &lt;
    .replace(/>/g,  "&gt;")    // > → &gt;
    .replace(/\"/g, "&quot;")  // " → &quot;
    .replace(/'/g,  "&#39;");  // ' → &#39;
}

/**
 * Actualiza el contador de registros y el nombre del registro activo
 * que se muestran en el encabezado de la aplicación.
 */
function updateHeaderStatus() {
  if (ui.totalRegistros) {
    const total = state.registros.length;
    // Singular "local" o plural "locales" según la cantidad
    ui.totalRegistros.textContent = `${total} ${total === 1 ? "local" : "locales"}`;
  }

  if (ui.registroActivo) {
    if (!state.selectedId) {
      ui.registroActivo.textContent = "Ningun registro seleccionado.";
      return;
    }

    // Busca el objeto del registro seleccionado para mostrar su ID y descripción
    const active = state.registros.find((item) => item.id === state.selectedId);
    ui.registroActivo.textContent = active
      ? `Seleccionado: ${active.id} - ${active.descripcion}`
      : "Ningun registro seleccionado.";
  }
}

/**
 * Valida los datos del formulario antes de una operación CRUD.
 * Comprueba campos obligatorios y unicidad de la llave primaria (ID Local).
 *
 * @param {{ id, descripcion, recomendacion, ubicacion, foto }} data - Datos del formulario.
 * @param {boolean} [isEdit=false] - true cuando se valida para una edición (no agregar).
 * @returns {boolean} true si todos los datos son válidos, false si hay algún error.
 */
function validateFields(data, isEdit = false) {
  // Verifica que ningún campo esté vacío (foto y ubicación son obligatorias)
  if (!data.id || !data.descripcion || !data.recomendacion || !data.ubicacion || !data.foto) {
    setMessage("Todos los campos son obligatorios, incluyendo foto y ubicacion.", "error");
    return false;
  }

  // Al agregar: comprueba que el ID no exista ya en la lista (unicidad de PK)
  const existing = state.registros.find(
    (item) => item.id.toLowerCase() === data.id.toLowerCase()
  );
  if (!isEdit && existing) {
    setMessage("La llave primaria (ID Local) ya existe.", "error");
    return false;
  }

  // Al editar: el ID no puede cambiarse (la PK es inmutable)
  if (isEdit && state.selectedId !== data.id) {
    setMessage("No puedes cambiar el ID Local en modo edicion.", "error");
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────
// OPERACIONES CRUD
// ─────────────────────────────────────────────

/**
 * Crea un nuevo registro y lo agrega al arreglo global.
 * Flujo: leer formulario → validar → push → guardar → renderizar → limpiar.
 */
function agregarRegistro() {
  const data = getFormValues();
  if (!validateFields(data)) {
    return; // validateFields ya mostró el mensaje de error
  }

  state.registros.push(data);
  saveRegistros();
  renderList();
  setMessage("Registro agregado correctamente.");
  clearForm();
}

/**
 * Actualiza el registro actualmente seleccionado con los valores del formulario.
 * Requiere que haya un registro seleccionado (state.selectedId != null).
 * Flujo: verificar selección → validar (modo edición) → reemplazar → guardar → renderizar.
 */
function editarRegistro() {
  if (!state.selectedId) {
    setMessage("Selecciona un registro para editar.", "error");
    return;
  }

  const data = getFormValues();
  if (!validateFields(data, true)) {
    return;
  }

  // Encuentra la posición del registro en el arreglo por su ID
  const index = state.registros.findIndex((item) => item.id === state.selectedId);
  if (index === -1) {
    setMessage("No se encontro el registro seleccionado.", "error");
    return;
  }

  // Reemplaza completamente el objeto en la posición encontrada
  state.registros[index] = data;
  saveRegistros();
  renderList();
  setMessage("Registro editado correctamente.");
  clearForm();
}

/**
 * Elimina el registro actualmente seleccionado del arreglo.
 * Usa filter() para crear un nuevo arreglo sin el elemento eliminado.
 * Requiere que haya un registro seleccionado.
 */
function eliminarRegistro() {
  if (!state.selectedId) {
    setMessage("Selecciona un registro para eliminar.", "error");
    return;
  }

  // filter devuelve todos los registros EXCEPTO el seleccionado
  state.registros = state.registros.filter((item) => item.id !== state.selectedId);
  saveRegistros();
  renderList();
  setMessage("Registro eliminado correctamente.");
  clearForm();
}

// ─────────────────────────────────────────────
// SELECCIÓN Y LIMPIEZA DEL FORMULARIO
// ─────────────────────────────────────────────

/**
 * Selecciona un registro de la lista y carga sus datos en el formulario para edición.
 * También actualiza el estado visual de los botones y resalta la tarjeta activa.
 *
 * @param {string} id - ID del registro que se desea seleccionar.
 */
function selectRegistro(id) {
  const item = state.registros.find((registro) => registro.id === id);
  if (!item) {
    return; // El registro no existe (no debería ocurrir en flujo normal)
  }

  setFormVisibility(true);
  state.selectedId = item.id;

  // Carga los valores del registro en los campos del formulario
  ui.idLocal.value       = item.id;
  ui.descripcion.value   = item.descripcion;
  ui.recomendacion.value = item.recomendacion;
  ui.ubicacion.value     = item.ubicacion;
  state.photoData        = item.foto;

  renderPhoto();           // Muestra la foto del registro en el preview
  setButtonState(true);    // Activa Editar/Eliminar, desactiva Agregar
  renderList();            // Re-renderiza para resaltar la tarjeta seleccionada
}

/**
 * Limpia todos los campos del formulario y restablece el estado de selección.
 * Se usa al terminar una operación CRUD o al hacer clic en "Limpiar".
 */
function clearForm() {
  ui.idLocal.value       = "";
  ui.descripcion.value   = "";
  ui.recomendacion.value = "";
  ui.ubicacion.value     = "";
  state.photoData        = "";
  state.selectedId       = null;

  renderPhoto();           // Limpia el preview de foto
  setButtonState(false);   // Vuelve al estado "sin selección"
  updateHeaderStatus();    // Actualiza el indicador del encabezado
}

/**
 * Habilita o deshabilita los botones según si hay un registro seleccionado.
 *
 * Con selección activa (hasSelection = true):
 *   - Editar y Eliminar se habilitan.
 *   - Agregar y el campo ID se deshabilitan (no se puede crear ni cambiar la PK).
 *
 * Sin selección (hasSelection = false):
 *   - Agregar e ID se habilitan para crear un registro nuevo.
 *   - Editar y Eliminar se deshabilitan (no hay nada sobre qué actuar).
 *
 * @param {boolean} hasSelection - true si hay un registro seleccionado.
 */
function setButtonState(hasSelection) {
  ui.btnEditar.disabled  = !hasSelection;
  ui.btnEliminar.disabled = !hasSelection;
  ui.btnAgregar.disabled  =  hasSelection;
  ui.idLocal.disabled     =  hasSelection; // Evita modificar la PK en modo edición
}

// ─────────────────────────────────────────────
// RENDERIZADO DE LA INTERFAZ
// ─────────────────────────────────────────────

/**
 * Actualiza el área de previsualización de la foto.
 * Si no hay foto en state.photoData, muestra el texto "Sin foto".
 */
function renderPhoto() {
  if (!state.photoData) {
    ui.photoPreview.innerHTML = "Sin foto";
    return;
  }

  // Inserta un <img> con el data URL de la foto capturada
  ui.photoPreview.innerHTML = `<img src="${state.photoData}" alt="Foto del local" />`;
}

/**
 * Renderiza la lista de registros aplicando el filtro de búsqueda actual.
 * Genera el HTML de cada tarjeta de forma dinámica y registra sus listeners de clic.
 *
 * Flujo:
 *  1. Lee el texto del buscador y filtra registros por ID o descripción.
 *  2. Si no hay coincidencias, muestra mensaje de lista vacía.
 *  3. Genera HTML para cada registro con datos escapados (prevención XSS).
 *  4. Registra un listener de clic en cada tarjeta para seleccionarla.
 */
function renderList() {
  const filter = ui.buscar.value.trim().toLowerCase();
  updateHeaderStatus();

  // Filtra registros que contengan el texto buscado en ID o descripción
  const filtered = state.registros.filter((item) => {
    const byId   = item.id.toLowerCase().includes(filter);
    const byDesc = item.descripcion.toLowerCase().includes(filter);
    return byId || byDesc;
  });

  // Estado vacío: no hay registros que mostrar
  if (!filtered.length) {
    ui.listaRegistros.innerHTML = "<p class=\"empty-state\">No hay registros para mostrar.</p>";
    return;
  }

  // Genera el HTML de cada tarjeta de registro
  ui.listaRegistros.innerHTML = filtered
    .map((item) => {
      // Escapa todos los datos antes de insertarlos en el HTML
      const safeId           = escapeHtml(item.id);
      const safeDescripcion  = escapeHtml(item.descripcion);
      const safeRecomendacion = escapeHtml(item.recomendacion);
      const safeUbicacion    = escapeHtml(item.ubicacion);

      // Muestra la miniatura si hay foto, o un placeholder si no
      const preview = item.foto
        ? `<img class="record-thumb" src="${item.foto}" alt="Foto de ${safeId}" />`
        : "<div class=\"record-thumb-fallback\">Sin foto</div>";

      // La clase "active" resalta visualmente la tarjeta seleccionada
      // encodeURIComponent en data-id protege IDs con caracteres especiales
      return `
        <article class="record-item ${item.id === state.selectedId ? "active" : ""}" data-id="${encodeURIComponent(item.id)}">
          ${preview}
          <div class="record-body">
            <p class="record-title">${safeId} - ${safeDescripcion}</p>
            <p class="record-meta">${safeRecomendacion}</p>
            <p class="record-meta">${safeUbicacion}</p>
          </div>
        </article>
      `;
    })
    .join("");

  // Registra el evento clic en cada tarjeta recién creada en el DOM
  document.querySelectorAll(".record-item").forEach((card) => {
    card.addEventListener("click", () => {
      // decodeURIComponent revierte el encoding aplicado al generar el data-id
      const selectedId = decodeURIComponent(card.getAttribute("data-id"));
      selectRegistro(selectedId);
    });
  });
}

// ─────────────────────────────────────────────
// PLUGINS NATIVOS DE CORDOVA
// ─────────────────────────────────────────────

/**
 * Activa la cámara del dispositivo para capturar una foto.
 * Usa cordova-plugin-camera; solo funciona en dispositivo Android real o emulador.
 *
 * Opciones de captura:
 *  - quality: 60        → Compresión JPEG al 60% para reducir tamaño en localStorage.
 *  - destinationType: DATA_URL → La foto se devuelve como string base64 (no como archivo).
 *  - sourceType: CAMERA → Abre la cámara (no la galería).
 *  - encodingType: JPEG → Formato de compresión de la imagen.
 *  - correctOrientation: true → Corrige automáticamente la rotación según el giroscopio.
 */
function tomarFoto() {
  // Verifica que el plugin esté disponible (no lo estará en navegador de escritorio)
  if (!navigator.camera) {
    setMessage("Plugin de camara no disponible. Prueba en dispositivo Android.", "error");
    return;
  }

  navigator.camera.getPicture(
    // Callback de éxito: recibe el base64 de la imagen
    (imageData) => {
      state.photoData = `data:image/jpeg;base64,${imageData}`;
      renderPhoto();
      setMessage("Foto capturada correctamente.");
    },
    // Callback de error: el usuario canceló o hubo un fallo del plugin
    (error) => {
      setMessage(`No se pudo tomar la foto: ${error}`, "error");
    },
    {
      quality: 60,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType:      Camera.PictureSourceType.CAMERA,
      encodingType:    Camera.EncodingType.JPEG,
      mediaType:       Camera.MediaType.PICTURE,
      correctOrientation: true
    }
  );
}

/**
 * Obtiene las coordenadas GPS actuales del dispositivo.
 * Usa cordova-plugin-geolocation (compatible con la API estándar Web Geolocation).
 *
 * Opciones:
 *  - enableHighAccuracy: true → Usa GPS hardware (más preciso, consume más batería).
 *  - timeout: 10000           → Espera máximo 10 segundos antes de reportar error.
 *  - maximumAge: 0            → No acepta posiciones cacheadas; siempre solicita una nueva.
 *
 * El resultado se formatea como "latitud, longitud" con 6 decimales (~11 cm de precisión).
 */
function obtenerUbicacion() {
  // Verifica disponibilidad de la API (podría estar desactivada en el dispositivo)
  if (!navigator.geolocation) {
    setMessage("Geolocalizacion no disponible en este dispositivo.", "error");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    // Callback de éxito: recibe el objeto Position con las coordenadas
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      ui.ubicacion.value = `${lat}, ${lng}`;
      setMessage("Ubicacion obtenida correctamente.");
    },
    // Callback de error: GPS desactivado, permiso denegado o timeout
    (error) => {
      setMessage(`No se pudo obtener ubicacion: ${error.message}`, "error");
    },
    {
      enableHighAccuracy: true,
      timeout:     10000,
      maximumAge:  0
    }
  );
}
