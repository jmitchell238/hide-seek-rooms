'use strict';

const defaultSave = () => ({
  muted: false,
  reducedMotion: false,
  finds: 0,
  roomsDone: 0,
  mode: 'cozy',
  unlocked: 1, // how many room indices unlocked (progress)
});

let save = defaultSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { save = defaultSave(); return save; }
    save = Object.assign(defaultSave(), JSON.parse(raw));
    if (!MODE_ORDER.includes(save.mode)) save.mode = 'cozy';
    save.unlocked = Math.max(1, Math.min(ROOMS.length, save.unlocked | 0));
  } catch { save = defaultSave(); }
  return save;
}

function persistSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* */ }
}

function recordFind() {
  save.finds = (save.finds | 0) + 1;
  persistSave();
}

function recordRoom() {
  save.roomsDone = (save.roomsDone | 0) + 1;
  if ((save.unlocked | 0) < ROOMS.length) {
    save.unlocked = (save.unlocked | 0) + 1;
  }
  persistSave();
}

function setMuted(v) { save.muted = !!v; persistSave(); }
function setReducedMotion(v) { save.reducedMotion = !!v; persistSave(); }
function setMode(id) {
  if (MODE_ORDER.includes(id)) { save.mode = id; persistSave(); }
}

loadSave();
