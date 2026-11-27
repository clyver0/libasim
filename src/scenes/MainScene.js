import Phaser from 'phaser';
import { audioManager } from '../audio/AudioManager.js';
import { MusicDirector } from '../audio/MusicDirector.js';
import { SOUND_KEYS, registerDefaultSoundBank } from '../audio/SoundBank.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { BOSS_CONFIG } from '../constants/boss.js';
import {
  AUDIO_CONFIG,
  CINEMATIC_CONFIG,
  PHASE_OPENING_CONFIG,
} from '../constants/expansion.js';
import { PHYSICS } from '../constants/physics.js';
import {
  HORIZONTAL_TRACK_CONFIG,
  PLATFORM_CONFIG,
  PLATFORM_TYPES,
} from '../constants/platforms.js';
import { SHOP_CONFIG } from '../constants/shops.js';
import { TYPOGRAPHY } from '../constants/typography.js';
import {
  DEFAULT_BOSS_DATA,
  DEFAULT_MINI_BOSS_DATA,
  scaleBossData,
} from '../data/boss.js';
import { CHARACTERS, DEFAULT_CHARACTER_ID, getCharacterById } from '../data/characters.js';
import {
  DRINKS,
  describeDrinkModifiers,
  getDrinkById,
} from '../data/drinks.js';
import { pickEnemyTypeForProgress } from '../data/enemies.js';
import { Boss } from '../entities/Boss.js';
import { Drink } from '../entities/Drink.js';
import { Enemy } from '../entities/Enemy.js';
import { GoldenCharacter } from '../entities/GoldenCharacter.js';
import { Player } from '../entities/Player.js';
import { AbilityRuntime } from '../systems/AbilityRuntime.js';
import { AntManager } from '../systems/AntManager.js';
import { BossAI } from '../systems/BossAI.js';
import { CharacterAppearanceSystem } from '../systems/CharacterAppearanceSystem.js';
import {
  DevToolsController,
  isDevEnvironment,
} from '../systems/DevToolsController.js';
import { DifficultySystem } from '../systems/DifficultySystem.js';
import { DrinkEffectManager } from '../systems/DrinkEffectManager.js';
import { DrinkSystem } from '../systems/DrinkSystem.js';
import { computeDrunkIntensity } from '../systems/DrunkIntensity.js';
import { EnemyAI } from '../systems/EnemyAI.js';
import { GoldenEventScheduler } from '../systems/GoldenEventScheduler.js';
import { HorizontalTrackSystem } from '../systems/HorizontalTrackSystem.js';
import { InputController } from '../systems/InputController.js';
import { KeySequenceDetector } from '../systems/KeySequenceDetector.js';
import { PhaseOpeningSystem } from '../systems/PhaseOpeningSystem.js';
import { PhaseSystem } from '../systems/PhaseSystem.js';
import { configureOneWayPlatform } from '../systems/PlatformCollision.js';
import { PlatformGenerator } from '../systems/PlatformGenerator.js';
import { RunManager } from '../systems/RunManager.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { AbilityHud } from '../ui/AbilityHud.js';
import {
  ParallaxBackdrop,
  drawCombatSlashEffect,
  renderArenaPlatforms,
} from '../ui/ArenaBackdrop.js';
import { ComboGuide } from '../ui/ComboGuide.js';
import { DrunkEffect } from '../ui/DrunkEffect.js';
import { EffectsManager } from '../ui/EffectsManager.js';
import { Hud } from '../ui/Hud.js';
import { ShopUI } from '../ui/ShopUI.js';
import { Tooltip } from '../ui/Tooltip.js';
import { syncUiCameraObjects } from '../ui/UiCameraLayer.js';
import { setupCrispScene } from '../utils/display.js';

const ASSET_BASE = (import.meta.env?.BASE_URL ?? './').replace(/\/?$/, '/');

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    for (const character of CHARACTERS) {
      if (character.portraitKey && character.portraitSrc) {
        this.load.image(character.portraitKey, character.portraitSrc);
      }
    }
    for (const drink of DRINKS) {
      if (drink.spriteKey && drink.spriteFile) {
        this.load.image(
          drink.spriteKey,
          `${ASSET_BASE}drinks/${drink.spriteFile}`
        );
      }
    }
    this.load.image(
      'shop_chiquinho_promos',
      `${ASSET_BASE}backgrounds/chiquinho-promos-shop.png`
    );
    this.load.image(
      'shop_noia_background',
      `${ASSET_BASE}backgrounds/noia-shop.png`
    );
    this.load.image(
      'phase1_role_da_liberdade',
      `${ASSET_BASE}backgrounds/phase1-role-da-liberdade.jpg`
    );
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
    this.pauseMenuOpen = false;
    this.secretModeModalOpen = false;
    this.drunkFxShopSuppressed = false;
    this.enemies = [];
    this.drinks = [];
    this.goldenCharacter = null;
    this.miniBoss = null;
    this.boss = null;
    this.activeBurstsCount = 0;
    this._lastVisualAttackId = 0;
    this.drinkRankById = Object.fromEntries(
      DRINKS.map((drink) => [drink.id, drink.rarityRank ?? 1])
    );

    registerDefaultSoundBank(audioManager);
    this.audio = audioManager;
    this.musicDirector = new MusicDirector({ audio: audioManager });
    this.musicDirector.silenceForPhaseIntro();
    this.effects = new EffectsManager(this);
    this.drunkEffect = new DrunkEffect(this);
    this.parallaxBackdrop = new ParallaxBackdrop(this, {
      width,
      height,
      seed: `${this.baseRunSeed}-bg`,
      photoTextureKey: 'phase1_role_da_liberdade',
    });
    this.acougueHeatOverlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0xef2929, 0)
      .setDepth(18)
      .setScrollFactor(0)
      .setVisible(false);
    this.cameras.main.fadeIn?.(260, 9, 13, 22);

    // Gravidade vertical exclusiva da gameplay e limites dinâmicos sem parede direita nem fundo artificial
    this.physics.world.gravity.y = PHYSICS.GRAVITY_Y;
    this.physics.world.setBounds(0, 0, width * 6, height, true, false, true, false);
    this.physics.world.resume?.();

    this.cameras.main.removeBounds?.();
    this.cameras.main.setScroll(0, 0);
    this.hitstopTimerMs = 0;
    this.pendingPhaseOpening = null;

    // Pista procedural horizontal contínua (chão segmentado + buracos + 3 tipos de plataformas)
    this.platforms = this.physics.add.staticGroup();
    this.movingPlatforms = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.groundCollidersById = new Map();
    this.platformCollidersById = new Map();
    this.platformVisualGraphics = this.add.graphics().setDepth(-5);
    this.platformGenerator = new PlatformGenerator({ width, height });
    this.trackSystem = new HorizontalTrackSystem({
      seed: this.runSeed,
      screenWidth: width,
      screenHeight: height,
      onPlatformBroken: (plat) => {
        this.audio?.play(SOUND_KEYS.PLATFORM_CRUMBLE);
        this.effects?.platformCrumble(plat);
      },
    });
    this.trackSystem.ensureChunksAround(240, 0);
    this._syncTrackColliders();
    this.currentLayout = this.trackSystem.getActiveLayout();
    renderArenaPlatforms(this.platformVisualGraphics, this.currentLayout, 0);

    // Instancia o personagem selecionado com corrida contínua para a direita
    const characterData = getCharacterById(this.selectedCharacterId);
    const spawnX = 220;
    const spawnY = height - 90;
    this.player = new Player(this, spawnX, spawnY, characterData, PHYSICS, {
      continuousRun: true,
    });
    this.physics.add.collider(this.player.collider, this.platforms);
    this.physics.add.collider(this.player.collider, this.movingPlatforms);

    // Sistemas da Fase 4 + Expansão: Dificuldade, Fases por Kills, Spawn, IA e Formigas
    this.difficultySystem = new DifficultySystem();
    this.phaseSystem = new PhaseSystem({
      onPhaseChanged: (transition) => this._handlePhaseChanged(transition),
    });
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
    this.physics.add.collider(this.enemyGroup, this.movingPlatforms);

    this.antManager = new AntManager({
      scene: this,
      platforms: this.platforms,
      movingPlatforms: this.movingPlatforms,
      onAntSquished: (ant) => {
        this.effects?.antSquish(ant.getCombatOrigin());
        this.audio?.play(SOUND_KEYS.ANT_SQUISH);
      },
      onHostileKilled: (ant) => {
        const o = ant.getCombatOrigin();
        this.effects?.sparks(o.x, o.y, 0x94a3b8, 8);
      },
      onAllyHit: (target) => {
        const o = target.getCombatOrigin?.();
        if (o) this.effects?.sparks(o.x, o.y, 0xfbbf24, 7);
      },
    });

    // Sistemas da Fase 5: Bebidas e Efeitos Temporários
    this.drinkSystem = new DrinkSystem({
      screenWidth: width,
      seed: `${this.runSeed}-drinks`,
    });
    this.drinkEffectManager = new DrinkEffectManager();
    this.drinkGroup = this.physics.add.group();
    this.physics.add.collider(this.drinkGroup, this.platforms);
    this.physics.add.collider(this.drinkGroup, this.movingPlatforms);
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
    this.physics.add.collider(this.bossGroup, this.movingPlatforms);

    // Compatibilidade com evento explícito de visita oficial
    this._onOfficialShopVisit = (metadata = {}) => {
      this.notifyOfficialShopVisit(metadata);
    };
    this.events.on('shop:official-visit', this._onOfficialShopVisit);

    this._onDrinkBounce = (info) => {
      this.effects?.drinkBounce(info);
      this.audio?.play(SOUND_KEYS.DRINK_BOUNCE);
    };
    this.events.on('drink:bounce', this._onDrinkBounce);

    this._onPlayerDash = (info) => {
      this.audio?.play(SOUND_KEYS.DASH);
      this.effects?.dashBurst(info, info.direction, info.slide);
    };
    this.events.on('player:dash', this._onPlayerDash);

    // Habilidade especial por personagem e HUD complementar da Expansão
    this.abilityRuntime = new AbilityRuntime({
      scene: this,
      player: this.player,
      effects: this.effects,
      antManager: this.antManager,
      spawnDrink: (req) => this._spawnDrink(req),
      getTargets: () => this._getPlayerCombatTargets(),
    });

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
        this.effects?.hit(origin, hitInfo, {
          color: this.player?.state?.color ?? 0x38bdf8,
        });
        this.audio?.play(
          isCombo ? SOUND_KEYS.COMBO_HIT : SOUND_KEYS.ATTACK_LIGHT
        );
        if (isCombo && target.isDead?.()) {
          this._triggerHitstop(CINEMATIC_CONFIG.COMBO_KILL_HITSTOP_MS);
        }
      },
    });
    this.hitboxGraphics = this.add.graphics().setDepth(50);
    this.hud = new Hud(
      this,
      this.player.state.getSnapshot(),
      this.spawnSystem.getSnapshot(),
      { tooltip: this.tooltip }
    );
    this.abilityHud = new AbilityHud(this, { width, height });
    this.abilityHud.setPhase(
      this.phaseSystem.getPhase(),
      0,
      this.spawnSystem.totalTarget
    );
    this.abilityHud.setDrunkLevelLabel(this.drunkEffect.getLevelLabel());
    this.abilityHud.update(
      this.abilityRuntime.getSnapshot(),
      this.player.state.ability,
      this.player.getDashSnapshot()
    );
    this.comboGuide = new ComboGuide(this);
    this.lastPlayerHp = this.player.state.currentHp;
    this._onPauseKeyDown = () => {
      if (this.secretModeModalOpen) return;
      if (!this.pauseMenuOpen && this.comboGuide?.visible) {
        this.comboGuide.toggle();
        return;
      }
      this._togglePauseMenu();
    };
    this.pauseKeyEvents = ['keydown-P'];
    for (const eventName of this.pauseKeyEvents) {
      this.input.keyboard.on(eventName, this._onPauseKeyDown);
    }
    this.isDevToolsAvailable = isDevEnvironment();
    if (this.isDevToolsAvailable) {
      this.secretSequence = new KeySequenceDetector(['1', '2', '3', '4', '5']);
      this._onSecretKeyDown = (event) => this._handleSecretKeyDown(event);
      this.input.keyboard.on('keydown', this._onSecretKeyDown);
      this._onSecretModalKeyDown = (event) => {
        if (
          this.secretModeModalOpen &&
          (event?.key === 'Enter' ||
            event?.key === ' ' ||
            event?.key === 'Escape')
        ) {
          this._closeSecretModeModal();
        }
      };
      this.input.keyboard.on('keydown', this._onSecretModalKeyDown);
    }

    this.controlsHintText = this.add
      .text(
        width - 16,
        16,
        this._getControlsHintLabel(),
        {
          fontFamily: TYPOGRAPHY.UI,
          fontSize: '11px',
          color: '#94a3b8',
        }
      )
      .setOrigin(1, 0)
      .setDepth(22)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.controlsHintText.on('pointerup', () => this._togglePauseMenu());
    this._createPauseMenu(width, height);

    this.runEndText = this.add
      .text(width / 2, height / 2, '', {
        fontFamily: TYPOGRAPHY.DISPLAY,
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#f8fafc',
        backgroundColor: '#0f172a',
        padding: { x: 18, y: 12 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setScrollFactor(0)
      .setVisible(false);

    this._createPhaseArrowIndicator(width, height);

    this.phaseOpeningSystem = new PhaseOpeningSystem({
      config: PHASE_OPENING_CONFIG,
      onIntroStart: (phase) => this._onPhaseOpeningStart(phase),
      onIntroUpdate: (snap) => this._onPhaseOpeningUpdate(snap),
      onIntroComplete: (phase) => this._onPhaseOpeningComplete(phase),
    });
    this.devToolsController = this.isDevToolsAvailable
      ? new DevToolsController({
          phaseSystem: this.phaseSystem,
          difficultySystem: this.difficultySystem,
          shopSystem: this.shopSystem,
          spawnSystem: this.spawnSystem,
          trackSystem: this.trackSystem,
          drinkSystem: this.drinkSystem,
          drinkEffectManager: this.drinkEffectManager,
          upgradeSystem: this.upgradeSystem,
          goldenScheduler: this.goldenScheduler,
          runManager: this.runManager,
          antManager: this.antManager,
          phaseOpeningSystem: this.phaseOpeningSystem,
          getPlayerState: () => this.player?.state ?? null,
          onPhaseApplied: (result) => this._applyDevToolsPhaseChange(result),
        })
      : null;
    this.phaseOpeningSystem.start(this.phaseSystem.getPhase(1));
    this._createDrinkTimerCamera(width, height);

    this.events.once('shutdown', () => this._cleanupScene());
  }

  _getControlsHintLabel() {
    const soundState = audioManager.muted ? 'Mudo' : 'Som';
    return `A/D: Mover | W/Espaço: Pular | Shift/S: Dash | J/K/L: Golpes | E: Especial | TAB: Combos | M: ${soundState} | P: Pausa`;
  }

  _createDrinkTimerCamera(width, height) {
    if (typeof this.cameras?.add !== 'function') return;

    // Câmera dedicada de UI/modais acima da câmera principal, livre de pós-processamento de bebida
    this.uiCamera = this.cameras.add(0, 0, width, height);
    this.uiCamera.setScroll(0, 0);
    this.drinkTimerCamera = this.uiCamera;

    const cameraState = {
      uiObjects: new WeakSet(),
      worldObjects: new WeakSet(),
    };
    this._syncDrinkTimerCamera = () => {
      const excluded = new Set();
      if (this.acougueHeatOverlay) excluded.add(this.acougueHeatOverlay);
      if (this.abilityRuntime?.confetti) excluded.add(this.abilityRuntime.confetti);

      syncUiCameraObjects(
        this.cameras.main,
        this.uiCamera,
        this.children?.list ?? [],
        cameraState,
        { excluded }
      );
    };
    this.events.on('postupdate', this._syncDrinkTimerCamera);
    this._syncDrinkTimerCamera();
  }

  _handleSecretKeyDown(event) {
    if (!this.isDevToolsAvailable) return;
    const key = String(event?.key ?? event?.originalEvent?.key ?? '');
    if (!/^[1-5]$/.test(key)) {
      this.secretSequence?.reset();
      return;
    }

    if (
      this.runEnded ||
      this.pauseMenuOpen ||
      this.secretModeModalOpen ||
      this.shopSystem?.isOpen()
    ) {
      this.secretSequence?.reset();
      return;
    }

    const timestamp = Number.isFinite(event?.timeStamp)
      ? event.timeStamp
      : this.game?.loop?.now;
    if (this.secretSequence?.push(key, timestamp)) {
      this._toggleCheatMode();
    }
  }

  _toggleCheatMode() {
    if (!this.isDevToolsAvailable || !this.player || this.runEnded) return;
    const enabled = !this.player.cheatMode;
    this.player.setCheatMode(enabled);
    this.audio?.play(SOUND_KEYS.ABILITY_ACTIVATE);
    this._showSecretModeModal(enabled);
  }

  _applyDevToolsPhaseChange(result) {
    if (!result || this.runEnded) return;
    const { phase, toPhaseId, defeatedCount } = result;

    // Cancela abertura/lojas/bosses de estados anteriores e limpa entidades temporárias da arena
    this.pendingPhaseOpening = null;
    if (this.phaseOpeningSystem?.isActive()) {
      this.phaseOpeningSystem.cancel();
      this.player?.setIntroWalk(false);
      this.phaseArrowContainer?.setVisible(false);
      this.effects?.setLetterbox(false);
    }

    for (const enemy of [...this.enemies]) {
      this.removeEnemyWithoutDefeat(enemy);
    }
    this._clearAllDrinks();
    this._clearGoldenCharacter();

    if (this.miniBoss) {
      this.bossGroup?.remove?.(this.miniBoss.collider, false, false);
      this.miniBoss.destroy();
      this.miniBoss = null;
      this.musicDirector?.endBossMusic('mini_boss_50');
    }
    if (this.boss) {
      this.bossGroup?.remove?.(this.boss.collider, false, false);
      this.boss.destroy();
      this.boss = null;
      this.musicDirector?.endBossMusic('boss_final');
    }
    if (this.runManager) {
      this.runManager.miniBossSpawned = defeatedCount > BOSS_CONFIG.MINI_BOSS_MILESTONE;
      this.runManager.miniBossDefeated = defeatedCount > BOSS_CONFIG.MINI_BOSS_MILESTONE;
      this.runManager.bossSpawned = false;
      this.runManager.bossPhase = 0;
    }
    this.hud?.updateBossStatus(null);

    // Regenera pista e cenário para a nova fase e posiciona o jogador com segurança
    this.parallaxBackdrop?.setStageIndex(toPhaseId - 1);
    const nextSeed = `${this.baseRunSeed}-devtools-phase-${toPhaseId}`;
    this.generatePlatforms(nextSeed);
    this._repositionPlayerSafelyAfterRegen();

    // Ajusta sistemas de chuva de formigas, música, spawns e feedback de bebidas/HUD
    if (phase?.antRain) {
      this.antManager?.startRain();
    } else {
      this.antManager?.stopRain({ clearAnts: true });
    }
    this.musicDirector?.startDefault({ fadeInMs: 250 });
    this.drinkSystem?.resume();
    this.spawnSystem?.resume();

    if (this.abilityHud && phase) {
      this.abilityHud.setPhase(
        phase,
        defeatedCount,
        this.spawnSystem.totalTarget
      );
    }
    this._syncPlayerDrinkFeedback();
    this._syncRunManagerProgress();

    if (this.secretModeModalOpen) {
      this.hud?.setDrinkTimersVisible(false);
      this.drunkEffect?.setSuppressed(true);
      this._refreshSecretModeModalUI?.();
    } else {
      this.audio?.play(SOUND_KEYS.PHASE_UP);
      if (phase) {
        this.effects?.announce(phase.name, {
          color: phase.color,
          sub: phase.subtitle,
          size: 44,
          holdMs: 1200,
          y: 128,
        });
      }
    }
  }

  _showSecretModeModal(enabled = Boolean(this.player?.cheatMode)) {
    if (!this.isDevToolsAvailable) return;
    if (this.secretModeModal) {
      this.secretModeModal.destroy(true);
      this.secretModeModal = null;
    }

    const width = this.logicalWidth;
    const height = this.logicalHeight;
    this.secretModeModalOpen = true;
    this.hud?.setDrinkTimersVisible(false);
    this.drunkEffect?.setSuppressed(true);
    this.physics?.world?.pause?.();
    if (this.time) this.time.paused = true;

    const overlay = this.add
      .container(0, 0)
      .setDepth(110)
      .setScrollFactor(0);
    const background = this.add
      .rectangle(width / 2, height / 2, width, height, 0x020617, 0.86)
      .setInteractive();
    const panelW = 580;
    const panelH = 384;
    const cx = width / 2;
    const cy = height / 2;

    const panel = this.add
      .rectangle(cx, cy, panelW, panelH, 0x0f172a, 0.99)
      .setStrokeStyle(3, enabled ? 0xfacc15 : 0x38bdf8);

    const headerTag = this.add
      .text(cx, cy - 166, 'DEV TOOLS · AMBIENTE DE DESENVOLVIMENTO', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#94a3b8',
        align: 'center',
      })
      .setOrigin(0.5);

    const title = this.add
      .text(cx, cy - 140, '', {
        fontFamily: TYPOGRAPHY.DISPLAY,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#facc15',
        align: 'center',
      })
      .setOrigin(0.5);

    const cheatBtn = this.add
      .rectangle(cx, cy - 103, 270, 28, 0x1e293b, 1)
      .setStrokeStyle(1.5, 0xfacc15)
      .setInteractive({ useHandCursor: true });
    const cheatBtnText = this.add
      .text(cx, cy - 103, '', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const sectionTitle = this.add
      .text(cx, cy - 66, 'PROGRESSÃO DE FASES (CENÁRIO · PERSPECTIVA · BUILD SIMULADA)', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: '#7dd3fc',
        align: 'center',
      })
      .setOrigin(0.5);

    const phaseButtons = [];
    const phases = this.phaseSystem?.config?.PHASES ?? [];
    const btnW = 122;
    const btnGap = 12;
    const rowStartX = cx - ((phases.length - 1) * (btnW + btnGap)) / 2;
    const phaseRowY = cy - 30;

    phases.forEach((p, idx) => {
      const bx = rowStartX + idx * (btnW + btnGap);
      const rect = this.add
        .rectangle(bx, phaseRowY, btnW, 38, 0x1e293b, 1)
        .setStrokeStyle(1.5, 0x475569)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(bx, phaseRowY, `${p.name}`, {
          fontFamily: TYPOGRAPHY.UI,
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#f8fafc',
          align: 'center',
        })
        .setOrigin(0.5);
      rect.on('pointerup', () => {
        this.audio?.play(SOUND_KEYS.UPGRADE_PICK);
        this.devToolsController?.selectPhase(p.id, {
          simulateLoadout: true,
          source: 'modal_select',
        });
      });
      phaseButtons.push({ phase: p, rect, label });
    });

    const actionRowY = cy + 24;
    const nextBtn = this.add
      .rectangle(cx - 134, actionRowY, 244, 34, 0x0369a1, 1)
      .setStrokeStyle(1.5, 0x38bdf8)
      .setInteractive({ useHandCursor: true });
    const nextBtnText = this.add
      .text(cx - 134, actionRowY, 'AVANÇAR PRÓXIMA FASE', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const autoBtn = this.add
      .rectangle(cx + 134, actionRowY, 244, 34, 0x1e293b, 1)
      .setStrokeStyle(1.5, 0x64748b)
      .setInteractive({ useHandCursor: true });
    const autoBtnText = this.add
      .text(cx + 134, actionRowY, '', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const statusSummary = this.add
      .text(cx, cy + 76, '', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '12px',
        color: '#e2e8f0',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(
        cx,
        cy + 118,
        'Atalho 1-2-3-4-5 reabre a Dev Tools • Enter / Espaço / Esc fecha.',
        {
          fontFamily: TYPOGRAPHY.UI,
          fontSize: '11px',
          color: '#94a3b8',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    const button = this.add
      .rectangle(cx, cy + 156, 190, 34, 0x0284c7, 1)
      .setStrokeStyle(1.5, 0x7dd3fc)
      .setInteractive({ useHandCursor: true });
    const buttonText = this.add
      .text(cx, cy + 156, 'CONTINUAR PARTIDA', {
        fontFamily: TYPOGRAPHY.UI,
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    cheatBtn.on('pointerup', () => {
      if (!this.player) return;
      const nextCheat = !this.player.cheatMode;
      this.player.setCheatMode(nextCheat);
      this.audio?.play(SOUND_KEYS.ABILITY_ACTIVATE);
      this._refreshSecretModeModalUI?.();
    });

    nextBtn.on('pointerup', () => {
      if (!this.devToolsController?.getSnapshot().canAdvance) return;
      this.audio?.play(SOUND_KEYS.UPGRADE_PICK);
      this.devToolsController.advanceToNextPhase({
        simulateLoadout: true,
        source: 'modal_next',
      });
    });

    autoBtn.on('pointerup', () => {
      this.audio?.play(SOUND_KEYS.ABILITY_ACTIVATE);
      this.devToolsController?.toggleAutoProgression();
      this._refreshSecretModeModalUI?.();
    });

    button.on('pointerup', () => this._closeSecretModeModal());

    this._refreshSecretModeModalUI = () => {
      const cheatActive = Boolean(this.player?.cheatMode);
      const devSnap = this.devToolsController?.getSnapshot() ?? {
        currentPhaseId: this.phaseSystem?.currentPhaseId ?? 1,
        canAdvance: false,
        autoProgressionEnabled: false,
        simulatedEnemiesInStep: 0,
        enemiesPerPhase: 25,
      };
      const curPhase = this.phaseSystem?.getPhase(devSnap.currentPhaseId);
      const upgradesCount = this.upgradeSystem?.getAcquiredUpgrades().length ?? 0;
      const drinksCount = this.drinkEffectManager?.getActiveEffects().length ?? 0;

      panel.setStrokeStyle?.(3, cheatActive ? 0xfacc15 : 0x38bdf8);
      title.setText?.(
        cheatActive ? 'MODO IMORTAL ATIVADO' : 'MODO IMORTAL DESATIVADO'
      );
      title.setColor?.(cheatActive ? '#facc15' : '#38bdf8');
      cheatBtn.setFillStyle?.(cheatActive ? 0x422006 : 0x1e293b, 1);
      cheatBtn.setStrokeStyle?.(1.5, cheatActive ? 0xfacc15 : 0x64748b);
      cheatBtnText.setText?.(
        cheatActive ? 'Alternar Modo Imortal: ON' : 'Alternar Modo Imortal: OFF'
      );

      for (const item of phaseButtons) {
        const isCurrent = item.phase.id === devSnap.currentPhaseId;
        const accent = Number.parseInt(item.phase.color.replace('#', ''), 16);
        item.rect.setFillStyle?.(isCurrent ? 0x0c4a6e : 0x1e293b, 1);
        item.rect.setStrokeStyle?.(isCurrent ? 2.5 : 1.5, isCurrent ? accent : 0x475569);
        item.label.setColor?.(isCurrent ? item.phase.color : '#cbd5e1');
      }

      nextBtn.setFillStyle?.(devSnap.canAdvance ? 0x0369a1 : 0x1e293b, 1);
      nextBtn.setStrokeStyle?.(
        1.5,
        devSnap.canAdvance ? 0x38bdf8 : 0x334155
      );
      nextBtnText.setColor?.(devSnap.canAdvance ? '#f8fafc' : '#64748b');

      const autoOn = devSnap.autoProgressionEnabled;
      autoBtn.setFillStyle?.(autoOn ? 0x14532d : 0x1e293b, 1);
      autoBtn.setStrokeStyle?.(1.5, autoOn ? 0x4ade80 : 0x64748b);
      autoBtnText.setText?.(
        autoOn
          ? `AUTO (25 INIMIGOS): ON [${devSnap.simulatedEnemiesInStep}/${devSnap.enemiesPerPhase}]`
          : 'AUTO (A CADA 25 INIMIGOS): OFF'
      );
      autoBtnText.setColor?.(autoOn ? '#86efac' : '#cbd5e1');

      statusSummary.setText?.(
        `${curPhase?.name ?? 'FASE 1'} (${curPhase?.subtitle ?? ''}) · Visitas Loja: ${this.difficultySystem?.officialShopVisits ?? 0}\n` +
          `Abates: ${this.spawnSystem?.defeatedCount ?? 0}/${this.spawnSystem?.totalTarget ?? 100} · Upgrades ativos: ${upgradesCount} · Bebidas ativas: ${drinksCount}`
      );
    };

    const childNodes = [
      background,
      panel,
      headerTag,
      title,
      cheatBtn,
      cheatBtnText,
      sectionTitle,
      ...phaseButtons.flatMap((b) => [b.rect, b.label]),
      nextBtn,
      nextBtnText,
      autoBtn,
      autoBtnText,
      statusSummary,
      hint,
      button,
      buttonText,
    ];
    overlay.add(childNodes);
    this._refreshSecretModeModalUI();
    this.secretModeModal = overlay;
  }

  _closeSecretModeModal() {
    if (!this.secretModeModalOpen) return;
    this.secretModeModalOpen = false;
    this._refreshSecretModeModalUI = null;
    this.secretModeModal?.destroy(true);
    this.secretModeModal = null;
    if (this.time) this.time.paused = false;
    if (!this.runEnded) this.physics?.world?.resume?.();
    this.drunkEffect?.setSuppressed(this.drunkFxShopSuppressed);
    this.hud?.setDrinkTimersVisible(!this.shopSystem?.isOpen());
  }

  _createPauseMenu(width, height) {
    const pauseButton = this.add
      .rectangle(width - 48, height - 27, 74, 30, 0x0f172a, 0.96)
      .setStrokeStyle(1.5, 0x38bdf8)
      .setDepth(82)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width - 48, height - 27, 'PAUSAR', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5)
      .setDepth(83)
      .setScrollFactor(0);
    pauseButton.on('pointerup', () => this._togglePauseMenu());

    this.pauseOverlay = this.add
      .container(0, 0)
      .setDepth(100)
      .setScrollFactor(0)
      .setVisible(false);

    const background = this.add
      .rectangle(width / 2, height / 2, width, height, 0x020617, 0.82)
      .setInteractive();
    const panel = this.add
      .rectangle(width / 2, height / 2, 360, 300, 0x0f172a, 0.98)
      .setStrokeStyle(2, 0x38bdf8);
    const title = this.add
      .text(width / 2, height / 2 - 104, 'JOGO PAUSADO', {
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5);
    this.pauseOverlay.add([background, panel, title]);

    const addButton = (y, label, onClick, color) => {
      const button = this.add
        .rectangle(width / 2, y, 292, 44, color, 1)
        .setStrokeStyle(1.5, 0x7dd3fc)
        .setInteractive({ useHandCursor: true });
      const text = this.add
        .text(width / 2, y, label, {
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#f8fafc',
        })
        .setOrigin(0.5);
      button.on('pointerup', onClick);
      button.on('pointerover', () => button.setFillStyle(0x0369a1, 1));
      button.on('pointerout', () => button.setFillStyle(color, 1));
      this.pauseOverlay.add([button, text]);
    };

    addButton(
      height / 2 - 30,
      'CONTINUAR',
      () => this._togglePauseMenu(),
      0x0284c7
    );
    addButton(
      height / 2 + 24,
      'REINICIAR PARTIDA',
      () => this._restartRun(),
      0x7c2d12
    );
    addButton(
      height / 2 + 78,
      'VOLTAR À SELEÇÃO',
      () => this._returnToTitleScene(),
      0x334155
    );
  }

  _togglePauseMenu() {
    if (
      this.runEnded ||
      this.secretModeModalOpen ||
      this.shopSystem?.isOpen()
    ) return;

    this.pauseMenuOpen = !this.pauseMenuOpen;
    this.pauseOverlay?.setVisible(this.pauseMenuOpen);
    this.hud?.setDrinkTimersVisible(!this.pauseMenuOpen);
    if (this.time) {
      this.time.paused = this.pauseMenuOpen;
    }
    if (this.pauseMenuOpen) {
      this.physics?.world?.pause?.();
    } else {
      this.physics?.world?.resume?.();
    }
  }

  _restartRun() {
    if (this.runEnded) return;
    this.runEnded = true;
    this.pauseMenuOpen = false;
    this.pauseOverlay?.setVisible(false);
    if (this.time) {
      this.time.paused = false;
    }
    this.physics?.world?.resume?.();
    this.scene.restart({
      characterId: this.selectedCharacterId,
      seed: Date.now(),
    });
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
    for (const rect of this.groundCollidersById?.values() ?? []) {
      rect?.destroy?.();
    }
    for (const rect of this.platformCollidersById?.values() ?? []) {
      rect?.destroy?.();
    }
    this.groundCollidersById?.clear();
    this.platformCollidersById?.clear();
    this.platforms?.clear(true, true);
    this.movingPlatforms?.clear(true, true);
  }

  generatePlatforms(seed = Date.now()) {
    this.clearPlatforms();
    const playerX = this.player?.getCombatOrigin?.().x ?? 220;
    this.trackSystem.regenerateAround(playerX, seed);
    this.runSeed = this.trackSystem.baseSeed;
    this._syncTrackColliders();
    this.currentLayout = this.trackSystem.getActiveLayout();
    renderArenaPlatforms(
      this.platformVisualGraphics,
      this.currentLayout,
      (this.phaseSystem?.getPhase()?.id ?? 1) - 1
    );
    return this.currentLayout;
  }

  _syncTrackColliders() {
    if (!this.trackSystem) return;
    const layout = this.trackSystem.getActiveLayout();

    const activeGroundIds = new Set();
    for (const seg of layout.groundSegments) {
      activeGroundIds.add(seg.id);
      if (!this.groundCollidersById.has(seg.id)) {
        const rect = this._addStaticPlatform(
          seg.x,
          seg.y,
          seg.width,
          seg.height,
          0x334155,
          false
        );
        this.groundCollidersById.set(seg.id, rect);
      }
    }
    for (const [id, rect] of this.groundCollidersById.entries()) {
      if (!activeGroundIds.has(id)) {
        this.platforms?.remove(rect, true, true);
        rect?.destroy?.();
        this.groundCollidersById.delete(id);
      }
    }

    const activePlatIds = new Set();
    for (const plat of layout.allPlatforms ?? layout.platforms) {
      activePlatIds.add(plat.id);
      let rect = this.platformCollidersById.get(plat.id);
      if (!rect) {
        if (plat.type === PLATFORM_TYPES.MOVING) {
          rect = this.add.rectangle(
            plat.x,
            plat.y,
            plat.width,
            plat.height,
            0xffffff,
            0
          );
          this.physics.add.existing(rect, false);
          rect.body.setAllowGravity?.(false);
          rect.body.setImmovable?.(true);
          rect.body.setFriction?.(1, 0);
          configureOneWayPlatform(rect.body);
          this.movingPlatforms.add(rect);
        } else {
          rect = this._addStaticPlatform(
            plat.x,
            plat.y,
            plat.width,
            plat.height,
            0x475569,
            true
          );
        }
        this.platformCollidersById.set(plat.id, rect);
      }

      if (plat.type === PLATFORM_TYPES.MOVING && rect?.body) {
        const bodyCenterX = rect.body.x + rect.body.halfWidth;
        const bodyCenterY = rect.body.y + rect.body.halfHeight;
        const corrVx = (plat.x - bodyCenterX) * 8;
        const corrVy = (plat.y - bodyCenterY) * 8;
        rect.body.setVelocity?.((plat.vx ?? 0) + corrVx, (plat.vy ?? 0) + corrVy);
      } else if (plat.type === PLATFORM_TYPES.CRUMBLING && rect?.body) {
        rect.body.enable = Boolean(plat.solid);
      }
    }

    for (const [id, rect] of this.platformCollidersById.entries()) {
      if (!activePlatIds.has(id)) {
        this.platforms?.remove(rect, true, true);
        this.movingPlatforms?.remove(rect, true, true);
        rect?.destroy?.();
        this.platformCollidersById.delete(id);
      }
    }
  }

  _addStaticPlatform(x, y, width, height, _color, oneWay = true) {
    const rect = this.add.rectangle(x, y, width, height, 0xffffff, 0);
    this.physics.add.existing(rect, true);
    if (oneWay) configureOneWayPlatform(rect.body);
    this.platforms.add(rect);
    return rect;
  }

  _triggerHitstop(durationMs = 60) {
    if (!(durationMs > 0) || this.runEnded || this.pauseMenuOpen) return;
    this.hitstopTimerMs = Math.max(this.hitstopTimerMs, durationMs);
    this.physics?.world?.pause?.();
  }

  _createPhaseArrowIndicator(width, height) {
    const arrowX = width - 118;
    const arrowY = height / 2 - 24;
    const g = this.add.graphics();
    g.fillStyle(0x090d16, 0.9);
    g.fillRoundedRect(-84, -34, 168, 68, 14);
    g.lineStyle(3, 0xfacc15, 1);
    g.strokeRoundedRect(-84, -34, 168, 68, 14);

    // Seta cartunesca desenhada apontando para a direita
    g.fillStyle(0xfacc15, 1);
    g.fillRect(14, -10, 32, 20);
    g.fillTriangle(44, -22, 44, 22, 72, 0);
    g.lineStyle(2.5, 0x090d16, 1);
    g.strokeTriangle?.(44, -22, 44, 22, 72, 0);

    const label = this.add
      .text(-28, 0, 'SIGA!', {
        fontFamily: TYPOGRAPHY.DISPLAY,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#facc15',
        stroke: '#090d16',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.phaseArrowContainer = this.add
      .container(arrowX, arrowY, [g, label])
      .setDepth(92)
      .setScrollFactor(0)
      .setVisible(false);
  }

  _onPhaseOpeningStart(phase) {
    if (!phase) return;
    this.musicDirector?.silenceForPhaseIntro({
      fadeOutMs: phase.id === 1 ? 0 : PHASE_OPENING_CONFIG.MUSIC_FADE_OUT_MS,
    });

    // Limpa inimigos comuns remanescentes (sem contar abate) para que a abertura comece com caminhada solo
    for (const enemy of [...this.enemies]) {
      this.removeEnemyWithoutDefeat(enemy);
    }
    this.spawnSystem?.stop();
    this.drinkSystem?.stop();
    this.antManager?.stopRain({ clearAnts: true });

    this.trackSystem?.setPhase(phase.id);

    const playerX = this.player?.getCombatOrigin?.().x ?? 220;
    this.trackSystem?.ensureSafeGroundRange(
      Math.max(0, playerX - 180),
      HORIZONTAL_TRACK_CONFIG.PHASE_SAFE_GROUND_WIDTH + 300
    );
    this._syncTrackColliders();
    this.currentLayout = this.trackSystem.getActiveLayout();

    // Posiciona o jogador com segurança para a caminhada solo da nova fase
    if (this.player?.body) {
      const groundTop = this.trackSystem.groundTopY;
      if (this.player.body.y + this.player.body.height > groundTop) {
        this.player.body.y = groundTop - this.player.body.height;
        this.player.body.setVelocityY?.(0);
      }
    }

    this.player?.setIntroWalk(true);
    this.parallaxBackdrop?.setStageIndex(phase.id - 1);
    this.effects?.setLetterbox(true);
    this.effects?.announce(phase.name, {
      color: phase.color,
      sub: phase.subtitle,
      size: 50,
      holdMs: 1850,
      y: 128,
    });
    this.phaseArrowContainer?.setVisible(true);
  }

  _onPhaseOpeningUpdate(snap) {
    if (!this.phaseArrowContainer) return;
    this.phaseArrowContainer.setVisible(Boolean(snap.arrowVisible));
    const pulse = 1 + Math.sin(snap.elapsedMs * 0.012) * 0.07;
    this.phaseArrowContainer.setScale?.(pulse);
  }

  _onPhaseOpeningComplete(phase) {
    this.player?.setIntroWalk(false);
    this.phaseArrowContainer?.setVisible(false);
    this.effects?.setLetterbox(false);

    if (this.runEnded || this.player?.isDead?.()) return;

    this.musicDirector?.startDefault({
      fadeInMs: PHASE_OPENING_CONFIG.MUSIC_FADE_IN_MS,
    });
    this.drinkSystem?.resume();
    if (!this.spawnSystem?.isCompleted() && !this.miniBoss && !this.boss) {
      this.spawnSystem?.resume();
    }
    if (phase?.antRain && !this.spawnSystem?.isCompleted() && !this.boss) {
      this.antManager?.startRain();
    }
  }

  _spawnEnemy(spawnRequest) {
    const baseData = pickEnemyTypeForProgress(
      this.spawnSystem?.defeatedCount ?? 0,
      this.spawnSystem?.rng ?? null
    );
    const shopScaled = this.difficultySystem.scaleEnemyData(baseData);
    const scaledData = this.phaseSystem
      ? this.phaseSystem.scaleEnemyData(shopScaled)
      : shopScaled;
    const enemy = new Enemy(this, spawnRequest.x, spawnRequest.y, scaledData, {
      id: spawnRequest.id,
      onDefeated: (defeatedEnemy) => this._handleEnemyDefeated(defeatedEnemy),
    });
    enemy.setMoveSpeedMultiplier(
      this.player?.state.gameplayModifiers.enemyMoveSpeedMultiplier ?? 1
    );

    this.enemyGroup.add(enemy.collider);
    this.enemies.push(enemy);
    return enemy;
  }

  _handlePhaseChanged(transition) {
    if (!transition?.phase) return;
    this.audio?.play(SOUND_KEYS.PHASE_UP);
    this._triggerHitstop(CINEMATIC_CONFIG.MILESTONE_HITSTOP_MS);
    this.effects?.phaseTransition(transition.phase);

    // Agenda a sequência de abertura da nova fase (após eventual loja oficial fechar)
    this.trackSystem?.setPhase(transition.phase.id);
    this.pendingPhaseOpening = transition.phase;

    // Ajusta atributos dos inimigos comuns já ativos na arena na transição de fase
    for (const enemy of this.enemies) {
      if (
        this.phaseSystem?.upgradeExistingEnemy(
          enemy,
          transition.from,
          transition.to
        )
      ) {
        const o = enemy.getCombatOrigin?.();
        if (o) {
          this.effects?.ring(
            o.x,
            o.y,
            Number.parseInt(transition.phase.color.replace('#', ''), 16),
            { radius: 34, durationMs: 320, width: 2 }
          );
        }
      }
    }

    if (!transition.phase.antRain || this.spawnSystem?.isCompleted()) {
      this.antManager?.stopRain({ clearAnts: true });
    }
  }

  _getPlayerCombatTargets() {
    const targets = [...this.enemies];
    if (this.antManager) {
      targets.push(...this.antManager.getHostileTargets());
    }
    if (this.goldenCharacter && !this.goldenCharacter.isDead()) {
      targets.push(this.goldenCharacter);
    }
    if (this.miniBoss && !this.miniBoss.isDead()) {
      targets.push(this.miniBoss);
    }
    if (this.boss && !this.boss.isDead()) {
      targets.push(this.boss);
    }
    return targets;
  }

  _getAllyAntTargets() {
    const targets = [...this.enemies];
    if (this.miniBoss && !this.miniBoss.isDead()) {
      targets.push(this.miniBoss);
    }
    if (this.boss && !this.boss.isDead()) {
      targets.push(this.boss);
    }
    return targets;
  }

  _handleEnemyDefeated(enemy) {
    if (!enemy) return;

    if (enemy.state?.countsAsCommonEnemy === false) {
      this.spawnSystem.unregisterActiveEnemy(enemy.id);
      return;
    }

    this.spawnSystem.markEnemyDefeated(enemy.id);
    const defeatedCount = this.spawnSystem.defeatedCount;

    // Carga de habilidades por abates e progressão em 4 fases
    this.abilityRuntime?.registerKill();
    this.phaseSystem?.update(defeatedCount);
    if (this.phaseSystem && this.abilityHud) {
      this.abilityHud.setPhase(
        this.phaseSystem.getPhase(),
        defeatedCount,
        this.spawnSystem.totalTarget
      );
    }
    if (this.spawnSystem.isCompleted()) {
      this.antManager?.stopRain({ clearAnts: true });
    }

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

    if (this.pendingPhaseOpening && !this.shopSystem?.isOpen()) {
      const nextPhase = this.pendingPhaseOpening;
      this.pendingPhaseOpening = null;
      this.effects?.playPhaseCurtain({
        color: Number.parseInt(nextPhase.color.replace('#', ''), 16),
      });
      this.phaseOpeningSystem?.start(nextPhase);
    }
  }

  _spawnGoldenCharacter(triggerInfo) {
    if (this.goldenCharacter && !this.goldenCharacter.isDead()) {
      return this.goldenCharacter;
    }

    const groundTop = this.trackSystem?.groundTopY ?? this.logicalHeight - 40;
    const spawnY =
      groundTop - SHOP_CONFIG.COQUINHO.DEFAULT_HEIGHT_ABOVE_GROUND;
    const camLeft = this.cameras?.main?.scrollX ?? 0;

    this.goldenCharacter = new GoldenCharacter(this, {
      id: triggerInfo.id,
      direction: triggerInfo.direction,
      screenWidth: this.logicalWidth,
      viewportLeft: camLeft,
      y: spawnY,
      onHitReward: () => {
        const origin = this.goldenCharacter?.getCombatOrigin?.() ?? {
          x: camLeft + this.logicalWidth / 2,
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
    this.hitstopTimerMs = 0;
    this.combatSystem?.cancel();
    this.player?.setCombatPose('idle');
    this.hitboxGraphics?.clear();
    this.tooltip?.hide();
    this.player?.body?.setVelocity?.(0, 0);
    this.physics.world?.pause?.();
    this.hud?.setDrinkTimersVisible(false);
    if (session?.isOfficial && !this.drunkFxShopSuppressed) {
      this.drunkFxShopSuppressed = true;
      this.drunkEffect?.setSuppressed(true);
    }
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
      this.hud?.setDrinkTimersVisible(true);
      if (this.drunkFxShopSuppressed) {
        this.drunkFxShopSuppressed = false;
        this.drunkEffect?.setSuppressed(false);
      }
      if (!this.runEnded && !this.player?.isDead()) {
        this.physics.world?.resume?.();
      }

      if (this.pendingPhaseOpening && !this.runEnded && !this.player?.isDead()) {
        const nextPhase = this.pendingPhaseOpening;
        this.pendingPhaseOpening = null;
        this.effects?.playPhaseCurtain({
          color: Number.parseInt(nextPhase.color.replace('#', ''), 16),
        });
        this.phaseOpeningSystem?.start(nextPhase);
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
    const result = this.shopSystem.selectOption(
      optionIndex,
      this.player.state
    );
    const specialEffect = result?.appliedUpgrade?.temporaryDrinkEffect;
    if (specialEffect) {
      this.drinkEffectManager.applyDrink(
        {
          ...specialEffect,
          id: `${result.appliedUpgrade.id}_effect`,
          name: result.appliedUpgrade.name,
        },
        this.player.state
      );
      this.audio?.play(SOUND_KEYS.ABILITY_ACTIVATE);
      this._syncPlayerDrinkFeedback();
    }
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
    if (spawnRequest.drinkData?.isSpecial) {
      this.audio?.play(SOUND_KEYS.SPECIAL_DRINK);
      this._spawnBurstEffect(spawnRequest.x, spawnRequest.y, 0xfacc15, 34);
      const banner = this.add
        .text(
          this.logicalWidth / 2,
          72,
          `BEBIDA ESPECIAL: ${spawnRequest.drinkData.name.toUpperCase()}!`,
          {
            fontFamily: TYPOGRAPHY.DISPLAY,
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#fef08a',
            stroke: '#422006',
            strokeThickness: 6,
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(65);
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
    if (result.effect?.synergy) {
      this.effects?.powerUpBurst(
        this.player?.getCombatOrigin?.() ?? pos,
        Math.min(10, (result.stackCount ?? 1) + 1)
      );
      this.audio?.play(SOUND_KEYS.ABILITY_ACTIVATE);
    }
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
    const gameplayModifiers = this.player?.state.gameplayModifiers;
    this.goldenScheduler?.setProbabilityBonus(
      gameplayModifiers?.specialShopChanceBonus ?? 0
    );
    for (const enemy of this.enemies ?? []) {
      enemy.setMoveSpeedMultiplier(
        gameplayModifiers?.enemyMoveSpeedMultiplier ?? 1
      );
    }
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
    const isAcougue = this.player.state.characterId === 'acougue';
    const visualEffects =
      isAcougue
        ? activeEffects.filter((effect) => effect.drinkId !== 'cantinho_do_vale')
        : activeEffects;
    const latestColor =
      visualEffects.length > 0
        ? visualEffects[visualEffects.length - 1].color
        : null;
    this.player.setDrinkAuraColor(latestColor);
    const powerStacks = Math.min(9, activeEffects.filter(
      (effect) => effect.drinkId === 'cantinho_do_vale' && effect.synergy
    ).length);
    this.player.setPowerMode(powerStacks > 0, powerStacks);
    this.acougueHeatOverlay?.setAlpha(powerStacks * 0.042);
    this.acougueHeatOverlay?.setVisible(powerStacks > 0);
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
    const camLeft = this.cameras?.main?.scrollX ?? 0;
    const playerX = this.player?.getCombatOrigin?.().x ?? camLeft + 240;
    this.trackSystem?.ensureSafeGroundRange(playerX - 180, 1200);
    this._syncTrackColliders();
    const spawnX = Math.round(camLeft + this.logicalWidth * 0.72);
    const spawnY = BOSS_CONFIG.SPAWN_Y;

    // Pausa novos spawns comuns durante o duelo contra o Mini-Chefão
    this.spawnSystem?.stop();
    this._triggerHitstop(CINEMATIC_CONFIG.BOSS_ENTRANCE_PAUSE_MS);

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
    this.musicDirector?.playBossMusic('mini_boss_50', 1);
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
    this.musicDirector?.endBossMusic('mini_boss_50');
    this.hud?.updateBossStatus(null);

    // Solta uma bebida rara garantida como recompensa do Mini-Chefão!
    const rewardDrink = getDrinkById('mansao_maromba') ?? getDrinkById('chevette');
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
    const camLeft = this.cameras?.main?.scrollX ?? 0;
    const playerX = this.player?.getCombatOrigin?.().x ?? camLeft + 240;
    this.trackSystem?.ensureSafeGroundRange(playerX - 200, 1600);
    this._syncTrackColliders();
    const spawnX = Math.round(
      camLeft + this.logicalWidth * BOSS_CONFIG.SPAWN_X_RATIO
    );
    const spawnY = BOSS_CONFIG.SPAWN_Y;

    this.antManager?.stopRain({ clearAnts: true });
    this._triggerHitstop(CINEMATIC_CONFIG.BOSS_ENTRANCE_PAUSE_MS);
    this.effects?.setLetterbox(true);
    this.time?.delayedCall?.(1400, () => {
      if (!this.phaseOpeningSystem?.isActive()) {
        this.effects?.setLetterbox(false);
      }
    });

    this.boss = new Boss(this, spawnX, spawnY, scaledBossData, {
      id: 'boss_final',
      onPhaseChanged: (phase) => {
        this.runManager?.setBossPhase(phase);
        this.musicDirector?.setBossPhase('boss_final', phase);
        const bossOrigin = this.boss?.getCombatOrigin?.();
        if (bossOrigin) {
          this.effects?.shockwave(bossOrigin.x, bossOrigin.y, {
            maxRadius: 460,
            waveWidth: 32,
            durationMs: 480,
          });
        }
        this._showBannerText(`${scaledBossData.name} — FASE ${phase}!`, '#c084fc');
      },
      onDefeated: () => this._handleBossDefeated(),
    });

    this.bossGroup?.add(this.boss.collider);
    this.runManager?.markBossSpawned(1);
    this.audio?.play(SOUND_KEYS.BOSS_SPAWN);
    this.musicDirector?.playBossMusic('boss_final', 1);
    this.hud?.updateBossStatus(this.boss.state.getSnapshot());
    this._showBannerText(`BOSS FINAL: ${scaledBossData.name.toUpperCase()}!`, '#f87171');
    return this.boss;
  }

  _showBannerText(message, color = '#facc15') {
    if (!this.add?.text) return;
    const banner = this.add
      .text(this.logicalWidth / 2, 118, message, {
        fontFamily: TYPOGRAPHY.DISPLAY,
        fontSize: '25px',
        fontStyle: 'bold',
        color,
        stroke: '#090d16',
        strokeThickness: 6,
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
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
    this.abilityRuntime?.reset();
    this.antManager?.clear();
    this.drunkEffect?.teardown();
    this.musicDirector?.reset();
    this._clearAllDrinks();
    this._clearGoldenCharacter();
    this.combatSystem?.cancel();
    this.player?.setDrinkAuraColor(null);
    this.player?.setPowerMode(false);
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
    this.abilityRuntime?.reset();
    this.antManager?.clear();
    this.drunkEffect?.teardown();
    this.musicDirector?.reset();
    this._clearAllDrinks();
    this._clearGoldenCharacter();
    this.shopUI?.close();
    this.shopSystem?.reset();
    this.combatSystem.cancel();
    this.player.setDrinkAuraColor(null);
    this.player.setPowerMode(false);
    this.player.setCheatMode(false);
    this.player.setCombatPose('idle');
    this.hitboxGraphics.clear();
    this.player.body?.setVelocity?.(0, 0);
    this.hud?.setDrinkTimersVisible(false);
    this.physics.world?.pause?.();
    if (this.time) this.time.paused = false;

    for (const enemy of this.enemies) {
      enemy.stopCombat();
      enemy.body?.setVelocity?.(0, 0);
    }
    this.miniBoss?.stopCombat();
    this.boss?.stopCombat();

    const summary = this.runManager?.getSummary() ?? {};
    this.cameras.main.flash?.(280, 248, 113, 113);
    this.player.playDeathAnimation(() => {
      this.scene.start('GameOverScene', { summary });
    });
  }

  _returnToTitleScene() {
    if (this.runEnded) return;
    this.runEnded = true;
    this.pauseMenuOpen = false;
    this.pauseOverlay?.setVisible(false);
    if (this.time) {
      this.time.paused = false;
    }
    this.spawnSystem?.stop();
    this.drinkSystem?.stop();
    this.abilityRuntime?.reset();
    this.antManager?.clear();
    this.drunkEffect?.teardown();
    this.musicDirector?.reset();
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
      if (this._onDrinkBounce) {
        this.events.off('drink:bounce', this._onDrinkBounce);
      }
      if (this._onPlayerDash) {
        this.events.off('player:dash', this._onPlayerDash);
      }
      for (const eventName of this.pauseKeyEvents ?? []) {
        this.input?.keyboard?.off?.(eventName, this._onPauseKeyDown);
      }
      if (this._onSecretKeyDown) {
        this.input?.keyboard?.off?.('keydown', this._onSecretKeyDown);
      }
      if (this._onSecretModalKeyDown) {
        this.input?.keyboard?.off?.('keydown', this._onSecretModalKeyDown);
      }
      if (this._syncDrinkTimerCamera) {
        this.events.off('postupdate', this._syncDrinkTimerCamera);
      }
    });
    safeRun(() => this.phaseOpeningSystem?.cancel());
    safeRun(() => this.phaseArrowContainer?.destroy(true));
    safeRun(() => this.parallaxBackdrop?.destroy());
    safeRun(() => this.secretModeModal?.destroy(true));
    safeRun(() => this.abilityRuntime?.reset());
    safeRun(() => this.antManager?.clear());
    safeRun(() => this.drunkEffect?.teardown());
    safeRun(() => this.effects?.dispose());
    safeRun(() => this.musicDirector?.reset());
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
    safeRun(() => this.abilityHud?.destroy());
    safeRun(() => this.comboGuide?.destroy());
    safeRun(() => this.platformVisualGraphics?.destroy());
  }

  update(time, delta = 16.67) {
    if (this.runEnded) {
      return;
    }

    if (this.pauseMenuOpen) {
      return;
    }

    if (this.secretModeModalOpen) {
      return;
    }

    // Pausa dramática breve (hitstop) para dar peso a momentos importantes sem travar controles
    if (this.hitstopTimerMs > 0) {
      this.hitstopTimerMs = Math.max(0, this.hitstopTimerMs - delta);
      if (this.hitstopTimerMs <= 0 && !this.shopSystem?.isOpen()) {
        this.physics?.world?.resume?.();
      }
      return;
    }

    if (this.inputController.isActionJustPressed('MUTE_AUDIO')) {
      audioManager.toggleMute();
      this.controlsHintText?.setText(this._getControlsHintLabel());
    }
    if (this.inputController.isActionJustPressed('DRUNK_FX_LEVEL')) {
      this.drunkEffect?.cycleLevel();
      this.abilityHud?.setDrunkLevelLabel(this.drunkEffect.getLevelLabel());
    }
    if (this.inputController.isActionJustPressed('MUSIC_VOLUME_DOWN')) {
      this.musicDirector?.adjustVolume(-AUDIO_CONFIG.VOLUME_STEP);
    }
    if (this.inputController.isActionJustPressed('MUSIC_VOLUME_UP')) {
      this.musicDirector?.adjustVolume(AUDIO_CONFIG.VOLUME_STEP);
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
    this.devToolsController?.update(delta);
    this._syncRunManagerProgress();

    // Atualiza sequência de abertura de fase (caminhada solo, seta piscando, silêncio -> música fade-in)
    const introActive = this.phaseOpeningSystem?.isActive() ?? false;
    if (introActive) {
      this.phaseOpeningSystem.update(delta);
    }

    const intent = introActive
      ? { horizontal: 0, vertical: 0, jump: false, dash: false }
      : this.inputController.readMovementIntent();
    this.player.update(intent, delta);

    // Atualiza pista horizontal procedural, plataformas móveis e plataformas desintegráveis
    let playerOrigin = this.player.getCombatOrigin();
    const camScrollXBefore = this.cameras.main?.scrollX ?? 0;
    this.trackSystem.ensureChunksAround(playerOrigin.x, camScrollXBefore);
    const { riderDeltaY } = this.trackSystem.update(delta, {
      player: this.player,
    });
    if (riderDeltaY > 0 && this.player.isGrounded()) {
      this.player.body.y += riderDeltaY;
      this.player.syncVisualToBody();
    }
    this._syncTrackColliders();
    this.currentLayout = this.trackSystem.getActiveLayout();
    renderArenaPlatforms(
      this.platformVisualGraphics,
      this.currentLayout,
      (this.phaseSystem?.getPhase()?.id ?? 1) - 1
    );

    // Verifica queda em buraco (-30 HP exatos + ricochete + proteção na recuperação)
    const groundTopY = this.trackSystem.groundTopY;
    const pBox = this.player.getHurtbox();
    let pitResult = null;
    if (
      pBox.y + pBox.height >=
      groundTopY + PHYSICS.PIT_HAZARD.TRIGGER_DEPTH_BELOW_GROUND
    ) {
      const pCenterX = pBox.x + pBox.width / 2;
      const safeLandingX = this.trackSystem.findSafeGroundXAfter(pCenterX);
      pitResult = this.player.handlePitFall({ groundTopY, safeLandingX });
    }

    if (pitResult?.triggered) {
      if (pitResult.damaged) {
        this.audio?.play(SOUND_KEYS.PIT_BOUNCE);
      }
      this.effects?.pitBounce(
        this.player.getCombatOrigin(),
        pitResult.damaged
      );
      this.lastPlayerHp = this.player.state.currentHp;
      this.hud.update(
        this.player.state.getSnapshot(),
        this.spawnSystem.getSnapshot(),
        this.drinkEffectManager?.getActiveEffects() ?? [],
        { bossSnapshot: this._getActiveBossSnapshot() }
      );
      if (pitResult.fatal || this.player.isDead()) {
        this._endRunOnPlayerDeath();
        return;
      }
    }

    // Câmera acompanha o jogador horizontalmente sem limite artificial à direita
    playerOrigin = this.player.getCombatOrigin();
    const desiredScrollX = Math.max(
      0,
      playerOrigin.x -
        (this.logicalWidth / 2 - HORIZONTAL_TRACK_CONFIG.CAMERA_LOOKAHEAD_X)
    );
    const lerpFactor =
      1 -
      Math.pow(
        1 - HORIZONTAL_TRACK_CONFIG.CAMERA_LERP_X,
        Math.min(3, delta / 16.67)
      );
    const nextScrollX =
      camScrollXBefore + (desiredScrollX - camScrollXBefore) * lerpFactor;
    this.cameras.main.setScroll(nextScrollX, 0);
    if (isSide2D) {
      this.parallaxBackdrop?.update(nextScrollX);
    }

    const minPlayableX = Math.max(
      0,
      Math.floor(nextScrollX - HORIZONTAL_TRACK_CONFIG.LEFT_BACKTRACK_MARGIN_PX)
    );
    const dynamicWorldWidth = Math.max(
      this.logicalWidth * 4,
      Math.ceil(playerOrigin.x - minPlayableX + this.logicalWidth * 3)
    );
    this.physics.world.setBounds(
      minPlayableX,
      0,
      dynamicWorldWidth,
      this.logicalHeight,
      true,
      false,
      true,
      false
    );

    const combatIntent = introActive
      ? { attackType: null, toggleComboGuide: false, specialAbility: false }
      : this.inputController.readCombatIntent();
    if (combatIntent.toggleComboGuide) {
      this.comboGuide.toggle();
    }
    if (combatIntent.specialAbility && this.abilityRuntime?.tryActivate()) {
      this.audio?.play(SOUND_KEYS.ABILITY_ACTIVATE);
      const orig = this.player.getCombatOrigin();
      this.effects?.shockwave(orig.x, orig.y, {
        maxRadius: 420,
        waveWidth: 30,
        durationMs: 420,
      });
    }
    if (combatIntent.attackType && this.player.abilityForm !== 'car') {
      this.combatSystem.requestAttack(
        combatIntent.attackType,
        time,
        this.player
      );
    }

    // Spawn de novos inimigos na janela horizontal ativa
    const spawnRequest = this.spawnSystem.update(delta, {
      playerX: playerOrigin.x,
      activeEnemies: this.enemies,
      playerDead: this.player.isDead(),
      viewportLeft: nextScrollX,
      viewportWidth: this.logicalWidth,
      holes: this.currentLayout.holes,
    });
    if (spawnRequest) {
      this._spawnEnemy(spawnRequest);
    }

    // Spawn, atração, expiração e atualização de bebidas na janela visível
    const gameplayMods = this.player.state.gameplayModifiers;
    const drinkSpawnRequest = this.drinkSystem.update(delta, {
      activeDrinks: this.drinks,
      playerDead: this.player.isDead(),
      rarityBonus: gameplayMods.drinkRarityBonus,
      viewportLeft: nextScrollX,
      viewportWidth: this.logicalWidth,
      holes: this.currentLayout.holes,
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

      const dPos = drink.getPosition();
      const attraction = this.drinkSystem.computeAttractionVelocity(
        dPos,
        playerOrigin,
        { extraRadius: gameplayMods.drinkMagnetBonus }
      );
      if (attraction.attracted) {
        drink.setAttractionVelocity(attraction.vx, attraction.vy);
      } else {
        drink.resetFallVelocity();
      }

      const expiredOnGround =
        drink.update(delta, this.logicalHeight) ||
        dPos.x < nextScrollX - HORIZONTAL_TRACK_CONFIG.DESPAWN_BEHIND_CAMERA_PX;
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

    // Pós-processamento de embriaguez proporcional às bebidas ativas e à raridade/duração
    const activeDrinkEffects = this.drinkEffectManager.getActiveEffects();
    const effectsForDrunkVisual =
      this.player.state.characterId === 'acougue'
        ? activeDrinkEffects.filter((effect) => effect.drinkId !== 'cantinho_do_vale')
        : activeDrinkEffects;
    const drunkTarget = computeDrunkIntensity(
      effectsForDrunkVisual,
      {
        rankByDrinkId: this.drinkRankById,
        levelScale: this.drunkEffect?.getLevelScale() ?? 1,
      }
    );
    this.drunkEffect?.update(delta, drunkTarget);
    this.musicDirector?.setDrunkIntensity(
      computeDrunkIntensity(effectsForDrunkVisual, {
        rankByDrinkId: this.drinkRankById,
      }),
      time
    );

    // Ataques do jogador contra inimigos vivos, formigas hostis, Mini-Chefão, Boss Final e Coquinho Extra
    const combatTargets = this._getPlayerCombatTargets();
    this.combatSystem.update(delta, this.player, combatTargets);
    if (
      this.combatSystem.isAttacking() &&
      this.combatSystem.attackInstanceId !== this._lastVisualAttackId
    ) {
      this._lastVisualAttackId = this.combatSystem.attackInstanceId;
      const activeAtk = this.combatSystem.activeAttack;
      this.effects?.anticipation(playerOrigin, activeAtk?.color ?? this.player.state.color);
      this.effects?.swoosh(playerOrigin, this.player.facing, activeAtk);
      if (activeAtk?.type === 'HEAVY' || activeAtk?.type === 'SPECIAL') {
        this.audio?.play(SOUND_KEYS.ATTACK_HEAVY);
      }
    }

    // Habilidades especiais ativas (chuva de Cantinhos, carro atropelador, formigas auxiliares)
    this.abilityRuntime?.update(delta);
    this.antManager?.update(delta, {
      player: this.player,
      allyTargets: this._getAllyAntTargets(),
      ownerStrength: this.player.state.effectiveStats.strength,
    });
    this.abilityHud?.update(
      this.abilityRuntime?.getSnapshot(),
      this.player.state.ability,
      this.player.getDashSnapshot()
    );
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

    // Spawna o Mini-Chefão ao atingir 50 inimigos derrotados (após loja e abertura da Fase 3)
    if (
      !this.phaseOpeningSystem?.isActive() &&
      this.spawnSystem.defeatedCount >= BOSS_CONFIG.MINI_BOSS_MILESTONE &&
      !this.miniBoss &&
      !this.runManager?.miniBossSpawned &&
      !this.spawnSystem.isCompleted()
    ) {
      this._spawnMiniBoss();
    }

    // Spawna o Boss Final após os 100 inimigos comuns serem derrotados e sem Mini-Chefão pendente
    if (
      !this.phaseOpeningSystem?.isActive() &&
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

    // Atualização de IA, ataques e reciclagem horizontal dos inimigos comuns
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (!enemy || enemy.isDead() || enemy.destroyed) continue;

      const eOrigin = enemy.getCombatOrigin();
      if (
        eOrigin.y > this.logicalHeight + 90 ||
        eOrigin.x < nextScrollX - HORIZONTAL_TRACK_CONFIG.DESPAWN_BEHIND_CAMERA_PX
      ) {
        this.removeEnemyWithoutDefeat(enemy);
        continue;
      }

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

    // Mantém Mini-Chefão e Boss Final sempre na área ativa (nunca perdidos para trás ou em buracos)
    for (const activeBossEntity of [this.miniBoss, this.boss]) {
      if (
        activeBossEntity &&
        !activeBossEntity.isDead() &&
        activeBossEntity.body
      ) {
        const bOrigin = activeBossEntity.getCombatOrigin();
        if (
          bOrigin.y > groundTopY + 42 ||
          bOrigin.x < nextScrollX - 420
        ) {
          activeBossEntity.body.x = Math.max(
            nextScrollX + 120,
            this.trackSystem.findSafeGroundXAfter(bOrigin.x)
          );
          activeBossEntity.body.y =
            groundTopY - activeBossEntity.body.height - 8;
          activeBossEntity.body.setVelocityY?.(-540);
          activeBossEntity.syncVisualToBody?.();
        }
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

    // Desenha cortes/ataques ativos no plano 2D
    this.hitboxGraphics.clear();
    if (this.combatSystem.currentHitboxBounds) {
      const activeAtk = this.combatSystem.activeAttack;
      drawCombatSlashEffect(
        this.hitboxGraphics,
        this.combatSystem.currentHitboxBounds,
        activeAtk?.color ?? 0x38bdf8,
        this.player.facing,
        Boolean(
          activeAtk?.isCombo ||
            activeAtk?.type === 'HEAVY' ||
            activeAtk?.type === 'SPECIAL'
        )
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
