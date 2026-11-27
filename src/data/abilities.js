/**
 * Catálogo configurável de habilidades especiais.
 * `chargeType`:
 *  - 'kills': carrega com inimigos comuns derrotados (reinicia a cada uso).
 *  - 'cooldown': fica disponível após `initialCooldownMs` e recarrega por `cooldownMs`.
 * Toda habilidade tem `durationMs` finito: nenhuma invulnerabilidade/velocidade é permanente.
 */
export const ABILITIES = {
  terca_do_cantinho: {
    id: 'terca_do_cantinho',
    name: 'Terça do Cantinho',
    chargeType: 'kills',
    killsRequired: 10,
    durationMs: 9000,
    invulnerable: false,
    color: 0xa855f7,
    colorHex: '#a855f7',
    rain: {
      drinkId: 'cantinho_do_vale',
      intervalMs: 260,
      perTick: 1,
      maxDrinks: 28,
      spawnY: -24,
      marginX: 48,
    },
  },
  o_fit_se_calou: {
    id: 'o_fit_se_calou',
    name: 'O fit se calou',
    chargeType: 'kills',
    killsRequired: 10,
    durationMs: 5500,
    invulnerable: true,
    moveSpeed: 660,
    color: 0x22c55e,
    colorHex: '#22c55e',
    ram: {
      name: 'Atropelamento',
      baseDamage: 24,
      knockback: 70,
      width: 76,
      height: 44,
      offsetY: 8,
      rehitMs: 350,
    },
  },
  pisa_ligeiro: {
    id: 'pisa_ligeiro',
    name: 'Pisa ligeiro, pisa ligeiro',
    chargeType: 'kills',
    killsRequired: 10,
    durationMs: 7000,
    invulnerable: true,
    moveSpeed: 540,
    bodyScaleMultiplier: 0.55,
    color: 0xfbbf24,
    colorHex: '#fbbf24',
    helpers: {
      spawnIntervalMs: 420,
      maxActive: 10,
      lifetimeMs: 4500,
    },
  },
};

export function getAbilityById(id) {
  return ABILITIES[id] ?? null;
}
