'use client';

import { useSyncExternalStore } from 'react';
import {
  DEFAULT_SKIN,
  SKIN_STORAGE_KEY,
  isSkinId,
  type SkinId,
} from '@/app/games/skins';

// El skin vive en localStorage (`arcade-vault:skin`); React lo lee como store
// externo (mismo patrón que SessionProvider). En el servidor → DEFAULT_SKIN.
const skinListeners = new Set<() => void>();

function subscribeSkin(cb: () => void) {
  skinListeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    skinListeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

function readSkin(): SkinId {
  try {
    const raw = localStorage.getItem(SKIN_STORAGE_KEY);
    return isSkinId(raw) ? raw : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

function writeSkin(skin: SkinId) {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, skin);
  } catch {
    // localStorage no disponible: el cambio no persiste.
  }
  skinListeners.forEach((cb) => cb());
}

function serverSkin(): SkinId {
  return DEFAULT_SKIN;
}

/** Skin global activo de Arcade Vault y su setter (persistente). */
export function useSkin(): [SkinId, (skin: SkinId) => void] {
  const skin = useSyncExternalStore(subscribeSkin, readSkin, serverSkin);
  return [skin, writeSkin];
}
