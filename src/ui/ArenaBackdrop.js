import { SeededRandom } from '../utils/SeededRandom.js';

const STAGE_ACCENT_COLORS = [0x38bdf8, 0x10b981, 0xf59e0b, 0xd946ef];

/**
 * Gerencia camadas de cenário com efeito Parallax horizontal contínuo sem depender de assets extras.
 * Combina a imagem de fundo da Fase 1 (quando disponível) com silhuetas distantes, prédios médios
 * e lanternas/postes urbanos próximos que se deslocam em velocidades proporcionais à câmera.
 */
export class ParallaxBackdrop {
  constructor(
    scene,
    {
      width = 960,
      height = 540,
      seed = 'libasim-parallax',
      photoTextureKey = null,
    } = {}
  ) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.spanWidth = width * 2;
    this.stageIndex = 0;

    this.skyBase = createCyberNightBackdrop(scene, width, height, `${seed}-sky`);
    this.skyBase?.setScrollFactor?.(0);
    this.skyBase?.setDepth?.(-35);

    this.photoTile = null;
    if (
      photoTextureKey &&
      scene?.textures?.exists?.(photoTextureKey) &&
      typeof scene?.add?.tileSprite === 'function'
    ) {
      this.photoTile = scene.add
        .tileSprite(width / 2, height / 2, width, height, photoTextureKey)
        .setScrollFactor(0)
        .setDepth(-32)
        .setAlpha(0.72);
      const src = scene.textures.get(photoTextureKey)?.getSourceImage?.();
      if (src?.height > 0) {
        const scale = height / src.height;
        this.photoTile.setTileScale?.(scale, scale);
      }
    } else if (
      photoTextureKey &&
      scene?.textures?.exists?.(photoTextureKey) &&
      typeof scene?.add?.image === 'function'
    ) {
      this.photoImage = scene.add
        .image(width / 2, height / 2, photoTextureKey)
        .setDisplaySize(width, height)
        .setScrollFactor(0)
        .setDepth(-32)
        .setAlpha(0.72);
    }

    this.farLayer = scene?.add?.graphics?.()?.setDepth?.(-28)?.setScrollFactor?.(0) ?? null;
    this.midLayer = scene?.add?.graphics?.()?.setDepth?.(-24)?.setScrollFactor?.(0) ?? null;
    this.nearLayer = scene?.add?.graphics?.()?.setDepth?.(-18)?.setScrollFactor?.(0) ?? null;

    this._seed = seed;
    this._drawParallaxStrips();
  }

  _drawParallaxStrips() {
    const rng = new SeededRandom(`${this._seed}-strips`);
    const h = this.height;
    const span = this.spanWidth;
    const accent =
      STAGE_ACCENT_COLORS[this.stageIndex % STAGE_ACCENT_COLORS.length] ?? 0x38bdf8;

    if (this.farLayer) {
      this.farLayer.clear();
      for (let copy = 0; copy < 2; copy += 1) {
        const offsetX = copy * this.width;
        const localRng = new SeededRandom(`${this._seed}-far`);
        let x = 0;
        while (x < this.width) {
          const bw = localRng.int(58, 108);
          const bh = localRng.int(120, 235);
          const by = h - 40 - bh;
          this.farLayer.fillStyle(0x0b1326, 0.56);
          this.farLayer.fillRect(offsetX + x, by, bw - 4, bh + 40);
          x += bw;
        }
      }
    }

    if (this.midLayer) {
      this.midLayer.clear();
      for (let copy = 0; copy < 2; copy += 1) {
        const offsetX = copy * this.width;
        const localRng = new SeededRandom(`${this._seed}-mid`);
        let x = 8;
        while (x < this.width - 20) {
          const bw = localRng.int(68, 112);
          const bh = localRng.int(80, 165);
          const by = h - 40 - bh;
          this.midLayer.fillStyle(0x0f172a, 0.72);
          this.midLayer.fillRect(offsetX + x, by, bw - 8, bh + 40);
          this.midLayer.lineStyle(1.5, accent, 0.28);
          this.midLayer.strokeRect(offsetX + x, by, bw - 8, bh);

          for (let wy = by + 14; wy < h - 58; wy += 18) {
            for (let wx = x + 10; wx < x + bw - 20; wx += 16) {
              if (localRng.next() < 0.35) {
                this.midLayer.fillStyle(
                  localRng.next() < 0.7 ? 0xfde68a : accent,
                  0.32
                );
                this.midLayer.fillRect(offsetX + wx, wy, 6, 8);
              }
            }
          }
          x += bw + 10;
        }
      }
    }

    if (this.nearLayer) {
      this.nearLayer.clear();
      const postSpacing = 192;
      for (let x = 40; x < span; x += postSpacing) {
        // Poste estilizado estilo Liberdade / urbano com lanternas penduradas
        const baseY = h - 40;
        const topY = h - 178;
        this.nearLayer.lineStyle(3, 0x1e293b, 0.85);
        this.nearLayer.lineBetween(x, baseY, x, topY);
        this.nearLayer.lineBetween(x - 16, topY + 8, x + 16, topY + 8);

        // Lanternas duplas vibrantes
        for (const lx of [x - 13, x + 13]) {
          this.nearLayer.fillStyle(0xef4444, 0.22);
          this.nearLayer.fillCircle(lx, topY + 18, 11);
          this.nearLayer.fillStyle(0xfef2f2, 0.85);
          this.nearLayer.fillCircle(lx, topY + 18, 4.5);
          this.nearLayer.lineStyle(1.5, accent, 0.65);
          this.nearLayer.strokeCircle(lx, topY + 18, 6.5);
        }
      }
    }
    void rng;
  }

  setStageIndex(stageIndex = 0) {
    if (this.stageIndex === stageIndex) return;
    this.stageIndex = stageIndex;
    this._drawParallaxStrips();
  }

  update(scrollX = 0) {
    const wrap = (factor) => {
      const mod = ((scrollX * factor) % this.width + this.width) % this.width;
      return -mod;
    };
    if (this.photoTile) {
      this.photoTile.tilePositionX = scrollX * 0.16;
    }
    this.farLayer?.setPosition?.(wrap(0.18), 0);
    this.midLayer?.setPosition?.(wrap(0.36), 0);
    this.nearLayer?.setPosition?.(wrap(0.62), 0);
  }

  setVisible(visible = true) {
    const show = Boolean(visible);
    this.skyBase?.setVisible?.(show);
    this.photoTile?.setVisible?.(show);
    this.photoImage?.setVisible?.(show);
    this.farLayer?.setVisible?.(show);
    this.midLayer?.setVisible?.(show);
    this.nearLayer?.setVisible?.(show);
  }

  destroy() {
    this.skyBase?.destroy?.();
    this.photoTile?.destroy?.();
    this.photoImage?.destroy?.();
    this.farLayer?.destroy?.();
    this.midLayer?.destroy?.();
    this.nearLayer?.destroy?.();
  }
}

/**
 * Renderiza o cenário urbano noturno estilizado no fundo de uma cena Phaser.
 * Puramente visual, sem impacto na física ou lógica.
 */
export function createCyberNightBackdrop(
  scene,
  width = 960,
  height = 540,
  seed = 'libasim-backdrop'
) {
  if (!scene?.add?.graphics) return null;

  const g = scene.add.graphics().setDepth(-20);
  const rng = new SeededRandom(seed);

  // 1. Degradê de céu noturno em faixas suaves
  const skyBands = [
    { y: 0, h: 90, color: 0x050814 },
    { y: 90, h: 95, color: 0x091024 },
    { y: 185, h: 105, color: 0x0f172a },
    { y: 290, h: 120, color: 0x162038 },
    { y: 410, h: 130, color: 0x1e293b },
  ];
  for (const band of skyBands) {
    g.fillStyle(band.color, 1);
    g.fillRect(0, band.y, width, band.h + 2);
  }

  // Brilho atmosférico sutil no horizonte
  g.fillStyle(0x38bdf8, 0.045);
  g.fillEllipse(width * 0.5, height - 60, width * 1.1, 210);
  g.fillStyle(0xa855f7, 0.04);
  g.fillEllipse(width * 0.78, 130, 360, 220);

  // 2. Lua estilizada com halo suave
  const moonX = width * 0.82;
  const moonY = 92;
  g.fillStyle(0xe0f2fe, 0.06);
  g.fillCircle(moonX, moonY, 54);
  g.fillStyle(0xbae6fd, 0.12);
  g.fillCircle(moonX, moonY, 34);
  g.fillStyle(0xf8fafc, 0.92);
  g.fillCircle(moonX, moonY, 20);
  g.fillStyle(0x091024, 0.9);
  g.fillCircle(moonX - 7, moonY - 4, 17);

  // 3. Estrelas discretas no céu superior
  for (let i = 0; i < 42; i += 1) {
    const sx = rng.range(16, width - 16);
    const sy = rng.range(14, 240);
    const radius = rng.range(0.8, 1.9);
    const alpha = rng.range(0.25, 0.75);
    g.fillStyle(i % 5 === 0 ? 0xbae6fd : 0xf8fafc, alpha);
    g.fillCircle(sx, sy, radius);
  }

  // 4. Silhueta de prédios distantes (camada 1)
  let bx = -10;
  while (bx < width + 20) {
    const bw = rng.int(48, 92);
    const bh = rng.int(110, 230);
    const by = height - 38 - bh;
    g.fillStyle(0x0b1324, 0.92);
    g.fillRect(bx, by, bw, bh + 40);
    g.lineStyle(1, 0x1e293b, 0.55);
    g.strokeRect(bx, by, bw, bh);
    bx += bw - rng.int(4, 14);
  }

  // 5. Silhueta urbana mais próxima com janelas iluminadas (camada 2)
  bx = 0;
  while (bx < width) {
    const bw = rng.int(56, 98);
    const bh = rng.int(75, 165);
    const by = height - 38 - bh;

    g.fillStyle(0x0f172a, 0.97);
    g.fillRect(bx, by, bw, bh + 40);
    g.lineStyle(1, 0x334155, 0.65);
    g.strokeRect(bx, by, bw, bh);

    // Janelas acesas quentes/frias
    for (let wy = by + 12; wy < height - 56; wy += 16) {
      for (let wx = bx + 10; wx < bx + bw - 12; wx += 14) {
        if (rng.next() < 0.34) {
          const winColor = rng.next() < 0.72 ? 0xfde68a : 0x38bdf8;
          g.fillStyle(winColor, rng.range(0.18, 0.45));
          g.fillRect(wx, wy, 6, 8);
        }
      }
    }

    bx += bw + rng.int(6, 18);
  }

  // 6. Grade de horizonte suave na base da arena
  g.fillStyle(0x020617, 0.42);
  g.fillRect(0, height - 80, width, 80);

  return g;
}

/**
 * Renderiza o chão principal e todas as plataformas suspensas com acabamento detalhado.
 */
export function renderArenaPlatforms(graphics, layout, stageIndex = 0) {
  if (!graphics || !layout) return;
  graphics.clear();

  const accent =
    STAGE_ACCENT_COLORS[stageIndex % STAGE_ACCENT_COLORS.length] ?? 0x38bdf8;

  // 1. Segmentos de chão sólido + Buracos sinalizados
  const segments =
    Array.isArray(layout.groundSegments) && layout.groundSegments.length > 0
      ? layout.groundSegments
      : layout.ground
        ? [layout.ground]
        : [];

  for (const ground of segments) {
    const gx = ground.x - ground.width / 2;
    const gy = ground.y - ground.height / 2;
    const gw = ground.width;
    const gh = ground.height;

    graphics.fillStyle(0x0b1120, 1);
    graphics.fillRect(gx, gy, gw, gh);

    graphics.fillStyle(0x1e293b, 1);
    graphics.fillRect(gx, gy, gw, 12);

    graphics.lineStyle(1, 0x0f172a, 0.85);
    for (let x = gx + 32; x < gx + gw; x += 48) {
      graphics.lineBetween(x, gy + 3, x - 8, gy + gh);
    }

    graphics.fillStyle(accent, 0.25);
    graphics.fillRect(gx, gy - 2, gw, 5);
    graphics.lineStyle(2, accent, 0.9);
    graphics.lineBetween(gx, gy + 1, gx + gw, gy + 1);
  }

  // Buracos no chão: abismo escuro + sinalização cartunesca de perigo nas bordas
  for (const hole of layout.holes ?? []) {
    const hl = hole.left;
    const hr = hole.right;
    const hw = hole.width;
    const hy = hole.topY ?? 500;
    const hh = 48;

    graphics.fillStyle(0x02040a, 0.96);
    graphics.fillRect(hl, hy, hw, hh);
    graphics.fillStyle(0xef4444, 0.16);
    graphics.fillRect(hl + 2, hy + hh - 16, Math.max(4, hw - 4), 16);

    // Bordas listradas amarelo/preto nas quinas esquerda e direita do buraco
    for (const curbX of [hl - 12, hr]) {
      graphics.fillStyle(0xfacc15, 0.95);
      graphics.fillRect(curbX, hy, 12, 10);
      graphics.lineStyle(2, 0x0f172a, 0.95);
      graphics.lineBetween(curbX + 3, hy, curbX, hy + 10);
      graphics.lineBetween(curbX + 9, hy, curbX + 6, hy + 10);
    }
    graphics.lineStyle(2, 0xf87171, 0.65);
    graphics.lineBetween(hl, hy + hh - 4, hr, hy + hh - 4);
  }

  // 2. Plataformas suspensas estilizadas por categoria (static, moving, crumbling)
  const platformsToRender = layout.allPlatforms ?? layout.platforms ?? [];
  for (const plat of platformsToRender) {
    const pType = plat.type ?? 'static';
    const shakeX = plat.shakeOffsetX ?? 0;
    const shakeY = plat.shakeOffsetY ?? 0;
    const px = plat.x - plat.width / 2 + shakeX;
    const py = plat.y - plat.height / 2 + shakeY;
    const pw = plat.width;
    const ph = plat.height;

    // Plataforma desintegrada temporariamente: silhueta fantasma tracejada
    if (pType === 'crumbling' && plat.solid === false) {
      graphics.lineStyle(1.5, 0xfb923c, 0.24);
      graphics.strokeRoundedRect?.(px, py, pw, ph, 5);
      continue;
    }

    // Trilho guia sutil para plataformas móveis
    if (pType === 'moving' && plat.amplitude > 0) {
      graphics.lineStyle(1.5, 0x38bdf8, 0.24);
      if (plat.axis === 'horizontal') {
        graphics.lineBetween(
          plat.baseX - plat.amplitude,
          plat.baseY,
          plat.baseX + plat.amplitude,
          plat.baseY
        );
      } else {
        graphics.lineBetween(
          plat.baseX,
          plat.baseY - plat.amplitude,
          plat.baseX,
          plat.baseY + plat.amplitude
        );
      }
    }

    // Sombra inferior suave
    graphics.fillStyle(0x020617, 0.45);
    graphics.fillRoundedRect(px + 2, py + 4, pw, ph, 5);

    const bodyColor =
      pType === 'crumbling'
        ? plat.state === 'shaking'
          ? 0x7c2d12
          : 0x451a03
        : pType === 'moving'
          ? 0x0f2942
          : 0x1e293b;

    const topStripeColor =
      pType === 'crumbling'
        ? plat.state === 'shaking'
          ? 0xf87171
          : 0xfb923c
        : pType === 'moving'
          ? 0xfacc15
          : accent;

    // Corpo chanfrado
    graphics.fillStyle(bodyColor, 0.98);
    graphics.fillRoundedRect(px, py, pw, ph, 5);

    graphics.fillStyle(0x0f172a, 0.88);
    graphics.fillRoundedRect(px + 2, py + ph * 0.48, pw - 4, ph * 0.46, 3);

    if (pType === 'crumbling') {
      // Rachaduras visíveis indicando desintegração ao pisar
      graphics.lineStyle(1.6, 0xfdba74, 0.85);
      for (let cx = px + 24; cx < px + pw - 20; cx += 34) {
        graphics.lineBetween(cx, py + 2, cx - 5, py + ph * 0.55);
        graphics.lineBetween(cx - 5, py + ph * 0.55, cx + 4, py + ph - 2);
      }
    } else if (pType === 'moving') {
      // Chevrons direcionais e propulsores luminosos
      graphics.lineStyle(1.6, 0xfacc15, 0.85);
      const midX = px + pw / 2;
      const midY = py + ph / 2;
      if (plat.axis === 'horizontal') {
        graphics.lineBetween(midX - 12, midY, midX - 6, midY - 4);
        graphics.lineBetween(midX - 12, midY, midX - 6, midY + 4);
        graphics.lineBetween(midX + 12, midY, midX + 6, midY - 4);
        graphics.lineBetween(midX + 12, midY, midX + 6, midY + 4);
      } else {
        graphics.lineBetween(midX, midY - 5, midX - 5, midY - 1);
        graphics.lineBetween(midX, midY - 5, midX + 5, midY - 1);
        graphics.lineBetween(midX, midY + 5, midX - 5, midY + 1);
        graphics.lineBetween(midX, midY + 5, midX + 5, midY + 1);
      }
    } else {
      // Treliça metálica padrão
      graphics.lineStyle(1, 0x334155, 0.7);
      for (let tx = px + 14; tx < px + pw - 14; tx += 22) {
        graphics.lineBetween(tx, py + 4, tx + 10, py + ph - 3);
        graphics.lineBetween(tx + 10, py + 4, tx, py + ph - 3);
      }
    }

    graphics.lineStyle(
      1.5,
      pType === 'crumbling' ? 0x9a3412 : pType === 'moving' ? 0x0284c7 : 0x475569,
      0.95
    );
    graphics.strokeRoundedRect(px, py, pw, ph, 5);

    // Friso superior iluminado por categoria
    graphics.lineStyle(2.6, topStripeColor, 0.98);
    graphics.lineBetween(px + 4, py + 1.5, px + pw - 4, py + 1.5);

    for (const emitterX of [px + 14, px + pw - 14]) {
      graphics.fillStyle(topStripeColor, 0.24);
      graphics.fillCircle(emitterX, py + ph + 2, 6);
      graphics.fillStyle(0xe0f2fe, 0.9);
      graphics.fillCircle(emitterX, py + ph, 2);
    }
  }
}

/**
 * Desenha um arco estilizado de golpe/corte energético no lugar de caixas brutas de debug.
 */
export function drawCombatSlashEffect(
  graphics,
  hitboxBounds,
  color = 0x38bdf8,
  facing = 1,
  isHeavyOrCombo = false
) {
  if (!graphics || !hitboxBounds) return;

  const dir = facing >= 0 ? 1 : -1;
  const cx = hitboxBounds.x + hitboxBounds.width / 2;
  const cy = hitboxBounds.y + hitboxBounds.height / 2;
  const rx = hitboxBounds.width * 0.48;
  const ry = hitboxBounds.height * 0.46;

  // Brilho difuso ao redor do impacto
  graphics.fillStyle(color, isHeavyOrCombo ? 0.22 : 0.14);
  graphics.fillEllipse(cx, cy, hitboxBounds.width * 1.05, hitboxBounds.height * 0.95);

  // Lâmina/arco energético principal
  const tipX = cx + dir * rx;
  const backX = cx - dir * (rx * 0.45);
  const topY = cy - ry;
  const botY = cy + ry;

  graphics.lineStyle(isHeavyOrCombo ? 6 : 4, color, 0.9);
  graphics.beginPath?.();
  if (typeof graphics.arc === 'function' && isHeavyOrCombo && hitboxBounds.width > 100) {
    // Onda circular de choque (ex.: Shockwave do Boss)
    graphics.strokeEllipse(cx, cy, hitboxBounds.width * 0.96, hitboxBounds.height * 0.7);
    graphics.lineStyle(2, 0xffffff, 0.9);
    graphics.strokeEllipse(cx, cy, hitboxBounds.width * 0.82, hitboxBounds.height * 0.5);
    return;
  }

  // Curva estilizada de corte em 3 segmentos suaves + núcleo branco brilhante
  const midX = cx + dir * (rx * 0.68);
  graphics.lineBetween(backX, topY + 3, midX, cy - ry * 0.45);
  graphics.lineBetween(midX, cy - ry * 0.45, tipX, cy);
  graphics.lineBetween(tipX, cy, midX, cy + ry * 0.45);
  graphics.lineBetween(midX, cy + ry * 0.45, backX, botY - 3);

  graphics.lineStyle(isHeavyOrCombo ? 2.5 : 1.8, 0xffffff, 0.95);
  graphics.lineBetween(cx, cy - ry * 0.35, tipX - dir * 2, cy);
  graphics.lineBetween(tipX - dir * 2, cy, cx, cy + ry * 0.35);

  // Linhas cinéticas de velocidade
  graphics.lineStyle(1.5, color, 0.75);
  graphics.lineBetween(cx - dir * rx * 0.6, cy - 5, tipX - dir * 4, cy - 5);
  graphics.lineBetween(cx - dir * rx * 0.4, cy + 6, tipX - dir * 6, cy + 6);
}
