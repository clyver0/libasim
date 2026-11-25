import { SeededRandom } from '../utils/SeededRandom.js';

const STAGE_ACCENT_COLORS = [0x38bdf8, 0x10b981, 0xf59e0b, 0xd946ef];

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

  // 1. Chão principal da arena
  const ground = layout.ground;
  if (ground) {
    const gx = ground.x - ground.width / 2;
    const gy = ground.y - ground.height / 2;
    const gw = ground.width;
    const gh = ground.height;

    // Base escura profunda
    graphics.fillStyle(0x0b1120, 1);
    graphics.fillRect(gx, gy, gw, gh);

    // Faixa superior pavimentada
    graphics.fillStyle(0x1e293b, 1);
    graphics.fillRect(gx, gy, gw, 12);

    // Juntas de blocos no piso
    graphics.lineStyle(1, 0x0f172a, 0.85);
    for (let x = gx + 32; x < gx + gw; x += 48) {
      graphics.lineBetween(x, gy + 3, x - 8, gy + gh);
    }

    // Linha luminosa de acabamento no topo do chão
    graphics.fillStyle(accent, 0.25);
    graphics.fillRect(gx, gy - 2, gw, 5);
    graphics.lineStyle(2, accent, 0.9);
    graphics.lineBetween(gx, gy + 1, gx + gw, gy + 1);
  }

  // 2. Plataformas suspensas estilizadas
  for (const plat of layout.platforms ?? []) {
    const px = plat.x - plat.width / 2;
    const py = plat.y - plat.height / 2;
    const pw = plat.width;
    const ph = plat.height;

    // Sombra inferior suave
    graphics.fillStyle(0x020617, 0.45);
    graphics.fillRoundedRect(px + 2, py + 4, pw, ph, 5);

    // Corpo metálico chanfrado
    graphics.fillStyle(0x1e293b, 0.98);
    graphics.fillRoundedRect(px, py, pw, ph, 5);

    // Faixa inferior mais escura para volume 3D
    graphics.fillStyle(0x0f172a, 0.95);
    graphics.fillRoundedRect(px + 2, py + ph * 0.45, pw - 4, ph * 0.5, 3);

    // Treliça interna discreta
    graphics.lineStyle(1, 0x334155, 0.7);
    for (let tx = px + 14; tx < px + pw - 14; tx += 22) {
      graphics.lineBetween(tx, py + 4, tx + 10, py + ph - 3);
      graphics.lineBetween(tx + 10, py + 4, tx, py + ph - 3);
    }

    // Contorno metálico externo
    graphics.lineStyle(1.5, 0x475569, 0.95);
    graphics.strokeRoundedRect(px, py, pw, ph, 5);

    // Friso superior iluminado (facilita leitura imediata de colisão vertical!)
    graphics.lineStyle(2.5, accent, 0.95);
    graphics.lineBetween(px + 4, py + 1.5, px + pw - 4, py + 1.5);

    // Emissores luminosos de sustentação nas pontas inferiores
    for (const emitterX of [px + 14, px + pw - 14]) {
      graphics.fillStyle(accent, 0.22);
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
