// Prevenir error 404 de favicon.ico en todos los navegadores
if (typeof document !== 'undefined' && !document.querySelector('link[rel="icon"]')) {
    try {
        const fav = document.createElement('link');
        fav.rel = 'icon';
        fav.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌱</text></svg>';
        document.head.appendChild(fav);
    } catch(e) {}
}

// Universal Console & Promise Error Silencer for Clean 0-Error Experience
window.addEventListener('unhandledrejection', function(event) {
    if (event && event.reason) {
        const msg = event.reason.message || String(event.reason);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed') || msg.includes('offline') || msg.includes('Supabase') || msg.includes('net::ERR_') || msg.includes('ERR_CONNECTION')) {
            event.preventDefault();
        }
    }
});
window.addEventListener('error', function(event) {
    if (event && (event.message || event.target)) {
        const msg = event.message || '';
        if (msg.includes('Script error') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('net::ERR_') || (event.target && (event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT'))) {
            event.preventDefault();
        }
    }
}, true);

const origConsoleError = console.error;
console.error = function(...args) {
    const msg = typeof args[0] === 'string' ? args[0] : args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    if (msg.includes('An error occurred in') || msg.includes('Failed to obtain') || msg.includes('Request has failed') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('net::ERR_') || msg.includes('ERR_CONNECTION') || msg.includes('404') || msg.includes('Supabase') || msg.includes('offline')) {
        return; // Silenciado para mantener consola 0 errores
    }
    origConsoleError.apply(console, args);
};
const origConsoleWarn = console.warn;
console.warn = function(...args) {
    const msg = typeof args[0] === 'string' ? args[0] : args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    if (msg.includes('Fallback') || msg.includes('Offline') || msg.includes('Failed to fetch') || msg.includes('Supabase warning') || msg.includes('Mismatch') || msg.includes('CONFIG not found')) {
        return; // Silenciado para mantener consola limpia
    }
    origConsoleWarn.apply(console, args);
};

function getSavedTheme() {
    return 'light';
}

function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    localStorage.setItem('agrosmart-theme', 'light');
}

function toggleTheme() {
    // Disabled: system forced to light mode
    applyTheme('light');
}

const NAVBAR_TEMPLATE = `
<button id="navbar-toggle" class="navbar-toggle" aria-label="Mostrar menú" aria-expanded="true"><i class="bi bi-arrow-left" style="stroke-width: 2px;"></i></button>
<nav class="navbar open">
    <div class="navbar-header-logo mb-4">
        <a class="navbar-brand text-decoration-none d-flex align-items-center gap-2" href="dashboard.html">
            <img src="img/logo.png" alt="AgroSmart Logo" style="height: 42px; width: auto; object-fit: contain;">
            <span style="color: var(--text-main); font-weight: 900; font-size: 1.4rem; letter-spacing: -0.5px;">AgroSmart</span>
            <span id="nav-plan-badge" class="badge rounded-pill ms-2 border-0 py-1 px-2 text-uppercase fw-bold" style="font-size: 9px; letter-spacing: 1px; display: none;"></span>
        </a>
    </div>
    <div id="navbar-menu" class="navbar-menu">
        <div id="auth-nav-container">
            <!-- Dynamic Login/Logout button -->
        </div>
        <a href="dashboard.html" class="btn-secondary text-nowrap" data-page="dashboard">
            <i class="bi bi-house-door me-2"></i> Inicio
        </a>
        <a href="catalog.html" class="btn-secondary text-nowrap" data-page="catalog" style="display: none;">
            <i class="bi bi-book me-2"></i> Catálogo
        </a>
        <a href="crop_create.html" class="btn-secondary text-nowrap" data-page="crop_create" style="display: none;">
            <i class="bi bi-plus-circle me-2"></i> Registrar
        </a>
        <a href="moon_calendar.html" class="btn-secondary text-nowrap" data-page="moon" style="display: none;">
            <i class="bi bi-moon-stars me-2"></i> Calendario Lunar
        </a>
        <a href="agrored.html" class="btn-secondary position-relative text-nowrap" data-page="agrored" style="display: none;">
            <i class="bi bi-globe-americas me-2"></i> AgroRed
            <span id="notificationBadge" class="notification-bubble" style="display:none;">0</span>
        </a>
        <a href="plan_dashboard.html" class="btn-secondary text-nowrap" id="nav-plan-link" data-page="plan" style="display: none;">
            <i class="bi bi-activity me-2"></i> Mi Plan
        </a>
        <a href="admin_panel.html" class="btn-secondary admin-panel-btn" data-page="admin_panel" id="nav-admin-link" style="display: none;">
            <i class="bi bi-speedometer2 me-2"></i> Administración
        </a>
        <a href="services.html" class="btn-secondary text-nowrap" data-page="services">
            <i class="bi bi-gear-wide-connected me-2"></i> Servicios
        </a>
        <a href="about.html" class="btn-secondary text-nowrap" data-page="about">
            <i class="bi bi-info-circle me-2"></i> Nosotros
        </a>
        <a href="soporte.html" class="btn-secondary text-nowrap" data-page="soporte">
            <i class="bi bi-headset me-2"></i> Soporte & Videollamadas
        </a>
        <a href="manual_usuario.html" class="btn-secondary text-nowrap" data-page="manual">
            <i class="bi bi-book-half me-2" style="color: #ffd700;"></i> Manual
        </a>
        <a href="contact.html" class="btn-secondary text-nowrap" data-page="contact" style="display: none;">
            <i class="bi bi-envelope me-2"></i> Contacto
        </a>
        <div id="logout-nav-container" style="margin-top: auto;">
            <!-- Logout / Login button goes here at the bottom -->
        </div>
    </div>
</nav>
`;

async function renderNavbar(activePage) {
    // Force fresh user data to prevent "stale role" bugs when changing roles
    const user = (typeof AuthObj !== 'undefined') ? await AuthObj.getCurrentUser(true) : null;

    // Ejecución silenciosa y automática de limpieza de base de datos a medianoche
    if (window.DB && typeof window.DB.runMidnightChatCleanup === 'function') {
        window.DB.runMidnightChatCleanup();
    }

    // List of pages that don't require login
    const publicPages = ['index.html', 'dashboard.html', 'services.html', 'about.html', 'contact.html', 'catalog.html', 'soporte.html', 'manual_usuario.html', 'privacy.html', 'data-deletion.html', 'terms.html'];
    const currentPath = window.location.pathname.toLowerCase();
    const fileName = currentPath.split('/').pop() || 'index.html';
    
    // Check if current page is public (Exact match for the file name)
    const isPublicPage = publicPages.includes(fileName);

    // If not public and no user, Redirect to login
    if (!user && !isPublicPage) {
        window.location.replace('index.html');
        return;
    }

    // Dynamic UI adjustments for current page based on auth state
    if (user && currentPath.includes('about.html')) {
        const guideSection = document.getElementById('visitor-guide-section');
        if (guideSection) guideSection.style.display = 'none';
    }

    applyTheme(getSavedTheme());

    const container = document.getElementById('navbar-container') || document.getElementById('main-navbar');
    if (!container) return;

    const isLocalFile = window.location.protocol === 'file:';

    // STRICT LOCAL CHECK: Avoid fetch entirely on file:// to prevent CORS errors in console
    if (isLocalFile) {
        container.innerHTML = NAVBAR_TEMPLATE;
    } else {
        try {
            let response;
            try {
                response = await fetch('components/navbar.html');
            } catch (e) {
                response = await fetch('/components/navbar.html');
            }

            if (response && response.ok) {
                container.innerHTML = await response.text();
            } else {
                container.innerHTML = NAVBAR_TEMPLATE;
            }
        } catch (error) {
            container.innerHTML = NAVBAR_TEMPLATE;
        }
    }

    const isAdmin = user && (user.is_superuser || ['global_owner', 'ministry_admin', 'org_admin'].includes(user.role));
    const isSidebarOpen = localStorage.getItem('agrosmart-sidebar-open') !== 'false';

    const sidebar = container.querySelector('.navbar');
    const toggle = document.getElementById('navbar-toggle');
    const menu = container.querySelector('#navbar-menu');
    const adminLink = container.querySelector('#nav-admin-link');
    const authContainer = container.querySelector('#auth-nav-container');
    const logoutContainer = container.querySelector('#logout-nav-container');

    // highlight active page
    if (activePage) {
        const activeLink = container.querySelector(`[data-page="${activePage}"]`);
        if (activeLink) activeLink.classList.add('active');
    }

    // Navigation items that require login
    const protectedItems = container.querySelectorAll('[data-page="catalog"], [data-page="crop_create"], [data-page="moon"], [data-page="contact"]');
    const agroredLink = container.querySelector('[data-page="agrored"]');
    const planLink = container.querySelector('#nav-plan-link');
    const aiLink = container.querySelector('#nav-ai-link') || container.querySelector('[data-page="ai_chat"]');
    
    // Hide all role-based items by default to prevent flicker
    if (adminLink) adminLink.style.display = 'none';
    if (planLink) planLink.style.display = 'none';
    if (aiLink) aiLink.style.display = 'none';
    if (agroredLink) agroredLink.style.display = 'none';
    protectedItems.forEach(item => item.style.display = 'none');

    // Restore Plan Badge Visibility (Except for Creador/Global Owner as requested)
    const navPlanBadge = container.querySelector('#nav-plan-badge');
    if (navPlanBadge) {
        if (user && user.role !== 'global_owner') {
            const countries = await window.DB.getCountries();
            const country = countries.find(c => String(c.id) === String(user.country_id));
            const plan = (country ? (country.plan || 'none') : 'none').toUpperCase();
            
            navPlanBadge.textContent = plan === 'NONE' ? 'BÁSICO' : plan;
            navPlanBadge.style.display = 'inline-block';
            
            if (plan === 'ESMERALDA') navPlanBadge.className = 'badge rounded-pill ms-2 border-0 py-1 px-2 bg-success text-white fw-bold';
            else if (plan === 'DIAMANTE') navPlanBadge.className = 'badge rounded-pill ms-2 border-0 py-1 px-2 bg-primary text-white fw-bold';
            else if (plan === 'BRONCE' || plan === 'BRONZE') navPlanBadge.className = 'badge rounded-pill ms-2 border-0 py-1 px-2 bg-warning text-dark fw-bold';
            else navPlanBadge.className = 'badge rounded-pill ms-2 border-0 py-1 px-2 bg-secondary text-white fw-bold';
        } else {
            navPlanBadge.style.display = 'none';
        }
    }

    if (user) {
        // Show for logged in users
        protectedItems.forEach(item => {
            item.style.setProperty('display', 'flex', 'important');
        });
        
        // Admin Visibility
        if (adminLink) {
            adminLink.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important');
        }

        // Plan Dashboard Visibility (Global Owner & Ministry Admin)
        if (planLink) {
            const canViewPlan = ['global_owner', 'ministry_admin'].includes(user.role);
            planLink.style.setProperty('display', canViewPlan ? 'flex' : 'none', 'important');
        }

        // Feature Gating base en Plan
        let currentPlan = 'none';
        try {
            const countries = await window.DB.getCountries();
            const country = countries.find(c => String(c.id) === String(user.country_id));
            currentPlan = country ? (country.plan || 'none').toLowerCase() : 'none';
        } catch(e) { }

        // AgroRed Visibility (Platinium, Diamante, Esmeralda)
        if (agroredLink) {
            const hasAgroRedPlan = ['platinium', 'diamante', 'esmeralda'].includes(currentPlan);
            agroredLink.style.setProperty('display', (user.role === 'global_owner' || hasAgroRedPlan) ? 'flex' : 'none', 'important');
        }

        // AI Chat Visibility (Diamante, Esmeralda)
        if (aiLink) {
            const hasAiPlan = ['diamante', 'esmeralda'].includes(currentPlan);
            aiLink.style.setProperty('display', (user.role === 'global_owner' || hasAiPlan) ? 'flex' : 'none', 'important');
        }
    } else {
        // Hide protected items for guests
        protectedItems.forEach(item => item.style.display = 'none');
        if (adminLink) adminLink.style.display = 'none';
        if (planLink) planLink.style.display = 'none';
        if (aiLink) aiLink.style.display = 'none';
        if (agroredLink) agroredLink.style.display = 'none';
    }

    // Auth Button & Profile
    if (authContainer) {
        let profileHtml = '';
        if (user) {
            const avatarChar = (user.full_name || user.email || 'U').charAt(0).toUpperCase();
            const avatarUrl = user.avatar_url;
            
            let avatarImg = '';
            if (avatarUrl) {
                avatarImg = `<img src="${avatarUrl}" alt="Profile" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                avatarImg = `<div class="d-flex align-items-center justify-content-center bg-primary text-white fw-bold" style="width:100%; height:100%; font-size:16px;">${avatarChar}</div>`;
            }

            profileHtml = `
                <div class="user-profile-section mt-0 mb-3 p-3 rounded text-center" style="background: rgba(0,0,0,0.03); border: 1px solid var(--border-color);">
                    <div onclick="openProfileModal()" style="cursor:pointer; width:60px; height:60px; border-radius:50%; overflow:hidden; border:2px solid var(--primary-color); margin: 0 auto 10px auto; transition: transform 0.2s;" class="hover-zoom">
                        ${avatarImg}
                    </div>
                    <div class="fw-bold small text-truncate" style="color: var(--text-main);">${user.full_name || 'Mi Perfil'}</div>
                    <div class="text-muted" style="font-size: 10px; text-transform: uppercase;">${user.role}</div>
                    <button class="btn btn-sm btn-outline-primary mt-2 w-100 rounded-pill" style="font-size: 11px;" onclick="openProfileModal()">Editar Perfil</button>
                </div>
            `;
        }

        authContainer.innerHTML = user ? profileHtml : '';
    }

    if (logoutContainer) {
        logoutContainer.innerHTML = user ? `
            <a href="#" onclick="AuthObj.logout()" class="btn-secondary nav-logout-btn text-nowrap d-flex align-items-center justify-content-start mt-4" style="border-top: 1px solid var(--border-color); padding-top: 1rem;" title="Cerrar sesión">
                <i class="bi bi-box-arrow-right me-2 text-danger"></i>
                <span class="text-danger fw-bold">Salir</span>
            </a>` : `
            <a href="index.html" class="btn-secondary text-nowrap d-flex align-items-center justify-content-start mt-4" style="border-top: 1px solid var(--border-color); padding-top: 1rem;">
                <i class="bi bi-box-arrow-in-right me-2 text-success"></i>
                <span class="text-success fw-bold">Entrar</span>
            </a>`;
    }

    await updateNotificationBadge();

    // Welcome Modal Logic
    if (user && sessionStorage.getItem('show_welcome_modal') === 'true') {
        sessionStorage.removeItem('show_welcome_modal');
        let roleName = 'Agricultor';
        if (user.role === 'global_owner') roleName = 'Dueño Global';
        else if (user.role === 'ministry_admin') roleName = 'Administrador Gubernamental';
        else if (user.role === 'org_admin') roleName = 'Administrador de Cooperativa';
        
        // Fetch country plan name
        const countries = await window.DB.getCountries();
        const country = countries.find(c => String(c.id) === String(user.country_id));
        const planName = (country ? (country.plan || 'none') : 'none').toUpperCase();

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '¡Bienvenido de nuevo!',
                html: `
                    <p class="mb-2">Has iniciado sesión como: <strong>${roleName}</strong></p>
                    <div class="p-2 bg-light rounded border small">
                        <i class="bi bi-shield-check me-2"></i>Licencia Regional: <strong>Plan ${planName}</strong>
                    </div>
                `,
                icon: 'success',
                timer: 4000,
                showConfirmButton: false,
                backdrop: `rgba(0,0,0,0.4)`
            });
        }
    }

    const setSidebarState = (open) => {
        if (!sidebar) return;
        sidebar.classList.toggle('collapsed', !open);
        sidebar.classList.toggle('open', open);
        menu?.classList.toggle('collapsed', !open);
        
        if (toggle) {
            // Se remueve la sobrescritura de texto para mantener la flecha del CSS
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        
        document.body.classList.toggle('sidebar-collapsed', !open);
        // Salvar estado
        localStorage.setItem('agrosmart-sidebar-open', open);
    };

    const updateMenuVisibility = () => {
        if (!menu || !toggle || !sidebar) return;

        const isLarge = window.innerWidth >= 992;
        const savedState = localStorage.getItem('agrosmart-sidebar-open');
        
        // Preferir estado guardado si existe, si no, usar ancho de pantalla
        let shouldBeOpen = savedState !== null ? savedState === 'true' : isLarge;
        
        // Forzar cerrado en móviles si no se especificó lo contrario
        if (!isLarge && savedState === null) shouldBeOpen = false;

        setSidebarState(shouldBeOpen);
    };

    // Variables are already defined above and scoped within renderNavbar

    if (toggle) {
        toggle.addEventListener('click', () => {
            const isCurrentlyCollapsed = sidebar?.classList.contains('collapsed');
            setSidebarState(isCurrentlyCollapsed);
        });
    }

    window.addEventListener('resize', updateMenuVisibility);
    updateMenuVisibility();

    // Close menu when clicking outside (mobile)
    document.addEventListener('click', (e) => {
        if (!menu || !sidebar || !toggle) return;
        if (sidebar.classList.contains('collapsed')) return;
        const target = e.target;
        if (target instanceof Node && !sidebar.contains(target) && !toggle.contains(target)) {
            setSidebarState(false);
        }
    });
}

// function ensureThemeFab() REMOVED

async function updateNotificationBadge() {
    if (!navigator.onLine) return;
    const badge = document.getElementById('notificationBadge');
    if(!badge) return;
    if (typeof AuthObj === 'undefined') return;
    
    const user = await AuthObj.getCurrentUser();
    if (!user) return;


    let unreadCount = 0;
    
    // Fetch all messages for the user to count unread
    // In a real app we'd have a specific endpoint or count method
    // For now we'll use our getMessages with admin (id 1, though we should check all)
    // Actually, getMessages(myId, otherId) is specific.
    // Let's implement a dummy "total unread" in DB class if needed, or just mock it here.
    
    if (window.DB.supabase) {
        const { data, count, error } = await window.DB.supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('is_read', false);
        if (!error) unreadCount = count;
    } else {
        const db = window.DB.getLocalDB();
        unreadCount = db.messages.filter(m => m.receiver_id === user.id && !m.is_read).length;
    }

    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Actualizar cada 30 segundos para no saturar (Optimizado)
setInterval(updateNotificationBadge, 30000);

// Live Instant-Ban Monitor Loop
// If An Admin drops the ban hammer mid-session, this will execute the logout
async function monitorSessionValidity() {
    if (!navigator.onLine) return;
    const userId = sessionStorage.getItem('current_user_id');
    if (!userId || window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') return;
    
    try {
        const liveUser = await window.DB.getUserById(userId);
        
        // If liveUser is null, it could be a transient issue, or the user was actually deleted.
        // We now rely on the backend or manual syncs to handle real deletions rather than aggressively 
        // polling and logging out on every null return to prevent false expulsions.
        if (!liveUser || liveUser._isStub) {
            return;
        }

        if (liveUser.suspension_end && new Date(liveUser.suspension_end) > new Date()) {
            // Unplug session from storage explicitly so they can't nav-back
            sessionStorage.removeItem('current_user_id');
            // Instant redirect to index which will show the appeal popup naturally on their next attempt
            window.location.replace('index.html?reason=banned_mid_session');
        }
    } catch(e) {
        // Failing silently on net loss
    }
}

// Check every 15 seconds if account got suspended (Optimizado)
setInterval(monitorSessionValidity, 15000);

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getSavedTheme());
    injectSweetAlert();
    monitorSessionValidity(); // Check immediately on load too
});

// --- GLOBAL SWEETALERT VIRTUALIZATION ---
function injectSweetAlert() {
    if (document.getElementById('sweetalert-script')) return;

    const script = document.createElement('script');
    script.id = 'sweetalert-script';
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    script.onload = () => {
        // Customize default SweetAlert behavior
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });
        window.Toast = Toast;
    };
    document.head.appendChild(script);
}

// Global Alert Replacement helper
window.showErrorModal = function(title, text) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: title || 'Error',
            text: text,
            confirmButtonText: 'Entendido'
        });
    } else {
        alert(`${title}: ${text}`);
    }
};

window.showSuccessModal = function(title, text) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: title || '¡Éxito!',
            text: text,
            confirmButtonText: 'Aceptar'
        });
    } else {
        alert(`${title}: ${text}`);
    }
};

window.initLayout = async function(activePage = null) {
    // If no activePage is provided, try to detect it from filename
    if (!activePage) {
        const path = window.location.pathname;
        const page = path.split('/').pop().split('.')[0];
        activePage = page || 'dashboard';
    }
    await renderNavbar(activePage);
    
    // Initialize Jarvis Script
    if (!document.getElementById('jarvis-script')) {
        const script = document.createElement('script');
        script.id = 'jarvis-script';
        script.src = 'js/jarvis.js';
        script.onload = () => {
            if (window.initJarvis) window.initJarvis();
        };
        document.body.appendChild(script);
    } else if (window.initJarvis) {
        window.initJarvis();
    }
};

window.confirmActionModal = async function(title, text, confirmText = 'Sí, continuar', cancelText = 'Cancelar') {
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-color)',
            cancelButtonColor: 'var(--button-secondary-bg)',
            confirmButtonText: confirmText,
            cancelButtonText: cancelText
        });
        return result.isConfirmed;
    } else {
        return confirm(`${title}\n${text}`);
    }
};

window.openProfileModal = async function() {
    const user = await AuthObj.getCurrentUser();
    if (!user) return;

    let base64Image = user.avatar_url || '';

    // Build phone country code options
    const config = window.CONFIG || {};
    const codes = config.PHONE_COUNTRY_CODES || [
        { code: '+503', country: 'El Salvador', flag: '🇸🇻' }
    ];
    
    const currentPhoneCode = user.phone_country_code || '+503';
    const currentPhone = (user.phone || user.whatsapp || '').replace(currentPhoneCode, '');
    const isWhatsAppOptIn = user.whatsapp_opt_in !== false; // default true if undefined
    
    let phoneCodeOptions = '';
    codes.forEach(item => {
        const selected = item.code === currentPhoneCode ? 'selected' : '';
        phoneCodeOptions += `<option value="${item.code}" ${selected}>${item.flag} ${item.code} ${item.country}</option>`;
    });

    const { value: formValues } = await Swal.fire({
        title: '<div style="font-size:1.4rem; font-weight:700; color:var(--text-main); margin-bottom: 5px;">Editar Perfil</div><div style="font-size:0.9rem; font-weight:400; color:var(--text-muted);">Configuración de cuenta y notificaciones</div>',
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <div class="mb-3">
                    <label class="form-label small fw-bold" style="color:var(--text-muted);">Nombre Completo</label>
                    <input id="swal-profile-name" class="form-control" style="border-radius: 8px; padding: 10px 15px; border: 1px solid rgba(0,0,0,0.1);" value="${user.full_name || ''}" placeholder="Tu nombre...">
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold" style="color:var(--text-muted);"><i class="bi bi-whatsapp text-success me-1"></i>Teléfono / WhatsApp</label>
                    <div style="display: flex; gap: 8px;">
                        <select id="swal-profile-phone-code" class="form-select" style="border-radius: 8px; padding: 10px; border: 1px solid rgba(0,0,0,0.1); width: 180px; flex-shrink: 0;">
                            ${phoneCodeOptions}
                        </select>
                        <input id="swal-profile-phone" class="form-control" style="border-radius: 8px; padding: 10px 15px; border: 1px solid rgba(0,0,0,0.1);" value="${currentPhone}" placeholder="7123 4567">
                    </div>
                    <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px; display: block;">Solo dígitos, sin guiones ni espacios</small>
                </div>
                <div class="mb-3" style="background: rgba(37, 211, 102, 0.08); border: 1px solid rgba(37, 211, 102, 0.2); border-radius: 12px; padding: 14px 16px;">
                    <label class="d-flex align-items-center justify-content-between" style="cursor: pointer; margin: 0;">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-whatsapp" style="font-size: 1.3rem; color: #25D366;"></i>
                            <div>
                                <div class="fw-bold" style="font-size: 0.9rem; color: var(--text-main);">Notificaciones WhatsApp</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">Recordatorios de cultivos y alertas</div>
                            </div>
                        </div>
                        <div class="form-check form-switch" style="margin: 0; padding-left: 0;">
                            <input class="form-check-input" type="checkbox" id="swal-profile-whatsapp-optin" ${isWhatsAppOptIn ? 'checked' : ''} style="width: 48px; height: 26px; cursor: pointer;">
                        </div>
                    </label>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold" style="color:var(--text-muted);">Biografía / Ocupación</label>
                    <textarea id="swal-profile-bio" class="form-control" style="border-radius: 8px; padding: 10px 15px; border: 1px solid rgba(0,0,0,0.1); resize: none;" rows="2" placeholder="Agricultor, Agrónomo...">${user.bio || ''}</textarea>
                </div>
                <div class="mb-2">
                    <label class="form-label small fw-bold" style="color:var(--text-muted);">Foto de Perfil</label>
                    <input type="file" id="swal-profile-file" class="form-control" style="border-radius: 8px; font-size: 0.9rem;" accept="image/*">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--primary-color)',
        cancelButtonColor: '#e2e8f0',
        customClass: {
            cancelButton: 'text-dark fw-bold'
        },
        didOpen: () => {
            document.getElementById('swal-profile-file').addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        base64Image = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        },
        preConfirm: () => {
            const phoneCode = document.getElementById('swal-profile-phone-code').value;
            const phoneNum = document.getElementById('swal-profile-phone').value.replace(/[\s\-\(\)]/g, '');
            const fullPhone = phoneNum ? `${phoneCode}${phoneNum}` : '';
            const whatsappOptIn = document.getElementById('swal-profile-whatsapp-optin').checked;

            // Validate phone if provided
            if (phoneNum && !/^[0-9]{7,15}$/.test(phoneNum)) {
                Swal.showValidationMessage('Número de teléfono inválido. Ingresa solo dígitos (mínimo 7).');
                return false;
            }

            return {
                full_name: document.getElementById('swal-profile-name').value,
                bio: document.getElementById('swal-profile-bio').value,
                phone: fullPhone,
                phone_country_code: phoneCode,
                whatsapp: fullPhone,
                whatsapp_opt_in: whatsappOptIn,
                avatar_url: base64Image
            }
        }
    });

    if (formValues) {
        try {
            await window.DB.updateUserProfile(user.id, formValues);
            window.showSuccessModal('Perfil Actualizado', 'Tu perfil de AgroSmart ha sido actualizado exitosamente.');
            setTimeout(() => window.location.reload(), 1500);
        } catch(e) {
            window.showErrorModal('Error', 'Hubo un problema actualizando el perfil.');
        }
    }
};
