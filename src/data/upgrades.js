/**
 * Catálogo orientado a dados dos 30 upgrades da partida (GAME_DESIGN.md §8).
 * Todos os upgrades possuem benefícios reais claros (mesmo os de risco/retorno).
 */
export const UPGRADES = [
  // --- Upgrades originais (1 a 10) ---
  {
    id: 'soco_de_aco',
    number: 1,
    name: 'Soco de Aço',
    description: 'Punhos reforçados que aumentam a força dos seus golpes.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { strength: 5 },
    },
    visual: {
      slot: 'fists_tint',
      type: 'steel_fists',
      color: 0x94a3b8,
    },
  },
  {
    id: 'mao_de_alface',
    number: 2,
    name: 'Mão de Alface',
    description: 'Mãos super leves: reduz um pouco a força, mas acelera muito os golpes e a recuperação.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { strength: -2 },
      gameplay: {
        attackSpeedMultiplier: 1.35,
        recoveryMultiplier: 0.75,
      },
    },
    visual: {
      slot: 'fists_tint',
      type: 'lettuce_hands',
      color: 0x4ade80,
    },
  },
  {
    id: 'coracao_extra',
    number: 3,
    name: 'Coração Extra',
    description: 'Aumenta o HP máximo permanentemente na partida.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { maxHp: 30 },
    },
    visual: {
      slot: 'chest_emblem',
      type: 'extra_heart',
      color: 0xef4444,
    },
  },
  {
    id: 'saude_fragil',
    number: 4,
    name: 'Saúde Frágil',
    description: 'Canhão de vidro: reduz o HP máximo, mas aumenta bastante o dano geral e a velocidade.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { maxHp: -20 },
      gameplay: {
        damageMultiplier: 1.25,
        moveSpeedMultiplier: 1.15,
      },
    },
    visual: {
      slot: 'chest_crack',
      type: 'fragile_health',
      color: 0x38bdf8,
    },
  },
  {
    id: 'figado_de_ferro',
    number: 5,
    name: 'Fígado de Ferro',
    description: 'Aumenta a resistência contra embriaguez e concede vida extra.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { drinkResistance: 0.35, maxHp: 15 },
    },
    visual: {
      slot: 'belt',
      type: 'iron_liver',
      color: 0xcbd5e1,
    },
  },
  {
    id: 'figado_sensivel',
    number: 6,
    name: 'Fígado Sensível',
    description: 'Reduz a resistência (prolongando o efeito das bebidas!) e aumenta força e sorte.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { drinkResistance: -0.25, strength: 4 },
      gameplay: { drinkRarityBonus: 0.5 },
    },
    visual: {
      slot: 'abdomen_glow',
      type: 'sensitive_liver',
      color: 0xa3e635,
    },
  },
  {
    id: 'sorte_no_copo',
    number: 7,
    name: 'Sorte no Copo',
    description: 'Aumenta bastante a chance de bebidas raras e dá um bônus de força.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { strength: 2 },
      gameplay: { drinkRarityBonus: 0.9 },
    },
    visual: {
      slot: 'floating_charm_left',
      type: 'lucky_clover',
      color: 0x22c55e,
    },
  },
  {
    id: 'azar_no_copo',
    number: 8,
    name: 'Azar no Copo',
    description: 'Menos bebidas raras, porém fortalece o corpo com mais HP, força e defesa.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { maxHp: 30, strength: 4 },
      gameplay: {
        drinkRarityBonus: -0.4,
        damageReduction: 0.1,
      },
    },
    visual: {
      slot: 'floating_charm_right',
      type: 'unlucky_cloud',
      color: 0x60a5fa,
    },
  },
  {
    id: 'ima_de_bebidas',
    number: 9,
    name: 'Ímã de Bebidas',
    description: 'Atrai bebidas de longe automaticamente e melhora a mobilidade.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      gameplay: {
        drinkMagnetBonus: 120,
        moveSpeedMultiplier: 1.08,
      },
    },
    visual: {
      slot: 'magnet',
      type: 'drink_magnet',
      color: 0xef4444,
    },
  },
  {
    id: 'corpo_de_aco',
    number: 10,
    name: 'Corpo de Aço',
    description: 'Reduz o dano recebido e aumenta o HP máximo.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { maxHp: 15 },
      gameplay: { damageReduction: 0.18 },
    },
    visual: {
      slot: 'armor_outline',
      type: 'steel_body',
      color: 0x94a3b8,
    },
  },

  // --- Upgrades adicionais (11 a 30) ---
  {
    id: 'bracos_de_gorila',
    number: 11,
    name: 'Braços de Gorila',
    description: 'Aumenta muito a força bruta, reduzindo um pouco a velocidade de ataque.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { strength: 9 },
      gameplay: { attackSpeedMultiplier: 0.8 },
    },
    visual: {
      slot: 'arms_body',
      type: 'gorilla_arms',
      armThickness: 6,
      color: 0xf97316,
    },
  },
  {
    id: 'pernas_de_mola',
    number: 12,
    name: 'Pernas de Mola',
    description: 'Impulsiona a altura do pulo e a agilidade horizontal.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      gameplay: {
        jumpMultiplier: 1.18,
        moveSpeedMultiplier: 1.08,
      },
    },
    visual: {
      slot: 'legs_body',
      type: 'spring_legs',
      color: 0x38bdf8,
    },
  },
  {
    id: 'tenis_de_foguete',
    number: 13,
    name: 'Tênis de Foguete',
    description: 'Aumenta bastante a velocidade de corrida.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      gameplay: { moveSpeedMultiplier: 1.24 },
    },
    visual: {
      slot: 'feet',
      type: 'rocket_shoes',
      color: 0xf97316,
    },
  },
  {
    id: 'capacete_de_obra',
    number: 14,
    name: 'Capacete de Obra',
    description: 'Aumenta o HP máximo e reduz levemente o dano recebido.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { maxHp: 25 },
      gameplay: { damageReduction: 0.08 },
    },
    visual: {
      slot: 'head_helmet',
      type: 'hard_hat',
      color: 0xfacc15,
    },
  },
  {
    id: 'mascara_de_gas',
    number: 15,
    name: 'Máscara de Gás',
    description: 'Alta resistência contra embriaguez e proteção extra.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { drinkResistance: 0.45 },
      gameplay: { damageReduction: 0.08 },
    },
    visual: {
      slot: 'face_mask',
      type: 'gas_mask',
      color: 0x22c55e,
    },
  },
  {
    id: 'barriga_de_chope',
    number: 16,
    name: 'Barriga de Chope',
    description: 'Concede muito HP máximo em troca de um pouco de velocidade.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { maxHp: 50 },
      gameplay: { moveSpeedMultiplier: 0.88 },
    },
    visual: {
      slot: 'torso_shape',
      type: 'beer_belly',
      bellyRadius: 9,
      color: 0xfbbf24,
    },
  },
  {
    id: 'luvas_de_boxe',
    number: 17,
    name: 'Luvas de Boxe',
    description: 'Aumenta fortemente o dano dos golpes leves e a força.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { strength: 2 },
      gameplay: { lightDamageMultiplier: 1.38 },
    },
    visual: {
      slot: 'gloves',
      type: 'boxing_gloves',
      color: 0xdc2626,
    },
  },
  {
    id: 'luvas_de_seda',
    number: 18,
    name: 'Luvas de Seda',
    description: 'Golpes muito mais velozes com leve redução no impacto base.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      gameplay: {
        attackSpeedMultiplier: 1.35,
        damageMultiplier: 0.88,
      },
    },
    visual: {
      slot: 'gloves_trim',
      type: 'silk_gloves',
      color: 0xf8fafc,
    },
  },
  {
    id: 'ombros_de_concreto',
    number: 19,
    name: 'Ombros de Concreto',
    description: 'Reduz o dano recebido e adiciona força aos ataques.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { strength: 3 },
      gameplay: { damageReduction: 0.16 },
    },
    visual: {
      slot: 'shoulders',
      type: 'concrete_shoulders',
      color: 0x94a3b8,
    },
  },
  {
    id: 'chapeu_da_sorte',
    number: 20,
    name: 'Chapéu da Sorte',
    description: 'Aumenta a chance de bebidas raras e concede HP máximo.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { maxHp: 15 },
      gameplay: { drinkRarityBonus: 1.0 },
    },
    visual: {
      slot: 'head_hat',
      type: 'lucky_hat',
      color: 0x16a34a,
    },
  },
  {
    id: 'capa_de_super_heroi',
    number: 21,
    name: 'Capa de Super-Herói',
    description: 'Aumenta a velocidade de movimento e o impulso aéreo.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      gameplay: {
        moveSpeedMultiplier: 1.18,
        jumpMultiplier: 1.08,
      },
    },
    visual: {
      slot: 'cape',
      type: 'hero_cape',
      color: 0xe11d48,
    },
  },
  {
    id: 'miniatura',
    number: 22,
    name: 'Miniatura',
    description: 'Alvo menor e mais rápido: reduz tamanho/hitbox e ganha velocidade, com menos HP.',
    stackable: false,
    incompatibleWith: ['gigantismo'],
    requirements: [],
    modifiers: {
      flat: { maxHp: -20 },
      gameplay: {
        bodyScale: 0.75,
        moveSpeedMultiplier: 1.18,
      },
    },
    visual: {
      slot: 'scale',
      type: 'miniature',
      scale: 0.75,
      color: 0x38bdf8,
    },
  },
  {
    id: 'gigantismo',
    number: 23,
    name: 'Gigantismo',
    description: 'Colosso: aumenta tamanho, HP máximo e força, com leve redução de velocidade.',
    stackable: false,
    incompatibleWith: ['miniatura'],
    requirements: [],
    modifiers: {
      flat: { maxHp: 45, strength: 7 },
      gameplay: {
        bodyScale: 1.28,
        moveSpeedMultiplier: 0.88,
      },
    },
    visual: {
      slot: 'scale',
      type: 'giant',
      scale: 1.28,
      color: 0xf59e0b,
    },
  },
  {
    id: 'faixa_ninja',
    number: 24,
    name: 'Faixa Ninja',
    description: 'Reduz bastante o tempo de recuperação e acelera os golpes.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      gameplay: {
        recoveryMultiplier: 0.7,
        attackSpeedMultiplier: 1.1,
      },
    },
    visual: {
      slot: 'headband',
      type: 'ninja_headband',
      color: 0x0ea5e9,
    },
  },
  {
    id: 'corrente_de_ouro',
    number: 25,
    name: 'Corrente de Ouro',
    description: 'Aumenta a força dos golpes e prolonga o efeito das bebidas.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { strength: 6, drinkResistance: -0.2 },
    },
    visual: {
      slot: 'neck',
      type: 'gold_chain',
      color: 0xfacc15,
    },
  },
  {
    id: 'joelheiras_blindadas',
    number: 26,
    name: 'Joelheiras Blindadas',
    description: 'Reduz pela metade o empurrão recebido e aumenta o HP máximo.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { maxHp: 20 },
      gameplay: { knockbackResistance: 0.55 },
    },
    visual: {
      slot: 'knees',
      type: 'armored_kneepads',
      color: 0x94a3b8,
    },
  },
  {
    id: 'oculos_de_precisao',
    number: 27,
    name: 'Óculos de Precisão',
    description: 'Aumenta o alcance de todos os golpes e a precisão dos ataques leves.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      gameplay: {
        attackRangeMultiplier: 1.28,
        lightDamageMultiplier: 1.12,
      },
    },
    visual: {
      slot: 'eyes',
      type: 'precision_glasses',
      color: 0x22d3ee,
    },
  },
  {
    id: 'mochila_de_bebidas',
    number: 28,
    name: 'Mochila de Bebidas',
    description: 'Amplia fortemente o raio de atração de bebidas e dá HP extra.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { maxHp: 20 },
      gameplay: { drinkMagnetBonus: 150 },
    },
    visual: {
      slot: 'back',
      type: 'drink_backpack',
      color: 0x8b5cf6,
    },
  },
  {
    id: 'tatuagem_de_dragao',
    number: 29,
    name: 'Tatuagem de Dragão',
    description: 'Aumenta fortemente o dano dos combos e concede força base.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { strength: 3 },
      gameplay: { comboDamageMultiplier: 1.35 },
    },
    visual: {
      slot: 'tattoo',
      type: 'dragon_tattoo',
      color: 0xf43f5e,
    },
  },
  {
    id: 'coroa_do_caos',
    number: 30,
    name: 'Coroa do Caos',
    description: 'Poder supremo: aumenta muito a força e combos, reduzindo o HP máximo.',
    stackable: false,
    incompatibleWith: [],
    requirements: [],
    modifiers: {
      flat: { strength: 12, maxHp: -25 },
      gameplay: { comboDamageMultiplier: 1.15 },
    },
    visual: {
      slot: 'crown',
      type: 'chaos_crown',
      color: 0xc084fc,
    },
  },
];

/**
 * Resume os modificadores mecânicos de um upgrade em texto curto legível para HUD e Loja.
 */
export function summarizeUpgradeEffects(upgrade, { separator = ' • ', maxItems = 3 } = {}) {
  const tags = [];
  const flat = upgrade?.modifiers?.flat ?? {};
  const gp = upgrade?.modifiers?.gameplay ?? {};

  if (flat.strength) tags.push(`${flat.strength > 0 ? '+' : ''}${flat.strength} Força`);
  if (flat.maxHp) tags.push(`${flat.maxHp > 0 ? '+' : ''}${flat.maxHp} Vida`);
  if (gp.damageMultiplier && gp.damageMultiplier !== 1) {
    const pct = Math.round((gp.damageMultiplier - 1) * 100);
    tags.push(`${pct > 0 ? '+' : ''}${pct}% Dano`);
  }
  if (gp.lightDamageMultiplier && gp.lightDamageMultiplier > 1) {
    tags.push(`+${Math.round((gp.lightDamageMultiplier - 1) * 100)}% Leve`);
  }
  if (gp.comboDamageMultiplier && gp.comboDamageMultiplier > 1) {
    tags.push(`+${Math.round((gp.comboDamageMultiplier - 1) * 100)}% Combos`);
  }
  if (gp.attackSpeedMultiplier && gp.attackSpeedMultiplier !== 1) {
    const pct = Math.round((gp.attackSpeedMultiplier - 1) * 100);
    tags.push(`${pct > 0 ? '+' : ''}${pct}% Vel.Atk`);
  }
  if (gp.recoveryMultiplier && gp.recoveryMultiplier < 1) {
    tags.push(`-${Math.round((1 - gp.recoveryMultiplier) * 100)}% Recup.`);
  }
  if (gp.moveSpeedMultiplier && gp.moveSpeedMultiplier !== 1) {
    const pct = Math.round((gp.moveSpeedMultiplier - 1) * 100);
    tags.push(`${pct > 0 ? '+' : ''}${pct}% Veloc.`);
  }
  if (gp.jumpMultiplier && gp.jumpMultiplier > 1) {
    tags.push(`+${Math.round((gp.jumpMultiplier - 1) * 100)}% Pulo`);
  }
  if (gp.damageReduction) {
    tags.push(`+${Math.round(gp.damageReduction * 100)}% Defesa`);
  }
  if (gp.attackRangeMultiplier && gp.attackRangeMultiplier > 1) {
    tags.push(`+${Math.round((gp.attackRangeMultiplier - 1) * 100)}% Alcance`);
  }
  if (gp.drinkMagnetBonus) {
    tags.push(`+${gp.drinkMagnetBonus}px Ímã`);
  }
  if (gp.drinkRarityBonus) {
    tags.push(gp.drinkRarityBonus > 0 ? '+Sorte' : '-Sorte');
  }
  if (gp.knockbackResistance) {
    tags.push(`-${Math.round(gp.knockbackResistance * 100)}% Empurrão`);
  }
  if (gp.bodyScale && gp.bodyScale !== 1) {
    tags.push(gp.bodyScale > 1 ? 'Gigante' : 'Mini');
  }
  if (flat.drinkResistance) {
    const sign = flat.drinkResistance > 0 ? '+' : '';
    tags.push(`${sign}${Math.round(flat.drinkResistance * 100)}% Resist.`);
  }

  return tags.slice(0, maxItems).join(separator);
}

export function getAllUpgrades() {
  return UPGRADES;
}

export function getUpgradeById(id) {
  return UPGRADES.find((upgrade) => upgrade.id === id) ?? null;
}
