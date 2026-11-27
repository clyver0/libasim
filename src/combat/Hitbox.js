/**
 * Utilitário geométrico para cálculo de hitboxes e detecção de interseção AABB
 * com hurtboxes, totalmente independente da renderização.
 */
export class Hitbox {
  /**
   * Calcula os limites no mundo (x, y, width, height) a partir do centro do atacante.
   * `x` e `y` representam o canto superior esquerdo do retângulo AABB.
   */
  static getWorldBounds(origin, hitboxConfig, facing = 1, aimVector = null) {
    if (
      aimVector &&
      (typeof aimVector.x === 'number' || typeof aimVector.y === 'number')
    ) {
      const rawX = aimVector.x ?? 0;
      const rawY = aimVector.y ?? 0;
      const len = Math.hypot(rawX, rawY) || 1;
      const ax = rawX / len;
      const ay = rawY / len;
      const reach = hitboxConfig.offsetX ?? 0;
      const baseW = hitboxConfig.width;
      const baseH = Math.max(hitboxConfig.height, 42);
      const width = Math.round(Math.abs(ax) * baseW + Math.abs(ay) * baseH);
      const height = Math.round(Math.abs(ay) * baseW + Math.abs(ax) * baseH);
      const centerX = origin.x + ax * reach;
      const centerY = origin.y + ay * reach;

      return {
        x: centerX - width / 2,
        y: centerY - height / 2,
        width,
        height,
      };
    }

    const dir = facing >= 0 ? 1 : -1;
    const width = hitboxConfig.width;
    const height = hitboxConfig.height;
    const centerX = origin.x + dir * (hitboxConfig.offsetX ?? 0);
    const centerY = origin.y + (hitboxConfig.offsetY ?? 0);

    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    };
  }

  /**
   * Verifica interseção AABB entre dois retângulos { x, y, width, height }.
   */
  static intersects(a, b) {
    if (!a || !b) return false;
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}
