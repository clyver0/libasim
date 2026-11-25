/**
 * Utilitário geométrico para cálculo de hitboxes e detecção de interseção AABB
 * com hurtboxes, totalmente independente da renderização.
 */
export class Hitbox {
  /**
   * Calcula os limites no mundo (x, y, width, height) a partir do centro do atacante.
   * `x` e `y` representam o canto superior esquerdo do retângulo AABB.
   */
  static getWorldBounds(origin, hitboxConfig, facing = 1) {
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
