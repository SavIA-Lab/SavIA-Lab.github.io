/**
 * SavIA-Lab — JavaScript principal
 * --------------------------------
 * Responsabilidades:
 * 1. Menú responsive.
 * 2. Año dinámico del footer.
 * 3. Carga de métricas públicas de GitHub.
 * 4. Carga de repositorios destacados.
 *
 * La conexión con GitHub está preparada para una primera versión
 * estática. En una fase posterior puede trasladarse a GitHub Actions
 * si se requieren métricas más complejas o una caché de datos.
 */

const GITHUB_ORG = "SavIA-Lab";
const GITHUB_API = "https://api.github.com";

/* =========================================================
   UTILIDADES
   ========================================================= */

async function fetchGitHub(endpoint) {
    const response = await fetch(`${GITHUB_API}${endpoint}`, {
        headers: {
            Accept: "application/vnd.github+json"
        }
    });

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
}

function setMetric(name, value) {
    const element = document.querySelector(`[data-metric="${name}"]`);

    if (element) {
        element.textContent = value;
    }
}

/* =========================================================
   MENÚ RESPONSIVE
   ========================================================= */

function setupMenu() {
    const toggle = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".main-nav");

    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute(
            "aria-label",
            isOpen ? "Cerrar menú" : "Abrir menú"
        );
    });

    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            nav.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Abrir menú");
        });
    });
}

/* =========================================================
   FOOTER
   ========================================================= */

function setupYear() {
    const yearElement = document.getElementById("current-year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}


/* =========================================================
   CARRUSEL DEL HERO
   ========================================================= */

function setupHeroCarousel() {
    const carousel = document.querySelector("[data-carousel]");

    if (!carousel) return;

    const slides = Array.from(carousel.querySelectorAll(".hero-slide"));
    const dots = Array.from(carousel.querySelectorAll(".carousel-dot"));

    if (slides.length < 2) return;

    let currentIndex = 0;
    let intervalId = null;

    function showSlide(index) {
        currentIndex = (index + slides.length) % slides.length;

        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle("is-active", slideIndex === currentIndex);
        });

        dots.forEach((dot, dotIndex) => {
            const active = dotIndex === currentIndex;
            dot.classList.toggle("is-active", active);
            dot.setAttribute("aria-current", String(active));
        });
    }

    function startAutoplay() {
        window.clearInterval(intervalId);
        intervalId = window.setInterval(() => {
            showSlide(currentIndex + 1);
        }, 10000);
    }

    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            showSlide(index);
            startAutoplay();
        });
    });

    carousel.addEventListener("mouseenter", () => window.clearInterval(intervalId));
    carousel.addEventListener("mouseleave", startAutoplay);
    carousel.addEventListener("focusin", () => window.clearInterval(intervalId));
    carousel.addEventListener("focusout", (event) => {
        if (!carousel.contains(event.relatedTarget)) {
            startAutoplay();
        }
    });

    startAutoplay();
}

/* =========================================================
   MÉTRICAS GITHUB
   ========================================================= */

async function loadGitHubMetrics() {
    try {
        const repositories = await fetchAllRepositories();

        const publicRepositories = repositories.filter(
            (repository) => !repository.archived
        );

        const projects = publicRepositories.filter((repository) =>
            repository.name.startsWith("project-")
        );

        const software = publicRepositories.filter(
            (repository) =>
                repository.name.startsWith("int-software-") ||
                repository.name.startsWith("ext-software-")
        );

        const documentation = publicRepositories.filter((repository) =>
            repository.name.startsWith("docs-")
        );

        setMetric("repositories", publicRepositories.length);
        setMetric("projects", projects.length);
        setMetric("software", software.length);
        setMetric("documentation", documentation.length);

        renderFeaturedRepositories(publicRepositories);
    } catch (error) {
        console.warn("No fue posible cargar los datos de GitHub.", error);

        setMetric("repositories", "—");
        setMetric("projects", "—");
        setMetric("software", "—");
        setMetric("documentation", "—");

        const container = document.getElementById("featured-repositories");

        if (container) {
            container.innerHTML = `
                <div class="repo-placeholder">
                    Los repositorios se mostrarán cuando GitHub esté disponible.
                </div>
            `;
        }
    }
}

async function fetchAllRepositories() {
    const repositories = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        const pageData = await fetchGitHub(
            `/orgs/${GITHUB_ORG}/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc`
        );

        repositories.push(...pageData);

        if (pageData.length < perPage) {
            break;
        }

        page += 1;
    }

    return repositories;
}

/* =========================================================
   REPOSITORIOS DESTACADOS
   ========================================================= */

function renderFeaturedRepositories(repositories) {
    const container = document.getElementById("featured-repositories");

    if (!container) return;

    /*
     * Criterio inicial:
     * - excluir repositorios archivados;
     * - excluir .github;
     * - ordenar por estrellas;
     * - usar los tres primeros.
     *
     * En una fase posterior este criterio puede reemplazarse por
     * una selección editorial de repositorios estratégicos.
     */

    const featured = repositories
        .filter((repository) => repository.name !== ".github")
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 3);

    if (!featured.length) {
        container.innerHTML = `
            <div class="repo-placeholder">
                Aún no hay repositorios públicos para mostrar.
            </div>
        `;
        return;
    }

    container.innerHTML = featured
        .map(
            (repository) => `
                <article class="repo-item">
                    <a
                        href="${repository.html_url}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${escapeHTML(repository.name)}
                    </a>
                    <div class="repo-meta">
                        ★ ${repository.stargazers_count}
                        · ${repository.language || "Sin lenguaje principal"}
                    </div>
                </article>
            `
        )
        .join("");
}

/* =========================================================
   SEGURIDAD BÁSICA DE TEXTO
   ========================================================= */

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    setupMenu();
    setupYear();
    setupHeroCarousel();
    loadGitHubMetrics();
});
