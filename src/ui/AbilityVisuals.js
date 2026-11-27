/**
 * Formas visuais temporárias das habilidades especiais (carro do Piri e formiga do Tonegi).
 * Desenhadas em Graphics relativo ao centro do corpo do jogador (mesmo referencial do stick figure).
 */

/** Carro esportivo estilizado: roda girando, faróis e linhas de velocidade. */
export function drawCar(
  graphics,
  { color = 0x22c55e, facing = 1, timeMs = 0, footOffset = 28 } = {}
) {
  if (!graphics) return;
  graphics.clear();
  const d = facing >= 0 ? 1 : -1;
  const wheelSpin = timeMs * 0.04;
  const bottom = footOffset;

  // Linhas de velocidade atrás do carro
  graphics.lineStyle(2, 0xffffff, 0.55);
  for (let i = 0; i < 4; i += 1) {
    const off = ((timeMs * 0.9 + i * 23) % 46);
    const y = bottom - 8 - i * 7;
    graphics.lineBetween(-d * (36 + off), y, -d * (52 + off), y);
  }

  // Sombra
  graphics.fillStyle(0x020617, 0.4);
  graphics.fillEllipse(0, bottom + 1, 70, 7);

  // Carroceria
  graphics.fillStyle(0x052e16, 1);
  graphics.fillRoundedRect(-32, bottom - 22, 64, 17, 6);
  graphics.fillStyle(color, 1);
  graphics.fillRoundedRect(-31, bottom - 21, 62, 14, 6);
  // Cabine e vidro
  graphics.fillStyle(color, 1);
  graphics.fillRoundedRect(-14 * d - 11, bottom - 34, 24, 14, 5);
  graphics.fillStyle(0xbae6fd, 0.95);
  graphics.fillRoundedRect(-14 * d - 8, bottom - 32, 18, 9, 3);
  // Faixa e detalhes
  graphics.fillStyle(0xffffff, 0.6);
  graphics.fillRect(-28, bottom - 15, 56, 2);
  // Farol e lanterna
  graphics.fillStyle(0xfef08a, 1);
  graphics.fillCircle(d * 30, bottom - 15, 3.2);
  graphics.fillStyle(0xef4444, 1);
  graphics.fillCircle(-d * 30, bottom - 15, 2.4);
  graphics.fillStyle(0xfef08a, 0.25);
  graphics.fillTriangle(d * 32, bottom - 17, d * 70, bottom - 26, d * 70, bottom - 6);

  // Rodas com raios girando
  for (const wx of [-19, 19]) {
    graphics.fillStyle(0x0f172a, 1);
    graphics.fillCircle(wx, bottom - 4, 7.5);
    graphics.fillStyle(0xcbd5e1, 1);
    graphics.fillCircle(wx, bottom - 4, 3.6);
    graphics.lineStyle(1.5, 0x0f172a, 1);
    graphics.lineBetween(
      wx + Math.cos(wheelSpin) * 3.4,
      bottom - 4 + Math.sin(wheelSpin) * 3.4,
      wx - Math.cos(wheelSpin) * 3.4,
      bottom - 4 - Math.sin(wheelSpin) * 3.4
    );
  }
}

/** Formiga gigante estilizada usada como forma do Tonegi (será reduzida pela escala visual). */
export function drawAntForm(
  graphics,
  { color = 0xfbbf24, facing = 1, timeMs = 0, footOffset = 28 } = {}
) {
  if (!graphics) return;
  graphics.clear();
  const d = facing >= 0 ? 1 : -1;
  const t = timeMs * 0.045;
  const bottom = footOffset;
  const cy = bottom - 12;

  // Aura laranja pulsante (identidade distinta do carro verde)
  graphics.fillStyle(color, 0.16 + Math.sin(timeMs * 0.012) * 0.05);
  graphics.fillEllipse(0, cy, 74, 44);

  graphics.fillStyle(0x020617, 0.35);
  graphics.fillEllipse(0, bottom + 1, 52, 6);

  // Patas
  graphics.lineStyle(3, 0x1f2937, 1);
  for (let i = 0; i < 3; i += 1) {
    const baseX = d * (-8 + i * 9);
    const swing = Math.sin(t + i * 2.1) * 8;
    graphics.lineBetween(baseX, cy + 2, baseX + swing, bottom);
    graphics.lineBetween(baseX, cy + 2, baseX - swing, bottom);
  }

  // Corpo
  graphics.fillStyle(0x1f2937, 1);
  graphics.fillCircle(-d * 17, cy, 11);
  graphics.fillCircle(0, cy - 1, 8);
  graphics.fillCircle(d * 14, cy - 3, 7);
  graphics.fillStyle(color, 1);
  graphics.fillCircle(-d * 17, cy, 8);
  graphics.fillCircle(0, cy - 1, 5.5);
  graphics.fillCircle(d * 14, cy - 3, 4.8);
  graphics.fillStyle(0xffffff, 0.45);
  graphics.fillCircle(-d * 20, cy - 4, 2.5);
  // Olho + mandíbulas
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(d * 16, cy - 5, 2.2);
  graphics.fillStyle(0x020617, 1);
  graphics.fillCircle(d * 16.6, cy - 5, 1);
  graphics.lineStyle(2, 0x1f2937, 1);
  graphics.lineBetween(d * 20, cy - 1, d * 25, cy + 2);
  // Antenas
  const wig = Math.sin(t * 0.8) * 3;
  graphics.lineBetween(d * 17, cy - 9, d * 25, cy - 18 + wig);
  graphics.lineBetween(d * 13, cy - 9, d * 19, cy - 20 - wig);
}
