// ════════════════════════════════════════════════════════════
//  garage.js — Profile picker & garage view (stub)
// ════════════════════════════════════════════════════════════

import { onProfileSelected, navigate } from './main.js';
import { timeAgo } from './utils.js';

const PROFILES = ['nick', 'tarro', 'nathan', 'damian', 'harrison'];

export function renderProfilePicker() {
  const root = document.getElementById('game-root');
  root.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'profile-picker';

  const heading = document.createElement('h1');
  heading.className = 'picker-title';
  heading.textContent = 'JDM Restoration Garage';
  wrap.appendChild(heading);

  const subtitle = document.createElement('p');
  subtitle.className = 'picker-subtitle';
  subtitle.textContent = 'Select your profile';
  wrap.appendChild(subtitle);

  const grid = document.createElement('div');
  grid.className = 'profile-grid';

  for (const id of PROFILES) {
    const card = document.createElement('button');
    card.className = 'profile-card';
    card.addEventListener('click', () => onProfileSelected(id));

    const name = document.createElement('span');
    name.className = 'profile-name';
    name.textContent = id.charAt(0).toUpperCase() + id.slice(1);

    const detail = document.createElement('span');
    detail.className = 'profile-detail';
    const saved = localStorage.getItem('jdm_game_' + id);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const cars = Object.keys(data.garage?.vehicles || {}).length;
        detail.textContent = `${cars} car${cars !== 1 ? 's' : ''} · ${timeAgo(data.lastModified)}`;
      } catch {
        detail.textContent = 'Corrupted save';
      }
    } else {
      detail.textContent = 'New game';
    }

    card.append(name, detail);
    grid.appendChild(card);
  }

  wrap.appendChild(grid);
  root.appendChild(wrap);
}

export function renderGarage() {
  const root = document.getElementById('game-root');
  root.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'view-garage';

  const h = document.createElement('h2');
  h.textContent = 'Your Garage';
  wrap.appendChild(h);

  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = 'No cars yet. Hit the Junkyard to find your first project.';
  wrap.appendChild(p);

  root.appendChild(wrap);
}
