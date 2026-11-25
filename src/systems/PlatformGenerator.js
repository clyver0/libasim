import { GAMEPLAY } from '../constants/gameplay.js';
import { PHYSICS } from '../constants/physics.js';
import { PLATFORM_CONFIG } from '../constants/platforms.js';
import { SeededRandom } from '../utils/SeededRandom.js';

/**
 * Calcula métricas de alcance de pulo com base nos parâmetros reais de física.
 */
export function computeJumpEnvelope(physics = PHYSICS, config = PLATFORM_CONFIG) {
  const gravity = physics.GRAVITY_Y;
  const jumpSpeed = Math.abs(physics.PLAYER_JUMP_VELOCITY);
  const moveSpeed = physics.PLAYER_MOVE_SPEED;

  const theoreticalMaxHeight = (jumpSpeed * jumpSpeed) / (2 * gravity);
  const safeMaxJumpUp = theoreticalMaxHeight * config.JUMP_HEIGHT_SAFETY;

  return {
    gravity,
    jumpSpeed,
    moveSpeed,
    theoreticalMaxHeight,
    safeMaxJumpUp,
  };
}

/**
 * Verifica se é possível saltar de uma superfície `from` para `to`.
 * Superfícies usam coordenadas de centro `(x, y)` com `width` e `height`.
 */
export function canJumpBetween(
  from,
  to,
  physics = PHYSICS,
  config = PLATFORM_CONFIG
) {
  const fromTop = from.y - from.height / 2;
  const toTop = to.y - to.height / 2;

  // deltaY > 0 significa que o destino está acima da origem
  const deltaY = fromTop - toTop;

  const { gravity, jumpSpeed, moveSpeed, safeMaxJumpUp } = computeJumpEnvelope(
    physics,
    config
  );

  if (deltaY > safeMaxJumpUp) {
    return false;
  }

  // Tempo disponível no ar até cruzar a altura de destino na descida
  const discriminant = jumpSpeed * jumpSpeed - 2 * gravity * deltaY;
  if (discriminant < 0) {
    return false;
  }

  const airTime = (jumpSpeed + Math.sqrt(discriminant)) / gravity;
  const maxHorizontalGap = moveSpeed * airTime * config.JUMP_HORIZONTAL_SAFETY;

  const fromLeft = from.x - from.width / 2;
  const fromRight = from.x + from.width / 2;
  const toLeft = to.x - to.width / 2;
  const toRight = to.x + to.width / 2;

  const horizontalGap = Math.max(0, toLeft - fromRight, fromLeft - toRight);
  return horizontalGap <= maxHorizontalGap;
}

/**
 * Sistema independente de geração procedural determinística de plataformas.
 * Não depende do Phaser; retorna dados puros prontos para instanciação na cena.
 */
export class PlatformGenerator {
  constructor({
    width = GAMEPLAY.SCREEN_WIDTH,
    height = GAMEPLAY.SCREEN_HEIGHT,
    physics = PHYSICS,
    config = PLATFORM_CONFIG,
  } = {}) {
    this.width = width;
    this.height = height;
    this.physics = physics;
    this.config = config;
  }

  getGroundDescriptor() {
    const groundHeight = this.config.GROUND_HEIGHT;
    return {
      id: 'ground',
      x: this.width / 2,
      y: this.height - groundHeight / 2,
      width: this.width,
      height: groundHeight,
      isGround: true,
    };
  }

  _isInsideScreen(platform) {
    const halfW = platform.width / 2;
    const halfH = platform.height / 2;
    const groundTop = this.height - this.config.GROUND_HEIGHT;

    return (
      platform.x - halfW >= this.config.MARGIN_X &&
      platform.x + halfW <= this.width - this.config.MARGIN_X &&
      platform.y - halfH >= this.config.MIN_TOP_Y &&
      platform.y + halfH <= groundTop - this.config.MAX_BOTTOM_MARGIN_FROM_GROUND
    );
  }

  _overlapsSafeZone(platform) {
    const zone = this.config.SAFE_SPAWN_ZONE;
    if (!zone) return false;

    const dx = Math.abs(platform.x - zone.x);
    const dy = Math.abs(platform.y - zone.y);
    return (
      dx < (platform.width + zone.width) / 2 &&
      dy < (platform.height + zone.height) / 2
    );
  }

  _overlapsExisting(candidate, existing) {
    for (const other of existing) {
      const dx = Math.abs(candidate.x - other.x);
      const dy = Math.abs(candidate.y - other.y);

      const minDx =
        (candidate.width + other.width) / 2 + this.config.MIN_HORIZONTAL_GAP;
      const minDy =
        (candidate.height + other.height) / 2 + this.config.MIN_VERTICAL_GAP;

      if (dx < minDx && dy < minDy) {
        return true;
      }
    }
    return false;
  }

  _isValidCandidate(candidate, existing) {
    return (
      this._isInsideScreen(candidate) &&
      !this._overlapsSafeZone(candidate) &&
      !this._overlapsExisting(candidate, existing)
    );
  }

  /**
   * Verifica via BFS se todas as plataformas são alcançáveis a partir do chão.
   */
  validateReachability(platforms) {
    if (platforms.length === 0) return true;

    const ground = this.getGroundDescriptor();
    const visited = new Set();
    const queue = [ground];

    while (queue.length > 0) {
      const current = queue.shift();

      for (let i = 0; i < platforms.length; i += 1) {
        if (visited.has(i)) continue;
        if (canJumpBetween(current, platforms[i], this.physics, this.config)) {
          visited.add(i);
          queue.push(platforms[i]);
        }
      }
    }

    return visited.size === platforms.length;
  }

  generate(seed) {
    const rng = new SeededRandom(seed);
    const ground = this.getGroundDescriptor();
    const targetCount = rng.int(this.config.MIN_COUNT, this.config.MAX_COUNT);
    const platforms = [];
    const { safeMaxJumpUp } = computeJumpEnvelope(this.physics, this.config);

    let attempts = 0;
    while (
      platforms.length < targetCount &&
      attempts < this.config.MAX_GENERATION_ATTEMPTS
    ) {
      attempts += 1;

      const anchors = [ground, ...platforms];
      const anchor = rng.pick(anchors);

      const width = rng.int(this.config.MIN_WIDTH, this.config.MAX_WIDTH);
      const height = this.config.HEIGHT;

      const anchorTop = anchor.y - anchor.height / 2;
      const minStepUp = anchor.isGround
        ? this.config.MAX_BOTTOM_MARGIN_FROM_GROUND
        : Math.min(safeMaxJumpUp, this.config.MIN_VERTICAL_GAP);
      const maxStepUp = safeMaxJumpUp;

      const stepUp = rng.range(minStepUp, maxStepUp);
      const candidateTop = anchorTop - stepUp;
      const candidateY = Math.round(candidateTop + height / 2);

      // Posição X dentro do alcance horizontal da âncora
      const maxOffset = anchor.isGround
        ? this.width / 2 - this.config.MARGIN_X - width / 2
        : 220;
      const rawX = anchor.x + rng.range(-maxOffset, maxOffset);
      const clampedX = Math.round(
        Math.max(
          this.config.MARGIN_X + width / 2,
          Math.min(this.width - this.config.MARGIN_X - width / 2, rawX)
        )
      );

      const candidate = {
        id: `platform_${platforms.length + 1}`,
        x: clampedX,
        y: candidateY,
        width,
        height,
      };

      if (
        this._isValidCandidate(candidate, platforms) &&
        canJumpBetween(anchor, candidate, this.physics, this.config)
      ) {
        platforms.push(candidate);
      }
    }

    return {
      seed: rng.seed,
      ground,
      platforms,
      reachable: this.validateReachability(platforms),
    };
  }
}
