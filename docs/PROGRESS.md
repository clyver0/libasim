
# PROGRESS — Acompanhamento do Desenvolvimento

## Estado atual

Projeto inicial configurado.

- [x] Estrutura inicial do projeto criada.
- [x] Dependências e ambiente inicial configurados.
- [x] Arquitetura inicial criada.
- [x] Arquivos de documentação criados.
- [x] GEMINI.md criado e reconhecido pelo Antigravity.
- [x] Documentação preenchida e revisada.
- [x] Fase 1 iniciada.

Nenhuma funcionalidade de gameplay deve ser considerada concluída até ser implementada e testada.

## Fase 1 — Estrutura e protótipo

Status: Implementada (aguardando validação manual no navegador pelo usuário).

Objetivos:
- [x] Configurar cena inicial.
- [x] Criar tela de título.
- [x] Criar seleção de personagem.
- [x] Criar os dois personagens.
- [x] Implementar movimentação horizontal.
- [x] Implementar pulo e gravidade.
- [x] Implementar colisões básicas.
- [x] Criar HUD provisória.
- [x] Validar build.
- [x] Executar testes.
- [ ] Validar funcionamento no navegador.

Registro da Fase 1:
- **Implementado:** Migração para Phaser `3.90.0`; constantes configuráveis (`gameplay.js`, `physics.js`, `controls.js`); catálogo neutro provisório de dois personagens diferenciados por cor (`characters.js`); cálculo centralizado de atributos (`StatCalculator.js`); controlador de teclado desacoplado (`InputController.js`); estado do jogador (`PlayerState.js`) e entidade `Player.js` com corpo físico Arcade Physics separado da representação visual em stick figure (`Graphics` sincronizado pós-física); `Hud.js` provisória; `TitleScene.js` com seleção de personagem; `MainScene.js` com gravidade local, câmera fixa e cenário estático básico (chão + 2 plataformas).
- **Testes realizados:** `npm ls phaser` (`3.90.0`), `npm test` com Vitest (`2` arquivos / `7` testes aprovados cobrindo setup inicial, catálogo de personagens, cálculo centralizado de atributos, HUD, movimentação, pulo e sincronização visual pós-física) e `npm run build` com Vite concluído sem erros.
- **Problemas conhecidos:** Nenhum erro de código, teste ou build; a validação visual no navegador permanece pendente de execução manual (`npm run dev`) pois o Chrome remoto não estava conectado à automação.
- **Próxima tarefa:** Após validação manual no navegador pelo usuário, iniciar o planejamento e implementação da **Fase 2 — Plataformas e movimentação vertical** (`PlatformGenerator` com seed por run).

Critério de conclusão:
Selecionar um personagem, iniciar o jogo e movimentá-lo em um cenário básico com física funcional.

## Fase 2 — Plataformas e movimentação vertical

Status: Implementada (validação manual no navegador pendente).

- [x] Criar PlatformGenerator.
- [x] Implementar geração procedural.
- [x] Implementar seed por run.
- [x] Validar acessibilidade.
- [x] Validar limites da tela.
- [x] Evitar sobreposições.
- [x] Preparar regeneração para lojas oficiais (`generatePlatforms(seed)` e `clearPlatforms()` na `MainScene`).
- [x] Testar diferentes seeds.

Registro da Fase 2:
- **Implementado:** `SeededRandom.js` (PRNG determinístico Mulberry32 com suporte a seed numérica/string), `src/constants/platforms.js` (limites, margens, espaçamentos e zona segura inicial), `PlatformGenerator.js` (geração incremental ancorada + cálculo de alcance de pulo baseado em gravidade, velocidade horizontal e pulo reais + validação de conectividade por BFS) e integração na `MainScene.js` com `generatePlatforms(seed)` e `clearPlatforms()`.
- **Testes realizados:** `npm test` com Vitest (`3` arquivos / `13` testes aprovados, incluindo `6` novos testes em `tests/phase2.test.js` validando reprodutibilidade, variação entre seeds, limites da tela, ausência de sobreposição, região inicial segura e acessibilidade a partir do chão) e `npm run build` com Vite concluído sem erros.
- **Problemas conhecidos:** Nenhum erro de código, teste ou build; a validação visual no navegador com diferentes seeds permanece para verificação manual com `npm run dev`.
- **Próxima tarefa:** Planejar e implementar a **Fase 3 — Combate e combos** após validação visual.

Critério de conclusão:
O personagem consegue utilizar as plataformas geradas sem encontrar configurações impossíveis.

## Fase 3 — Combate e combos

Status: Implementada (aguardando validação visual final no navegador).

- [x] Implementar os três golpes.
- [x] Implementar hitboxes e hurtboxes.
- [x] Implementar cálculo de dano.
- [x] Implementar cinco combos.
- [x] Implementar recuperação dos golpes.
- [x] Implementar knockback.
- [x] Criar guia de combos.
- [ ] Validar fluidez e responsividade no navegador.

Registro da Fase 3:
- **Implementado:** `src/constants/combat.js` e `src/data/attacks.js` (parâmetros centralizados, 3 golpes individuais e 5 combos provisórios configuráveis); `DamageCalculator.js`, `Hitbox.js`, `ComboSystem.js` (com janela baseada no momento de inserção do comando e suporte a prefixos compartilhados), `CombatSystem.js` (ciclo `idle`/`attacking`/`recovering`, buffer de 1 comando na recuperação e prevenção de dano duplicado), `ComboGuide.js` (painel alternável por tecla configurável) e `TrainingDummy.js` (recurso temporário de desenvolvimento para validação visual de hitboxes e knockback).
- **Testes realizados:** `npm test` com Vitest (`4` arquivos / `19` testes aprovados, incluindo `6` novos testes em `tests/phase3.test.js`) e `npm run build` com Vite concluído sem erros.
- **Próxima tarefa:** Após validação visual no navegador, iniciar o planejamento da **Fase 4 — Inimigos e progressão**.

Critério de conclusão:
Golpes e combos funcionam de maneira consistente.

## Fase 4 — Inimigos e progressão

Status: Implementada (validação visual manual no navegador pendente).

- [x] Criar entidade Enemy.
- [x] Implementar atributos dos inimigos.
- [x] Implementar SpawnSystem.
- [x] Implementar perseguição.
- [x] Implementar ataques.
- [x] Implementar uso de plataformas pela IA.
- [x] Implementar limite de inimigos simultâneos.
- [x] Implementar contador de derrotas.
- [x] Implementar escalonamento de dificuldade.

Registro da Fase 4:
- **Implementado:** `src/constants/enemies.js` e `src/data/enemies.js` (parâmetros provisórios configuráveis e catálogo base de inimigos comuns); `EnemyState.js` e `Enemy.js` (leitura automática de `scaledStats`, suporte a `countsAsCommonEnemy`, corpo físico Arcade Physics separado do visual stick figure + barra de HP, máquina de estados `falling`/`chasing`/`windup`/`attacking`/`recovering`/`hurt`/`dead` e `stopCombat()` ao morrer o jogador); `DifficultySystem.js` (escalonamento aplicado uma única vez sobre `baseStats` preservado, acionado apenas por visitas oficiais à loja do Chiquinho via `registerOfficialShopVisit`/`handleShopVisit({ isOfficial })` e evento `shop:official-visit`); `SpawnSystem.js` (spawn na região superior evitando o jogador, limites configuráveis `5`/`7`/`10`, `stop()`/`resume()`, bloqueio de contagem pós-remoção administrativa via `removedIds`, contagem idempotente e parada definitiva aos `100` inimigos derrotados); `EnemyAI.js` (perseguição, ataques no alcance, navegação por plataformas reutilizando `canJumpBetween`, condução horizontal em saltos diagonais sem manipular `y`/`velocity.y`, ponto de decolagem fora da sombra inferior, anti-stuck e separação entre inimigos); `CombatSystem.js` (`resolveHits` unificado e `cancel()` ao morrer o atacante); integração com `Player`/`PlayerState` (dano, invulnerabilidade breve, knockback), `Hud.js` (`Inimigos: X / 100`) e `MainScene.js` (`removeEnemyWithoutDefeat`, interrupção completa da run, IA, ataques, spawns e física na morte do jogador, e substituição da instanciação do `TrainingDummy`, mantendo `TrainingDummy.js` intacto no repositório).
- **Testes realizados:** `npm test` com Vitest (`5` arquivos / `26` testes aprovados, incluindo `7` testes em `tests/phase4.test.js` e toda a suíte anterior de `setup.test.js`, `phase1.test.js`, `phase2.test.js` e `phase3.test.js`) e `npm run build` com Vite concluído sem erros (`37` módulos transformados).
- **Problemas conhecidos:** Nenhum erro de código, teste ou build; a validação visual no navegador via automação falhou porque o Chrome/DevTools MCP não encontrou `DevToolsActivePort` (`C:\Users\leona\AppData\Local\Google\Chrome\User Data\DevToolsActivePort`), mantendo pendente a validação visual manual com `npm run dev`.
- **Próxima tarefa:** Após validação visual manual no navegador pelo usuário, planejar e implementar a **Fase 5 — Bebidas e efeitos temporários**.

Critério de conclusão:
O ciclo de combate contra inimigos funciona e permite alcançar 100 derrotas.

## Fase 5 — Bebidas e efeitos temporários

Status: Implementada (validação visual manual no navegador pendente).

- [x] Criar catálogo de bebidas.
- [x] Implementar raridades.
- [x] Implementar spawn e queda.
- [x] Implementar coleta.
- [x] Implementar efeitos de atributos.
- [x] Implementar resistência e duração.
- [x] Implementar timers.
- [x] Implementar efeitos visuais.
- [x] Implementar atração automática.

Registro da Fase 5:
- **Implementado:** `src/constants/drinks.js` e `src/data/drinks.js` (catálogo configurável provisório das 6 bebidas em ordem crescente de raridade: `Cantinho do Vale`, `Cerveja`, `Ginde 10`, `Chevette`, `Whisky com Energético` e `Absinto`); `src/systems/DrinkEffectManager.js` (cálculo centralizado de duração efetiva usando a resistência registrada no momento da coleta, temporizadores independentes, renovação de timer em coletas repetidas sem duplicar modificadores, cura instantânea em cada coleta sem reviver jogador morto, expiração simultânea no mesmo frame e limpeza total ao encerrar/morrer); `src/systems/DrinkSystem.js` (sorteio ponderado determinístico por seed via `SeededRandom`, agendamento de spawn, coleta idempotente e atração automática com raio inicial configurável + `extraRadius` preparado para a Fase 6); `src/entities/Drink.js` (entidade física Arcade Physics + visual minimalista colorido por bebida); integração em `PlayerState.js` (`heal` e `setActiveEffects`), `Player.js` (aura colorida de efeito ativo), `Hud.js` (`formatActiveEffects` com timers restantes) e `MainScene.js` (spawn, queda, overlap de coleta, atração e limpeza em morte/shutdown).
- **Testes realizados:** `npm test` com Vitest (`6` arquivos / `34` testes aprovados, incluindo `8` novos testes em `tests/phase5.test.js`) e `npm run build` com Vite concluído sem erros (`42` módulos transformados).
- **Problemas conhecidos:** Nenhum erro de código, teste ou build; a validação visual automatizada no navegador falhou porque o Chrome/DevTools local não possui `DevToolsActivePort` ativo (`C:\Users\leona\AppData\Local\Google\Chrome\User Data\DevToolsActivePort`), mantendo pendente a validação visual manual com `npm run dev`.
- **Próxima tarefa:** Após validação visual manual no navegador pelo usuário e aprovação, planejar a **Fase 6 — Sistema de upgrades**.

Critério de conclusão:
Todas as bebidas possuem efeitos funcionais, duração e apresentação visual.

## Fase 6 — Sistema de upgrades

Status: Implementada.

- [x] Criar catálogo de 30 upgrades.
- [x] Implementar cálculo centralizado.
- [x] Implementar efeitos positivos e negativos.
- [x] Implementar regras de acúmulo.
- [x] Implementar incompatibilidades.
- [x] Implementar seleção válida.
- [x] Testar combinações.

Registro da Fase 6:
- **Implementado:** `src/constants/upgrades.js` e `src/data/upgrades.js` (catálogo orientado a dados dos 30 upgrades previstos em `GAME_DESIGN.md`, separando modificadores mecânicos e metadados visuais); `src/systems/UpgradeSystem.js` (validação de repetição, suporte a `stackable`, incompatibilidade mútua `Miniatura` vs `Gigantismo`, requisitos e sorteio determinístico de opções válidas para lojas via `SeededRandom`); expansão de `StatCalculator.calculateGameplayModifiers` e `PlayerState` (`setUpgrades`, `getCombatStats`) mantendo imutabilidade dos atributos-base; integração mecânica real em `DamageCalculator.js` (multiplicadores global, golpe leve e combo + redução de dano), `CombatSystem.js` (velocidade de ataque, tempo de recuperação e alcance de hitbox), `Player.js` (velocidade horizontal, pulo, resistência a knockback e escala física `syncBodyScale` preservando base dos pés) e `MainScene.js` (integração com raridade e raio de atração de bebidas).
- **Testes realizados:** `npm test` com Vitest (`7` arquivos / `39` testes aprovados, incluindo `tests/phase6.test.js`) e `npm run build` com Vite concluído sem erros (`45` módulos transformados).
- **Problemas conhecidos:** Nenhum erro de código, teste ou build.
- **Próxima tarefa:** Implementar e validar a **Fase 7 — Aparência dos personagens** (`CharacterAppearanceSystem`).

Critério de conclusão:
Os 30 upgrades funcionam mecanicamente e respeitam as regras de compatibilidade.

## Fase 7 — Aparência dos personagens

Status: Implementada.

- [x] Criar CharacterAppearanceSystem.
- [x] Implementar acessórios.
- [x] Implementar alterações corporais.
- [x] Implementar alterações de escala.
- [x] Implementar efeitos visuais.
- [x] Integrar aparência às animações.
- [x] Testar combinações de upgrades.

Registro da Fase 7:
- **Implementado:** `src/systems/CharacterAppearanceSystem.js` com cálculo de articulações por pose/direção (`computePoseSkeleton`), resolução declarativa de camadas visuais para todos os 30 upgrades sem tocar em atributos mecânicos, regras explícitas de coexistência (`Braços de Gorila` + `Luvas`, `Tênis de Foguete` + `Pernas de Mola`, empilhamento de `Capacete de Obra` + `Chapéu da Sorte` + `Coroa do Caos`, e `Mochila de Bebidas` + `Ímã de Bebidas`); integração com `Player.js` (incluindo animação de caminhada articulada e aura de bebidas) e `MainScene.js`.
- **Testes realizados:** `npm test` com Vitest (`8` arquivos / `42` testes aprovados, incluindo `tests/phase7.test.js`) e `npm run build` com Vite concluído sem erros (`46` módulos transformados).
- **Problemas conhecidos:** Nenhum erro de código, teste ou build.
- **Próxima tarefa:** Implementar e validar a **Fase 8 — Lojas e Coquinho Extra**.

Critério de conclusão:
Cada upgrade possui representação visual compatível com os demais.

## Fase 8 — Lojas e Coquinho Extra

Status: Implementada.

- [x] Implementar contador das lojas oficiais.
- [x] Implementar loja do Chiquinho.
- [x] Implementar seleção de três upgrades.
- [x] Implementar escolha de um upgrade.
- [x] Implementar progressão de dificuldade.
- [x] Implementar regeneração de plataformas.
- [x] Implementar Coquinho Extra.
- [x] Implementar frequência de aparições.
- [x] Implementar recompensa extra.
- [x] Implementar loja especial.
- [x] Implementar tratamento de eventos simultâneos.

Registro da Fase 8:
- **Implementado:** `src/constants/shops.js` (parâmetros das lojas e agendamento do Coquinho Extra); `src/systems/GoldenEventScheduler.js` (mínimo 1 aparição 100% garantida e máximo 3 por run com probabilidades decrescentes e determinismo por seed); `src/entities/GoldenCharacter.js` (personagem dourado que atravessa a tela sem atacar nem contar como inimigo comum, concedendo loja especial ao ser atingido); `src/systems/ShopSystem.js` (marcos oficiais `25`/`50`/`75`, fila sequencial sem perda em eventos simultâneos, distinção estrita entre loja oficial que escala dificuldade/regenera plataformas e loja especial que preserva ambos); `src/ui/ShopUI.js` (interface com identidade própria por loja e suporte a teclado/mouse) e integração em `MainScene.js`.
- **Testes realizados:** `npm test` com Vitest (`9` arquivos / `46` testes aprovados, incluindo `tests/phase8.test.js`) e `npm run build` com Vite concluído sem erros (`51` módulos transformados).
- **Problemas conhecidos:** Nenhum erro de código, teste ou build.
- **Próxima tarefa:** Implementar e validar a **Fase 9 — Boss e encerramento**.

Critério de conclusão:
As lojas e eventos funcionam sem interferência indevida na progressão.

## Fase 9 — Boss e encerramento

Status: Implementada.

- [x] Criar entidade Boss.
- [x] Implementar atributos.
- [x] Implementar IA.
- [x] Implementar ataques.
- [x] Implementar balanceamento.
- [x] Implementar condição de vitória.
- [x] Criar tela de encerramento.

Registro da Fase 9:
- **Implementado:** `src/constants/boss.js` e `src/data/boss.js` (atributos próprios superiores aos inimigos comuns, 3 padrões de ataque configuráveis e escalonamento pelo estágio da run); `src/entities/BossState.js`, `src/entities/Boss.js` e `src/systems/BossAI.js` (perseguição reutilizando navegação de plataformas, Golpe Esmagador, Investida Brutal e transição em `<= 50%` HP para Fase 2 Enfurecida com Onda do Caos); `src/systems/RunManager.js` (estado global consolidado da partida); `src/scenes/VictoryScene.js` e `src/scenes/GameOverScene.js` registradas em `src/config.js` e integradas em `src/scenes/MainScene.js`.
- **Testes realizados:** `npm test` com Vitest (`10` arquivos / `49` testes aprovados, incluindo `tests/phase9.test.js`) e `npm run build` com Vite concluído sem erros (`59` módulos transformados).
- **Problemas conhecidos:** Nenhum erro de código, teste ou build.
- **Próxima tarefa:** Implementar e validar a **Fase 10 — Interface e polimento**.

Critério de conclusão:
Uma run completa pode ser finalizada derrotando o boss.

## Fase 10 — Interface e polimento

Status: Implementada (validação visual manual no navegador pendente).

- [x] Finalizar tela inicial.
- [x] Finalizar seleção de personagem.
- [x] Finalizar HUD.
- [x] Finalizar lojas.
- [x] Melhorar animações.
- [x] Adicionar efeitos sonoros.
- [x] Adicionar música.
- [x] Melhorar feedback visual.
- [x] Ajustar balanceamento.
- [x] Realizar testes de regressão.
- [x] Otimizar desempenho.

Registro da Fase 10:
- **Implementado:** diferenciação completa de atributos e velocidade dos dois personagens (`Relâmpago Azul` vs `Colosso Laranja`), catálogo de `4` arquétipos distintos de inimigos comuns e **Mini-Chefão aos 50 inimigos derrotados** (`Leão de Chácara`) com drop de bebida rara; `src/ui/Tooltip.js` (tooltips com título e explicação e clamp nas bordas da tela em HUD, tela inicial e lojas); `src/audio/SoundBank.js` e expansão de `src/audio/AudioManager.js` (efeitos sonoros e loop musical sintetizados em WAV PCM em memória via Howler.js, com atalho `[M]` de mute); `src/utils/display.js` (tela fixa `960x540` centralizada sem esticamento CSS e com textos em alta densidade); `src/ui/ArenaBackdrop.js` (cenário urbano noturno ilustrado, chão e plataformas suspensas estilizadas com iluminação por estágio e arcos energéticos de golpe substituindo hitboxes de debug); refinamento visual completo dos personagens, inimigos, bebidas e interfaces (`TitleScene.js`, `Hud.js`, `ShopUI.js`, `ComboGuide.js`, `VictoryScene.js`, `GameOverScene.js`, `MainScene.js`); correção definitiva em `CombatSystem.js` e `Player.js` para impedir travamento em `RECOVERING` órfão quando uma loja abre durante um golpe ativo.
- **Testes realizados:** `npm test` com Vitest (`11` arquivos / `54` testes aprovados, incluindo testes de regressão pós-loja, validação de benefícios positivos nos 30 upgrades, detalhamento de bebidas/upgrades, transição segura e cinemática contínua em `tests/phase10.test.js`) e `npm run build` com Vite concluído sem erros (`63` módulos transformados).
- **Problemas conhecidos:** Validação visual automatizada via Chrome DevTools permanece indisponível no ambiente local por ausência de `DevToolsActivePort` (`C:\Users\leona\AppData\Local\Google\Chrome\User Data\DevToolsActivePort`), devendo ser executada manualmente via `npm run dev`.
- **Próxima tarefa:** Validação manual jogável de ponta a ponta pelo usuário e eventuais ajustes finos de balanceamento numérico.

Critério de conclusão:
O jogo apresenta uma experiência completa e consistente do início ao fim.

## Regras de atualização

Ao finalizar uma tarefa:
1. Atualizar o status correspondente.
2. Registrar o que foi implementado.
3. Registrar testes realizados.
4. Registrar problemas conhecidos.
5. Indicar a próxima tarefa.

Não marcar tarefas como concluídas sem implementação e validação.

Não iniciar fases futuras sem aprovação.
