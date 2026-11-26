(() => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const menuToggle = document.getElementById('menuToggle');
    const adminProfile = document.querySelector('.admin-profile');

    function setSidebarOpen(isOpen) {
        sidebar.classList.toggle('open', isOpen);
        overlay.classList.toggle('show', isOpen);
        sidebar.inert = !isOpen;
        sidebar.setAttribute('aria-hidden', String(!isOpen));
        menuToggle.setAttribute('aria-expanded', String(isOpen));
        menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    }

    function updateActiveNavigation() {
        if (!window.location.hash) {
            return;
        }
        const activeHash = window.location.hash;
        sidebar.querySelectorAll('.menu-link').forEach(link => {
            link.classList.toggle('active', link.hash === activeHash);
        });
    }

    setSidebarOpen(false);
    updateActiveNavigation();

    menuToggle.addEventListener('click', () => {
        setSidebarOpen(!sidebar.classList.contains('open'));
    });
    overlay.addEventListener('click', () => setSidebarOpen(false));
    sidebar.querySelectorAll('.menu-link').forEach(link => {
        link.addEventListener('click', () => {
            updateActiveNavigation();
            setSidebarOpen(false);
        });
    });

    document.addEventListener('click', event => {
        if (adminProfile && !adminProfile.contains(event.target)) {
            adminProfile.open = false;
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (adminProfile) {
                adminProfile.open = false;
            }
            if (sidebar.classList.contains('open')) {
                setSidebarOpen(false);
                menuToggle.focus();
            }
        }
    });

    window.addEventListener('resize', () => setSidebarOpen(false));
    window.addEventListener('hashchange', updateActiveNavigation);
})();
