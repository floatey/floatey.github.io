// shop.js — Parts shop view (stub)

export function renderShop() {
  const root = document.getElementById('game-root');
  root.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = 'Shop — parts and tools coming soon.';
  root.appendChild(p);
}
