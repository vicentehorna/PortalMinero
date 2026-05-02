// Toggle del Sidebar (mostrar/ocultar)
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const backdrop = document.getElementById('sidebarBackdrop');
    const STORAGE_KEY = 'intranet-sidebar-collapsed';

    function isSidebarCollapsed() {
        return sidebar && sidebar.classList.contains('collapsed');
    }

    function setSidebarCollapsed(collapsed) {
        if (!sidebar) return;
        if (collapsed) {
            sidebar.classList.add('collapsed');
            if (backdrop) backdrop.classList.remove('is-visible');
        } else {
            sidebar.classList.remove('collapsed');
            if (window.innerWidth <= 767 && backdrop) backdrop.classList.add('is-visible');
        }
        try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch (e) {}
    }

    function toggleSidebar() {
        setSidebarCollapsed(!isSidebarCollapsed());
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() { toggleSidebar(); });
    }
    if (sidebarClose) {
        sidebarClose.addEventListener('click', function() { setSidebarCollapsed(true); });
    }
    if (backdrop) {
        backdrop.addEventListener('click', function() { setSidebarCollapsed(true); });
    }

    // Persistencia: en móvil iniciar oculto si se guardó así
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (saved !== null && sidebar) {
        if (saved === '1') sidebar.classList.add('collapsed');
        else sidebar.classList.remove('collapsed');
    } else if (window.innerWidth <= 767 && sidebar) {
        sidebar.classList.add('collapsed');
    }

    // Cerrar sidebar al hacer clic en un enlace de navegación (móvil)
    if (sidebar) {
        sidebar.querySelectorAll('a[href]').forEach(function(link) {
            var href = link.getAttribute('href') || '';
            if (href.indexOf('#') === 0) return;
            link.addEventListener('click', function() {
                if (window.innerWidth <= 767) setSidebarCollapsed(true);
            });
        });
    }

    // Expandir submenús que contengan la página actual activa
    const currentPath = window.location.pathname;
    const submenus = document.querySelectorAll('.sidebar .collapse');

    submenus.forEach(function(submenu) {
        const links = submenu.querySelectorAll('a[href]');
        let isActive = false;

        links.forEach(function(link) {
            if (link.getAttribute('href') === currentPath) {
                isActive = true;
                link.classList.add('active');
            }
        });

        if (isActive) {
            submenu.classList.add('show');
            const toggleId = submenu.getAttribute('id');
            const toggle = document.querySelector('.sidebar a[href="#' + toggleId + '"]');
            if (toggle) toggle.setAttribute('aria-expanded', 'true');
        }
    });

    // Al cargar: cerrar los submenús que no son el activo (solo uno abierto)
    if (sidebar) {
        sidebar.querySelectorAll('.collapse').forEach(function(collapseEl) {
            if (!collapseEl.classList.contains('show')) return;
            const links = collapseEl.querySelectorAll('a[href]');
            let isActiveSub = false;
            links.forEach(function(link) {
                if (link.getAttribute('href') === currentPath) isActiveSub = true;
            });
            if (!isActiveSub) {
                const bsCollapse = bootstrap.Collapse.getInstance(collapseEl);
                if (bsCollapse) bsCollapse.hide();
                else collapseEl.classList.remove('show');
                const toggle = sidebar.querySelector('a[href="#' + collapseEl.getAttribute('id') + '"]');
                if (toggle) toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Acordeón: al abrir un menú, cerrar los demás (solo uno desplegado a la vez)
    var accordionParent = document.getElementById('sidebarMenuAccordion');
    if (sidebar && accordionParent) {
        accordionParent.querySelectorAll('.collapse').forEach(function(collapseEl) {
            collapseEl.addEventListener('show.bs.collapse', function(event) {
                var openId = event.target.getAttribute('id');
                accordionParent.querySelectorAll('.collapse').forEach(function(other) {
                    if (other.getAttribute('id') !== openId && other.classList.contains('show')) {
                        var otherInstance = bootstrap.Collapse.getInstance(other);
                        if (otherInstance) otherInstance.hide();
                        var toggle = accordionParent.querySelector('a[href="#' + other.getAttribute('id') + '"]');
                        if (toggle) toggle.setAttribute('aria-expanded', 'false');
                    }
                });
            });
        });
    }
});

// Vista previa de documentos PDF en modal (usado en Envío de Documentos)
// Usa la ruta de la app (/stream_pdf/...) para que funcione en producción (Render):
// la página es HTTPS y cargar un iframe con URL HTTP (IIS) sería contenido mixto bloqueado.
function previewDocument(filename, empleado) {
    if (!filename) return;

    const modalEl = document.getElementById('previewModal');
    if (!modalEl) return;

    const modal = new bootstrap.Modal(modalEl);
    const frame = document.getElementById('pdfFrame');
    const title = document.getElementById('previewTitle');

    title.innerText = `Documento: ${empleado || '-'}`;
    frame.src = '/stream_pdf/' + encodeURIComponent(filename.trim());

    modal.show();
}
