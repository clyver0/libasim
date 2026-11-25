import Phaser from 'phaser';
import { audioManager } from '../audio/AudioManager.js';
import { SOUND_KEYS, registerDefaultSoundBank } from '../audio/SoundBank.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { BOSS_CONFIG } from '../constants/boss.js';
import { PHYSICS } from '../constants/physics.js';
import { PLATFORM_CONFIG } from '../constants/platforms.js';
import { SHOP_CONFIG } from '../constants/shops.js';
import {
  DEFAULT_BOSS_DATA,
  DEFAULT_MINI_BOSS_DATA,
  scaleBossData,
} from '../data/boss.js';
import { DEFAULT_CHARACTER_ID, getCharacterById } from '../data/characters.js';
import { describeDrinkModifiers, getDrinkById } from '../data/drinks.js';
import { pickEnemyTypeForProgress } from '../data/enemies.js';
import { Boss } from '../entities/Boss.js';
import { Drink } from '../entities/Drink.js';
import { Enemy } from '../entities/Enemy.js';
import { GoldenCharacter } from '../entities/GoldenCharacter.js';
import { Player } from '../entities/Player.js';
import { BossAI } from '../systems/BossAI.js';
import { CharacterAppearanceSystem } from '../systems/CharacterAppearanceSystem.js';
import { DifficultySystem } from '../systems/DifficultySystem.js';
import { DrinkEffectManager } from '../systems/DrinkEffectManager.js';
import { DrinkSystem } from '../systems/DrinkSystem.js';
import { EnemyAI } from '../systems/EnemyAI.js';
import { GoldenEventScheduler } from '../systems/GoldenEventScheduler.js';
import { InputController } from '../systems/InputController.js';
import { PlatformGenerator } from '../systems/PlatformGenerator.js';
import { RunManager } from '../systems/RunManager.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import {
  createCyberNightBackdrop,
  drawCombatSlashEffect,
  renderArenaPlatforms,
} from '../ui/ArenaBackdrop.js';
import { ComboGuide } from '../ui/ComboGuide.js';
import { Hud } from '../ui/Hud.js';
import { ShopUI } from '../ui/ShopUI.js';
import { Tooltip } from '../ui/Tooltip.js';
import { setupCrispScene } from '../utils/display.js';

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  init(data = {}) {
    this.selectedCharacterId = data.characterId ?? DEFAULT_CHARACTER_ID;
    this.runSeed = data.seed ?? Date.now();
    this.baseRunSeed = this.runSeed;
  }

  create() {
    const { width, height } = setupCrispScene(this);
    this.logicalWidth = width;
    this.logicalHeight = height;
    this.runEnded = false;
    this.enemies = [];
    this.drinks = [];
    this.goldenCharacter = null;
    this.miniBoss = null;
    this.boss = null;
    this.activeBurstsCount = 0;

    registerDefaultSoundBank(audioManager);
    audioManager.playMusic(SOUND_KEYS.BGM_LOOP);
    createCyberNightBackdrop(this, width, height, `${this.baseRunSeed}-bg`);
    this.cameras.main.fadeIn?.(220, 9, 13, 22);

    // Gravidade vertical exclusiva da gameplay (mantendo config global em 0)
    this.physics.world.gravity.y = PHYSICS.GRAVITY_Y;
    this.physics.world.setBounds(0, 0, width, height);
    this.physics.world.resume?.();

    // Câmera fixa dentro da área visível
    this.cameras.main.setBounds(0, 0, width, height);

    // Geração procedural determinística de plataformas (física invisível + camada visual rica)
    this.platforms = this.physics.add.staticGroup();
    this.platformVisualGraphics = this.add.graphics().setDepth(-5);
    this.platformGenerator = new PlatformGenerator({ width, height });
    this.currentLayout = this.generatePlatforms(this.runSeed);

    // Instancia o personagem selecionado e sua física/colisão com o cenário
    const characterData = getCharacterById(this.selectedCharacterId);
    const spawnX = width / 2;
    const spawnY = height - 90;
    this.player = new Player(this, spawnX, spawnY, characterData);
    this.physics.add.collider(this.player.collider, this.platforms);

    // Sistemas da Fase 4: Dificuldade, Spawn, IA e grupo físico de inimigos
    this.difficultySystem = new DifficultySystem();
    this.spawnSystem = new SpawnSystem({
      screenWidth: width,
      seed: this.runSeed,
      onAllDefeated: (snapshot) => {
        this.events.emit('enemies:all-defeated', snapshot);
      },
    });
    this.enemyAI = new EnemyAI({
      physics: PHYSICS,
      platformConfig: PLATFORM_CONFIG,
      screenWidth: width,
    });
    this.enemyGroup = this.physics.add.group();
    this.physics.add.collider(this.enemyGroup, this.platforms);

    // Sistemas da Fase 5: Bebidas e Efeitos Temporários
    this.drinkSystem = new DrinkSystem({
      screenWidth: width,
      seed: `${this.runSeed}-drinks`,
    });
    this.drinkEffectManager = new DrinkEffectManager();
    this.drinkGroup = this.physics.add.group();
    this.physics.add.collider(this.drinkGroup, this.platforms);
    this.physics.add.overlap(
      this.player.collider,
      this.drinkGroup,
      (_playerCollider, drinkCollider) => {
        const drinkEntity = this.drinks.find(
          (item) => item.collider === drinkCollider
        );
        if (drinkEntity) {
          this._collectDrink(drinkEntity);
        }
      }
    );

    // Sistemas da Fase 6 e Fase 7: Upgrades e Aparência Visual
    this.appearanceSystem = new CharacterAppearanceSystem();
    this.upgradeSystem = new UpgradeSystem({
      seed: `${this.baseRunSeed}-upgrades`,
      onUpgradesChanged: (acquiredUpgrades) =>
        this._handleUpgradesChanged(acquiredUpgrades),
    });

    // Tooltip compartilhado entre HUD e Lojas (Fase 10)
    this.tooltip = new Tooltip(this);

    // Sistemas da Fase 8: Lojas (Chiquinho Promos e Coquinho Extra)
    this.goldenScheduler = new GoldenEventScheduler({
      seed: `${this.baseRunSeed}-coquinho`,
    });
    this.shopUI = new ShopUI(this, {
      tooltip: this.tooltip,
      onSelectOption: (optionIndex) =>
        this._handleShopOptionSelected(optionIndex),
    });
    this.shopSystem = new ShopSystem({
      upgradeSystem: this.upgradeSystem,
      difficultySystem: this.difficultySystem,
      onShopOpened: (session) => this._onShopOpened(session),
      onShopClosed: (summary) => this._onShopClosed(summary),
    });

    // Sistemas da Fase 9: RunManager e Boss Final
    this.runManager = new RunManager({
      characterId: characterData.id,
      characterName: characterData.name,
      seed: this.baseRunSeed,
      totalEnemyTarget: this.spawnSystem.totalTarget,
    });
    this.bossAI = new BossAI({
      physics: PHYSICS,
      platformConfig: PLATFORM_CONFIG,
      screenWidth: width,
    });
    this.bossGroup = this.physics.add.group();
    this.physics.add.collider(this.bossGroup, this.platforms);

    // Compatibilidade com evento explícito de visita oficial
    this._onOfficialShopVisit = (metadata = {}) => {
      this.notifyOfficialShopVisit(metadata);
    };
    this.events.on('shop:official-visit', this._onOfficialShopVisit);

    // Sistemas de entrada, combate e interface
    this.inputController = new InputController(this);
    this.combatSystem = new CombatSystem({
      onHit: (target, hitInfo) => {
        const origin = target.getCombatOrigin
          ? target.getCombatOrigin()
          : { x: target.x ?? 0, y: target.y ?? 0 };
        const isCombo = Boolean(hitInfo?.attack?.isCombo);
        this._spawnBurstEffect(
          origin.x,
          origin.y,
          isCombo ? 0xfacc15 : 0x38bdf8,
          isCombo ? 24 : 16
        );
        this.audio?.play(
          isCombo ? SOUND_KEYS.COMBO_HIT : SOUND_KEYS.ATTACK_LIGHT
        );
      },
    });
    this.hitboxGraphics = this.add.graphics().setDepth(50);
    this.hud = new Hud(
      this,
      this.player.state.getSnapshot(),
      this.spawnSystem.getSnapshot(),
      { tooltip: this.tooltip }
    );
    this.comboGuide = new ComboGuide(this);
    this.lastPlayerHp = this.player.state.currentHp;

    // Instrução discreta de controles e atalho de retorno ao menu (tecla ESC ou clique)
    this.escapeKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );
    this._onEscKeyDown = () => {
      if (this.comboGuide?.visible) {
        this.comboGuide.toggle();
        return;
      }
      this._returnToTitleScene();
    };
    this.input.keyboard.on?.('keydown-ESC', this._onEscKeyDown);

    this.controlsHintText = this.add
      .text(
        width - 16,
        16,
        this._getControlsHintLabel(),
        {
          fontSize: '11.5px',
          color: '#94a3b8',
        }
      )
      .setOrigin(1, 0)
      .setDepth(22)
      .setInteractive({ useHandCursor: true });
    this.controlsHintText.on('pointerup', () => this._returnToTitleScene());

    this.runEndText = this.add
      .text(width / 2, height / 2, '', {
        fontFamily: 'sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#f8fafc',
        backgroundColor: '#0f172a',
        padding: { x: 18, y: 12 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setVisible(false);

    this.events.once('shutdown', () => this._cleanupScene());

    // Garante referência pronta ao gerenciador de áudio (Howler.js)
    this.audio = audioManager;
  }

  _getControlsHintLabel() {
    const soundState = audioManager.muted ? 'Mudo' : 'Som';
    return `A/D: Mover | W/Espaço: Pular | J/K/L: Golpes | TAB: Combos | M: ${soundState} | ESC: Menu`;
  }

  _spawnBurstEffect(x, y, color = 0x38bdf8, radius = 18) {
    // Limite estrito de efeitos simultâneos para preservar performance
    if (this.activeBurstsCount >= 12 || !this.add?.circle || !this.tweens?.add) {
      return;
    }
    this.activeBurstsCount += 1;
    const ring = this.add
      .circle(x, y, 6, color, 0.25)
      .setStrokeStyle(2, color, 0.95)
      .setDepth(52);

    this.tweens.add({
      targets: ring,
      scale: radius / 6,
      alpha: 0,
      duration: 280,
      onComplete: () => {
        this.activeBurstsCount = Math.max(0, this.activeBurstsCount - 1);
        ring.destroy();
      },
    });
  }

  notifyOfficialShopVisit(metadata = {}) {
    return this.difficultySystem.registerOfficialShopVisit(metadata);
  }

  handleShopVisit(visitInfo = {}) {
    return this.difficultySystem.handleShopVisit(visitInfo);
  }

  clearPlatforms() {
    this.platforms.clear(true, true);
  }

  generatePlatforms(seed = Date.now()) {
    this.clearPlatforms();

    const layout = this.platformGenerator.generate(seed);
    this.runSeed = layout.seed;
    this.currentLayout = layout;

    // Chão principal
    this._addStaticPlatform(
      layout.ground.x,
      layout.ground.y,
      layout.ground.width,
      layout.ground.height,
      0x334155
    );

    // Plataformas procedurais
    for (const platform of layout.platforms) {
      this._addStaticPlatform(
        platform.x,
        platform.y,
        platform.width,
        platform.height,
        0x475569
      );
    }

    renderArenaPlatforms(
      this.platformVisualGraphics,
      layout,
      this.shopSystem?.officialVisitsCompleted ?? 0
    );

    return layout;
  }

  _addStaticPlatform(x, y, width, height) {
    // Corpo estático invisível dedicado à colisão; o visual detalhado fica em `platformVisualGraphics`
    const rect = this.add.rectangle(x, y, width, height, 0xffffff, 0);
    this.physics.add.existing(rect, true);
    this.platforms.add(rect);
    return rect;
  }

  _spawnEnemy(spawnRequest) {
    const baseData = pickEnemyTypeForProgress(
      this.spawnSystem?.defeatedCount ?? 0,
      this.spawnSystem?.rng ?? null
    );
    const scaledData = this.difficultySystem.scaleEnemyData(baseData);
    const enemy = new Enemy(this, spawnRequest.x, spawnRequest.y, scaledData, {
      id: spawnRequest.id,
      onDefeated: (defeatedEnemy) => this._handleEnemyDefeated(defeatedEnemy),
    });

    this.enemyGroup.add(enemy.collider);
    this.enemies.push(enemy);
    return enemy;
  }

  _handleEnemyDefeated(enemy) {
    if (!enemy) return;

    if (enemy.state?.countsAsCommonEnemy === false) {
      this.spawnSystem.unregisterActiveEnemy(enemy.id);
      return;
    }

    this.spawnSystem.markEnemyDefeated(enemy.id);
    const defeatedCount = this.spawnSystem.defeatedCount;

    this.hud.update(
      this.player.state.getSnapshot(),
      this.spawnSystem.getSnapshot(),
      this.drinkEffectManager?.getActiveEffects() ?? []
    );

    // Verifica agendamento do Coquinho Extra (sem alterar dificuldade nem contagem)
    const goldenTrigger = this.goldenScheduler?.checkTrigger(defeatedCount, {
      hasActiveGolden: Boolean(
        this.goldenCharacter && !this.goldenCharacter.isDead()
      ),
    });
    if (goldenTrigger) {
      this._spawnGoldenCharacter(goldenTrigger);
    }

    // Verifica marcos oficiais da loja do Chiquinho (25, 50, 75)
    this.shopSystem?.checkOfficialMilestones(defeatedCount);
  }

  _spawnGoldenCharacter(triggerInfo) {
    if (this.goldenCharacter && !this.goldenCharacter.isDead()) {
      return this.goldenCharacter;
    }

    const groundTop =
      (this.currentLayout?.ground?.y ?? this.logicalHeight - 20) -
      (this.currentLayout?.ground?.height ?? 40) / 2;
    const spawnY = groundTop - SHOP_CONFIG.COQUINHO.DEFAULT_HEIGHT_ABOVE_GROUND;

    this.goldenCharacter = new GoldenCharacter(this, {
      id: triggerInfo.id,
      direction: triggerInfo.direction,
      screenWidth: this.logicalWidth,
      y: spawnY,
      onHitReward: () => {
        const origin = this.goldenCharacter?.getCombatOrigin?.() ?? {
          x: this.logicalWidth / 2,
          y: spawnY,
        };
        this._spawnBurstEffect(origin.x, origin.y, 0xfacc15, 32);
        this.audio?.play(SOUND_KEYS.COQUINHO_HIT);
        this._clearGoldenCharacter();
        this.shopSystem?.enqueueSpecialShop({ source: 'coquinho_extra' });
      },
    });

    return this.goldenCharacter;
  }

  _clearGoldenCharacter() {
    if (!this.goldenCharacter) return;
    this.goldenCharacter.destroy();
    this.goldenCharacter = null;
  }

  _onShopOpened(session) {
    this.combatSystem?.cancel();
    this.player?.setCombatPose('idle');
    this.hitboxGraphics?.clear();
    this.tooltip?.hide();
    this.player?.body?.setVelocity?.(0, 0);
    this.physics.world?.pause?.();
    this.audio?.play(SOUND_KEYS.SHOP_OPEN);
    this.shopUI?.open(session);
  }

  _onShopClosed(summary) {
    if (summary?.shouldRegeneratePlatforms) {
      const nextPlatformSeed = `${this.baseRunSeed}-official-shop-${this.shopSystem.officialVisitsCompleted}`;
      this.generatePlatforms(nextPlatformSeed);
      this._repositionPlayerSafelyAfterRegen();
    }

    if (!summary?.hasNextQueued) {
      this.shopUI?.close();
      // Garante que o sistema de combate sempre retome em IDLE limpo após escolher upgrade
      this.combatSystem?.cancel();
      this.player?.setCombatPose('idle');
      if (!this.runEnded && !this.player?.isDead()) {
        this.physics.world?.resume?.();
      }
    }
  }

  _handleShopOptionSelected(optionIndex) {
    if (!this.shopSystem?.isOpen()) return;
    this.audio?.play(SOUND_KEYS.UPGRADE_PICK);
    const origin = this.player?.getCombatOrigin?.();
    if (origin) {
      this._spawnBurstEffect(origin.x, origin.y, 0x4ade80, 28);
    }
    this.shopSystem.selectOption(optionIndex, this.player.state);
  }

  _repositionPlayerSafelyAfterRegen() {
    if (!this.player?.body || !this.currentLayout) return;
    const body = this.player.body;
    for (const plat of this.currentLayout.platforms ?? []) {
      const platLeft = plat.x - plat.width / 2;
      const platRight = plat.x + plat.width / 2;
      const platTop = plat.y - plat.height / 2;
      const platBottom = plat.y + plat.height / 2;

      const overlapsX = body.x < platRight && body.x + body.width > platLeft;
      const overlapsY = body.y < platBottom && body.y + body.height > platTop;

      if (overlapsX && overlapsY) {
        body.y = platTop - body.height - 2;
        body.setVelocityY?.(0);
        this.player.syncVisualToBody();
      }
    }
  }

  removeEnemyWithoutDefeat(enemy) {
    if (!enemy) return;

    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }
    this.spawnSystem?.unregisterActiveEnemy(enemy.id);
    this.enemyGroup?.remove(enemy.collider, false, false);
    enemy.destroy();
    this.hud?.update(
      this.player.state.getSnapshot(),
      this.spawnSystem.getSnapshot()
    );
  }

  _pruneDeadEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (!enemy || enemy.destroyed || enemy.isDead()) {
        this.enemies.splice(i, 1);
        if (enemy) {
          if (!enemy.isDead()) {
            this.spawnSystem?.unregisterActiveEnemy(enemy.id);
          }
          this.enemyGroup?.remove(enemy.collider, false, false);
          enemy.destroy();
        }
      }
    }
  }

  _spawnDrink(spawnRequest) {
    const drink = new Drink(
      this,
      spawnRequest.x,
      spawnRequest.y,
      spawnRequest.drinkData,
      { id: spawnRequest.id }
    );
    this.drinkGroup.add(drink.collider);
    this.drinks.push(drink);
    return drink;
  }

  _collectDrink(drink) {
    const pos = drink.getPosition?.() ?? { x: 0, y: 0 };
    const drinkData = drink.drinkData;
    const color = drinkData?.color ?? 0x38bdf8;
    const colorHex = drinkData?.colorHex ?? '#38bdf8';
    const result = this.drinkSystem.collectDrink(
      drink,
      this.player.state,
      this.drinkEffectManager
    );
    if (!result) return null;

    this._spawnBurstEffect(pos.x, pos.y, color, 26);
    this._spawnDrinkPickupDetails(drinkData, result.healedAmount, colorHex);
    this.audio?.play(SOUND_KEYS.DRINK_PICKUP);
    this._removeDrink(drink);
    this.runManager?.registerDrinkCollected();
    this._syncPlayerDrinkFeedback();
    return result;
  }

  _spawnDrinkPickupDetails(drinkData, healedAmount = 0, colorHex = '#38bdf8') {
    if (!this.add?.text || !drinkData) return;
    const origin = this.player?.getCombatOrigin?.() ?? { x: 480, y: 300 };
    const summary = describeDrinkModifiers(drinkData.modifiers, {
      healedAmount,
    });
    const label = summary
      ? `🍹 ${drinkData.name}!\n${summary}`
      : `🍹 ${drinkData.name}!`;

    const popup = this.add
      .text(origin.x, origin.y - 44, label, {
        fontSize: '13px',
        fontStyle: 'bold',
        color: colorHex,
        stroke: '#090d16',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(75);

    if (this.tweens?.add) {
      this.tweens.add({
        targets: popup,
        y: popup.y - 38,
        alpha: 0,
        duration: 1550,
        onComplete: () => popup.destroy(),
      });
    } else {
      popup.destroy();
    }
  }

  _removeDrink(drink) {
    if (!drink) return;
    const index = this.drinks.indexOf(drink);
    if (index !== -1) {
      this.drinks.splice(index, 1);
    }
    this.drinkGroup?.remove(drink.collider, false, false);
    drink.destroy();
  }

  _clearAllDrinks() {
    for (const drink of [...this.drinks]) {
      this.drinkGroup?.remove(drink.collider, false, false);
      drink.destroy();
    }
    this.drinks = [];
  }

  _handleUpgradesChanged(acquiredUpgrades = []) {
    const appearanceState =
      this.appearanceSystem?.setUpgrades(acquiredUpgrades) ?? null;
    this.player?.syncBodyScale();
    this.player?.setAppearanceState(appearanceState);
    if (this.player && this.hud && this.spawnSystem) {
      this.lastPlayerHp = this.player.state.currentHp;
      this.hud.update(
        this.player.state.getSnapshot(),
        this.spawnSystem.getSnapshot(),
        this.drinkEffectManager?.getActiveEffects() ?? [],
        {
          acquiredUpgrades,
          bossSnapshot: this.boss ? this.boss.state.getSnapshot() : null,
        }
      );
    }
  }

  _syncPlayerDrinkFeedback() {
    const activeEffects = this.drinkEffectManager.getActiveEffects();
    const latestColor =
      activeEffects.length > 0
        ? activeEffects[activeEffects.length - 1].color
        : null;
    this.player.setDrinkAuraColor(latestColor);
    this.lastPlayerHp = this.player.state.currentHp;
    this.hud.update(
      this.player.state.getSnapshot(),
      this.spawnSystem.getSnapshot(),
      activeEffects,
      {
        bossSnapshot: this.boss ? this.boss.state.getSnapshot() : null,
      }
    );
  }

  _syncRunManagerProgress() {
    this.runManager?.syncProgress({
      defeatedEnemies: this.spawnSystem?.defeatedCount ?? 0,
      officialShopsVisited: this.shopSystem?.officialVisitsCompleted ?? 0,
      specialShopsVisited: this.shopSystem?.specialVisitsCompleted ?? 0,
      acquiredUpgrades: this.upgradeSystem?.getAcquiredUpgrades() ?? [],
    });
  }

  _getActiveBossSnapshot() {
    if (this.boss && !this.boss.isDead()) {
      return this.boss.state.getSnapshot();
    }
    if (this.miniBoss && !this.miniBoss.isDead()) {
      return this.miniBoss.state.getSnapshot();
    }
    return null;
  }

  _spawnMiniBoss() {
    if (this.miniBoss || this.runManager?.miniBossSpawned) {
      return this.miniBoss;
    }

    const scaledMiniBoss = scaleBossData(DEFAULT_MINI_BOSS_DATA, {
      officialShopVisits: this.difficultySystem.officialShopVisits,
    });
    const spawnX = Math.round(this.logicalWidth * 0.7);
    const spawnY = BOSS_CONFIG.SPAWN_Y;

    // Pausa novos spawns comuns durante o duelo contra o Mini-Chefão
    this.spawnSystem?.stop();

    this.miniBoss = new Boss(this, spawnX, spawnY, scaledMiniBoss, {
      id: 'mini_boss_50',
      onPhaseChanged: (phase) => {
        this._showBannerText(
          `${scaledMiniBoss.name} — FASE ${phase}!`,
          '#fb923c'
        );
      },
      onDefeated: () => this._handleMiniBossDefeated(),
    });

    this.bossGroup?.add(this.miniBoss.collider);
    this.runManager?.markMiniBossSpawned();
    this.audio?.play(SOUND_KEYS.BOSS_SPAWN);
    this.hud?.updateBossStatus(this.miniBoss.state.getSnapshot());
    this._showBannerText(
      `⚠ MINI-CHEFÃO (50 MORTOS): ${scaledMiniBoss.name.toUpperCase()}!`,
      '#fb923c'
    );
    return this.miniBoss;
  }

  _handleMiniBossDefeated() {
    if (!this.miniBoss) return;
    const origin = this.miniBoss.getCombatOrigin();
    this._spawnBurstEffect(origin.x, origin.y, 0xf97316, 42);

    this.bossGroup?.remove?.(this.miniBoss.collider, false, false);
    this.miniBoss.destroy();
    this.miniBoss = null;

    this.runManager?.markMiniBossDefeated();
    this.hud?.updateBossStatus(null);

    // Solta uma bebida rara garantida como recompensa do Mini-Chefão!
    const rewardDrink = getDrinkById('whisky_energetico') ?? getDrinkById('chevette');
    if (rewardDrink) {
      this._spawnDrink({
        id: `miniboss_reward_${Date.now()}`,
        x: origin.x,
        y: Math.max(40, origin.y - 20),
        drinkData: rewardDrink,
      });
    }

    this._showBannerText('MINI-CHEFÃO DERROTADO! RECOMPENSA RARA!', '#4ade80');

    if (!this.runEnded && !this.spawnSystem?.isCompleted()) {
      this.spawnSystem?.resume();
    }
  }

  _spawnBoss() {
    if (this.boss || this.runManager?.bossSpawned) {
      return this.boss;
    }

    const scaledBossData = scaleBossData(DEFAULT_BOSS_DATA, {
      officialShopVisits: this.difficultySystem.officialShopVisits,
    });
    const spawnX = Math.round(this.logicalWidth * BOSS_CONFIG.SPAWN_X_RATIO);
    const spawnY = BOSS_CONFIG.SPAWN_Y;

    this.boss = new Boss(this, spawnX, spawnY, scaledBossData, {
      id: 'boss_final',
      onPhaseChanged: (phase) => {
        this.runManager?.setBossPhase(phase);
        this._showBannerText(`${scaledBossData.name} — FASE ${phase}!`, '#c084fc');
      },
      onDefeated: () => this._handleBossDefeated(),
    });

    this.bossGroup?.add(this.boss.collider);
    this.runManager?.markBossSpawned(1);
    this.audio?.play(SOUND_KEYS.BOSS_SPAWN);
    this.hud?.updateBossStatus(this.boss.state.getSnapshot());
    this._showBannerText(`BOSS FINAL: ${scaledBossData.name.toUpperCase()}!`, '#f87171');
    return this.boss;
  }

  _showBannerText(message, color = '#facc15') {
    if (!this.add?.text) return;
    const banner = this.add
      .text(this.logicalWidth / 2, 118, message, {
        fontSize: '20px',
        fontStyle: 'bold',
        color,
        stroke: '#090d16',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(80);

    if (this.tweens?.add) {
      this.tweens.add({
        targets: banner,
        y: banner.y - 24,
        alpha: 0,
        duration: 1500,
        onComplete: () => banner.destroy(),
      });
    } else {
      banner.destroy();
    }
  }

  _handleBossDefeated() {
    if (this.runEnded) return;
    this.runEnded = true;
    this._syncRunManagerProgress();
    this.runManager?.markVictory();

    this.spawnSystem?.stop();
    this.drinkSystem?.stop();
    this.drinkEffectManager?.clear(this.player?.state);
    this._clearAllDrinks();
    this._clearGoldenCharacter();
    this.combatSystem?.cancel();
    this.player?.setDrinkAuraColor(null);
    this.player?.body?.setVelocity?.(0, 0);

    const summary = this.runManager?.getSummary() ?? {};
    this.scene.start('VictoryScene', { summary });
  }

  _endRunOnPlayerDeath() {
    if (this.runEnded) return;
    this.runEnded = true;
    this._syncRunManagerProgress();
    this.runManager?.markDefeat();

    this.spawnSystem.stop();
    this.drinkSystem?.stop();
    this.drinkEffectManager?.clear(this.player.state);
    this._clearAllDrinks();
    this._clearGoldenCharacter();
    this.shopUI?.close();
    this.shopSystem?.reset();
    this.combatSystem.cancel();
    this.player.setDrinkAuraColor(null);
    this.player.setCombatPose('idle');
    this.hitboxGraphics.clear();
    this.player.body?.setVelocity?.(0, 0);

    for (const enemy of this.enemies) {
      enemy.stopCombat();
      enemy.body?.setVelocity?.(0, 0);
    }
    this.miniBoss?.stopCombat();
    this.boss?.stopCombat();

    const summary = this.runManager?.getSummary() ?? {};
    this.scene.start('GameOverScene', { summary });
  }

  _returnToTitleScene() {
    if (this.runEnded) return;
    this.runEnded = true;
    this.spawnSystem?.stop();
    this.drinkSystem?.stop();
    this.combatSystem?.cancel();
    this.shopUI?.close();
    this.tooltip?.hide();
    // Garante que o mundo físico nunca permaneça pausado ao sair da cena
    this.physics?.world?.resume?.();
    this.scene.start('TitleScene');
  }

  _cleanupScene() {
    const safeRun = (fn) => {
      try {
        fn();
      } catch {
        // Protege o SceneManager contra objetos já descartados durante o shutdown do Phaser
      }
    };

    safeRun(() => {
      if (this._onOfficialShopVisit) {
        this.events.off('shop:official-visit', this._onOfficialShopVisit);
      }
      if (this._onEscKeyDown) {
        this.input?.keyboard?.off?.('keydown-ESC', this._onEscKeyDown);
      }
    });
    safeRun(() => this.drinkSystem?.stop());
    safeRun(() => this.drinkEffectManager?.clear(this.player?.state));
    safeRun(() => {
      for (const drink of [...this.drinks]) {
        drink?.destroy?.();
      }
      this.drinks = [];
    });
    safeRun(() => this._clearGoldenCharacter());
    safeRun(() => {
      if (this.miniBoss) {
        this.miniBoss.destroy();
        this.miniBoss = null;
      }
      if (this.boss) {
        this.boss.destroy();
        this.boss = null;
      }
    });
    safeRun(() => this.shopUI?.destroy());
    safeRun(() => this.shopSystem?.reset());
    safeRun(() => this.tooltip?.destroy());
    safeRun(() => {
      for (const enemy of [...this.enemies]) {
        this.spawnSystem?.unregisterActiveEnemy(enemy.id);
        enemy?.destroy?.();
      }
      this.enemies = [];
    });
    safeRun(() => this.player?.destroy());
    safeRun(() => this.hud?.destroy());
    safeRun(() => this.comboGuide?.destroy());
    safeRun(() => this.platformVisualGraphics?.destroy());
  }

  update(time, delta = 16.67) {
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      if (this.comboGuide?.visible) {
        this.comboGuide.toggle();
        return;
      }
      this._returnToTitleScene();
      return;
    }

    if (this.inputController.isActionJustPressed('MUTE_AUDIO')) {
      audioManager.toggleMute();
      this.controlsHintText?.setText(this._getControlsHintLabel());
    }

    if (this.runEnded) {
      return;
    }

    if (this.player.isDead()) {
      this._endRunOnPlayerDeath();
      return;
    }

    // Enquanto uma loja estiver aberta, a gameplay permanece pausada
    if (this.shopSystem?.isOpen()) {
      this.shopUI?.handleInput(this.inputController);
      return;
    }

    this.runManager?.updateTime(delta);
    this._syncRunManagerProgress();

    const intent = this.inputController.readMovementIntent();
    this.player.update(intent, delta);

    const combatIntent = this.inputController.readCombatIntent();
    if (combatIntent.toggleComboGuide) {
      this.comboGuide.toggle();
    }
    if (combatIntent.attackType) {
      this.combatSystem.requestAttack(
        combatIntent.attackType,
        time,
        this.player
      );
    }

    // Spawn de novos inimigos na região superior
    const playerOrigin = this.player.getCombatOrigin();
    const spawnRequest = this.spawnSystem.update(delta, {
      playerX: playerOrigin.x,
      activeEnemies: this.enemies,
      playerDead: this.player.isDead(),
    });
    if (spawnRequest) {
      this._spawnEnemy(spawnRequest);
    }

    // Spawn, atração, expiração e atualização de bebidas (Fase 5 + modificadores Fase 6)
    const gameplayMods = this.player.state.gameplayModifiers;
    const drinkSpawnRequest = this.drinkSystem.update(delta, {
      activeDrinks: this.drinks,
      playerDead: this.player.isDead(),
      rarityBonus: gameplayMods.drinkRarityBonus,
    });
    if (drinkSpawnRequest) {
      this._spawnDrink(drinkSpawnRequest);
    }

    for (let i = this.drinks.length - 1; i >= 0; i -= 1) {
      const drink = this.drinks[i];
      if (!drink || drink.destroyed || drink.collected) {
        this.drinks.splice(i, 1);
        continue;
      }

      const attraction = this.drinkSystem.computeAttractionVelocity(
        drink.getPosition(),
        playerOrigin,
        { extraRadius: gameplayMods.drinkMagnetBonus }
      );
      if (attraction.attracted) {
        drink.setAttractionVelocity(attraction.vx, attraction.vy);
      } else {
        drink.resetFallVelocity();
      }

      const expiredOnGround = drink.update(delta, this.logicalHeight);
      if (expiredOnGround) {
        this._removeDrink(drink);
      }
    }

    const hadActiveDrinkEffects = this.drinkEffectManager.hasActiveEffects();
    const expiredDrinkEffects = this.drinkEffectManager.update(
      delta,
      this.player.state
    );
    if (expiredDrinkEffects.length > 0 || hadActiveDrinkEffects) {
      this._syncPlayerDrinkFeedback();
    }

    // Ataques do jogador contra inimigos vivos, Mini-Chefão, Boss Final e Coquinho Extra
    const combatTargets = [...this.enemies];
    if (this.goldenCharacter && !this.goldenCharacter.isDead()) {
      combatTargets.push(this.goldenCharacter);
    }
    if (this.miniBoss && !this.miniBoss.isDead()) {
      combatTargets.push(this.miniBoss);
    }
    if (this.boss && !this.boss.isDead()) {
      combatTargets.push(this.boss);
    }
    this.combatSystem.update(delta, this.player, combatTargets);
    this._pruneDeadEnemies();

    if (this.runEnded) {
      return;
    }

    if (this.goldenCharacter) {
      const goldenFinished = this.goldenCharacter.update(delta);
      if (goldenFinished) {
        this._clearGoldenCharacter();
      }
    }

    if (this.shopSystem?.isOpen()) {
      return;
    }

    // Spawna o Mini-Chefão ao atingir 50 inimigos derrotados (após fechar eventual loja aberta)
    if (
      this.spawnSystem.defeatedCount >= BOSS_CONFIG.MINI_BOSS_MILESTONE &&
      !this.miniBoss &&
      !this.runManager?.miniBossSpawned &&
      !this.spawnSystem.isCompleted()
    ) {
      this._spawnMiniBoss();
    }

    // Spawna o Boss Final após os 100 inimigos comuns serem derrotados e sem Mini-Chefão pendente
    if (
      this.spawnSystem.isCompleted() &&
      this.enemies.length === 0 &&
      !this.miniBoss &&
      !this.boss &&
      !this.runManager?.bossSpawned
    ) {
      this._spawnBoss();
    }

    const activeCombatAnim =
      this.combatSystem.isAttacking() || this.combatSystem.isRecovering();
    this.player.setCombatPose(
      activeCombatAnim
        ? this.combatSystem.activeAttack?.pose ?? 'idle'
        : 'idle',
      this.combatSystem.getAttackMotionProgress()
    );

    // Atualização de IA e ataques dos inimigos comuns
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (!enemy || enemy.isDead() || enemy.destroyed) continue;

      const aiIntent = this.enemyAI.decide(
        enemy,
        this.player,
        this.currentLayout,
        this.enemies,
        delta
      );
      enemy.update(delta, aiIntent, this.player);
      if (this.player.isDead()) {
        break;
      }
    }

    // Atualização de IA e ataques do Mini-Chefão (quando presente)
    if (this.miniBoss && !this.miniBoss.isDead() && !this.player.isDead()) {
      const miniIntent = this.bossAI.decide(
        this.miniBoss,
        this.player,
        this.currentLayout,
        delta
      );
      this.miniBoss.update(delta, miniIntent, this.player);
      this.hud.updateBossStatus(this.miniBoss.state.getSnapshot());
    }

    // Atualização de IA e ataques do Boss Final
    if (this.boss && !this.boss.isDead() && !this.player.isDead()) {
      const bossIntent = this.bossAI.decide(
        this.boss,
        this.player,
        this.currentLayout,
        delta
      );
      this.boss.update(delta, bossIntent, this.player);
      this.hud.updateBossStatus(this.boss.state.getSnapshot());
    }

    // Verifica dano recebido ou morte do jogador após ataques inimigos/boss neste frame
    if (this.player.state.currentHp !== this.lastPlayerHp) {
      if (this.player.state.currentHp < this.lastPlayerHp) {
        this.audio?.play(SOUND_KEYS.PLAYER_HURT);
      }
      this.lastPlayerHp = this.player.state.currentHp;
      this.hud.update(
        this.player.state.getSnapshot(),
        this.spawnSystem.getSnapshot(),
        this.drinkEffectManager?.getActiveEffects() ?? [],
        {
          bossSnapshot: this._getActiveBossSnapshot(),
        }
      );
    }

    if (this.player.isDead()) {
      this._endRunOnPlayerDeath();
      return;
    }

    // Efeitos estilizados de corte/impacto para ataques ativos (sem caixas retangulares de debug)
    this.hitboxGraphics.clear();
    if (this.combatSystem.currentHitboxBounds) {
      const hb = this.combatSystem.currentHitboxBounds;
      const activeAtk = this.combatSystem.activeAttack;
      const color = activeAtk?.color ?? 0x38bdf8;
      const isHeavyOrCombo = Boolean(
        activeAtk?.isCombo ||
          activeAtk?.type === 'HEAVY' ||
          activeAtk?.type === 'SPECIAL'
      );
      drawCombatSlashEffect(
        this.hitboxGraphics,
        hb,
        color,
        this.player.facing,
        isHeavyOrCombo
      );
    }

    for (const enemy of this.enemies) {
      if (enemy.currentHitboxBounds) {
        drawCombatSlashEffect(
          this.hitboxGraphics,
          enemy.currentHitboxBounds,
          0xf43f5e,
          enemy.facing,
          false
        );
      }
    }

    const activeBoss = this.boss ?? this.miniBoss;
    if (activeBoss?.currentHitboxBounds) {
      const bossHitColor =
        activeBoss.state.phase >= 2
          ? activeBoss.state.colorPhase2
          : activeBoss.state.colorPhase1;
      drawCombatSlashEffect(
        this.hitboxGraphics,
        activeBoss.currentHitboxBounds,
        bossHitColor,
        activeBoss.facing,
        true
      );
    }
  }
}
