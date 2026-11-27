import { ENEMY_CONFIG } from '../constants/enemies.js';
import { GAMEPLAY } from '../constants/gameplay.js';
import { PHYSICS } from '../constants/physics.js';
import { PLATFORM_CONFIG } from '../constants/platforms.js';
import { canJumpBetween } from './PlatformGenerator.js';

function getSurfaceBounds(surface) {
  return {
    left: surface.x - surface.width / 2,
    right: surface.x + surface.width / 2,
    top: surface.y - surface.height / 2,
    bottom: surface.y + surface.height / 2,
  };
}

/**
 * Identifica a superfície (chão ou plataforma) sobre a qual uma hurtbox está apoiada
 * ou mais próxima abaixo dela caso esteja no ar.
 */
export function findReferenceSurface(
  hurtbox,
  surfaces,
  toleranceY = ENEMY_CONFIG.AI.SURFACE_TOLERANCE_Y
) {
  if (!hurtbox || !surfaces?.length) return null;

  const footY = hurtbox.y + hurtbox.height;
  const boxLeft = hurtbox.x;
  const boxRight = hurtbox.x + hurtbox.width;

  let exactMatch = null;
  let bestBelow = null;
  let bestBelowDist = Infinity;

  for (const surface of surfaces) {
    const bounds = getSurfaceBounds(surface);
    const overlapsX = boxRight > bounds.left - 2 && boxLeft < bounds.right + 2;
    if (!overlapsX) continue;

    const dy = bounds.top - footY;
    if (Math.abs(dy) <= toleranceY) {
      if (!exactMatch || bounds.top < getSurfaceBounds(exactMatch).top) {
        exactMatch = surface;
      }
    } else if (dy >= -toleranceY && dy < bestBelowDist) {
      bestBelowDist = dy;
      bestBelow = surface;
    }
  }

  return exactMatch ?? bestBelow ?? surfaces.find((s) => s.isGround) ?? null;
}

/**
 * Encontra o próximo degrau alcançável por BFS usando exclusivamente `canJumpBetween`
 * com os parâmetros físicos reais do inimigo, evitando plataformas impossíveis.
 */
export function findNextReachableStep(
  fromSurface,
  targetSurface,
  surfaces,
  enemyPhysics,
  platformConfig = PLATFORM_CONFIG
) {
  if (!fromSurface || !targetSurface || !surfaces?.length) return null;
  if (fromSurface.id === targetSurface.id) return targetSurface;

  const visited = new Set([fromSurface.id]);
  const queue = [{ surface: fromSurface, firstStep: null }];

  while (queue.length > 0) {
    const { surface: current, firstStep } = queue.shift();

    for (const candidate of surfaces) {
      if (visited.has(candidate.id)) continue;

      const reachableByJump = canJumpBetween(
        current,
        candidate,
        enemyPhysics,
        platformConfig
      );
      const reachableByDrop =
        !current.isGround &&
        candidate.y - candidate.height / 2 > current.y - current.height / 2;

      if (!reachableByJump && !reachableByDrop) continue;

      const nextFirstStep = firstStep ?? candidate;
      if (candidate.id === targetSurface.id) {
        return nextFirstStep;
      }

      visited.add(candidate.id);
      queue.push({ surface: candidate, firstStep: nextFirstStep });
    }
  }

  return null;
}

/**
 * Calcula um ponto seguro de decolagem na superfície atual para saltar até `nextSurface`,
 * desviando da sombra inferior da plataforma quando ela está diretamente acima.
 */
export function computeTakeoffPoint(
  currentSurface,
  nextSurface,
  enemyCenterX,
  bodyWidth,
  screenWidth = GAMEPLAY.SCREEN_WIDTH,
  aiConfig = ENEMY_CONFIG.AI,
  worldBounds = null
) {
  const cur = getSurfaceBounds(currentSurface);
  const nxt = getSurfaceBounds(nextSurface);
  const margin = bodyWidth / 2 + aiConfig.CLEARANCE_MARGIN;
  const worldLeft = worldBounds?.left ?? Math.min(0, cur.left - 32);
  const worldRight =
    worldBounds?.right ?? Math.max(screenWidth, cur.right + 32);
  const minSurfaceX = Math.max(worldLeft + margin, cur.left + bodyWidth / 2 + 4);
  const maxSurfaceX = Math.min(
    worldRight - margin,
    cur.right - bodyWidth / 2 - 4
  );

  // Se a próxima plataforma está acima, evite pular de baixo dela (bater a cabeça)
  if (nxt.top < cur.top) {
    const leftTakeoff = nxt.left - margin;
    const rightTakeoff = nxt.right + margin;
    const candidates = [];

    if (leftTakeoff >= minSurfaceX && leftTakeoff <= maxSurfaceX) {
      candidates.push(leftTakeoff);
    }
    if (rightTakeoff >= minSurfaceX && rightTakeoff <= maxSurfaceX) {
      candidates.push(rightTakeoff);
    }

    if (candidates.length === 1) {
      return candidates[0];
    }
    if (candidates.length === 2) {
      return Math.abs(enemyCenterX - candidates[0]) <=
        Math.abs(enemyCenterX - candidates[1])
        ? candidates[0]
        : candidates[1];
    }
  }

  // Salto lateral entre plataformas ou borda mais próxima
  const clampedTargetX = Math.max(
    minSurfaceX,
    Math.min(maxSurfaceX, nextSurface.x)
  );
  return clampedTargetX;
}

/**
 * Sistema de IA simples e determinístico para perseguição, ataque e navegação entre plataformas.
 * Não manipula a posição vertical diretamente: apenas emite intenções (`moveDir`, `jump`, `shouldAttack`).
 */
export class EnemyAI {
  constructor({
    physics = PHYSICS,
    platformConfig = PLATFORM_CONFIG,
    aiConfig = ENEMY_CONFIG.AI,
    screenWidth = GAMEPLAY.SCREEN_WIDTH,
  } = {}) {
    this.physics = physics;
    this.platformConfig = platformConfig;
    this.aiConfig = aiConfig;
    this.screenWidth = screenWidth;
  }

  decide(enemy, player, layout, activeEnemies = [], deltaMs = 16.67) {
    const result = {
      moveDir: 0,
      jump: false,
      shouldAttack: false,
      facing: enemy.facing ?? 1,
    };

    if (!enemy || !player || enemy.isDead() || player.isDead?.()) {
      return result;
    }

    const state = enemy.state;
    const behavior = state.behaviorState;
    if (
      behavior === ENEMY_CONFIG.STATES.WINDUP ||
      behavior === ENEMY_CONFIG.STATES.ATTACKING ||
      behavior === ENEMY_CONFIG.STATES.RECOVERING ||
      behavior === ENEMY_CONFIG.STATES.HURT ||
      behavior === ENEMY_CONFIG.STATES.DEAD
    ) {
      return result;
    }

    const enemyBox = enemy.getHurtbox();
    const playerBox = player.getHurtbox();
    const enemyOrigin = enemy.getCombatOrigin();
    const playerOrigin = player.getCombatOrigin();

    const dx = playerOrigin.x - enemyOrigin.x;
    const dy = playerOrigin.y - enemyOrigin.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const facingToPlayer = dx >= 0 ? 1 : -1;
    result.facing = facingToPlayer;

    // Atualiza timers de IA do inimigo (sem criar objetos)
    const memory = enemy.aiMemory;
    if (memory.jumpCooldownMs > 0) {
      memory.jumpCooldownMs = Math.max(0, memory.jumpCooldownMs - deltaMs);
    }
    if (memory.decisionTimerMs > 0) {
      memory.decisionTimerMs = Math.max(0, memory.decisionTimerMs - deltaMs);
    }

    // Verifica se está ao alcance de ataque e com cooldown zerado
    const attack = state.attack;
    if (
      enemy.isGrounded() &&
      enemy.attackCooldownMs <= 0 &&
      absDx <= attack.rangeX &&
      absDy <= attack.rangeY
    ) {
      result.shouldAttack = true;
      result.moveDir = 0;
      return result;
    }

    // Detector anti-stuck quando em perseguição no chão/plataforma
    if (enemy.isGrounded() && !memory.dropSurfaceId) {
      memory.stuckTimerMs += deltaMs;
      if (memory.unstickTimerMs > 0) {
        memory.unstickTimerMs = Math.max(0, memory.unstickTimerMs - deltaMs);
        result.moveDir = memory.unstickDir;
        if (memory.jumpCooldownMs <= 0) {
          result.jump = true;
          memory.jumpCooldownMs = this.aiConfig.JUMP_COOLDOWN_MS;
        }
        return result;
      }

      if (memory.stuckTimerMs >= this.aiConfig.STUCK_CHECK_WINDOW_MS) {
        const movedX = Math.abs(enemyOrigin.x - memory.lastCheckX);
        memory.stuckTimerMs = 0;
        memory.lastCheckX = enemyOrigin.x;

        if (movedX < this.aiConfig.STUCK_MIN_DISTANCE_X && absDx > attack.rangeX) {
          memory.unstickTimerMs = this.aiConfig.UNSTICK_DURATION_MS;
          const isScrollingWorld = Boolean(layout?.groundSegments?.length);
          memory.unstickDir = isScrollingWorld
            ? facingToPlayer
            : enemyOrigin.x > this.screenWidth / 2
              ? -1
              : 1;
          memory.cachedNextStep = null;
          result.moveDir = memory.unstickDir;
          if (isScrollingWorld && memory.jumpCooldownMs <= 0) {
            result.jump = true;
            memory.jumpCooldownMs = this.aiConfig.JUMP_COOLDOWN_MS;
          }
          return result;
        }
      }
    } else {
      memory.stuckTimerMs = 0;
      memory.lastCheckX = enemyOrigin.x;
    }

    if (!enemy.isGrounded() && !memory.jumpTarget) {
      return result;
    }

    // Continua guiando o salto em andamento até aterrissar
    if (!enemy.isGrounded() && memory.jumpTarget) {
      const target = memory.jumpTarget;
      const isClimbingJump = target.top < memory.jumpFromTop;
      const feetY = enemyBox.y + enemyBox.height;

      if (isClimbingJump && feetY > target.top + 4) {
        // Sobe fora da sombra inferior da plataforma, mas aproxima horizontalmente se estiver distante
        const safeLeft = (target.left ?? target.x) - (enemyBox.width / 2 + 4);
        const safeRight = (target.right ?? target.x) + (enemyBox.width / 2 + 4);
        if (enemyOrigin.x < safeLeft - 8) {
          result.moveDir = 1;
        } else if (enemyOrigin.x > safeRight + 8) {
          result.moveDir = -1;
        } else {
          result.moveDir = 0;
        }
      } else {
        const targetDx = target.x - enemyOrigin.x;
        result.moveDir = Math.abs(targetDx) <= 10 ? 0 : Math.sign(targetDx);
      }
      return result;
    }

    if (enemy.isGrounded() && memory.jumpTarget) {
      memory.jumpTarget = null;
    }

    // Navegação por plataformas e segmentos de chão (incluindo salto sobre buracos)
    const groundList = layout?.groundSegments?.length
      ? layout.groundSegments
      : layout?.ground
        ? [layout.ground]
        : [];
    const surfaces = layout ? [...groundList, ...(layout.platforms ?? [])] : [];
    const worldBounds = layout?.ground
      ? {
          left: layout.ground.x - layout.ground.width / 2,
          right: layout.ground.x + layout.ground.width / 2,
        }
      : { left: 0, right: this.screenWidth };
    const enemySurface = findReferenceSurface(
      enemyBox,
      surfaces,
      this.aiConfig.SURFACE_TOLERANCE_Y
    );
    const playerSurface = findReferenceSurface(
      playerBox,
      surfaces,
      this.aiConfig.SURFACE_TOLERANCE_Y
    );

    const enemyPhysics = {
      GRAVITY_Y: this.physics.GRAVITY_Y,
      PLAYER_MOVE_SPEED: state.moveSpeed,
      PLAYER_JUMP_VELOCITY: state.jumpVelocity,
    };

    let moveDir = absDx > 6 ? facingToPlayer : 0;

    if (enemySurface && playerSurface && enemySurface.id !== playerSurface.id) {
      const curBounds = getSurfaceBounds(enemySurface);
      const targetBounds = getSurfaceBounds(playerSurface);

      // Jogador está abaixo do inimigo: manter escolha firme de borda para evitar oscilação no centro
      if (targetBounds.top > curBounds.top + 8 && !enemySurface.isGround) {
        if (memory.dropSurfaceId !== enemySurface.id) {
          const leftDropX = curBounds.left - enemyBox.width * 0.7;
          const rightDropX = curBounds.right + enemyBox.width * 0.7;
          const canDropLeft = leftDropX > worldBounds.left + 16;
          const canDropRight = rightDropX < worldBounds.right - 16;

          let chosenDropX;
          if (playerOrigin.x < curBounds.left && canDropLeft) {
            chosenDropX = leftDropX;
          } else if (playerOrigin.x > curBounds.right && canDropRight) {
            chosenDropX = rightDropX;
          } else if (canDropLeft && canDropRight) {
            chosenDropX =
              Math.abs(enemyOrigin.x - leftDropX) <=
              Math.abs(enemyOrigin.x - rightDropX)
                ? leftDropX
                : rightDropX;
          } else if (canDropRight || canDropLeft) {
            chosenDropX = canDropRight ? rightDropX : leftDropX;
          } else {
            chosenDropX = enemyOrigin.x;
          }

          memory.dropSurfaceId =
            canDropLeft || canDropRight ? enemySurface.id : null;
          memory.dropTargetX = chosenDropX;
        }

        const dropDx = memory.dropTargetX - enemyOrigin.x;
        moveDir = Math.abs(dropDx) <= 2 ? 0 : Math.sign(dropDx);
      } else {
        memory.dropSurfaceId = null;

        // Recalcula rota BFS apenas em intervalos ou quando muda a superfície
        if (
          memory.decisionTimerMs <= 0 ||
          memory.cachedFromId !== enemySurface.id ||
          memory.cachedTargetId !== playerSurface.id
        ) {
          memory.decisionTimerMs = this.aiConfig.DECISION_INTERVAL_MS;
          memory.cachedFromId = enemySurface.id;
          memory.cachedTargetId = playerSurface.id;
          memory.cachedNextStep = findNextReachableStep(
            enemySurface,
            playerSurface,
            surfaces,
            enemyPhysics,
            this.platformConfig
          );
        }

        const nextStep = memory.cachedNextStep;
        if (nextStep && nextStep.id !== enemySurface.id) {
          const nextBounds = getSurfaceBounds(nextStep);
          const takeoffX = computeTakeoffPoint(
            enemySurface,
            nextStep,
            enemyOrigin.x,
            enemyBox.width,
            this.screenWidth,
            this.aiConfig,
            worldBounds
          );

          const distToTakeoff = takeoffX - enemyOrigin.x;
          const underShadow =
            nextBounds.top < curBounds.top &&
            enemyOrigin.x >= nextBounds.left - enemyBox.width / 2 &&
            enemyOrigin.x <= nextBounds.right + enemyBox.width / 2;

          if (!underShadow && Math.abs(distToTakeoff) <= 22) {
            // Na zona segura de decolagem: pular e travar alvo de salto
            moveDir =
              nextBounds.top < curBounds.top
                ? 0
                : nextStep.x >= enemyOrigin.x
                ? 1
                : -1;
            if (enemy.isGrounded() && memory.jumpCooldownMs <= 0) {
              result.jump = true;
              memory.jumpCooldownMs = this.aiConfig.JUMP_COOLDOWN_MS;
              memory.jumpTarget = {
                x: nextStep.x,
                top: nextBounds.top,
                left: nextBounds.left,
                right: nextBounds.right,
              };
              memory.jumpFromTop = curBounds.top;
            }
          } else {
            moveDir = distToTakeoff >= 0 ? 1 : -1;
          }
        }
      }
    } else {
      memory.dropSurfaceId = null;
      if (!enemy.isGrounded() && absDx > 6) {
        // No ar perseguindo horizontalmente
        moveDir = facingToPlayer;
      }
    }

    // Separação suave entre inimigos (limitada para nunca anular totalmente a perseguição)
    let separationForce = 0;
    const radius = this.aiConfig.SEPARATION_RADIUS_X;
    for (const other of activeEnemies) {
      if (!other || other.id === enemy.id || other.isDead?.()) continue;
      const otherOrigin = other.getCombatOrigin();
      if (Math.abs(otherOrigin.y - enemyOrigin.y) > enemyBox.height) continue;

      const diffX = enemyOrigin.x - otherOrigin.x;
      const dist = Math.abs(diffX);
      if (dist > 0 && dist < radius) {
        separationForce += ((radius - dist) / radius) * Math.sign(diffX);
      } else if (dist === 0) {
        separationForce += enemy.id > other.id ? 0.5 : -0.5;
      }
    }

    const clampedSeparation = Math.max(-0.6, Math.min(0.6, separationForce));
    const combinedDir =
      moveDir + clampedSeparation * this.aiConfig.SEPARATION_STRENGTH;
    result.moveDir =
      Math.abs(combinedDir) > 0.15 ? Math.max(-1, Math.min(1, combinedDir)) : 0;

    return result;
  }
}
