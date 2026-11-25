import { PHYSICS } from '../constants/physics.js';
import { getUpgradeById } from '../data/upgrades.js';

function safeFillRect(g, x, y, w, h) {
  if (typeof g.fillRect === 'function') {
    g.fillRect(x, y, w, h);
  } else {
    g.fillCircle(x + w / 2, y + h / 2, Math.max(2, Math.min(w, h) / 2));
  }
}

function safeStrokeRect(g, x, y, w, h) {
  if (typeof g.strokeRect === 'function') {
    g.strokeRect(x, y, w, h);
  } else {
    g.lineBetween(x, y, x + w, y);
    g.lineBetween(x + w, y, x + w, y + h);
    g.lineBetween(x + w, y + h, x, y + h);
    g.lineBetween(x, y + h, x, y);
  }
}

function safeFillEllipse(g, x, y, w, h) {
  if (typeof g.fillEllipse === 'function') {
    g.fillEllipse(x, y, w, h);
  } else {
    g.fillCircle(x, y, Math.max(w, h) / 2);
  }
}

function safeStrokeEllipse(g, x, y, w, h) {
  if (typeof g.strokeEllipse === 'function') {
    g.strokeEllipse(x, y, w, h);
  } else {
    g.strokeCircle(x, y, Math.max(w, h) / 2);
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Cinemática inversa 2D de 2 segmentos (ex.: quadril->joelho->pé ou ombro->cotovelo->mão).
 * Faz os membros dobrarem organicamente como um lutador animado fluido.
 */
function solveTwoBoneIK(ax, ay, bx, by, len1, len2, bendSign = 1) {
  const dx = bx - ax;
  const dy = by - ay;
  const rawDist = Math.hypot(dx, dy) || 0.001;
  const maxReach = Math.max(2, len1 + len2 - 0.05);
  const clampedDist = Math.min(maxReach, Math.max(Math.abs(len1 - len2) + 0.05, rawDist));

  const cosAngle =
    (len1 * len1 + clampedDist * clampedDist - len2 * len2) /
    (2 * len1 * clampedDist);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const proj = len1 * clampedCos;
  const height = len1 * Math.sqrt(Math.max(0, 1 - clampedCos * clampedCos));

  const ux = dx / rawDist;
  const uy = dy / rawDist;
  const px = -uy * bendSign;
  const py = ux * bendSign;

  return {
    x: ax + ux * proj + px * height,
    y: ay + uy * proj + py * height,
  };
}

/**
 * Curva suave de impacto para golpes: avanço explosivo (0..0.32), pico (0.32..0.68) e retração fluida (0.68..1).
 */
function computeStrikeWeight(progress = 0.5) {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.3) {
    const t = p / 0.3;
    return 1 - (1 - t) * (1 - t);
  }
  if (p <= 0.68) {
    return 1;
  }
  const t = (p - 0.68) / 0.32;
  return Math.max(0, 1 - t * t);
}

/**
 * Calcula as articulações completas com interpolação contínua de movimento (60 FPS):
 * respiração, corrida senoidal, pulo/queda aérea, inclinação do tronco e cinemática inversa 2D.
 */
export function computePoseSkeleton(
  facing = 1,
  pose = 'idle',
  footY = PHYSICS.PLAYER_BODY_HEIGHT / 2,
  motion = null
) {
  const dir = facing >= 0 ? 1 : -1;
  const headRadius = 8;

  const animTime = motion?.animTimeMs ?? 0;
  const vx = motion?.vx ?? 0;
  const vy = motion?.vy ?? 0;
  const grounded = motion?.grounded ?? true;
  const speedRatio = Math.min(1.4, Math.abs(vx) / 240);
  const isMoving = grounded && speedRatio > 0.06;

  // Respiração e balanço vertical contínuo
  const breathe = Math.sin(animTime * 0.0055) * 1.1;
  const stridePhase = animTime * 0.0155;
  const runBob = isMoving ? -Math.abs(Math.cos(stridePhase)) * 2.4 * speedRatio : 0;

  const isAttackPose =
    pose === 'light' ||
    pose === 'heavy' ||
    pose === 'special' ||
    pose === 'combo_fast' ||
    pose === 'combo_heavy' ||
    pose === 'combo_special';

  const strikeWeight = isAttackPose
    ? computeStrikeWeight(motion?.attackProgress ?? 0.5)
    : 0;

  // Inclinação dinâmica do tronco na corrida ou no golpe
  let leanX = 0;
  if (isAttackPose) {
    const attackLean =
      pose === 'heavy' || pose === 'combo_heavy'
        ? 6.5
        : pose === 'special' || pose === 'combo_special'
        ? -3.5
        : 4.5;
    leanX = dir * attackLean * strikeWeight;
  } else if (isMoving) {
    leanX = dir * 4.2 * Math.min(1, speedRatio);
  } else if (!grounded) {
    leanX = dir * Math.min(3, Math.abs(vx) * 0.01);
  }

  const hip = {
    x: leanX * 0.25,
    y: 10 + runBob * 0.6,
  };
  const shoulder = {
    x: leanX * 0.85,
    y: -5 + breathe * 0.7 + runBob,
  };
  const neck = {
    x: leanX * 0.95,
    y: -10 + breathe * 0.8 + runBob,
  };
  const head = {
    x: leanX * 1.08,
    y: -18 + breathe + runBob,
  };

  // Posição base de guarda viva para mãos e pés
  const idleSway = Math.cos(animTime * 0.0055) * 1.2;
  let frontHand = { x: shoulder.x + dir * 10.5, y: shoulder.y + 9 + idleSway };
  let backHand = { x: shoulder.x - dir * 8.5, y: shoulder.y + 10 - idleSway };
  let frontFoot = { x: dir * 8.5, y: footY };
  let backFoot = { x: -dir * 8.5, y: footY };

  if (!grounded && !isAttackPose) {
    // Animação aérea fluida (pulo vs queda)
    const rising = vy < -20;
    frontFoot = {
      x: dir * (rising ? 11 : 10),
      y: rising ? footY - 8 : footY - 3,
    };
    backFoot = {
      x: -dir * (rising ? 8 : 10),
      y: rising ? footY - 2 : footY - 5,
    };
    frontHand = {
      x: shoulder.x + dir * 12,
      y: rising ? shoulder.y - 6 : shoulder.y - 2,
    };
    backHand = {
      x: shoulder.x - dir * 11,
      y: rising ? shoulder.y + 4 : shoulder.y - 4,
    };
  } else if (isMoving && !isAttackPose) {
    // Ciclo contínuo de corrida a 60 FPS (substitui troca brusca de frames!)
    const s1 = Math.sin(stridePhase);
    const c1 = Math.cos(stridePhase);
    const s2 = Math.sin(stridePhase + Math.PI);
    const c2 = Math.cos(stridePhase + Math.PI);
    const strideAmp = 12 * Math.min(1.15, speedRatio);
    const liftAmp = 7.5 * Math.min(1.15, speedRatio);

    frontFoot = {
      x: hip.x + s1 * strideAmp * dir,
      y: footY - Math.max(0, c1) * liftAmp,
    };
    backFoot = {
      x: hip.x + s2 * strideAmp * dir,
      y: footY - Math.max(0, c2) * liftAmp,
    };

    // Braços bombeiam em oposição natural às pernas
    frontHand = {
      x: shoulder.x + s2 * 11 * dir + dir * 3,
      y: shoulder.y + 8 - Math.abs(s2) * 3,
    };
    backHand = {
      x: shoulder.x + s1 * 10 * dir - dir * 2,
      y: shoulder.y + 9 - Math.abs(s1) * 2.5,
    };
  } else if (pose === 'walk_1' && !motion) {
    frontHand = { x: dir * 13, y: 3 };
    backHand = { x: -dir * 11, y: 7 };
    frontFoot = { x: dir * 12, y: footY - 3 };
    backFoot = { x: -dir * 10, y: footY };
  } else if (pose === 'walk_2' && !motion) {
    frontHand = { x: -dir * 9, y: 6 };
    backHand = { x: dir * 11, y: 4 };
    frontFoot = { x: dir * 6, y: footY };
    backFoot = { x: -dir * 12, y: footY - 3 };
  }

  // Interpolação contínua das poses de combate sobre a postura atual!
  if (isAttackPose) {
    let targetFrontHand = frontHand;
    let targetBackHand = backHand;
    let targetFrontFoot = frontFoot;
    let targetBackFoot = backFoot;

    if (pose === 'light' || pose === 'combo_fast') {
      targetFrontHand = { x: shoulder.x + dir * 22, y: shoulder.y - 2 };
      targetBackHand = { x: shoulder.x - dir * 8, y: shoulder.y + 5 };
      targetFrontFoot = { x: dir * 12, y: footY };
    } else if (pose === 'heavy' || pose === 'combo_heavy') {
      targetFrontHand = { x: shoulder.x + dir * 25, y: shoulder.y + 3 };
      targetBackHand = { x: shoulder.x + dir * 15, y: shoulder.y - 6 };
      targetFrontFoot = { x: dir * 14, y: footY };
      targetBackFoot = { x: -dir * 11, y: footY };
    } else if (pose === 'special' || pose === 'combo_special') {
      // Chute giratório / golpe especial aéreo fluido
      targetFrontHand = { x: shoulder.x + dir * 14, y: shoulder.y - 6 };
      targetBackHand = { x: shoulder.x - dir * 13, y: shoulder.y - 8 };
      targetFrontFoot = { x: hip.x + dir * 23, y: hip.y - 3 };
      targetBackFoot = { x: -dir * 8, y: footY };
    }

    frontHand = {
      x: lerp(frontHand.x, targetFrontHand.x, strikeWeight),
      y: lerp(frontHand.y, targetFrontHand.y, strikeWeight),
    };
    backHand = {
      x: lerp(backHand.x, targetBackHand.x, strikeWeight),
      y: lerp(backHand.y, targetBackHand.y, strikeWeight),
    };
    frontFoot = {
      x: lerp(frontFoot.x, targetFrontFoot.x, strikeWeight),
      y: lerp(frontFoot.y, targetFrontFoot.y, strikeWeight),
    };
    backFoot = {
      x: lerp(backFoot.x, targetBackFoot.x, strikeWeight),
      y: lerp(backFoot.y, targetBackFoot.y, strikeWeight),
    };
  }

  // Resolve joelhos e cotovelos com Cinemática Inversa 2D (articulações reais!)
  const frontKnee = solveTwoBoneIK(
    hip.x,
    hip.y,
    frontFoot.x,
    frontFoot.y,
    10.5,
    10.5,
    -dir
  );
  const backKnee = solveTwoBoneIK(
    hip.x,
    hip.y,
    backFoot.x,
    backFoot.y,
    10.5,
    10.5,
    -dir
  );
  const frontElbow = solveTwoBoneIK(
    shoulder.x,
    shoulder.y,
    frontHand.x,
    frontHand.y,
    9.5,
    9.5,
    dir
  );
  const backElbow = solveTwoBoneIK(
    shoulder.x,
    shoulder.y,
    backHand.x,
    backHand.y,
    9.5,
    9.5,
    dir
  );

  return {
    dir,
    headRadius,
    animTime,
    head,
    neck,
    shoulder,
    torsoMid: {
      x: (neck.x + hip.x) / 2,
      y: (neck.y + hip.y) / 2,
    },
    hip,
    frontElbow,
    backElbow,
    frontHand,
    backHand,
    frontKnee,
    backKnee,
    frontFoot,
    backFoot,
  };
}

function drawSpringSegment(graphics, x1, y1, x2, y2, color, width = 2.5) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const amp = 3.0;

  const p1x = x1 + dx * 0.25 + nx * amp;
  const p1y = y1 + dy * 0.25 + ny * amp;
  const p2x = x1 + dx * 0.5 - nx * amp;
  const p2y = y1 + dy * 0.5 - ny * amp;
  const p3x = x1 + dx * 0.75 + nx * amp;
  const p3y = y1 + dy * 0.75 + ny * amp;

  graphics.lineStyle(width, color, 1);
  graphics.lineBetween(x1, y1, p1x, p1y);
  graphics.lineBetween(p1x, p1y, p2x, p2y);
  graphics.lineBetween(p2x, p2y, p3x, p3y);
  graphics.lineBetween(p3x, p3y, x2, y2);
}

function drawArticulatedLimb(graphics, p1, joint, p2, width, color) {
  // Contorno escuro externo
  graphics.lineStyle(width + 2.8, 0x020617, 0.92);
  graphics.lineBetween(p1.x, p1.y, joint.x, joint.y);
  graphics.lineBetween(joint.x, joint.y, p2.x, p2.y);
  graphics.fillStyle(0x020617, 0.92);
  graphics.fillCircle(joint.x, joint.y, (width + 2.4) * 0.48);

  // Preenchimento colorido vibrante
  graphics.lineStyle(width, color, 1);
  graphics.lineBetween(p1.x, p1.y, joint.x, joint.y);
  graphics.lineBetween(joint.x, joint.y, p2.x, p2.y);
  graphics.fillStyle(color, 1);
  graphics.fillCircle(joint.x, joint.y, width * 0.48);
}

/**
 * Sistema modular responsável exclusivamente pelas alterações visuais e animação procedural
 * do personagem (GAME_DESIGN.md §9 / ARCHITECTURE.md §12).
 */
export class CharacterAppearanceSystem {
  constructor() {
    this.acquiredUpgrades = [];
    this.appearanceState = CharacterAppearanceSystem.resolveAppearanceState([]);
  }

  setUpgrades(upgradesOrIds = []) {
    const resolvedUpgrades = upgradesOrIds
      .map((item) => (typeof item === 'string' ? getUpgradeById(item) : item))
      .filter(Boolean);

    this.acquiredUpgrades = resolvedUpgrades;
    this.appearanceState =
      CharacterAppearanceSystem.resolveAppearanceState(resolvedUpgrades);
    return this.appearanceState;
  }

  reset() {
    this.acquiredUpgrades = [];
    this.appearanceState = CharacterAppearanceSystem.resolveAppearanceState([]);
    return this.appearanceState;
  }

  getState() {
    return this.appearanceState;
  }

  static resolveAppearanceState(upgrades = []) {
    const types = new Set();
    let scale = 1;
    let armStrokeWidth = 3.4;
    let torsoStrokeWidth = 3.8;

    for (const upg of upgrades) {
      const v = upg?.visual;
      if (!v?.type) continue;

      if (v.type === 'miniature' && types.has('giant')) continue;
      if (v.type === 'giant' && types.has('miniature')) continue;

      types.add(v.type);

      if (typeof v.scale === 'number') {
        scale *= v.scale;
      }
      if (v.type === 'gorilla_arms') {
        armStrokeWidth = v.armThickness ?? 6;
      }
    }

    const hasHardHat = types.has('hard_hat');
    const hasLuckyHat = types.has('lucky_hat');
    const hasChaosCrown = types.has('chaos_crown');

    const headStack = {
      hardHatOffsetY: 0,
      luckyHatOffsetY: hasHardHat ? -6 : 0,
      crownOffsetY:
        hasHardHat && hasLuckyHat ? -13 : hasHardHat || hasLuckyHat ? -7 : 0,
    };

    return {
      scale: Math.round(scale * 1000) / 1000,
      armStrokeWidth,
      torsoStrokeWidth,
      activeTypes: Array.from(types),
      hasGorillaArms: types.has('gorilla_arms'),
      hasBoxingGloves: types.has('boxing_gloves'),
      hasSilkGloves: types.has('silk_gloves'),
      hasSpringLegs: types.has('spring_legs'),
      hasRocketShoes: types.has('rocket_shoes'),
      hasHardHat,
      hasLuckyHat,
      hasChaosCrown,
      hasDrinkBackpack: types.has('drink_backpack'),
      hasDrinkMagnet: types.has('drink_magnet'),
      hasBeerBelly: types.has('beer_belly'),
      headStack,
    };
  }

  static renderCharacter(
    graphics,
    {
      color = 0x38bdf8,
      facing = 1,
      pose = 'idle',
      auraColor = null,
      appearanceState = null,
      motion = null,
    } = {}
  ) {
    if (!graphics) return;
    graphics.clear();

    const state =
      appearanceState ?? CharacterAppearanceSystem.resolveAppearanceState([]);
    const active = new Set(state.activeTypes ?? []);
    const skel = computePoseSkeleton(
      facing,
      pose,
      PHYSICS.PLAYER_BODY_HEIGHT / 2,
      motion
    );
    const dir = skel.dir;
    const wave = Math.sin((skel.animTime ?? 0) * 0.01) * 2.5;

    // 1. Sombra dinâmica no chão (encolhe quando pula no ar!)
    const grounded = motion?.grounded ?? true;
    const shadowW = grounded ? 26 : 18;
    const shadowAlpha = grounded ? 0.44 : 0.22;
    graphics.fillStyle(0x020617, shadowAlpha);
    safeFillEllipse(graphics, 0, PHYSICS.PLAYER_BODY_HEIGHT / 2 + 1, shadowW, 7);

    // 1b. Aura pulsante de bebida ativa
    if (auraColor !== null && auraColor !== undefined) {
      const pulse = Math.sin((skel.animTime ?? 0) * 0.008) * 2;
      graphics.fillStyle(auraColor, 0.15);
      safeFillEllipse(graphics, 0, 1, 46 + pulse, 64 + pulse);
      graphics.lineStyle(2.2, auraColor, 0.85);
      safeStrokeEllipse(graphics, 0, 1, 41 + pulse * 0.5, 59 + pulse * 0.5);
    }

    // 2. Capa esvoaçante com física procedural (#21) e Mochila (#28)
    if (active.has('hero_cape')) {
      const capeTipX = -dir * (16 + Math.abs(motion?.vx ?? 0) * 0.025);
      const capeTipY = skel.hip.y + 13 + wave;
      graphics.lineStyle(5.5, 0x881337, 0.95);
      graphics.lineBetween(skel.shoulder.x, skel.shoulder.y, capeTipX, capeTipY);
      graphics.lineStyle(3.4, 0xf43f5e, 0.98);
      graphics.lineBetween(skel.shoulder.x, skel.shoulder.y, capeTipX + dir * 1.5, capeTipY - 1);
      graphics.lineBetween(skel.shoulder.x, skel.shoulder.y + 2, capeTipX + dir * 4, capeTipY + 1);
    }

    if (active.has('drink_backpack')) {
      const bx = skel.shoulder.x + (dir > 0 ? -12 : 4);
      graphics.fillStyle(0x5b21b6, 1);
      graphics.lineStyle(1.8, 0xc4b5fd, 0.95);
      safeFillRect(graphics, bx, skel.shoulder.y - 1, 8, 15);
      safeStrokeRect(graphics, bx, skel.shoulder.y - 1, 8, 15);
    }

    // 3. Braço e Perna TRASEIROS primeiro (profundidade real entre frente e trás!)
    const armWidth = state.armStrokeWidth ?? 3.4;
    drawArticulatedLimb(
      graphics,
      skel.shoulder,
      skel.backElbow,
      skel.backHand,
      armWidth * 0.92,
      color
    );

    if (active.has('spring_legs')) {
      drawSpringSegment(
        graphics,
        skel.hip.x,
        skel.hip.y,
        skel.backFoot.x,
        skel.backFoot.y,
        0x38bdf8,
        2.5
      );
    } else {
      drawArticulatedLimb(
        graphics,
        skel.hip,
        skel.backKnee,
        skel.backFoot,
        3.2,
        color
      );
    }

    // 4. Corpo de Aço (#10) e Barriga de Chope (#16)
    if (active.has('steel_body')) {
      graphics.lineStyle(7.2, 0x94a3b8, 0.65);
      graphics.lineBetween(skel.neck.x, skel.neck.y, skel.hip.x, skel.hip.y);
    }

    if (active.has('beer_belly')) {
      graphics.fillStyle(0x020617, 0.9);
      graphics.fillCircle(skel.hip.x + dir * 4, skel.hip.y - 5, 8.5);
      graphics.fillStyle(color, 0.88);
      graphics.lineStyle(2, 0xf8fafc, 0.35);
      graphics.fillCircle(skel.hip.x + dir * 4, skel.hip.y - 5, 7);
      graphics.strokeCircle(skel.hip.x + dir * 4, skel.hip.y - 5, 7);
    }

    // 5. Tronco principal inclinado dinamicamente + Cabeça expressiva
    const torsoW = state.torsoStrokeWidth ?? 3.8;
    graphics.lineStyle(torsoW + 3, 0x020617, 0.94);
    graphics.lineBetween(skel.neck.x, skel.neck.y, skel.hip.x, skel.hip.y);
    graphics.lineStyle(torsoW, color, 1);
    graphics.lineBetween(skel.neck.x, skel.neck.y, skel.hip.x, skel.hip.y);
    graphics.fillStyle(color, 1);
    graphics.fillCircle(skel.shoulder.x, skel.shoulder.y, torsoW * 0.55);
    graphics.fillCircle(skel.hip.x, skel.hip.y, torsoW * 0.55);

    graphics.fillStyle(0x020617, 0.96);
    graphics.fillCircle(skel.head.x, skel.head.y, skel.headRadius + 1.8);
    graphics.fillStyle(color, 1);
    graphics.fillCircle(skel.head.x, skel.head.y, skel.headRadius);
    graphics.fillStyle(0xffffff, 0.28);
    graphics.fillCircle(skel.head.x - dir * 2, skel.head.y - 3, 3.2);
    graphics.fillStyle(0x090d16, 0.92);
    safeFillRect(
      graphics,
      skel.head.x + (dir > 0 ? 0.5 : -6.5),
      skel.head.y - 2.6,
      6,
      3.4
    );
    graphics.fillStyle(0xf8fafc, 1);
    graphics.fillCircle(skel.head.x + dir * 3.8, skel.head.y - 0.9, 1.35);

    // 6. Detalhes do tronco
    if (active.has('extra_heart')) {
      graphics.fillStyle(0xef4444, 1);
      graphics.fillCircle(skel.shoulder.x + dir * 2, skel.shoulder.y + 4, 2.8);
    }
    if (active.has('fragile_health')) {
      graphics.lineStyle(1.8, 0x38bdf8, 0.95);
      graphics.lineBetween(
        skel.shoulder.x - 3,
        skel.shoulder.y + 2,
        skel.shoulder.x + 3,
        skel.shoulder.y + 7
      );
    }
    if (active.has('iron_liver')) {
      graphics.fillStyle(0xcbd5e1, 1);
      safeFillRect(graphics, skel.hip.x - 5, skel.hip.y - 4, 10, 3);
    }
    if (active.has('sensitive_liver')) {
      graphics.fillStyle(0xa3e635, 0.9);
      graphics.fillCircle(skel.hip.x - dir * 2, skel.hip.y - 3, 2.5);
    }
    if (active.has('dragon_tattoo')) {
      graphics.lineStyle(2, 0xf43f5e, 0.95);
      graphics.lineBetween(
        skel.shoulder.x - 2,
        skel.shoulder.y + 1,
        skel.hip.x + dir * 4,
        skel.hip.y - 2
      );
    }
    if (active.has('gold_chain')) {
      graphics.lineStyle(2, 0xfacc15, 1);
      graphics.lineBetween(skel.neck.x - 4, skel.neck.y + 1, skel.neck.x, skel.neck.y + 5);
      graphics.lineBetween(skel.neck.x, skel.neck.y + 5, skel.neck.x + 4, skel.neck.y + 1);
    }
    if (active.has('concrete_shoulders')) {
      graphics.fillStyle(0x64748b, 1);
      safeFillRect(graphics, skel.shoulder.x - 9, skel.shoulder.y - 3, 6, 5);
      safeFillRect(graphics, skel.shoulder.x + 3, skel.shoulder.y - 3, 6, 5);
    }

    // 7. Perna FRONTAL articulada + pés, joelheiras e tênis
    if (active.has('spring_legs')) {
      drawSpringSegment(
        graphics,
        skel.hip.x,
        skel.hip.y,
        skel.frontFoot.x,
        skel.frontFoot.y,
        color,
        2.8
      );
    } else {
      drawArticulatedLimb(
        graphics,
        skel.hip,
        skel.frontKnee,
        skel.frontFoot,
        3.5,
        color
      );
      for (const foot of [skel.backFoot, skel.frontFoot]) {
        graphics.fillStyle(0x020617, 0.95);
        graphics.fillCircle(foot.x + dir * 1, foot.y, 3.1);
        graphics.fillStyle(color, 1);
        graphics.fillCircle(foot.x + dir * 1, foot.y, 2.0);
      }
    }

    if (active.has('armored_kneepads')) {
      for (const knee of [skel.backKnee, skel.frontKnee]) {
        graphics.fillStyle(0x0f172a, 1);
        graphics.fillCircle(knee.x, knee.y, 4);
        graphics.fillStyle(0xcbd5e1, 1);
        graphics.fillCircle(knee.x, knee.y, 2.6);
      }
    }

    if (active.has('rocket_shoes')) {
      for (const foot of [skel.backFoot, skel.frontFoot]) {
        graphics.fillStyle(0x020617, 1);
        safeFillRect(graphics, foot.x - 5, foot.y - 5, 10, 6);
        graphics.fillStyle(0xf97316, 1);
        safeFillRect(graphics, foot.x - 4, foot.y - 4, 8, 4);
        graphics.fillStyle(0x38bdf8, 0.95);
        graphics.fillCircle(foot.x - dir * 6, foot.y - 2, 2.4);
      }
    }

    // 8. Braço FRONTAL articulado + luvas e punhos nas duas mãos
    drawArticulatedLimb(
      graphics,
      skel.shoulder,
      skel.frontElbow,
      skel.frontHand,
      armWidth,
      color
    );

    for (const hand of [skel.backHand, skel.frontHand]) {
      graphics.fillStyle(0x020617, 0.95);
      graphics.fillCircle(hand.x, hand.y, 3.6);
      graphics.fillStyle(color, 1);
      graphics.fillCircle(hand.x, hand.y, 2.4);

      if (active.has('boxing_gloves')) {
        graphics.fillStyle(0x020617, 1);
        graphics.fillCircle(hand.x, hand.y, 6);
        graphics.fillStyle(0xdc2626, 1);
        graphics.fillCircle(hand.x, hand.y, 4.8);
        graphics.fillStyle(0xffffff, 0.45);
        graphics.fillCircle(hand.x - 1.2, hand.y - 1.5, 1.6);
      }
      if (active.has('silk_gloves')) {
        graphics.lineStyle(2, 0xf8fafc, 1);
        graphics.strokeCircle(
          hand.x,
          hand.y,
          active.has('boxing_gloves') ? 6.2 : 4.2
        );
      }
      if (active.has('steel_fists')) {
        graphics.lineStyle(2.2, 0xe2e8f0, 1);
        graphics.strokeCircle(hand.x, hand.y, 3.8);
      }
      if (active.has('lettuce_hands')) {
        graphics.fillStyle(0x4ade80, 0.95);
        graphics.fillCircle(hand.x, hand.y, 3.2);
      }
    }

    // 9. Ímã de Bebidas (#9)
    if (active.has('drink_magnet')) {
      const mx = skel.hip.x + dir * 9;
      const my = skel.hip.y - 1;
      graphics.lineStyle(2, 0xef4444, 1);
      graphics.strokeCircle(mx, my, 3.5);
      graphics.fillStyle(0xef4444, 1);
      graphics.fillCircle(mx + dir * 2, my - 2, 1.5);
      graphics.fillStyle(0x38bdf8, 1);
      graphics.fillCircle(mx + dir * 2, my + 2, 1.5);
    }

    // 10. Acessórios de rosto e cabeça acompanhando o movimento da cabeça!
    if (active.has('gas_mask')) {
      graphics.fillStyle(0x475569, 0.95);
      graphics.fillCircle(skel.head.x + dir * 4, skel.head.y + 3, 4.2);
      graphics.fillStyle(0x22c55e, 0.9);
      graphics.fillCircle(skel.head.x + dir * 7, skel.head.y + 4, 2);
    }

    if (active.has('precision_glasses')) {
      graphics.lineStyle(2, 0x22d3ee, 1);
      safeStrokeRect(
        graphics,
        skel.head.x + (dir > 0 ? 0 : -7),
        skel.head.y - 4,
        7,
        4
      );
    }

    if (active.has('ninja_headband')) {
      graphics.lineStyle(2.5, 0x0ea5e9, 1);
      graphics.lineBetween(
        skel.head.x - skel.headRadius,
        skel.head.y - 4,
        skel.head.x + skel.headRadius,
        skel.head.y - 4
      );
      graphics.lineBetween(
        skel.head.x - dir * skel.headRadius,
        skel.head.y - 4,
        skel.head.x - dir * 15,
        skel.head.y - 1 + wave * 0.6
      );
    }

    const headTopY = skel.head.y - skel.headRadius;
    if (state.hasHardHat) {
      const hy = headTopY + state.headStack.hardHatOffsetY;
      graphics.fillStyle(0xfacc15, 1);
      safeFillRect(graphics, skel.head.x - 9, hy - 5, 18, 6);
      graphics.lineStyle(2, 0xeab308, 1);
      graphics.lineBetween(skel.head.x - 11, hy + 1, skel.head.x + 11, hy + 1);
    }

    if (state.hasLuckyHat) {
      const ly = headTopY + state.headStack.luckyHatOffsetY;
      graphics.fillStyle(0x16a34a, 1);
      safeFillRect(graphics, skel.head.x - 6, ly - 7, 12, 7);
      graphics.lineStyle(2, 0x15803d, 1);
      graphics.lineBetween(skel.head.x - 10, ly, skel.head.x + 10, ly);
    }

    if (state.hasChaosCrown) {
      const cy = headTopY + state.headStack.crownOffsetY - 3;
      const hx = skel.head.x;
      graphics.lineStyle(2, 0xc084fc, 1);
      graphics.lineBetween(hx - 6, cy, hx - 4, cy - 5);
      graphics.lineBetween(hx - 4, cy - 5, hx, cy - 1);
      graphics.lineBetween(hx, cy - 1, hx + 4, cy - 5);
      graphics.lineBetween(hx + 4, cy - 5, hx + 6, cy);
      graphics.lineBetween(hx - 6, cy, hx + 6, cy);
    }

    // 11. Amuletos flutuantes animados
    if (active.has('lucky_clover')) {
      graphics.fillStyle(0x22c55e, 0.92);
      graphics.fillCircle(skel.head.x - dir * 14, skel.head.y - 8 + wave * 0.5, 3);
    }
    if (active.has('unlucky_cloud')) {
      graphics.fillStyle(0x60a5fa, 0.88);
      graphics.fillCircle(skel.head.x + dir * 14, skel.head.y - 10 - wave * 0.5, 3.5);
    }
  }
}
