import { GAMEPLAY } from '../constants/gameplay.js';
import { PHYSICS } from '../constants/physics.js';
import {
  HORIZONTAL_TRACK_CONFIG,
  PLATFORM_CONFIG,
  PLATFORM_TYPES,
} from '../constants/platforms.js';
import { SeededRandom } from '../utils/SeededRandom.js';
import { canJumpBetween, computeJumpEnvelope } from './PlatformGenerator.js';

/**
 * Sistema independente de geração e atualização contínua de cenário horizontal em chunks.
 *
 * Responsabilidades:
 * - Gerar segmentos de chão e buracos determinísticos por seed, garantindo salto possível.
 * - Distribuir plataformas procedurais das 3 categorias (`static`, `moving`, `crumbling`)
 *   respeitando distâncias horizontais/verticais e envelope real de pulo (`canJumpBetween`).
 * - Atualizar plataformas móveis (horizontal e vertical) e o ciclo de desintegração das
 *   plataformas `crumbling` após contato com o jogador.
 * - Descartar chunks antigos atrás da câmera para manter memória e colisões constantes O(1).
 */
export class HorizontalTrackSystem {
  constructor({
    seed = Date.now(),
    screenWidth = GAMEPLAY.SCREEN_WIDTH,
    screenHeight = GAMEPLAY.SCREEN_HEIGHT,
    physics = PHYSICS,
    platformConfig = PLATFORM_CONFIG,
    trackConfig = HORIZONTAL_TRACK_CONFIG,
    phaseId = 1,
    onPlatformShaking = null,
    onPlatformBroken = null,
    onPlatformRestored = null,
  } = {}) {
    this.baseSeed = String(seed);
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.physics = physics;
    this.platformConfig = platformConfig;
    this.trackConfig = trackConfig;
    this.currentPhaseId = Math.max(1, Math.floor(phaseId));
    this.onPlatformShaking = onPlatformShaking;
    this.onPlatformBroken = onPlatformBroken;
    this.onPlatformRestored = onPlatformRestored;

    this.chunks = new Map();
    this.nextChunkIndex = 0;
    this.elapsedMs = 0;
    this.safeGroundUntilX = trackConfig.INITIAL_SAFE_GROUND_WIDTH;
    this.platformSeq = 0;
    this.groundSeq = 0;
    this.holeSeq = 0;
  }

  get groundHeight() {
    return this.platformConfig.GROUND_HEIGHT;
  }

  get groundTopY() {
    return this.screenHeight - this.groundHeight;
  }

  get groundCenterY() {
    return this.screenHeight - this.groundHeight / 2;
  }

  /**
   * Garante chão contínuo (sem buracos) em `[fromX, fromX + length]` para aberturas de fase ou boss.
   * Se já houver buracos gerados nessa faixa ainda não percorrida, preenche-os com chão sólido.
   */
  ensureSafeGroundRange(fromX, length = this.trackConfig.PHASE_SAFE_GROUND_WIDTH) {
    const safeEnd = Math.max(this.safeGroundUntilX, fromX + length);
    this.safeGroundUntilX = safeEnd;

    for (const chunk of this.chunks.values()) {
      if (chunk.endX <= fromX || chunk.startX >= safeEnd) continue;
      const remainingHoles = chunk.holes.filter(
        (hole) => hole.right <= fromX || hole.left >= safeEnd
      );
      if (remainingHoles.length !== chunk.holes.length) {
        chunk.holes = remainingHoles;
        chunk.groundSegments = this._buildGroundSegmentsFromHoles(
          chunk.index,
          chunk.startX,
          chunk.endX,
          chunk.holes
        );
        chunk.dirty = true;
      }
    }
  }

  /** Reinicia a malha mantendo determinismo para uma nova seed (ex.: pós-loja oficial). */
  regenerateAround(playerX, seed = `${this.baseSeed}-regen`, safeLength = 760) {
    this.baseSeed = String(seed);
    this.chunks.clear();
    const startChunk = Math.max(
      0,
      Math.floor((playerX - this.screenWidth) / this.trackConfig.CHUNK_WIDTH)
    );
    this.nextChunkIndex = startChunk;
    this.safeGroundUntilX = Math.max(this.safeGroundUntilX, playerX + safeLength);
    this.ensureChunksAround(playerX, Math.max(0, playerX - 360));
  }

  /** Garante chunks gerados à frente do jogador e descarta chunks muito atrás da câmera. */
  ensureChunksAround(playerX = 0, cameraScrollX = 0) {
    const chunkW = this.trackConfig.CHUNK_WIDTH;
    const maxTargetX = playerX + this.trackConfig.GENERATE_AHEAD_PX;
    const minKeepX = cameraScrollX - this.trackConfig.PRUNE_BEHIND_PX;

    const addedChunks = [];
    while (this.nextChunkIndex * chunkW < maxTargetX) {
      const chunk = this._generateChunk(this.nextChunkIndex);
      this.chunks.set(chunk.index, chunk);
      addedChunks.push(chunk);
      this.nextChunkIndex += 1;
    }

    const removedChunks = [];
    for (const [idx, chunk] of this.chunks.entries()) {
      if (chunk.endX < minKeepX && this.chunks.size > 2) {
        this.chunks.delete(idx);
        removedChunks.push(chunk);
      }
    }

    return { addedChunks, removedChunks };
  }

  /** Atualiza a fase atual para liberar novas categorias de plataformas nos próximos chunks. */
  setPhase(phaseId = 1) {
    this.currentPhaseId = Math.max(1, Math.floor(phaseId));
  }

  _pickPlatformCategory(rng) {
    // Fase 1: apenas estáticas; Fase 2: estáticas + móveis; Fase 3+: todas (incluindo crumbling)
    if (this.currentPhaseId < 2) {
      return PLATFORM_TYPES.STATIC;
    }

    const weights = this.trackConfig.CATEGORY_WEIGHTS;
    const wStatic = weights.static ?? 0.46;
    const wMoving = weights.moving ?? 0.3;
    const wCrumbling = this.currentPhaseId >= 3 ? (weights.crumbling ?? 0.24) : 0;

    const total = wStatic + wMoving + wCrumbling;
    let roll = rng.next() * total;
    if ((roll -= wStatic) <= 0) return PLATFORM_TYPES.STATIC;
    if ((roll -= wMoving) <= 0) return PLATFORM_TYPES.MOVING;
    return PLATFORM_TYPES.CRUMBLING;
  }

  _buildGroundSegmentsFromHoles(chunkIndex, startX, endX, holes) {
    const sorted = [...holes].sort((a, b) => a.left - b.left);
    const segments = [];
    let cursor = startX;

    for (const hole of sorted) {
      const segW = hole.left - cursor;
      if (segW > 4) {
        segments.push({
          id: `ground_${chunkIndex}_${++this.groundSeq}`,
          x: cursor + segW / 2,
          y: this.groundCenterY,
          width: segW,
          height: this.groundHeight,
          left: cursor,
          right: hole.left,
          isGround: true,
        });
      }
      cursor = hole.right;
    }

    if (endX - cursor > 4) {
      const segW = endX - cursor;
      segments.push({
        id: `ground_${chunkIndex}_${++this.groundSeq}`,
        x: cursor + segW / 2,
        y: this.groundCenterY,
        width: segW,
        height: this.groundHeight,
        left: cursor,
        right: endX,
        isGround: true,
      });
    }

    return segments;
  }

  _generateHolesForChunk(chunkIndex, startX, endX, rng) {
    const holeCfg = this.trackConfig.HOLE;
    const usableStart = Math.max(
      startX + holeCfg.MIN_SOLID_SEGMENT_WIDTH * 0.5,
      this.safeGroundUntilX
    );
    const usableEnd = endX - holeCfg.MIN_SOLID_SEGMENT_WIDTH * 0.5;

    if (
      usableEnd - usableStart < holeCfg.MIN_WIDTH + 30 ||
      rng.next() > holeCfg.CHANCE_PER_CHUNK
    ) {
      return [];
    }

    const desiredCount = rng.int(1, holeCfg.MAX_HOLES_PER_CHUNK);
    const holes = [];

    for (let i = 0; i < desiredCount; i += 1) {
      for (let attempt = 0; attempt < 18; attempt += 1) {
        const wantLong =
          rng.next() < (holeCfg.LONG_HOLE_CHANCE ?? 0.48) &&
          usableEnd - usableStart >= (holeCfg.LONG_MIN_WIDTH ?? 220) + 40;
        const maxPossibleW = Math.floor(usableEnd - usableStart - 20);
        const width = wantLong
          ? rng.int(
              holeCfg.LONG_MIN_WIDTH ?? 220,
              Math.min(holeCfg.LONG_MAX_WIDTH ?? 460, maxPossibleW)
            )
          : rng.int(
              holeCfg.MIN_WIDTH,
              Math.min(holeCfg.MAX_WIDTH, maxPossibleW)
            );
        if (width < holeCfg.MIN_WIDTH) continue;

        const left = Math.round(rng.range(usableStart, usableEnd - width));
        const right = left + width;

        const tooClose = holes.some(
          (other) =>
            left < other.right + holeCfg.MIN_SOLID_SEGMENT_WIDTH &&
            right > other.left - holeCfg.MIN_SOLID_SEGMENT_WIDTH
        );
        if (tooClose) continue;

        const leftBank = {
          x: left - 60,
          y: this.groundCenterY,
          width: 120,
          height: this.groundHeight,
        };
        const rightBank = {
          x: right + 60,
          y: this.groundCenterY,
          width: 120,
          height: this.groundHeight,
        };
        const directlyJumpable = canJumpBetween(
          leftBank,
          rightBank,
          this.physics,
          this.platformConfig
        );

        holes.push({
          id: `hole_${chunkIndex}_${++this.holeSeq}`,
          left,
          right,
          x: left + width / 2,
          width,
          topY: this.groundTopY,
          isLong: !directlyJumpable,
        });
        break;
      }
    }

    return holes.sort((a, b) => a.left - b.left);
  }

  _overlapsPlatformEnvelope(candidate, existingList) {
    const cSpanX =
      candidate.width / 2 +
      (candidate.type === PLATFORM_TYPES.MOVING && candidate.axis === 'horizontal'
        ? candidate.amplitude
        : 0);
    const cSpanY =
      candidate.height / 2 +
      (candidate.type === PLATFORM_TYPES.MOVING && candidate.axis === 'vertical'
        ? candidate.amplitude
        : 0);

    for (const other of existingList) {
      const oSpanX =
        other.width / 2 +
        (other.type === PLATFORM_TYPES.MOVING && other.axis === 'horizontal'
          ? other.amplitude
          : 0);
      const oSpanY =
        other.height / 2 +
        (other.type === PLATFORM_TYPES.MOVING && other.axis === 'vertical'
          ? other.amplitude
          : 0);

      const dx = Math.abs(candidate.baseX - other.baseX);
      const dy = Math.abs(candidate.baseY - other.baseY);
      if (
        dx < cSpanX + oSpanX + this.platformConfig.MIN_HORIZONTAL_GAP &&
        dy < cSpanY + oSpanY + this.platformConfig.MIN_VERTICAL_GAP * 0.72
      ) {
        return true;
      }
    }
    return false;
  }

  _generateChunk(chunkIndex) {
    const chunkW = this.trackConfig.CHUNK_WIDTH;
    const startX = chunkIndex * chunkW;
    const endX = startX + chunkW;
    const rng = new SeededRandom(`${this.baseSeed}::chunk::${chunkIndex}`);

    const holes = this._generateHolesForChunk(chunkIndex, startX, endX, rng);
    const groundSegments = this._buildGroundSegmentsFromHoles(
      chunkIndex,
      startX,
      endX,
      holes
    );

    const prevChunk = this.chunks.get(chunkIndex - 1);
    const prevPlatforms = prevChunk
      ? prevChunk.platforms.filter((p) => p.baseX > startX - 280)
      : [];

    const platforms = [];
    const targetCount = rng.int(
      this.trackConfig.PLATFORMS_PER_CHUNK.MIN,
      this.trackConfig.PLATFORMS_PER_CHUNK.MAX
    );
    const { safeMaxJumpUp } = computeJumpEnvelope(
      this.physics,
      this.platformConfig
    );
    const minTopY = this.platformConfig.MIN_TOP_Y;
    const maxBottomY =
      this.groundTopY - this.platformConfig.MAX_BOTTOM_MARGIN_FROM_GROUND;

    // Para buracos longos, garante uma ponte alcançável de plataformas sobre todo o vão
    for (const hole of holes) {
      if (!hole.isLong) continue;
      const bridgeCount = Math.max(2, Math.ceil(hole.width / 155));
      const stepSpan = hole.width / (bridgeCount + 1);
      for (let b = 1; b <= bridgeCount; b += 1) {
        const platW = rng.int(116, 152);
        const platH = this.platformConfig.HEIGHT;
        const baseX = Math.round(hole.left + stepSpan * b);
        const stepUp = rng.range(
          this.platformConfig.MAX_BOTTOM_MARGIN_FROM_GROUND,
          Math.min(safeMaxJumpUp * 0.88, 120)
        );
        const baseY = Math.round(
          Math.max(
            minTopY + platH / 2,
            Math.min(maxBottomY - platH / 2, this.groundTopY - stepUp)
          )
        );
        const bridgeCategory = this._pickPlatformCategory(rng);
        platforms.push({
          id: `hplat_${chunkIndex}_${++this.platformSeq}`,
          chunkIndex,
          type:
            bridgeCategory === PLATFORM_TYPES.MOVING
              ? PLATFORM_TYPES.STATIC
              : bridgeCategory,
          axis: null,
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          prevX: baseX,
          prevY: baseY,
          deltaX: 0,
          deltaY: 0,
          vx: 0,
          vy: 0,
          width: platW,
          height: platH,
          amplitude: 0,
          speed: 0,
          phase: 0,
          state: 'intact',
          solid: true,
          timerMs: 0,
          shakeOffsetX: 0,
          shakeOffsetY: 0,
        });
      }
    }

    // Se houver buracos curtos, tenta posicionar também uma plataforma acessível próxima ao vão
    const holeBridgeTargets = holes.filter((h) => !h.isLong);

    let attempts = 0;
    while (platforms.length < targetCount && attempts < 140) {
      attempts += 1;

      const anchors = [
        ...groundSegments,
        ...prevPlatforms,
        ...platforms,
      ];
      if (anchors.length === 0) break;

      const bridgeHole = holeBridgeTargets[0] ?? null;
      const anchor = bridgeHole
        ? groundSegments.find((seg) => seg.right <= bridgeHole.left + 2) ??
          rng.pick(anchors)
        : rng.pick(anchors);

      const width = rng.int(
        this.platformConfig.MIN_WIDTH,
        this.platformConfig.MAX_WIDTH
      );
      const height = this.platformConfig.HEIGHT;
      const category =
        chunkIndex === 0 && platforms.length === 0
          ? PLATFORM_TYPES.STATIC
          : this._pickPlatformCategory(rng);

      const anchorTop = anchor.y - anchor.height / 2;
      const minStepUp = anchor.isGround
        ? this.platformConfig.MAX_BOTTOM_MARGIN_FROM_GROUND
        : Math.min(safeMaxJumpUp * 0.85, this.platformConfig.MIN_VERTICAL_GAP);
      const stepUp = rng.range(minStepUp, safeMaxJumpUp);
      const rawY = anchor.isGround
        ? anchorTop - stepUp + height / 2
        : rng.next() < 0.65
          ? anchorTop - stepUp + height / 2
          : Math.min(maxBottomY - height / 2, anchorTop + stepUp * 0.55);

      const baseY = Math.round(
        Math.max(
          minTopY + height / 2,
          Math.min(maxBottomY - height / 2, rawY)
        )
      );

      let rawX;
      if (bridgeHole) {
        rawX = bridgeHole.x + rng.range(-36, 36);
      } else {
        rawX = anchor.isGround
          ? rng.range(
              Math.max(startX + width / 2 + 24, anchor.left ?? startX),
              Math.min(endX - width / 2 - 24, anchor.right ?? endX)
            )
          : anchor.x + rng.range(-210, 230);
      }

      const baseX = Math.round(
        Math.max(
          startX + width / 2 + 20,
          Math.min(endX - width / 2 - 20, rawX)
        )
      );

      // Evita obstruir o ponto inicial de spawn do jogador no chunk 0
      if (
        chunkIndex === 0 &&
        Math.abs(baseX - 240) < 100 &&
        baseY > this.groundTopY - 120
      ) {
        continue;
      }

      let axis = null;
      let amplitude = 0;
      let speed = 0;
      let phase = 0;
      if (category === PLATFORM_TYPES.MOVING) {
        axis = rng.next() < 0.58 ? 'horizontal' : 'vertical';
        const movCfg = this.trackConfig.MOVING;
        if (axis === 'horizontal') {
          const maxRoomX = Math.min(
            baseX - (startX + width / 2 + 12),
            endX - width / 2 - 12 - baseX
          );
          amplitude = Math.round(
            Math.min(
              Math.max(0, maxRoomX),
              rng.range(
                movCfg.HORIZONTAL_AMPLITUDE_MIN,
                movCfg.HORIZONTAL_AMPLITUDE_MAX
              )
            )
          );
          if (amplitude < 24) {
            axis = 'vertical';
          }
        }
        if (axis === 'vertical') {
          const maxRoomY = Math.min(
            baseY - (minTopY + height / 2 + 8),
            maxBottomY - height / 2 - 4 - baseY
          );
          amplitude = Math.round(
            Math.min(
              Math.max(0, maxRoomY),
              rng.range(
                movCfg.VERTICAL_AMPLITUDE_MIN,
                movCfg.VERTICAL_AMPLITUDE_MAX
              )
            )
          );
        }
        speed = Number(
          rng
            .range(
              movCfg.SPEED_RAD_PER_SEC_MIN,
              movCfg.SPEED_RAD_PER_SEC_MAX
            )
            .toFixed(2)
        );
        phase = Number(rng.range(0, Math.PI * 2).toFixed(2));
      }

      const finalType =
        category === PLATFORM_TYPES.MOVING && amplitude < 18
          ? PLATFORM_TYPES.STATIC
          : category;

      const candidate = {
        id: `hplat_${chunkIndex}_${++this.platformSeq}`,
        chunkIndex,
        type: finalType,
        axis: finalType === PLATFORM_TYPES.MOVING ? axis : null,
        baseX,
        baseY,
        x: baseX,
        y: baseY,
        prevX: baseX,
        prevY: baseY,
        deltaX: 0,
        deltaY: 0,
        vx: 0,
        vy: 0,
        width,
        height,
        amplitude: finalType === PLATFORM_TYPES.MOVING ? amplitude : 0,
        speed: finalType === PLATFORM_TYPES.MOVING ? speed : 0,
        phase: finalType === PLATFORM_TYPES.MOVING ? phase : 0,
        state: 'intact',
        solid: true,
        timerMs: 0,
        shakeOffsetX: 0,
        shakeOffsetY: 0,
      };

      if (
        !this._overlapsPlatformEnvelope(candidate, [
          ...prevPlatforms,
          ...platforms,
        ]) &&
        canJumpBetween(anchor, candidate, this.physics, this.platformConfig)
      ) {
        platforms.push(candidate);
        if (bridgeHole) {
          holeBridgeTargets.shift();
        }
      }
    }

    return {
      index: chunkIndex,
      startX,
      endX,
      holes,
      groundSegments,
      platforms,
      dirty: false,
    };
  }

  /** Aciona manualmente o início da desintegração de uma plataforma `crumbling`. */
  triggerCrumble(platform) {
    if (
      !platform ||
      platform.type !== PLATFORM_TYPES.CRUMBLING ||
      platform.state !== 'intact'
    ) {
      return false;
    }
    platform.state = 'shaking';
    platform.timerMs = this.trackConfig.CRUMBLING.SHAKE_DURATION_MS;
    this.onPlatformShaking?.(platform);
    return true;
  }

  /**
   * Atualiza plataformas móveis e plataformas desintegráveis.
   * Detecta automaticamente o apoio do jogador sobre plataformas `crumbling` ou `moving`.
   */
  update(deltaMs = 16.67, { player = null } = {}) {
    if (!(deltaMs > 0)) return { riderDeltaX: 0, riderDeltaY: 0 };

    this.elapsedMs += deltaMs;
    const tSec = this.elapsedMs / 1000;
    const dtSec = deltaMs / 1000;

    const playerHurtbox =
      player && !player.isDead?.() ? player.getHurtbox?.() : null;
    const playerVy = player?.body?.velocity?.y ?? 0;
    const playerFootY = playerHurtbox
      ? playerHurtbox.y + playerHurtbox.height
      : null;

    let riderDeltaX = 0;
    let riderDeltaY = 0;

    for (const chunk of this.chunks.values()) {
      for (const plat of chunk.platforms) {
        plat.prevX = plat.x;
        plat.prevY = plat.y;
        plat.deltaX = 0;
        plat.deltaY = 0;

        if (plat.type === PLATFORM_TYPES.MOVING) {
          const offset = Math.sin(tSec * plat.speed + plat.phase) * plat.amplitude;
          const nextX =
            plat.axis === 'horizontal' ? plat.baseX + offset : plat.baseX;
          const nextY =
            plat.axis === 'vertical' ? plat.baseY + offset : plat.baseY;
          plat.deltaX = nextX - plat.x;
          plat.deltaY = nextY - plat.y;
          plat.x = nextX;
          plat.y = nextY;
          plat.vx = dtSec > 0 ? plat.deltaX / dtSec : 0;
          plat.vy = dtSec > 0 ? plat.deltaY / dtSec : 0;
        }

        if (plat.type === PLATFORM_TYPES.CRUMBLING) {
          if (plat.state === 'shaking') {
            plat.timerMs -= deltaMs;
            plat.shakeOffsetX = Math.sin(this.elapsedMs * 0.09) * 3.2;
            plat.shakeOffsetY = Math.cos(this.elapsedMs * 0.12) * 1.6;
            if (plat.timerMs <= 0) {
              plat.state = 'broken';
              plat.solid = false;
              plat.shakeOffsetX = 0;
              plat.shakeOffsetY = 0;
              plat.timerMs = this.trackConfig.CRUMBLING.RESPAWN_DELAY_MS;
              this.onPlatformBroken?.(plat);
            }
          } else if (plat.state === 'broken') {
            plat.timerMs -= deltaMs;
            if (plat.timerMs <= 0) {
              plat.state = 'intact';
              plat.solid = true;
              plat.timerMs = 0;
              this.onPlatformRestored?.(plat);
            }
          }
        }

        if (plat.solid && playerHurtbox && playerVy >= -15) {
          // Verifica se o jogador está apoiado sobre esta plataforma
          const platLeft = plat.x - plat.width / 2;
          const platRight = plat.x + plat.width / 2;
          const platTop = plat.y - plat.height / 2;
          const overlapsX =
            playerHurtbox.x + playerHurtbox.width > platLeft + 3 &&
            playerHurtbox.x < platRight - 3;
          const onTop = Math.abs(playerFootY - platTop) <= 10;

          if (overlapsX && onTop) {
            if (plat.type === PLATFORM_TYPES.MOVING) {
              riderDeltaX = plat.deltaX;
              riderDeltaY = plat.deltaY;
            } else if (
              plat.type === PLATFORM_TYPES.CRUMBLING &&
              plat.state === 'intact'
            ) {
              this.triggerCrumble(plat);
            }
          }
        }
      }
    }

    return { riderDeltaX, riderDeltaY };
  }

  /** Verifica se uma coordenada X cai dentro de um buraco ativo no chão. */
  findHoleAtX(x) {
    for (const chunk of this.chunks.values()) {
      if (x < chunk.startX - 4 || x > chunk.endX + 4) continue;
      for (const hole of chunk.holes) {
        if (x > hole.left && x < hole.right) {
          return hole;
        }
      }
    }
    return null;
  }

  /** Retorna um X seguro em chão sólido logo após um buraco (para impulsionar o ricochete). */
  findSafeGroundXAfter(x) {
    const hole = this.findHoleAtX(x);
    const clearance = this.physics.PIT_HAZARD?.SAFE_LANDING_CLEARANCE_X ?? 36;
    if (hole) {
      return hole.right + clearance;
    }
    return x + clearance;
  }

  /**
   * Retorna o descritor consolidado de layout compatível com `EnemyAI`, `BossAI` e renderizadores.
   */
  getActiveLayout() {
    const orderedChunks = [...this.chunks.values()].sort(
      (a, b) => a.index - b.index
    );
    const groundSegments = [];
    const holes = [];
    const solidPlatforms = [];
    const allPlatforms = [];

    for (const chunk of orderedChunks) {
      groundSegments.push(...chunk.groundSegments);
      holes.push(...chunk.holes);
      for (const plat of chunk.platforms) {
        allPlatforms.push(plat);
        if (plat.solid) {
          solidPlatforms.push(plat);
        }
      }
    }

    const minX = orderedChunks[0]?.startX ?? 0;
    const maxX =
      orderedChunks[orderedChunks.length - 1]?.endX ?? this.screenWidth;
    const spanW = Math.max(this.screenWidth, maxX - minX);

    return {
      seed: this.baseSeed,
      perspective: 'side_2d',
      ground: {
        id: 'ground',
        x: minX + spanW / 2,
        y: this.groundCenterY,
        width: spanW,
        height: this.groundHeight,
        isGround: true,
      },
      groundSegments,
      holes,
      platforms: solidPlatforms,
      allPlatforms,
    };
  }
}
