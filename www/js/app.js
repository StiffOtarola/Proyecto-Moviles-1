const STORAGE_KEY = "locales_it621";

const state = {
  registros: [],
  selectedId: null,
  photoData: "",
  formVisible: false
};

const ui = {};

document.addEventListener("deviceready", init, false);
document.addEventListener("DOMContentLoaded", () => {
  if (!window.cordova) {
    init();
  }
});

function init() {
  bindElements();
  bindEvents();
  loadRegistros();
  renderList();
  clearForm();
  setFormVisibility(false);
}

function bindElements() {
  ui.formModal     = document.getElementById("formModal");
  ui.formCard      = document.getElementById("formCard");
  ui.idLocal       = document.getElementById("idLocal");
  ui.descripcion   = document.getElementById("descripcion");
  ui.recomendacion = document.getElementById("recomendacion");
  ui.ubicacion     = document.getElementById("ubicacion");
  ui.buscar        = document.getElementById("buscar");
  ui.mensaje       = document.getElementById("mensaje");
  ui.listaRegistros = document.getElementById("listaRegistros");
  ui.photoPreview  = document.getElementById("photoPreview");
  ui.totalRegistros  = document.getElementById("totalRegistros");
  ui.registroActivo  = document.getElementById("registroActivo");
  ui.btnTomarFoto          = document.getElementById("btnTomarFoto");
  ui.btnUbicacion          = document.getElementById("btnUbicacion");
  ui.btnAgregar            = document.getElementById("btnAgregar");
  ui.btnEditar             = document.getElementById("btnEditar");
  ui.btnEliminar           = document.getElementById("btnEliminar");
  ui.btnLimpiar            = document.getElementById("btnLimpiar");
  ui.btnNuevoLocal         = document.getElementById("btnNuevoLocal");
  ui.btnOcultarFormulario  = document.getElementById("btnOcultarFormulario");
}

function bindEvents() {
  ui.btnAgregar.addEventListener("click", agregarRegistro);
  ui.btnEditar.addEventListener("click", editarRegistro);
  ui.btnEliminar.addEventListener("click", eliminarRegistro);
  ui.btnLimpiar.addEventListener("click", clearForm);
  ui.btnTomarFoto.addEventListener("click", tomarFoto);
  ui.btnUbicacion.addEventListener("click", obtenerUbicacion);
  ui.buscar.addEventListener("input", renderList);
  ui.btnNuevoLocal.addEventListener("click", openNewForm);
  ui.btnOcultarFormulario.addEventListener("click", () => {
    setFormVisibility(false);
  });

  ui.formModal.addEventListener("click", (event) => {
    if (event.target === ui.formModal) {
      setFormVisibility(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.formVisible) {
      setFormVisibility(false);
    }
  });
}

function setFormVisibility(show) {
  state.formVisible = show;

  if (show) {
    ui.formModal.classList.remove("is-hidden");
    document.body.classList.add("modal-open");
    return;
  }

  ui.formModal.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

function openNewForm() {
  clearForm();
  setMessage("", "ok");
  setFormVisibility(true);
  ui.idLocal.focus();
}

function loadRegistros() {
  try {
    state.registros = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (err) {
    state.registros = [];
  }
}

function saveRegistros() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.registros));
}

function setMessage(text, type = "ok") {
  ui.mensaje.textContent = text;
  ui.mensaje.className = `message ${type}`;
}

function getFormValues() {
  return {
    id:            ui.idLocal.value.trim().toUpperCase(),
    descripcion:   ui.descripcion.value.trim(),
    recomendacion: ui.recomendacion.value.trim(),
    ubicacion:     ui.ubicacion.value.trim(),
    foto:          state.photoData
  };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g,  "&#39;");
}

function updateHeaderStatus() {
  if (ui.totalRegistros) {
    const total = state.registros.length;
    ui.totalRegistros.textContent = `${total} ${total === 1 ? "local" : "locales"}`;
  }

  if (ui.registroActivo) {
    if (!state.selectedId) {
      ui.registroActivo.textContent = "Ningun registro seleccionado.";
      return;
    }

    const active = state.registros.find((item) => item.id === state.selectedId);
    ui.registroActivo.textContent = active
      ? `Seleccionado: ${active.id} - ${active.descripcion}`
      : "Ningun registro seleccionado.";
  }
}

function validateFields(data, isEdit = false) {
  if (!data.id || !data.descripcion || !data.recomendacion || !data.ubicacion || !data.foto) {
    setMessage("Todos los campos son obligatorios, incluyendo foto y ubicacion.", "error");
    return false;
  }

  const existing = state.registros.find(
    (item) => item.id.toLowerCase() === data.id.toLowerCase()
  );
  if (!isEdit && existing) {
    setMessage("La llave primaria (ID Local) ya existe.", "error");
    return false;
  }

  if (isEdit && state.selectedId !== data.id) {
    setMessage("No puedes cambiar el ID Local en modo edicion.", "error");
    return false;
  }

  return true;
}

function agregarRegistro() {
  const data = getFormValues();
  if (!validateFields(data)) {
    return;
  }

  state.registros.push(data);
  saveRegistros();
  renderList();
  setMessage("Registro agregado correctamente.");
  clearForm();
}

function editarRegistro() {
  if (!state.selectedId) {
    setMessage("Selecciona un registro para editar.", "error");
    return;
  }

  const data = getFormValues();
  if (!validateFields(data, true)) {
    return;
  }

  const index = state.registros.findIndex((item) => item.id === state.selectedId);
  if (index === -1) {
    setMessage("No se encontro el registro seleccionado.", "error");
    return;
  }

  state.registros[index] = data;
  saveRegistros();
  renderList();
  setMessage("Registro editado correctamente.");
  clearForm();
}

function eliminarRegistro() {
  if (!state.selectedId) {
    setMessage("Selecciona un registro para eliminar.", "error");
    return;
  }

  state.registros = state.registros.filter((item) => item.id !== state.selectedId);
  saveRegistros();
  renderList();
  setMessage("Registro eliminado correctamente.");
  clearForm();
}

function selectRegistro(id) {
  const item = state.registros.find((registro) => registro.id === id);
  if (!item) {
    return;
  }

  setFormVisibility(true);
  state.selectedId = item.id;
  ui.idLocal.value       = item.id;
  ui.descripcion.value   = item.descripcion;
  ui.recomendacion.value = item.recomendacion;
  ui.ubicacion.value     = item.ubicacion;
  state.photoData        = item.foto;
  renderPhoto();
  setButtonState(true);
  renderList();
}

function clearForm() {
  ui.idLocal.value       = "";
  ui.descripcion.value   = "";
  ui.recomendacion.value = "";
  ui.ubicacion.value     = "";
  state.photoData        = "";
  state.selectedId       = null;
  renderPhoto();
  setButtonState(false);
  updateHeaderStatus();
}

function setButtonState(hasSelection) {
  ui.btnEditar.disabled   = !hasSelection;
  ui.btnEliminar.disabled = !hasSelection;
  ui.btnAgregar.disabled  =  hasSelection;
  ui.idLocal.disabled     =  hasSelection;
}

function renderPhoto() {
  if (!state.photoData) {
    ui.photoPreview.innerHTML = "Sin foto";
    return;
  }

  ui.photoPreview.innerHTML = `<img src="${state.photoData}" alt="Foto del local" />`;
}

function renderList() {
  const filter = ui.buscar.value.trim().toLowerCase();
  updateHeaderStatus();

  const filtered = state.registros.filter((item) => {
    const byId   = item.id.toLowerCase().includes(filter);
    const byDesc = item.descripcion.toLowerCase().includes(filter);
    return byId || byDesc;
  });

  if (!filtered.length) {
    ui.listaRegistros.innerHTML = "<p class=\"empty-state\">No hay registros para mostrar.</p>";
    return;
  }

  ui.listaRegistros.innerHTML = filtered
    .map((item) => {
      const safeId            = escapeHtml(item.id);
      const safeDescripcion   = escapeHtml(item.descripcion);
      const safeRecomendacion = escapeHtml(item.recomendacion);
      const safeUbicacion     = escapeHtml(item.ubicacion);

      const preview = item.foto
        ? `<img class="record-thumb" src="${item.foto}" alt="Foto de ${safeId}" />`
        : "<div class=\"record-thumb-fallback\">Sin foto</div>";

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

  document.querySelectorAll(".record-item").forEach((card) => {
    card.addEventListener("click", () => {
      const selectedId = decodeURIComponent(card.getAttribute("data-id"));
      selectRegistro(selectedId);
    });
  });
}

function tomarFoto() {
  if (!navigator.camera) {
    setMessage("Plugin de camara no disponible. Prueba en dispositivo Android.", "error");
    return;
  }

  navigator.camera.getPicture(
    (imageData) => {
      state.photoData = `data:image/jpeg;base64,${imageData}`;
      renderPhoto();
      setMessage("Foto capturada correctamente.");
    },
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

function obtenerUbicacion() {
  if (!navigator.geolocation) {
    setMessage("Geolocalizacion no disponible en este dispositivo.", "error");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      ui.ubicacion.value = `${lat}, ${lng}`;
      setMessage("Ubicacion obtenida correctamente.");
    },
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
