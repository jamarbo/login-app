document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('theme');
  let theme = savedTheme || (prefersDark ? 'dark' : 'light');

  function applyTheme(theme) {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
    localStorage.setItem('theme', theme);
    btn.textContent = theme === 'dark' ? '🌙' : '🌞';
  }

  btn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
  });

  applyTheme(theme);
});