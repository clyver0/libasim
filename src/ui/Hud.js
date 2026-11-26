import { GAMEPLAY } from '../constants/gameplay.js';
import { summarizeUpgradeEffects } from '../data/upgrades.js';

/**
 * Formata os dados de estado do jogador para exibição textual na HUD.
 * Função pura exportada para facilitar testes independentes da engine.
 */
export function formatHudLines(snapshot) {
  const lines = [
    `${snapshot.characterName}`,
    `HP: ${snapshot.hp} / ${snapshot.maxHp}`,
    `Força: ${snapshot.strength}`,
    `Resistência a bebidas: ${snapshot.drinkResistance}`,
  ];
  if (typeof snapshot.moveSpeed === 'number') {
    lines.push(`Velocidade: ${snapshot.moveSpeed}`);
  }
  return lines;
}

export function formatEnemyCounter(defeatedCount = 0, totalTarget = 100) {
  return `Inimigos: ${defeatedCount} / ${totalTarget}`;
}

export function formatActiveEffects(activeEffects = []) {
  if (!Array.isArray(activeEffects) || activeEffects.length === 0) {
    return [];
  }

  return activeEffects.map((effect) => {
    const seconds = (Math.max(0, effect.remainingMs ?? 0) / 1000).toFixed(1);
    return `${effect.name}: ${seconds}s`;
  });
}

export function formatDetailedActiveEffects(activeEffects = []) {
  if (!Array.isArray(activeEffects) || activeEffects.length === 0) {
    return [];
  }

  return activeEffects.map((effect) => {
    const seconds = (Math.max(0, effect.remainingMs ?? 0) / 1000).toFixed(1);
    const details = effect.effectSummary ? `\n   ${effect.effectSummary}` : '';
    return `🍹 ${effect.name} (${seconds}s)${details}`;
  });
}

export function formatAcquiredUpgradesList(upgrades = []) {
  if (!Array.isArray(upgrades) || upgrades.length === 0) {
    return [];
  }

  return upgrades.map((upg) => {
    const summary = summarizeUpgradeEffects(upg, { separator: ', ', maxItems: 3 });
    return summary ? `▸ ${upg.name}\n   ${summary}` : `▸ ${upg.name}`;
  });
}

export function formatBossHudLabel(bossSnapshot) {
  if (!bossSnapshot) return '';
  const phaseTag =
    bossSnapshot.phase >= 2 ? ' [FASE 2 — ENFURECIDO]' : ' [FASE 1]';
  return `${bossSnapshot.name}${phaseTag} — ${bossSnapshot.hp} / ${bossSnapshot.maxHp}`;
}

/**
 * HUD completa com detalhes de bebidas ativas e painel lateral dos upgrades adquiridos no canto.
 */
export class Hud {
  constructor(
    scene,
    initialSnapshot,
    enemyProgress = null,
    { tooltip = null } = {}
  ) {
    this.scene = scene;
    this.tooltip = tooltip;
    this.lastSnapshot = initialSnapshot;
    this.lastEnemyProgress = enemyProgress;
    this.lastUpgradesCount = -1;

    const padding = 14;
    const screenW = GAMEPLAY.SCREEN_WIDTH;

    this.panelDecor = scene.add.graphics?.()?.setDepth?.(19) ?? null;
    if (this.panelDecor?.fillRoundedRect) {
      this.panelDecor.fillStyle(0x020617, 0.5);
      this.panelDecor.fillRoundedRect(18, 17, 256, 156, 10);
      this.panelDecor.fillStyle(0x0b1120, 0.92);
      this.panelDecor.fillRoundedRect(14, 13, 256, 156, 10);
      this.panelDecor.lineStyle(1.5, 0x334155, 0.95);
      this.panelDecor.strokeRoundedRect(14, 13, 256, 156, 10);
    }

    this.panel = scene.add
      .rectangle(14, 13, 256, 156, 0x0f172a, this.panelDecor ? 0.01 : 0.88)
      .setOrigin(0, 0)
      .setDepth(20);
    this.panel.setInteractive?.();

    this.colorBadge =
      scene.add
        .circle(31, 29, 6.5, initialSnapshot.color)
        .setStrokeStyle?.(1.5, 0xf8fafc, 0.9) ??
      scene.add.circle(31, 29, 6.5, initialSnapshot.color);
    this.colorBadge.setDepth(21);

    this.titleText = scene.add
      .text(45, 20, '', {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setDepth(21);

    this.hpBarBg =
      scene.add
        .rectangle(14 + padding, 43, 228, 10, 0x1e293b, 1)
        .setOrigin(0, 0)
        .setStrokeStyle?.(1, 0x334155, 0.9) ??
      scene.add.rectangle(14 + padding, 43, 228, 10, 0x1e293b, 1).setOrigin(0, 0);
    this.hpBarBg.setDepth(21);

    this.hpBarFill = scene.add
      .rectangle(14 + padding, 43, 228, 10, 0x22c55e, 1)
      .setOrigin(0, 0)
      .setDepth(22);

    this.hpBarGloss = scene.add
      .rectangle(14 + padding, 44, 228, 3, 0xffffff, 0.24)
      .setOrigin(0, 0)
      .setDepth(23);

    this.statsText = scene.add
      .text(14 + padding, 58, '', {
        fontSize: '13px',
        color: '#cbd5e1',
        lineSpacing: 3,
      })
      .setDepth(21);

    this.enemyPillBg = scene.add
      .rectangle(14 + padding, 139, 228, 22, 0x1e293b, 0.85)
      .setOrigin(0, 0)
      .setDepth(20);
    this.enemyPillBg.setStrokeStyle?.(1, 0x475569, 0.8);

    this.enemyCounterText = scene.add
      .text(14 + padding + 10, 142, '', {
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: '#fda4af',
      })
      .setDepth(21);

    // Painel de bebidas ativas com explicação detalhada dos efeitos
    this.effectsPanel = scene.add
      .rectangle(14, 176, 272, 44, 0x090d16, 0.93)
      .setOrigin(0, 0)
      .setStrokeStyle(1.5, 0x38bdf8, 1)
      .setDepth(20)
      .setVisible(false);

    this.effectsText = scene.add
      .text(14 + 12, 183, '', {
        fontSize: '11.5px',
        color: '#f1f5f9',
        lineSpacing: 3,
        wordWrap: { width: 250 },
      })
      .setDepth(21)
      .setVisible(false);

    // Painel lateral no canto superior direito: UPGRADES ADQUIRIDOS detalhados!
    const upgWidth = 244;
    const upgX = screenW - upgWidth - 14;
    const upgY = 40;

    this.upgradesPanel = scene.add
      .rectangle(upgX, upgY, upgWidth, 56, 0x090d16, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1.5, 0x38bdf8, 0.85)
      .setDepth(20)
      .setVisible(false);
    this.upgradesPanel.setInteractive?.();

    this.upgradesTitle = scene.add
      .text(upgX + 12, upgY + 8, '⚡ UPGRADES ATIVOS', {
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: '#38bdf8',
      })
      .setDepth(21)
      .setVisible(false);

    this.upgradesListText = scene.add
      .text(upgX + 12, upgY + 27, '', {
        fontSize: '11px',
        color: '#e2e8f0',
        lineSpacing: 3,
        wordWrap: { width: upgWidth - 22 },
      })
      .setDepth(21)
      .setVisible(false);

    // Barra destacada do Boss Final no topo central
    const centerX = screenW / 2;
    this.bossContainer =
      scene.add.container?.(centerX, 54)?.setDepth?.(25) ?? null;
    if (this.bossContainer) {
      this.bossPanel = scene.add
        .rectangle(0, 0, 410, 48, 0x090d16, 0.94)
        .setStrokeStyle(2, 0xdc2626);
      this.bossLabel = scene.add
        .text(0, -10, '', {
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#f8fafc',
        })
        .setOrigin(0.5);
      this.bossHpBg = scene.add
        .rectangle(-186, 9, 372, 10, 0x1e293b, 1)
        .setOrigin(0, 0.5);
      this.bossHpFill = scene.add
        .rectangle(-186, 9, 372, 10, 0xdc2626, 1)
        .setOrigin(0, 0.5);
      this.bossContainer.add([
        this.bossPanel,
        this.bossLabel,
        this.bossHpBg,
        this.bossHpFill,
      ]);
      this.bossContainer.setVisible(false);
    }

    this.currentUpgrades = [];
    this._setupTooltips();
    this.update(initialSnapshot, enemyProgress, [], { acquiredUpgrades: [] });
  }

  _setupTooltips() {
    if (!this.tooltip) return;

    this.tooltip.attach(this.panel, () => {
      const s = this.lastSnapshot ?? {};
      const ep = this.lastEnemyProgress ?? {};
      return {
        title: `${s.characterName ?? 'Personagem'} — Atributos`,
        description: [
          `HP (${s.hp}/${s.maxHp}): vida restante antes da derrota.`,
          `Força (${s.strength}): multiplica o dano dos golpes e combos.`,
          `Resistência (${s.drinkResistance}): reduz a duração da embriaguez.`,
          `Progresso: ${ep.defeatedCount ?? 0}/${ep.totalTarget ?? 100} inimigos comuns.`,
        ].join('\n'),
      };
    });

    if (this.effectsPanel?.setInteractive) {
      this.effectsPanel.setInteractive();
      this.tooltip.attach(this.effectsPanel, () => ({
        title: 'Bebidas Ativas',
        description:
          'Bônus temporários ativos agora. Repetir uma bebida acumula um novo efeito com tempo próprio e cura novamente!',
      }));
    }

    if (this.upgradesPanel) {
      this.tooltip.attach(this.upgradesPanel, () => {
        if (!this.currentUpgrades?.length) return null;
        return {
          title: `Upgrades da Run (${this.currentUpgrades.length})`,
          description: this.currentUpgrades
            .map((u) => `• ${u.name}: ${u.description}`)
            .join('\n'),
        };
      });
    }
  }

  update(
    snapshot,
    enemyProgress = null,
    activeEffects = null,
    { acquiredUpgrades = null, bossSnapshot = undefined } = {}
  ) {
    if (snapshot) {
      this.lastSnapshot = snapshot;
      const [title, ...statLines] = formatHudLines(snapshot);
      this.colorBadge.setFillStyle(snapshot.color, 1);
      this.titleText.setText(title);
      this.statsText.setText(statLines.join('\n'));

      const ratio =
        snapshot.maxHp > 0
          ? Math.max(0, Math.min(1, snapshot.hp / snapshot.maxHp))
          : 0;
      const barColor =
        ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xf59e0b : 0xef4444;
      const fillW = Math.round(228 * ratio);
      this.hpBarFill.width = fillW;
      this.hpBarGloss.width = fillW;
      this.hpBarFill.setFillStyle(barColor, 1);
    }

    if (enemyProgress) {
      this.lastEnemyProgress = enemyProgress;
      this.enemyCounterText.setText(
        formatEnemyCounter(
          enemyProgress.defeatedCount,
          enemyProgress.totalTarget
        )
      );
    }

    if (Array.isArray(activeEffects)) {
      const detailedLines = formatDetailedActiveEffects(activeEffects);
      if (detailedLines.length === 0) {
        this.effectsPanel.setVisible(false);
        this.effectsText.setVisible(false);
      } else {
        const accentColor =
          activeEffects[activeEffects.length - 1]?.color ?? 0x38bdf8;
        this.effectsText.setText(detailedLines.join('\n')).setVisible(true);
        const textH = this.effectsText.height || detailedLines.length * 32;
        this.effectsPanel
          .setSize(272, Math.max(38, textH + 14))
          .setStrokeStyle(1.5, accentColor, 0.95)
          .setVisible(true);
      }
    }

    if (Array.isArray(acquiredUpgrades)) {
      this.updateUpgrades(acquiredUpgrades);
    }

    if (bossSnapshot !== undefined) {
      this.updateBossStatus(bossSnapshot);
    }
  }

  updateUpgrades(upgrades = []) {
    this.currentUpgrades = upgrades;
    if (upgrades.length === 0) {
      this.upgradesPanel?.setVisible(false);
      this.upgradesTitle?.setVisible(false);
      this.upgradesListText?.setVisible(false);
      this.lastUpgradesCount = 0;
      return;
    }

    if (upgrades.length === this.lastUpgradesCount) {
      return;
    }
    this.lastUpgradesCount = upgrades.length;

    const visibleUpgrades = upgrades.slice(-8);
    const lines = formatAcquiredUpgradesList(visibleUpgrades);
    const headerSuffix =
      upgrades.length > visibleUpgrades.length
        ? ` (${upgrades.length})`
        : ` (${upgrades.length})`;

    this.upgradesTitle
      ?.setText(`⚡ UPGRADES ATIVOS${headerSuffix}`)
      .setVisible(true);
    this.upgradesListText?.setText(lines.join('\n')).setVisible(true);

    const listHeight = this.upgradesListText?.height || lines.length * 28;
    this.upgradesPanel
      ?.setSize(244, Math.max(54, 34 + listHeight))
      .setVisible(true);
  }

  updateBossStatus(bossSnapshot = null) {
    if (!this.bossContainer) return;

    if (!bossSnapshot || bossSnapshot.hp <= 0) {
      this.bossContainer.setVisible(false);
      return;
    }

    const ratio = Math.max(0, Math.min(1, bossSnapshot.hp / bossSnapshot.maxHp));
    const accent = bossSnapshot.phase >= 2 ? 0xa855f7 : 0xdc2626;
    this.bossPanel.setStrokeStyle(2, accent);
    this.bossHpFill.width = Math.round(372 * ratio);
    this.bossHpFill.setFillStyle(accent, 1);
    this.bossLabel.setText(formatBossHudLabel(bossSnapshot));
    this.bossContainer.setVisible(true);
  }

  destroy() {
    const safeDestroy = (obj) => {
      try {
        obj?.destroy?.();
      } catch {
        // Ignora caso o SceneManager já tenha destruído o objeto durante shutdown
      }
    };

    safeDestroy(this.panelDecor);
    safeDestroy(this.panel);
    safeDestroy(this.colorBadge);
    safeDestroy(this.titleText);
    safeDestroy(this.hpBarBg);
    safeDestroy(this.hpBarFill);
    safeDestroy(this.hpBarGloss);
    safeDestroy(this.statsText);
    safeDestroy(this.enemyPillBg);
    safeDestroy(this.enemyCounterText);
    safeDestroy(this.effectsPanel);
    safeDestroy(this.effectsText);
    safeDestroy(this.upgradesPanel);
    safeDestroy(this.upgradesTitle);
    safeDestroy(this.upgradesListText);
    safeDestroy(this.bossContainer);
  }
}
