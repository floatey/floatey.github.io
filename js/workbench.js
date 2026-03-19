// workbench.js — Workbench view (stub)

export function renderWorkbench(vehicleInstanceId) {
  const root = document.getElementById('game-root');
  root.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = `Workbench — vehicle ${vehicleInstanceId || '(none)'}. Coming soon.`;
  root.appendChild(p);
}
