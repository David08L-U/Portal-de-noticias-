/**
 * GOD NEWS - Portal de Noticias
 * Script principal: Búsqueda y consumo de GNews API
 */

// La API Key se enlaza directamente desde config.js (archivo excluido en Git)
const apiKey = typeof API_KEY !== "undefined" ? API_KEY : "";

// Imagen de respaldo local
const DEFAULT_IMAGE = "Imagen/newspaper.jpg";

// Variables de paginación
let paginaActual = 1;
let tipoBusquedaActual = "destacadas";
let terminoBusquedaActual = "";

// Elementos del DOM
const searchForm = document.getElementById("searchForm");
const busquedaInput = document.getElementById("busqueda");
const resultsArea = document.getElementById("resultsArea");
const categoryButtons = document.querySelectorAll(".category-btn");
const paginationContainer = document.getElementById("paginationContainer");
const loadMoreBtn = document.getElementById("loadMoreBtn");

// Configuración inicial de eventos
document.addEventListener("DOMContentLoaded", () => {
    // Cargar automáticamente las noticias recientes y destacadas al abrir la página (sección "Todas")
    cargarNoticiasDestacadas();

    // Escuchar el envío del formulario de búsqueda
    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        paginaActual = 1;
        buscarNoticias();
    });

    // Permitir búsqueda rápida al hacer clic en las categorías
    categoryButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const categoria = btn.getAttribute("data-category");

            // Marcar botón activo
            categoryButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            paginaActual = 1; // Reiniciar paginación al cambiar de categoría

            // Si es "Todas" (o no tiene categoría definida), cargar noticias destacadas
            if (!categoria || categoria.toLowerCase() === "todas") {
                busquedaInput.value = "";
                cargarNoticiasDestacadas();
            } else {
                busquedaInput.value = categoria;
                buscarNoticias();
            }
        });
    });

    // Evento para el botón "Cargar más"
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            paginaActual++;
            
            // Indicador visual de carga
            const textoOriginal = loadMoreBtn.innerHTML;
            loadMoreBtn.innerHTML = '<span>Cargando...</span>';
            loadMoreBtn.disabled = true;

            if (tipoBusquedaActual === "destacadas") {
                cargarNoticiasDestacadas(true).finally(() => {
                    loadMoreBtn.innerHTML = textoOriginal;
                    loadMoreBtn.disabled = false;
                });
            } else {
                buscarNoticias(true).finally(() => {
                    loadMoreBtn.innerHTML = textoOriginal;
                    loadMoreBtn.disabled = false;
                });
            }
        });
    }
});

/**
 * Consulta y muestra las noticias más recientes y destacadas (sección "Todas")
 */
async function cargarNoticiasDestacadas(isAppending = false) {
    if (!isAppending) {
        mostrarEstadoCargando("las noticias más recientes y destacadas");
        tipoBusquedaActual = "destacadas";
        terminoBusquedaActual = "";
        if (paginationContainer) paginationContainer.style.display = "none";
    }

    // Endpoint de titulares principales en español (top-headlines) con paginación
    const url = `https://gnews.io/api/v4/top-headlines?lang=es&max=10&page=${paginaActual}&apikey=${apiKey}`;

    try {
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error("No se pudieron obtener las noticias");
        }

        const datos = await respuesta.json();
        console.log("Noticias destacadas:", datos);

        if (!datos.articles || datos.articles.length === 0) {
            if (!isAppending) mostrarEstadoSinResultados("noticias destacadas");
            if (paginationContainer) paginationContainer.style.display = "none";
        } else {
            pintarNoticias(datos.articles, "Noticias destacadas y recientes", isAppending);
            if (paginationContainer) {
                paginationContainer.style.display = datos.articles.length >= 10 ? "flex" : "none";
            }
        }

    } catch (error) {
        console.error(error);
        if (!isAppending) {
            mostrarEstadoError(
                "No se pudieron obtener las noticias en este momento. Por favor, verifica tu conexión a internet o intenta nuevamente más tarde.",
                cargarNoticiasDestacadas
            );
        } else {
            alert("No se pudieron cargar más noticias. Verifica tu conexión.");
        }
    }
}

/**
 * Función principal para consultar noticias a la API de GNews por un tema específico
 */
async function buscarNoticias(isAppending = false) {
    const tema = document.getElementById("busqueda").value.trim();

    // Si el campo está vacío, redirigir a las noticias destacadas
    if (!tema) {
        if (!isAppending) mostrarEstadoError("Por favor, escribe un tema o palabra clave en el buscador antes de continuar.");
        return;
    }

    if (!isAppending) {
        // Desmarcar categoría activa si la búsqueda fue escrita manualmente
        const categoriaActiva = Array.from(categoryButtons).find(btn => btn.getAttribute("data-category") === tema);
        if (!categoriaActiva) {
            categoryButtons.forEach(b => b.classList.remove("active"));
        }

        // Mostrar estado temporal de carga
        mostrarEstadoCargando(tema);
        tipoBusquedaActual = "busqueda";
        terminoBusquedaActual = tema;
        if (paginationContainer) paginationContainer.style.display = "none";
    }

    // Construcción de la URL de búsqueda en GNews con paginación
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(tema)}&lang=es&max=10&page=${paginaActual}&apikey=${apiKey}`;

    try {
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error("No se pudieron obtener las noticias");
        }

        const datos = await respuesta.json();
        console.log(datos);

        // Validar si existen noticias en la respuesta
        if (!datos.articles || datos.articles.length === 0) {
            if (!isAppending) mostrarEstadoSinResultados(tema);
            if (paginationContainer) paginationContainer.style.display = "none";
        } else {
            pintarNoticias(datos.articles, tema, isAppending);
            if (paginationContainer) {
                paginationContainer.style.display = datos.articles.length >= 10 ? "flex" : "none";
            }
        }

    } catch (error) {
        console.error(error);
        if (!isAppending) {
            mostrarEstadoError(
                "No se pudieron obtener las noticias en este momento. Por favor, verifica tu conexión a internet o intenta nuevamente más tarde.",
                buscarNoticias
            );
        } else {
            alert("No se pudieron cargar más noticias. Verifica tu conexión.");
        }
    }
}

/**
 * Pinta los datos de las noticias en pantalla mediante tarjetas visuales
 * @param {Array} articles Lista de noticias devuelta por la API
 * @param {string} tema Palabra clave o título de la sección
 * @param {boolean} isAppending Indica si debemos añadir a los resultados existentes
 */
function pintarNoticias(articles, tema, isAppending = false) {
    const esDestacadas = tema === "Noticias destacadas y recientes";
    const tituloSeccion = esDestacadas 
        ? "Noticias destacadas y recientes" 
        : `Resultados para: <em>"${escapeHTML(tema)}"</em>`;

    let cardsHtml = "";

    articles.forEach(noticia => {
        const imagen = noticia.image || DEFAULT_IMAGE;
        const titulo = noticia.title || "Sin título disponible";
        const descripcion = noticia.description || "No hay una descripción disponible para esta noticia.";
        const fuente = noticia.source?.name || "Medio digital";
        const fechaPublicacion = formatearFecha(noticia.publishedAt);
        const urlNoticia = noticia.url || "#";

        cardsHtml += `
            <article class="news-card">
                <!-- Imagen obligatoria -->
                <div class="news-image-wrapper">
                    <img 
                        src="${escapeHTML(imagen)}" 
                        alt="${escapeHTML(titulo)}" 
                        class="news-image" 
                        loading="lazy"
                        onerror="this.onerror=null; this.src='${DEFAULT_IMAGE}';"
                    >
                    <!-- Fuente obligatoria -->
                    <span class="news-badge">${escapeHTML(fuente)}</span>
                </div>

                <div class="news-content">
                    <div class="news-meta">
                        <!-- Fecha de publicación obligatoria -->
                        <span class="news-date">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="meta-icon" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${fechaPublicacion}
                        </span>
                    </div>

                    <!-- Título obligatorio -->
                    <h3 class="news-title">${escapeHTML(titulo)}</h3>

                    <!-- Descripción obligatoria -->
                    <p class="news-description">${escapeHTML(descripcion)}</p>
                </div>

                <!-- Botón Leer noticia obligatorio -->
                <div class="news-card-footer">
                    <a 
                        href="${escapeHTML(urlNoticia)}" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        class="news-read-btn"
                    >
                        <span>Leer noticia</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-external-icon" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                </div>
            </article>
        `;
    });

    if (isAppending) {
        const gridContainer = resultsArea.querySelector('.news-grid');
        if (gridContainer) {
            gridContainer.insertAdjacentHTML('beforeend', cardsHtml);
            const countSpan = resultsArea.querySelector('.results-count');
            if (countSpan) {
                const currentCount = gridContainer.querySelectorAll('.news-card').length;
                countSpan.textContent = `${currentCount} noticias disponibles`;
            }
        }
    } else {
        let html = `
            <div class="results-header-info">
                <h3>${tituloSeccion}</h3>
                <span class="results-count">${articles.length} noticias disponibles</span>
            </div>
            <div class="news-grid">
                ${cardsHtml}
            </div>
        `;
        resultsArea.innerHTML = html;
    }
}

/**
 * Muestra el mensaje temporal de carga para el usuario
 * @param {string} tema
 */
function mostrarEstadoCargando(tema) {
    resultsArea.innerHTML = `
        <div class="state-card state-loading">
            <div class="spinner-container">
                <div class="loading-spinner" aria-label="Cargando"></div>
                <div class="spinner-pulse"></div>
            </div>
            <h2 class="state-title">Buscando noticias...</h2>
            <p class="state-description">
                Estamos recopilando ${escapeHTML(tema)}. Por favor, espera un momento.
            </p>
            <div class="skeleton-preview">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-text"></div>
                <div class="skeleton-line skeleton-text short"></div>
            </div>
        </div>
    `;
}

/**
 * Muestra el mensaje cuando no se encuentran resultados (mensaje para el usuario)
 * @param {string} tema
 */
function mostrarEstadoSinResultados(tema) {
    resultsArea.innerHTML = `
        <div class="state-card state-no-results">
            <div class="state-icon-wrapper empty-tone">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
            </div>
            <h2 class="state-title">No se encontraron noticias</h2>
            <p class="state-description">
                No encontramos publicaciones para <strong>"${escapeHTML(tema)}"</strong>.
            </p>
            <div class="state-suggestions">
                <strong>Sugerencias para tu búsqueda:</strong>
                <ul>
                    <li>Revisa que las palabras estén bien escritas.</li>
                    <li>Prueba con palabras más comunes o generales (ej. <em>"Tecnología"</em>, <em>"Deportes"</em>, <em>"Salud"</em>).</li>
                    <li>Intenta buscar temas de actualidad o sinónimos.</li>
                </ul>
            </div>
        </div>
    `;
}

/**
 * Muestra un mensaje amigable para el usuario cuando ocurre un error
 * @param {string} mensaje
 * @param {Function} accionReintentar Función a ejecutar al presionar reintentar
 */
function mostrarEstadoError(mensaje, accionReintentar = null) {
    resultsArea.innerHTML = `
        <div class="state-card state-error">
            <div class="state-icon-wrapper error-tone">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h2 class="state-title">No se pudieron obtener las noticias</h2>
            <p class="state-description">${escapeHTML(mensaje)}</p>
            <button type="button" class="retry-button" id="retryBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                Reintentar búsqueda
            </button>
        </div>
    `;

    const retryBtn = document.getElementById("retryBtn");
    if (retryBtn) {
        retryBtn.addEventListener("click", () => {
            if (typeof accionReintentar === "function") {
                accionReintentar();
            } else {
                buscarNoticias();
            }
        });
    }
}

/**
 * Formatea una fecha ISO a formato legible para el lector
 * @param {string} dateString
 * @returns {string}
 */
function formatearFecha(dateString) {
    if (!dateString) return "Fecha reciente";

    try {
        const fecha = new Date(dateString);
        if (isNaN(fecha.getTime())) return "Fecha reciente";

        return fecha.toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    } catch {
        return "Fecha reciente";
    }
}

/**
 * Escapa texto HTML para prevenir inyecciones de código
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
