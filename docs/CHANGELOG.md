
# CHANGELOG

Histórico das alterações do projeto.

O arquivo registra funcionalidades implementadas, modificações técnicas e correções relevantes.

## [Unreleased]

### Fase 10 — Interface, Áudio, Tooltips e Polimento Final
#### Correções e polimento visual (Pós-teste)
- Diferenciados os dois personagens jogáveis em `src/data/characters.js`, `StatCalculator.js` e `PlayerState.js`: **Relâmpago Azul** (foco em Velocidade `307` e Força `12`, menor HP `90` e Resistência `0.85`) e **Colosso Laranja** (foco em HP Máximo `135` e Resistência `1.4`, Força `9.5` e Velocidade `234`), exibindo especialidade e velocidade na tela de seleção e na HUD.
- Adicionados 4 tipos distintos de inimigos comuns em `src/data/enemies.js` (`Briguento de Rua`, `Corredor Furioso`, `Brutamontes` e `Segurança de Elite`) com atributos, alcances, proporções e visuais próprios desbloqueados progressivamente durante a run.
- Implementado o **Mini-Chefão aos 50 inimigos derrotados** (`Leão de Chácara` em `src/data/boss.js` e `MainScene.js`), com barra de vida dedicada, duas fases e drop garantido de bebida rara ao ser derrotado.
- Corrigido travamento ao pressionar `ESC` na `MainScene`: blindado `_cleanupScene()` / `destroy()` contra chamadas `group.remove()` em grupos físicos já descartados pelo `shutdown` do Phaser (que abortavam a transição do `SceneManager` para `TitleScene`) e adicionado listener direto `keydown-ESC`.
- Detalhados os efeitos das bebidas tanto em texto flutuante imediato na coleta quanto no painel ativo da HUD (`describeDrinkModifiers` / `formatDetailedActiveEffects`), e ajustado o catálogo para que bebidas também aumentem significativamente a Vida Máxima (`maxHp`) e curas.
- Adicionado painel lateral direito `UPGRADES ATIVOS` em `src/ui/Hud.js` detalhando todos os upgrades adquiridos até o momento na run e seus bônus.
- Rebalanceados os upgrades puramente punitivos em `src/data/upgrades.js` (`Mão de Alface`, `Saúde Frágil`, `Fígado Sensível`, `Azar no Copo`, etc.) para que todos os 30 upgrades ofereçam vantagens claras e desejáveis.
- Substituídas poses estáticas discretas por **animação procedural contínua a 60 FPS com cinemática inversa 2D** (`solveTwoBoneIK` e `computePoseSkeleton` em `CharacterAppearanceSystem.js`, `Player.js`, `Enemy.js`, `Boss.js` e `GoldenCharacter.js`), com cotovelos e joelhos articulados, respiração, inclinação de corrida, animação aérea e interpolação fluida nos golpes.
- Corrigido bug crítico em `src/combat/CombatSystem.js` em que abrir uma loja durante `CombatSystem.update()` (ao derrotar o 25º/50º/75º inimigo ou acertar o Coquinho Extra) chamava `cancel()` dentro de `_checkHits` e em seguida colocava o sistema em `RECOVERING` com `activeAttack = null`, bloqueando novos ataques após escolher o upgrade.
- Corrigido `Player.syncBodyScale()` em `src/entities/Player.js` para não atribuir em propriedades somente-leitura (`width`/`height`) do `Phaser.Physics.Arcade.Body`, e protegida a seleção em `src/ui/ShopUI.js` (`pointerup` + trava de clique).
- Ajustado `src/config.js`, `src/utils/display.js` e `index.html` para janela de tamanho fixo `960x540` (`Phaser.Scale.NONE`) centralizada no meio da tela sem distorção/esticamento CSS nem deslocamento de câmera, mantendo textos em alta densidade (`resolution >= 2`).
- Adicionado `src/ui/ArenaBackdrop.js` com cenário urbano noturno ilustrado, plataformas metálicas iluminadas por estágio e arcos energéticos de ataque no lugar das caixas retangulares de debug.
- Refinados os visuais de personagens (contorno duplo, sombreamento, olhos expressivos e sombra de contato), garrafas de bebidas (`src/entities/Drink.js`) e painéis de UI (`TitleScene`, `Hud`, `ShopUI`, `ComboGuide`, `VictoryScene` e `GameOverScene`).

#### Novas funcionalidades
- Adicionado `src/ui/Tooltip.js` com cálculo seguro de bordas (`computeTooltipPosition`) e suporte a hover em atributos, upgrades, efeitos ativos e cards de loja/seleção.
- Adicionado `src/audio/SoundBank.js` e expandido `src/audio/AudioManager.js` com geração procedural leve de efeitos sonoros e trilha musical em WAV compatível com Howler.js e atalho de mute `[M]`.
- Finalizada `src/ui/Hud.js` com barra gráfica dinâmica de HP, badges de upgrades adquiridos e barra dedicada de vida/fase do Boss Final.
- Polidas `src/scenes/TitleScene.js`, `src/ui/ShopUI.js`, `src/ui/ComboGuide.js`, `src/scenes/VictoryScene.js`, `src/scenes/GameOverScene.js` e `src/scenes/MainScene.js` (transições `fadeIn`, feedback visual com teto de instâncias simultâneas e limpeza rigorosa de recursos).
- Adicionados testes integrados de regressão e fluxo completo de run em `tests/phase10.test.js`.

### Fase 9 — Boss Final e Encerramento da Run
#### Novas funcionalidades
- Adicionados `src/constants/boss.js`, `src/data/boss.js`, `src/entities/BossState.js`, `src/entities/Boss.js` e `src/systems/BossAI.js` com balanceamento próprio, múltiplos ataques e transição para Fase 2 em `<= 50%` do HP.
- Adicionado `src/systems/RunManager.js` para rastrear o estado global e estatísticas da run.
- Adicionadas as cenas de encerramento `src/scenes/VictoryScene.js` e `src/scenes/GameOverScene.js` e registradas em `src/config.js`.
- Integrados spawn do Boss após 100 inimigos derrotados e condições completas de vitória e derrota em `src/scenes/MainScene.js`.
- Adicionados testes automatizados em `tests/phase9.test.js`.

### Fase 8 — Lojas e Coquinho Extra
#### Novas funcionalidades
- Adicionados `src/constants/shops.js`, `src/systems/ShopSystem.js`, `src/systems/GoldenEventScheduler.js`, `src/entities/GoldenCharacter.js` e `src/ui/ShopUI.js`.
- Implementada a loja oficial **Chiquinho Promos** nos marcos de `25`, `50` e `75` inimigos derrotados, pausando a gameplay, sorteando 3 upgrades válidos, escalando dificuldade e regenerando plataformas.
- Implementado o evento **Coquinho Extra** (1 a 3 aparições por run, 1ª garantida, probabilidades decrescentes) e sua **Loja Especial** sem impacto na dificuldade nem nas plataformas.
- Implementada fila sequencial em `ShopSystem` para processar eventos simultâneos sem substituir nem perder recompensas.
- Adicionados testes automatizados em `tests/phase8.test.js`.

### Fase 7 — Aparência dos Personagens
#### Novas funcionalidades
- Adicionado `src/systems/CharacterAppearanceSystem.js` com mapeamento visual para todos os 30 upgrades, cálculo de esqueleto articulado (`computePoseSkeleton`) e regras explícitas de compatibilidade visual sem alterar cálculos mecânicos.
- Integrada animação de caminhada articulada (`walk_1`/`walk_2`) e sincronização de aparência em `src/entities/Player.js` e `src/scenes/MainScene.js`.
- Adicionados testes automatizados em `tests/phase7.test.js`.

### Fase 6 — Sistema de Upgrades
#### Novas funcionalidades
- Adicionados `src/constants/upgrades.js` e `src/data/upgrades.js` com os 30 upgrades configuráveis, separando modificadores mecânicos e descritores visuais.
- Adicionado `src/systems/UpgradeSystem.js` com regras de não-repetição, suporte opcional a acúmulo (`stackable`), incompatibilidade bidirecional (`Miniatura` vs `Gigantismo`) e sorteio determinístico de opções válidas (`rollOptions`).
- Adicionado `StatCalculator.calculateGameplayModifiers` para centralizar multiplicadores de movimento, pulo, velocidade de ataque, recuperação, alcance, dano específico (leve/combo/geral), redução de dano, resistência a knockback, escala física e bônus de bebidas.
- Integrados todos os modificadores mecânicos em `PlayerState.js`, `Player.js`, `DamageCalculator.js`, `CombatSystem.js` e `MainScene.js`.
- Adicionados testes automatizados em `tests/phase6.test.js`.

### Fase 5 — Bebidas e Efeitos Temporários
#### Novas funcionalidades
- Adicionados `src/constants/drinks.js` e `src/data/drinks.js` com configurações provisórias centralizadas e catálogo das 6 bebidas em ordem crescente de raridade (`Cantinho do Vale`, `Cerveja`, `Ginde 10`, `Chevette`, `Whisky com Energético`, `Absinto`).
- Adicionado `src/systems/DrinkEffectManager.js` para cálculo centralizado de duração efetiva (registrando a resistência no momento da coleta), controle independente de timers, renovação em coletas repetidas sem duplicar modificadores, cura instantânea segura e expiração simultânea no mesmo frame.
- Adicionado `src/systems/DrinkSystem.js` com seleção ponderada determinística por seed (`SeededRandom`), controle de spawn, coleta idempotente e atração automática configurável preparada para expansão na Fase 6.
- Adicionada entidade `src/entities/Drink.js` com corpo físico Arcade Physics separado do visual minimalista colorido por bebida.
- Adicionados testes automatizados em `tests/phase5.test.js`.

#### Correções e ajustes técnicos
- Adicionados `PlayerState.heal()` (nunca revivendo jogador morto) e `PlayerState.setActiveEffects()` em `src/entities/PlayerState.js` mantendo `baseStats` e `multipliers` imutáveis.
- Adicionada aura colorida de efeito ativo em `src/entities/Player.js`.
- Expandida `src/ui/Hud.js` (`formatActiveEffects`) para exibir efeitos ativos e timers restantes.
- Integrado ciclo completo de bebidas em `src/scenes/MainScene.js`, incluindo limpeza total de entidades e efeitos na morte do jogador e no encerramento da cena.
- Atualizado `docs/TECHNICAL_DECISIONS.md` resolvendo a divergência documental sobre atração automática na Fase 5 e registrando as regras de repetição e duração.

### Fase 4 — Inimigos, IA e Progressão de Dificuldade
#### Novas funcionalidades
- Adicionados `src/constants/enemies.js` e `src/data/enemies.js` com configurações provisórias e catálogo base de inimigos comuns.
- Adicionados `src/entities/EnemyState.js` e `src/entities/Enemy.js` com separação entre estado, corpo físico Arcade Physics, visual stick figure, barra de HP, recebimento de dano, knockback e morte.
- Adicionado `src/systems/DifficultySystem.js` com escalonamento centralizado de HP, força e velocidade aplicado uma única vez sobre os atributos-base somente em visitas oficiais da loja do Chiquinho.
- Adicionado `src/systems/SpawnSystem.js` para controle de spawn na região superior, evasão da coluna do jogador, limites simultâneos configuráveis (`5`/`7`/`10`), contagem idempotente de derrotas e interrupção aos `100` inimigos.
- Adicionado `src/systems/EnemyAI.js` com perseguição, ataques com windup/recuperação, navegação entre plataformas via `canJumpBetween`, desvio de sombra inferior, cooldown de pulo, anti-stuck e separação horizontal.
- Adicionados testes automatizados em `tests/phase4.test.js`.

#### Correções e ajustes técnicos
- Garantido o consumo automático de `scaledStats` em `EnemyState.js` e `Enemy.js`, preservando `baseStats` em `DifficultySystem.js` para assegurar aplicação única dos multiplicadores sobre os atributos-base.
- Adicionados `CombatSystem.cancel()`, `Enemy.stopCombat()`, `SpawnSystem.stop()`/`resume()`, pausa da física e interrupção imediata de IA, ataques e spawns em `MainScene.js` quando o jogador morre.
- Adicionados `SpawnSystem.removedIds` e `MainScene.removeEnemyWithoutDefeat()` (além de verificação de `countsAsCommonEnemy` e `_pruneDeadEnemies`) para garantir contagem idempotente e impedir incremento em remoções sem derrota.
- Ajustada a condução horizontal em saltos diagonais na `EnemyAI.js` sem manipulação direta da posição vertical (controle vertical mantido no Arcade Physics).
- Corrigida oscilação/travamento na `EnemyAI` quando o inimigo está sobre uma plataforma diretamente acima do jogador (fixação da borda de descida por plataforma e travamento de alvo durante o salto).
- Restaurados os textos flutuantes de dano e nome do golpe/combo (`COMBO! ...` / `-dano`) diretamente em `Enemy.onHit`.
- Extraído `CombatSystem.resolveHits` em `src/combat/CombatSystem.js` para unificar o pipeline de hitbox/hurtbox e `DamageCalculator` entre jogador e inimigos sem duplicar lógica.
- Adicionado suporte a dano, invulnerabilidade pós-acerto e knockback em `PlayerState.js` e `Player.js`.
- Expandida `Hud.js` (`formatEnemyCounter`) para exibir o progresso `Inimigos: X / 100`.
- Integrados `DifficultySystem`, `SpawnSystem`, `EnemyAI` e encerramento local da run por derrota em `MainScene.js`, removendo a instanciação do `TrainingDummy` (mantendo `TrainingDummy.js` intacto no repositório).

### Fase 3 — Sistema de Combate e Combos
- Adicionados `src/constants/combat.js` e `src/data/attacks.js` com os 3 golpes individuais e 5 combos provisórios configuráveis.
- Adicionados `src/combat/DamageCalculator.js`, `src/combat/Hitbox.js`, `src/combat/ComboSystem.js` e `src/combat/CombatSystem.js`.
- Adicionado `src/ui/ComboGuide.js` acessível por tecla configurável (`TAB` / `G`).
- Adicionado `src/entities/TrainingDummy.js` como alvo temporário de desenvolvimento para validação visual.
- Integrado combate ao `InputController`, `Player` (poses de ataque) e `MainScene`.
- Adicionados testes automatizados em `tests/phase3.test.js`.

### Fase 2 — Plataformas e movimentação vertical
#### Novas funcionalidades
- Utilitário determinístico `SeededRandom` (`src/utils/SeededRandom.js`) baseado em Mulberry32 com suporte a seeds numéricas e strings.
- Configurações centralizadas de geração em `src/constants/platforms.js` (limites de quantidade, dimensões, margens, espaçamento mínimo e zona segura inicial).
- Sistema independente `PlatformGenerator` (`src/systems/PlatformGenerator.js`) com geração procedural ancorada, cálculo de alcance de salto baseado na física real (`GRAVITY_Y`, `PLAYER_JUMP_VELOCITY`, `PLAYER_MOVE_SPEED`) e validação de alcançabilidade por BFS a partir do chão.
- Integração na `MainScene` (`generatePlatforms(seed)` e `clearPlatforms()`), mantendo câmera fixa e preparando a interface para regeneração futura pela loja oficial.
- Suíte de testes unitários da Fase 2 (`tests/phase2.test.js`).

### Fase 1 — Estrutura e protótipo jogável
#### Novas funcionalidades
- Tela inicial (`TitleScene`) com título configurável provisório e seleção interativa (teclado e mouse) entre os dois personagens iniciais.
- Catálogo provisório dos dois personagens (`src/data/characters.js`) diferenciados por cor identificadora, com atributos-base e multiplicadores neutros (`1.0`).
- Sistema centralizado de cálculo de atributos efetivos (`StatCalculator`), já preparado para modificadores de upgrades e efeitos temporários.
- Entidade `Player` e `PlayerState` separando estado de atributos, corpo físico retangular dedicado no Arcade Physics e representação visual minimalista em stick figure (`Graphics` sincronizado em `postupdate`).
- Controlador de entrada desacoplado (`InputController`) com mapeamento centralizado em `src/constants/controls.js`.
- Cena principal (`MainScene`) com gravidade vertical local (preservando gravidade global zero), câmera fixa, limites do mundo e cenário estático básico (chão e duas plataformas de teste) com colisões ativas.
- HUD provisória (`Hud`) exibindo personagem selecionado, HP atual/máximo, força e resistência contra bebidas.
- Suíte de testes unitários da Fase 1 (`tests/phase1.test.js`).

#### Correções e ajustes técnicos
- Alinhamento da dependência do motor para **Phaser `3.90.0`** (`^3.90.0` em `package.json` e `package-lock.json`), conforme definido em `TECHNICAL_DECISIONS.md`.
- Substituição do título fixo em `index.html` pelo título provisório configurável do protótipo.

### Planejamento
- Definição do conceito de jogo 2D de ação com elementos roguelite.
- Definição dos dois personagens jogáveis.
- Definição do sistema de três golpes e cinco combos.
- Definição da progressão de 100 inimigos e boss final.
- Definição do sistema de bebidas temporárias.
- Definição do catálogo de 30 upgrades.
- Definição das lojas Chiquinho Promos e Coquinho Extra.
- Definição da geração procedural de plataformas.
- Definição das regras de progressão de dificuldade.
- Definição da necessidade de mudanças visuais para todos os upgrades.

### Estrutura inicial
- Projeto inicial configurado com Vite e JavaScript.
- Arquitetura inicial criada.
- Documentação técnica criada.
- Regras permanentes de desenvolvimento definidas em GEMINI.md.

### Implementação
- Nenhuma funcionalidade de gameplay registrada como concluída até o momento.

## Regras

- Registrar somente alterações realmente realizadas.
- Separar funcionalidades novas de correções.
- Não registrar planos como funcionalidades implementadas.
- Manter as entradas em ordem cronológica, da mais recente para a mais antiga.
- Não apagar registros anteriores.
