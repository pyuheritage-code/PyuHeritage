(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        // ---- Profile dropdown ----
        const menuBtn = document.getElementById('profile-menu-btn');
        const menu = document.getElementById('profile-menu');
        const chevron = document.getElementById('profile-chevron');
        if (!menuBtn || !menu) return;

        function updateThemeUI() {
            const dot = document.getElementById('profile-theme-dot');
            const sw = document.getElementById('profile-theme-switch');
            const isDark = document.documentElement.classList.contains('dark');
            if (dot) dot.classList.toggle('translate-x-4', isDark);
            if (sw) sw.classList.toggle('bg-indigo-600', isDark);
        }

        function openMenu() {
            menu.classList.remove('hidden');
            if (chevron) chevron.classList.add('rotate-180');
            updateThemeUI();
        }

        function closeMenu() {
            menu.classList.add('hidden');
            if (chevron) chevron.classList.remove('rotate-180');
        }

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.contains('hidden') ? openMenu() : closeMenu();
        });

        menu.addEventListener('click', (e) => e.stopPropagation());

        document.addEventListener('click', (e) => {
            const root = document.getElementById('profile-menu-root');
            if (root && !root.contains(e.target)) closeMenu();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });

        const themeToggle = document.getElementById('profile-theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                if (typeof window.toggleTheme === 'function') window.toggleTheme();
                updateThemeUI();
            });
        }

        // ---- Change Username Modal ----
        const modal = document.getElementById('username-modal');
        if (!modal) return;

        const input = document.getElementById('username-input');
        const errorEl = document.getElementById('username-error');
        const saveBtn = document.getElementById('username-save');
        const cancelBtn = document.getElementById('username-cancel');
        const backdrop = document.getElementById('username-modal-backdrop');

        function showError(msg) {
            errorEl.textContent = msg;
            errorEl.classList.remove('hidden');
        }

        function hideError() {
            errorEl.textContent = '';
            errorEl.classList.add('hidden');
        }

        function openModal() {
            closeMenu();
            hideError();
            input.value = document.getElementById('profile-display-name')?.textContent || '';
            modal.classList.remove('hidden');
            input.focus();
            input.select();
        }

        function closeModal() {
            modal.classList.add('hidden');
        }

        document.getElementById('change-username-btn').addEventListener('click', openModal);
        const mobileChangeBtn = document.getElementById('mobile-change-username-btn');
        if (mobileChangeBtn) mobileChangeBtn.addEventListener('click', openModal);
        cancelBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
        });

        saveBtn.addEventListener('click', async () => {
            const username = input.value.trim();
            hideError();
            if (!username) {
                showError('Username cannot be empty.');
                return;
            }

            saveBtn.disabled = true;
            try {
                const res = await fetch('/auth/profile/username', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });
                const data = await res.json();
                if (!data.success) {
                    showError(data.error || 'Something went wrong. Please try again.');
                    saveBtn.disabled = false;
                    return;
                }
                const display = document.getElementById('profile-display-name');
                const triggerName = document.getElementById('profile-trigger-name');
                if (display) display.textContent = data.name;
                if (triggerName) triggerName.textContent = data.name;
                closeModal();
            } catch (err) {
                showError('Network error. Please try again.');
                saveBtn.disabled = false;
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveBtn.click();
        });
    });
})();