// Infra compartida de skins (sin React: la importan los motores y la UI).
// El skin es un setting global de Arcade Vault, guardado en localStorage.

export type SkinId = 'clasico' | 'neon' | 'retro';

export const SKIN_IDS: readonly SkinId[] = ['clasico', 'neon', 'retro'];

export const DEFAULT_SKIN: SkinId = 'clasico';

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: 'Clásico',
  neon: 'Neón',
  retro: 'Retro',
};

export const SKIN_STORAGE_KEY = 'arcade-vault:skin';

export function isSkinId(v: unknown): v is SkinId {
  return typeof v === 'string' && (SKIN_IDS as readonly string[]).includes(v);
}

/** Skin siguiente en el ciclo (tecla T). */
export function nextSkin(skin: SkinId): SkinId {
  return SKIN_IDS[(SKIN_IDS.indexOf(skin) + 1) % SKIN_IDS.length];
}
