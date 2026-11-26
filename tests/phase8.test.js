import { describe, expect, it, vi } from 'vitest';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { SHOP_CONFIG } from '../src/constants/shops.js';
import { ATTACK_TYPES } from '../src/data/attacks.js';
import { getCharacterById } from '../src/data/characters.js';
import { GoldenCharacter } from '../src/entities/GoldenCharacter.js';
import { Player } from '../src/entities/Player.js';
import { PlayerState } from '../src/entities/PlayerState.js';
import { DifficultySystem } from '../src/systems/DifficultySystem.js';
import { GoldenEventScheduler } from '../src/systems/GoldenEventScheduler.js';
import { PlatformGenerator } from '../src/systems/PlatformGenerator.js';
import { ShopSystem } from '../src/systems/ShopSystem.js';
import { SpawnSystem } from '../src/systems/SpawnSystem.js';
import { UpgradeSystem } from '../src/systems/UpgradeSystem.js';

function createMockScene() {
  const listeners = {};
  return {
    listeners,
    events: {
      on: vi.fn((ev, fn) => {
        listeners[ev] = fn;
      }),
      off: vi.fn(),
    },
    add: {
      rectangle: vi.fn((x, y, width, height) => ({
        x,
        y,
        width,
        height,
        destroy: vi.fn(),
      })),
      graphics: vi.fn(({ x = 0, y = 0 } = {}) => {
        const g = {
          x,
          y,
          clear: vi.fn(),
          lineStyle: vi.fn(),
          fillStyle: vi.fn(),
          strokeCircle: vi.fn(),
          fillCircle: vi.fn(),
          lineBetween: vi.fn(),
          fillEllipse: vi.fn(),
          strokeEllipse: vi.fn(),
          setDepth: vi.fn(() => g),
          setPosition: vi.fn(function (nx, ny) {
            this.x = nx;
            this.y = ny;
          }),
          destroy: vi.fn(),
        };
        return g;
      }),
      text: vi.fn(() => {
        const t = {
          y: 0,
          setOrigin: vi.fn(() => t),
          setDepth: vi.fn(() => t),
          setPosition: vi.fn(function (x, y) {
            this.x = x;
            this.y = y;
            return t;
          }),
          destroy: vi.fn(),
        };
        return t;
      }),
    },
    physics: {
      add: {
        existing: vi.fn((gameObject) => {
          gameObject.body = {
            x: gameObject.x - gameObject.width / 2,
            y: gameObject.y - gameObject.height / 2,
            width: gameObject.width,
            height: gameObject.height,
            halfWidth: gameObject.width / 2,
            halfHeight: gameObject.height / 2,
            velocity: { x: 0, y: 0 },
            blocked: { down: true },
            touching: { down: true },
            setAllowGravity: vi.fn(),
            setCollideWorldBounds: vi.fn(),
            setSize: vi.fn(),
            setVelocityX: vi.fn(function (vx) {
              this.velocity.x = vx;
            }),
            setVelocityY: vi.fn(function (vy) {
              this.velocity.y = vy;
            }),
          };
        }),
      },
    },
  };
}

describe('Fase 8 — Lojas (Chiquinho Promos) e Coquinho Extra', () => {
  it('abre lojas oficiais exatamente aos 25, 50 e 75 inimigos, aplica 1 entre 3 upgrades e aumenta dificuldade', () => {
    const playerState = new PlayerState(getCharacterById('character_1'));
    const upgradeSystem = new UpgradeSystem({ seed: 'shop-seed-1' });
    const difficultySystem = new DifficultySystem();
    const platformGenerator = new PlatformGenerator({ width: 960, height: 540 });

    let regeneratedCount = 0;
    const layouts = [platformGenerator.generate('run-base')];

    const shopSystem = new ShopSystem({
      upgradeSystem,
      difficultySystem,
      onShopClosed: (summary) => {
        if (summary.shouldRegeneratePlatforms) {
          regeneratedCount += 1;
          layouts.push(
            platformGenerator.generate(`run-base-shop-${regeneratedCount}`)
          );
        }
      },
    });

    // Antes de 25 não abre
    shopSystem.checkOfficialMilestones(24);
    expect(shopSystem.isOpen()).toBe(false);

    // Aos 25 abre a 1ª loja oficial com 3 upgrades válidos
    shopSystem.checkOfficialMilestones(25);
    expect(shopSystem.isOpen()).toBe(true);
    expect(shopSystem.getActiveSession().isOfficial).toBe(true);
    expect(shopSystem.getActiveSession().options).toHaveLength(3);

    const res25 = shopSystem.selectOption(1, playerState);
    expect(res25.appliedUpgrade).not.toBeNull();
    expect(res25.shouldRegeneratePlatforms).toBe(true);
    expect(difficultySystem.officialShopVisits).toBe(1);
    expect(regeneratedCount).toBe(1);
    expect(upgradeSystem.getAcquiredUpgrades()).toHaveLength(1);

    // Chamar novamente com 25 não reabre o mesmo marco
    shopSystem.checkOfficialMilestones(25);
    expect(shopSystem.isOpen()).toBe(false);

    // Marcos 50 e 75
    shopSystem.checkOfficialMilestones(50);
    expect(shopSystem.isOpen()).toBe(true);
    shopSystem.selectOption(0, playerState);
    expect(difficultySystem.officialShopVisits).toBe(2);
    expect(regeneratedCount).toBe(2);

    shopSystem.checkOfficialMilestones(75);
    expect(shopSystem.isOpen()).toBe(true);
    shopSystem.selectOption(2, playerState);
    expect(difficultySystem.officialShopVisits).toBe(3);
    expect(regeneratedCount).toBe(3);
    expect(upgradeSystem.getAcquiredUpgrades()).toHaveLength(3);
    expect(layouts).toHaveLength(4);
  });

  it('agenda entre 1 e 3 aparições do Coquinho Extra com a primeira 100% garantida e probabilidades decrescentes', () => {
    let oneCount = 0;
    let twoCount = 0;
    let threeCount = 0;

    for (let seed = 1; seed <= 200; seed += 1) {
      const scheduler = new GoldenEventScheduler({ seed });
      const events = scheduler.getScheduledEvents();

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.length).toBeLessThanOrEqual(3);
      expect(events[0].slotIndex).toBe(0);
      expect(events[0].probability).toBe(1.0);

      if (events.length === 1) oneCount += 1;
      if (events.length === 2) twoCount += 1;
      if (events.length === 3) threeCount += 1;
    }

    // Distribuição coerente com probabilidades progressivamente menores (1.0 > 0.55 > 0.25)
    expect(oneCount + twoCount + threeCount).toBe(200);
    expect(threeCount).toBeLessThan(twoCount + oneCount);
  });

  it('aumenta deterministicamente a chance de aparições extras após adquirir um aliado', () => {
    let foundAdditionalAppearance = false;
    for (let seed = 1; seed <= 100; seed += 1) {
      const base = new GoldenEventScheduler({ seed });
      const boosted = new GoldenEventScheduler({ seed });
      const baseCount = base.getScheduledEvents().length;

      boosted.setProbabilityBonus(0.2);
      expect(boosted.getScheduledEvents()[0].probability).toBe(1);
      if (boosted.getScheduledEvents().length > baseCount) {
        foundAdditionalAppearance = true;
        break;
      }
    }

    expect(foundAdditionalAppearance).toBe(true);
  });

  it('Coquinho Extra não conta como inimigo comum, desaparece se sair da tela e abre loja especial sem subir dificuldade ao ser atingido', () => {
    const scene = createMockScene();
    const spawnSystem = new SpawnSystem({ seed: 10 });
    const upgradeSystem = new UpgradeSystem({ seed: 20 });
    const difficultySystem = new DifficultySystem();
    let platformsRegenerated = false;

    const shopSystem = new ShopSystem({
      upgradeSystem,
      difficultySystem,
      onShopClosed: (summary) => {
        if (summary.shouldRegeneratePlatforms) {
          platformsRegenerated = true;
        }
      },
    });

    // Caso 1: Coquinho atravessa toda a tela sem ser atingido -> sem recompensa
    let rewardedMiss = false;
    const missedCoquinho = new GoldenCharacter(scene, {
      id: 'coquinho_miss',
      direction: 1,
      screenWidth: 960,
      y: 472,
      onHitReward: () => {
        rewardedMiss = true;
      },
    });

    expect(missedCoquinho.state.countsAsCommonEnemy).toBe(false);
    for (let step = 0; step < 50 && !missedCoquinho.isDead(); step += 1) {
      missedCoquinho.update(200);
    }
    expect(missedCoquinho.expired).toBe(true);
    expect(rewardedMiss).toBe(false);
    expect(shopSystem.isOpen()).toBe(false);
    expect(spawnSystem.defeatedCount).toBe(0);

    const groundTop = 500;
    expect(SHOP_CONFIG.COQUINHO.DEFAULT_HEIGHT_ABOVE_GROUND).toBe(
      SHOP_CONFIG.COQUINHO.BODY_HEIGHT / 2
    );
    const groundedNoia = new GoldenCharacter(scene, {
      id: 'noia_grounded',
      screenWidth: 960,
      y: groundTop - SHOP_CONFIG.COQUINHO.DEFAULT_HEIGHT_ABOVE_GROUND,
    });
    expect(
      groundedNoia.getHurtbox().y + groundedNoia.getHurtbox().height
    ).toBe(groundTop);
    expect(scene.add.text).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      'NOIA',
      expect.objectContaining({ color: '#fef08a' })
    );
    groundedNoia.syncVisualToBody();
    expect(groundedNoia.nameLabel.setPosition).toHaveBeenCalled();
    groundedNoia.destroy();

    // Caso 2: Coquinho é atingido por golpe do jogador -> abre loja especial sem alterar dificuldade nem plataformas
    const player = new Player(scene, 200, 472, getCharacterById('character_1'));
    const hitCoquinho = new GoldenCharacter(scene, {
      id: 'coquinho_hit',
      direction: 1,
      screenWidth: 960,
      y: 472,
      onHitReward: () => {
        shopSystem.enqueueSpecialShop({ source: 'coquinho_extra' });
      },
    });
    // Posiciona Coquinho no alcance do golpe leve do jogador
    hitCoquinho.body.x = 220;
    hitCoquinho.body.y = 446;

    const combat = new CombatSystem();
    combat.requestAttack(ATTACK_TYPES.LIGHT, 100, player);
    combat.update(16, player, [hitCoquinho]);

    expect(hitCoquinho.rewarded).toBe(true);
    expect(shopSystem.isOpen()).toBe(true);
    expect(shopSystem.getActiveSession().isOfficial).toBe(false);
    expect(spawnSystem.defeatedCount).toBe(0);

    const summary = shopSystem.selectOption(0, player.state);
    expect(summary.appliedUpgrade).not.toBeNull();
    expect(summary.shouldRegeneratePlatforms).toBe(false);
    expect(platformsRegenerated).toBe(false);
    expect(difficultySystem.officialShopVisits).toBe(0);
    expect(shopSystem.specialVisitsCompleted).toBe(1);
  });

  it('processa sequencialmente loja especial e loja oficial simultâneas sem substituir nem perder recompensas', () => {
    const playerState = new PlayerState(getCharacterById('character_1'));
    const upgradeSystem = new UpgradeSystem({ seed: 'seq-seed' });
    const difficultySystem = new DifficultySystem();
    const openedTypes = [];

    const shopSystem = new ShopSystem({
      upgradeSystem,
      difficultySystem,
      onShopOpened: (session) => openedTypes.push(session.type),
    });

    // Evento especial e marco oficial de 25 ocorrem juntos
    shopSystem.enqueueSpecialShop({ source: 'coquinho_extra' });
    shopSystem.checkOfficialMilestones(25);

    expect(shopSystem.isOpen()).toBe(true);
    expect(shopSystem.getActiveSession().type).toBe('special');
    expect(shopSystem.hasPendingShops()).toBe(true);

    // Conclui a loja especial -> abre automaticamente a loja oficial na sequência!
    const firstClose = shopSystem.selectOption(0, playerState);
    expect(firstClose.closedSession.type).toBe('special');
    expect(firstClose.shouldRegeneratePlatforms).toBe(false);
    expect(difficultySystem.officialShopVisits).toBe(0);

    expect(shopSystem.isOpen()).toBe(true);
    expect(shopSystem.getActiveSession().type).toBe('official');

    // Conclui a loja oficial -> aplica dificuldade e sinaliza regeneração de plataformas
    const secondClose = shopSystem.selectOption(0, playerState);
    expect(secondClose.closedSession.type).toBe('official');
    expect(secondClose.shouldRegeneratePlatforms).toBe(true);
    expect(difficultySystem.officialShopVisits).toBe(1);
    expect(shopSystem.isOpen()).toBe(false);

    // Ambas as recompensas foram entregues sem perda
    expect(openedTypes).toEqual(['special', 'official']);
    expect(upgradeSystem.getAcquiredUpgrades()).toHaveLength(2);
  });
});
