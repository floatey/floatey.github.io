// gacha.js — Junkyard / gacha pull view (stub)

export function renderJunkyard() {
  const root = document.getElementById('game-root');
  root.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = 'Junkyard — pull system coming soon.';
  root.appendChild(p);
}
