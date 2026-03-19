// social.js — Activity feed & garage visit view (stub)

export function renderVisit(memberId) {
  const root = document.getElementById('game-root');
  root.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = `Visiting ${memberId}'s garage — coming soon.`;
  root.appendChild(p);
}
