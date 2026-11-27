
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
- **Implementado:** `src/constants/drinks.js` e `src/data/drinks.js` (catálogo configurável provisório das 6 bebidas em ordem crescente de raridade: `Cantinho do Vale`, `Cerveja`, `Gin de 10`, `Chevette`, `Mansão Maromba` e `Absinto`); `src/systems/DrinkEffectManager.js` (cálculo centralizado de duração efetiva usando a resistência registrada no momento da coleta, temporizadores independentes e modificadores acumuláveis em coletas repetidas, cura instantânea em cada coleta sem reviver jogador morto, expiração simultânea no mesmo frame e limpeza total ao encerrar/morrer); `src/systems/DrinkSystem.js` (sorteio ponderado determinístico por seed via `SeededRandom`, agendamento de spawn, coleta idempotente e atração automática com raio inicial configurável + `extraRadius` preparado para a Fase 6); `src/entities/Drink.js` (entidade física Arcade Physics + sprites fotográficos com fallback procedural); integração em `PlayerState.js` (`heal` e `setActiveEffects`), `Player.js` (aura colorida de efeito ativo), `Hud.js` (`formatActiveEffects` com timers restantes) e `MainScene.js` (pré-carregamento dos sprites, spawn, queda, overlap de coleta, atração e limpeza em morte/shutdown).
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
- [x] Adicionar rostos reais aos personagens.
- [x] Personalizar o plano de fundo da Fase 1.
- [x] Criar modal inicial da Fase 1 com pausa antes dos inimigos.
- [x] Trocar a música do menu por uma faixa específica.
- [x] Adicionar música japonesa na Fase 1.
- [x] Reduzir o efeito visual da embriaguez.

Registro da Fase 10:
- **Implementado:** diferenciação completa de atributos e velocidade dos dois personagens (`Relâmpago Azul` vs `Colosso Laranja`), catálogo de `4` arquétipos distintos de inimigos comuns e **Mini-Chefão aos 50 inimigos derrotados** (`Leão de Chácara`) com drop de bebida rara; `src/ui/Tooltip.js` (tooltips com título e explicação e clamp nas bordas da tela em HUD, tela inicial e lojas); `src/audio/SoundBank.js` e expansão de `src/audio/AudioManager.js` (efeitos sonoros e loop musical sintetizados em WAV PCM em memória via Howler.js, com atalho `[M]` de mute); `src/utils/display.js` (tela fixa `960x540` centralizada sem esticamento CSS e com textos em alta densidade); `src/ui/ArenaBackdrop.js` (cenário urbano noturno ilustrado, chão e plataformas suspensas estilizadas com iluminação por estágio e arcos energéticos de golpe substituindo hitboxes de debug); refinamento visual completo dos personagens, inimigos, bebidas e interfaces (`TitleScene.js`, `Hud.js`, `ShopUI.js`, `ComboGuide.js`, `VictoryScene.js`, `GameOverScene.js`, `MainScene.js`); correção definitiva em `CombatSystem.js` e `Player.js` para impedir travamento em `RECOVERING` órfão quando uma loja abre durante um golpe ativo.
- **Testes realizados:** `npm test` com Vitest (`11` arquivos / `54` testes aprovados, incluindo testes de regressão pós-loja, validação de benefícios positivos nos 30 upgrades, detalhamento de bebidas/upgrades, transição segura e cinemática contínua em `tests/phase10.test.js`) e `npm run build` com Vite concluído sem erros (`63` módulos transformados).
- **Problemas conhecidos:** Validação visual automatizada via Chrome DevTools permanece indisponível no ambiente local por ausência de `DevToolsActivePort` (`C:\Users\leona\AppData\Local\Google\Chrome\User Data\DevToolsActivePort`), devendo ser executada manualmente via `npm run dev`.
- **Próxima tarefa:** Validação manual jogável de ponta a ponta pelo usuário e eventuais ajustes finos de balanceamento numérico.

Critério de conclusão:
O jogo apresenta uma experiência completa e consistente do início ao fim.

## Expansão — Personagens, Habilidades, Inimigos, Efeitos Visuais e Áudio

Status: Implementada e validada (testes automatizados, build e inicialização no navegador).

- [x] Pesquisar, avaliar e integrar bibliotecas (`phaser3-rex-plugins` + recursos nativos do Phaser 3.90 + `Howler.js`).
- [x] Implementar os três personagens jogáveis (**Açougue**, **Piri**, **Tonegi**) com atributos, tamanhos, visuais e sinergia de *Cantinho do Vale* no Açougue (`2×` a `10×`).
- [x] Implementar as três habilidades especiais (**Terça do Cantinho**, **O fit se calou** com carga de 10 abates, **Pisa ligeiro, pisa ligeiro** com formigas auxiliares).
- [x] Implementar pós-processamento exagerado de embriaguez (`Warp` + `Swirl` + aberração cromática/visão dupla + `Barrel`/`ColorMatrix`/`Bloom`) com ajuste configurável (`[N]`) e restauração completa.
- [x] Reduzir frequência de spawn das bebidas, acelerar queda e implementar física de quique com *squash & stretch*.
- [x] Aprimorar efeitos visuais de ataques (partículas, rastros, antecipação, `Shockwave` WebGL em combos/especiais e tremor de câmera).
- [x] Implementar progressão em 4 fases (a cada 25 abates), ajuste de inimigos existentes e 10 arquétipos distintos de inimigos comuns.
- [x] Implementar Fase 4 — Chuva de Formigas com teto de entidades e imunidade letal de Tonegi (`SPLAT!`).
- [x] Pesquisar, baixar e integrar músicas clássicas em domínio público/CC0 com `MusicDirector` (trilha normal + músicas distintas para Mini-Chefão e Fases 1 e 2 do Boss Final).
- [x] Atualizar documentação oficial e criar testes abrangentes (`tests/expansion.test.js`).

Registro da Expansão:
- **Implementado:** `src/constants/expansion.js`, `src/data/abilities.js`, `src/data/music.js`, `src/systems/SpecialAbilitySystem.js`, `src/systems/AbilityRuntime.js`, `src/systems/PhaseSystem.js`, `src/systems/DrunkIntensity.js`, `src/entities/Ant.js`, `src/systems/AntManager.js`, `src/ui/AbilityVisuals.js`, `src/ui/AbilityHud.js`, `src/ui/DrunkEffect.js`, `src/ui/EffectsManager.js`, `src/audio/MusicDirector.js`, 4 faixas em domínio público em `public/audio/music/` (+ `CREDITS.md`) e integração completa em `MainScene.js`, `TitleScene.js`, `Player.js`, `PlayerState.js`, `Drink.js`, `DrinkEffectManager.js`, `AudioManager.js`, `SoundBank.js`, `characters.js` e `enemies.js`.
- **Testes realizados:** `npm test` com Vitest (`12` arquivos / `66` testes aprovados, incluindo 12 novos testes dedicados em `tests/expansion.test.js`) e `npm run build` com Vite concluído sem erros (`91` módulos, 3 chunks *lazy* de shaders do `phaser3-rex-plugins` somando `2,75 kB` gzip).
- **Problemas conhecidos:** Nenhum erro de teste ou build; o usuário assumiu a aba do navegador durante a validação visual em `http://localhost:5175/`, restando validação jogável completa de áudio/efeitos em tempo real pelo usuário.
- **Próxima tarefa:** Feedback manual do jogador sobre balanceamento fino (velocidades, cooldowns e intensidade da embriaguez) durante partidas completas.

## Atualização — acúmulo e sprites das bebidas

- **Implementado:** efeitos repetidos acumulam com temporizadores independentes; a sinergia do Açougue sobe de `2×` a `10×`, com chamas e overlay vermelho progressivos; sprites preservam a proporção original com altura fixa; arte da loja oficial adicionada.
- **Testes:** `npm test -- --run tests/phase5.test.js tests/expansion.test.js tests/phase8.test.js` (26 testes aprovados); `npm run build` concluído com 91 módulos e assets presentes em `dist/`.
- **Limitação:** as fontes/licenças das fotos substituídas não foram registradas; a validação visual no navegador ainda está pendente. O build também reporta o bundle principal acima de 500 kB.
- **Próxima tarefa:** validar a apresentação da arte da loja e dos sprites durante uma partida.
- **Correção adicional:** mantida a escala proporcional do sprite da bebida durante a sincronização visual; `npm test -- --run tests/expansion.test.js` passou (14 testes).

## Atualização — lojas em tela cheia, upgrades e bebida especial

- **Implementado:** as modais oficial e do Noia agora ocupam a tela inteira e usam, respectivamente, o fundo do Chiquinho e a nova imagem fornecida. Cinco upgrades originais foram substituídos; bônus de sorte/velocidade dos inimigos e aparição do Noia estão integrados aos sistemas existentes. A Cachaça de Cobra ativa um efeito de 15 segundos com perda gradual de HP. A Caseirinha da Casa é a mais rara e recebe bipes, aro pulsante e aviso visual ao surgir.
- **Testes:** `npm test` — 12 arquivos e 72 testes aprovados. `npm run build` concluído com 91 módulos; sem erros.
- **Limitação:** a Caseirinha usa o sprite procedural atual até receber uma imagem própria. Ainda falta validar visualmente as modais e o efeito durante uma partida no navegador.

## Atualização — bebidas maiores, Água, IA e pausa

- **Implementado:** altura visual de todas as bebidas dobrada com proporção preservada; Água adicionada como bebida mais comum e de cura instantânea. Tênis de Foguete reforçado com velocidade e força altas, custo de resistência e sorte. IA não oscila durante quedas; Noia surge alinhado ao chão e exibe o nome; menu de pausa oferece continuar, reiniciar ou retornar à seleção.
- **Pausa:** botão e atalho `P` confirmados no navegador; o menu oferece continuar, reiniciar e retornar à seleção. `ESC` não é anunciado como atalho porque não foi reconhecido de forma consistente durante a validação visual.
- **Testes:** `npm test` — 12 arquivos e 74 testes aprovados.
- **Build e diff:** `npm run build` concluído com 91 módulos; `git diff --check` sem erros.

## Atualização — especiais, fases, timers e áudio

- **Implementado:** animação de morte antes do Game Over; anúncio animado “PASSOU DE FASE”; modo secreto alternável com `1-2-3-4-5`, modal, invulnerabilidade e dano extremos.
- **Gameplay:** os três especiais carregam com 10 abates; forma do Tonegi alinhada ao chão; hitbox vertical do carro do Piri reduzida; plataformas elevadas atravessáveis por baixo, mantendo o chão sólido.
- **Bebidas/áudio:** barras individuais de duração no topo central, em câmera sem pós-processamento; efeito visual suspenso na loja oficial; `Howler.rate()` acompanha sutilmente a intensidade da embriaguez.
- **Validação visual:** sequência secreta ligada/desligada, barras legíveis sobre a distorção e loja oficial sem o efeito visual foram conferidas no navegador.
- **Testes:** `npm test` — 12 arquivos e 80 testes aprovados. `npm run build` concluído com 93 módulos; sem erros. `git diff --check` sem erros.
- **Observação:** o build mantém o aviso já existente de bundle principal acima de 500 kB.

## Atualização — configuração de regras de teste e build

- **Implementado:** atualizados `GEMINI.md` e `docs/TECHNICAL_DECISIONS.md` com a regra explícita de nunca executar testes de build (`npm run build`) nem testes rodando a aplicação (`npm run dev`, servidor local ou navegador) sem solicitação explícita do usuário.
- **Testes:** não aplicável (alteração apenas em documentação/regras do projeto).
- **Problemas conhecidos:** nenhum.
- **Próxima tarefa:** aguardar novas instruções de configuração do projeto.

## Transformação do Gameplay e Movimentação Horizontal

Status: Implementada e validada via suíte automatizada Vitest (validação visual manual pelo usuário conforme regra de não iniciar servidor/build sem solicitação explícita).

- [x] Analisar sistemas existentes e pesquisar bibliotecas compatíveis com Phaser `3.90.0` (priorizando APIs nativas + `phaser3-rex-plugins` e `Howler.js` já instalados).
- [x] Implementar movimentação horizontal estilo *beat 'em up* (controle manual livre do jogador, sem andar automaticamente fora da abertura de fase), acompanhada por câmera horizontal suave e limites dinâmicos sem barreiras artificiais.
- [x] Criar `HorizontalTrackSystem` com geração procedural determinística em chunks horizontais, poda automática atrás da câmera e três categorias de plataformas (`static`, `moving` horizontal/vertical e `crumbling` desintegrável).
- [x] Implementar habilidade de Dash/Slide (`[SHIFT]` / `[S]` / `[DOWN]`) com pose corporal dedicada, partículas, esquiva temporária, cooldown configurável, indicador na HUD e parada consistente em obstáculos.
- [x] Implementar buracos no chão com perda exata de `30 HP`, ricochete de retorno à área jogável e proteção contra dano repetido durante a recuperação.
- [x] Implementar `PhaseOpeningSystem` para abrir todas as 4 fases (`0`, `25`, `50` e `75` inimigos derrotados) com caminhada solo do jogador, silêncio musical inicial, seta cartunesca piscando para a direita, fade-in da música e início posterior dos spawns.
- [x] Aprimorar cinematografia e identidade visual cartunesca (`ParallaxBackdrop`, fontes `Bangers` e `Fredoka`, barras *letterbox*, cortina de transição entre fases, *hitstop* pontual e `setScrollFactor(0)` em toda a UI).
- [x] Criar testes automatizados direcionados (`tests/horizontal_gameplay.test.js`) e validar toda a suíte de regressão.

Registro da Transformação Horizontal:
- **Implementado:** novos módulos `src/constants/typography.js`, `src/systems/HorizontalTrackSystem.js`, `src/systems/PhaseOpeningSystem.js` e `src/ui/UiCameraLayer.js` (isolamento completo de HUD e modais em câmera dedicada imune à distorção das bebidas); evolução pontual e retrocompatível em `src/constants/controls.js`, `src/constants/physics.js`, `src/constants/platforms.js`, `src/constants/expansion.js`, `src/audio/SoundBank.js`, `src/audio/MusicDirector.js`, `src/entities/Player.js`, `src/entities/GoldenCharacter.js`, `src/systems/InputController.js`, `src/systems/CharacterAppearanceSystem.js`, `src/systems/SpawnSystem.js`, `src/systems/EnemyAI.js`, `src/systems/DrinkSystem.js`, `src/systems/AntManager.js`, `src/systems/AbilityRuntime.js`, `src/ui/ArenaBackdrop.js`, `src/ui/EffectsManager.js`, `src/ui/Hud.js`, `src/ui/AbilityHud.js`, `src/ui/ShopUI.js`, `src/ui/ComboGuide.js`, `src/ui/Tooltip.js`, `src/scenes/MainScene.js`, `src/scenes/TitleScene.js`, `src/scenes/VictoryScene.js`, `src/scenes/GameOverScene.js` e `index.html`.
- **Testes realizados:** suíte automatizada com Vitest (`npx vitest run` — todos os arquivos de teste anteriores + `tests/horizontal_gameplay.test.js`, sem executar `npm run build` nem `npm run dev` conforme regras do projeto).
- **Problemas conhecidos:** nenhum erro nos testes automatizados; validação jogável visual no navegador fica a cargo do usuário quando desejar executar localmente.
- **Próxima tarefa:** ajustes finos de balanceamento de ritmo horizontal ou próximas evoluções planejadas pelo usuário.

## Atualização — transformação do gameplay e movimentação horizontal

Status: Implementada e validada via suíte automatizada Vitest (validação visual manual no navegador pendente conforme regra do projeto).

- [x] Pesquisar bibliotecas compatíveis com Phaser `3.90.0` e registrar justificativas técnicas priorizando recursos nativos.
- [x] Implementar corrida contínua para a direita no `Player` com acompanhamento horizontal de câmera, cenário em *parallax* e remoção de limites artificiais à direita.
- [x] Implementar geração procedural contínua em chunks (`HorizontalTrackSystem`) com plataformas estáticas, móveis (horizontal/vertical) e desintegráveis após contato.
- [x] Implementar habilidade de Dash / Slide (`SHIFT` / `S` / `Baixo`) com animação corporal própria, partículas, esquiva de ataques, cooldown configurável e parada consistente em obstáculos.
- [x] Implementar buracos no chão com perda exata de `30 HP`, ricochete de volta à área jogável e proteção contra dano repetido durante a recuperação.
- [x] Implementar abertura padronizada no início de todas as 4 fases (`0`, `25`, `50` e `75` abates): caminhada solo, silêncio inicial, seta cartunesca piscando, entrada de música em *fade-in* e retomada do spawn.
- [x] Aprimorar cinematografia e identidade visual com fontes cartunescas (`Bangers` e `Fredoka`), barras *letterbox*, cortina de transição entre fases, *hitstop* sutil e indicador de Dash na HUD.
- [x] Criar testes automatizados direcionados (`tests/horizontal_gameplay.test.js`) e validar regressão completa.

Registro da atualização:
- **Implementado:** `src/constants/typography.js`, `src/systems/HorizontalTrackSystem.js`, `src/systems/PhaseOpeningSystem.js`, expansão de `src/constants/controls.js`, `src/constants/physics.js`, `src/constants/platforms.js`, `src/constants/expansion.js`, `src/audio/SoundBank.js`, `src/audio/MusicDirector.js`, `src/entities/Player.js`, `src/systems/InputController.js`, `src/systems/CharacterAppearanceSystem.js`, `src/systems/SpawnSystem.js`, `src/systems/EnemyAI.js`, `src/systems/DrinkSystem.js`, `src/systems/AntManager.js`, `src/entities/GoldenCharacter.js`, `src/systems/AbilityRuntime.js`, `src/ui/ArenaBackdrop.js` (`ParallaxBackdrop` + renderização de buracos e 3 categorias de plataformas), `src/ui/EffectsManager.js`, `src/ui/Hud.js`, `src/ui/AbilityHud.js`, `src/ui/ShopUI.js`, `src/ui/ComboGuide.js`, `src/ui/Tooltip.js`, `src/scenes/MainScene.js`, `src/scenes/TitleScene.js`, `src/scenes/VictoryScene.js`, `src/scenes/GameOverScene.js` e `index.html`.
- **Testes:** `npx vitest run` executado (sem rodar `npm run build` nem `npm run dev`, respeitando `GEMINI.md`).
- **Problemas conhecidos:** nenhum erro nos testes automatizados; validação jogável visual fica para execução manual pelo usuário quando desejar.
- **Próxima tarefa:** aguardar validação manual do usuário e instruções dos próximos prompts.

## Atualização — regras detalhadas de validação do projeto

- **Implementado:** atualizados `GEMINI.md`, `docs/TECHNICAL_DECISIONS.md`, `docs/PROGRESS.md` e `docs/CHANGELOG.md` detalhando o que manter (Vitest unitário/integração, correção de falhas e revisão estática), o que não executar (`npm run build`/builds, `npm run dev`, navegador/jogo, Playwright/Cypress/automação visual, screenshots, gravações de vídeo e validações visuais/manuais) e o fluxo de 5 passos ao concluir cada etapa.
- **Testes:** não aplicável (alteração exclusiva em documentação/regras do projeto).
- **Problemas conhecidos:** nenhum.
- **Próxima tarefa:** aguardar novas instruções de configuração do projeto.

## Mudança de Perspectiva — 3D na Fase 2 e Top-Down nas Fases 3 e 4

Status: Implementada e validada via suíte automatizada Vitest (validação visual manual no navegador pelo usuário conforme regras do projeto).

- [x] Fase 1 (`0–24` abates): preservado integralmente o estilo lateral 2D atual (`side_2d`).
- [x] Fase 2 (`25–49` abates): transformada em **gameplay FPS 3D sem uso de mouse (`first_person_3d`)** — câmera frontal pura com *head-bob*, *roll* de strafe e *kick* de golpe; controles `W/S` avanço/recuo, `A/D` strafe lateral em `laneZ`, `Espaço` pulo e `Shift` dash 3D; modelos de inimigos/bosses **100% articulados em 3D real** (`solveIK3D` + cilindros cônicos com escorço de perspectiva por articulação e ordenação de profundidade por membro) readaptando todas as aparências e acessórios da Fase 1 2D (`ninja_headband`, `rocket_shoes`, `concrete_shoulders`, `beer_belly`, `precision_glasses`, `boxing_gloves`, `hard_hat`, `chaos_crown`, `hero_cape`, `spring_legs` e lança 3D do `spear_thrower`); animações reais de ataque 3D (`WINDUP` -> `ATTACKING` investindo em `-X` na direção da câmera -> `RECOVERING`); cenário Liberdade 3D com janelas iluminadas, postes de lanternas vermelhas, meios-fios de perigo e viewmodel FPS polido em canvas WebGL único do Phaser.
- [x] Fase 3 (`50–74` abates): implementado gameplay completo em Visão Superior (`top_down`), incluindo movimentação e dash em 8 direções sem gravidade, hitboxes rotacionadas/escaladas em 360° conforme o vetor de mira (`aimVector`), knockback 2D, IA 360° de inimigos/boss/formigas, crateras 2D no asfalto (`-30 HP` + ricochete radial + proteção na recuperação), obstáculos sólidos de cobertura (`static`/`moving`) e grades frágeis de piso (`crumbling`).
- [x] Fase 4 (`75–99` abates): preservada a perspectiva Top-Down da Fase 3 integrada ao enxame/chuva de formigas em 2D.
- [x] Transições cinematográficas marcantes nas mudanças de perspectiva (`side_2d -> side_3d` e `side_3d -> top_down`).
- [x] Criada suíte automatizada `tests/perspective_phases.test.js` e validada regressão completa no Vitest.

Registro da Mudança de Perspectiva:
- **Implementado:** novos módulos `src/systems/PerspectiveSystem.js`, `src/ui/Stage3DRenderer.js` e `src/ui/TopDownRenderer.js`; adaptações pontuais em `src/constants/controls.js`, `src/systems/InputController.js` (com deduplicação de teclas compartilhadas), `src/combat/Hitbox.js`, `src/combat/CombatSystem.js`, `src/systems/HorizontalTrackSystem.js`, `src/entities/Player.js`, `src/entities/Enemy.js`, `src/entities/Boss.js`, `src/entities/Ant.js`, `src/entities/Drink.js`, `src/entities/GoldenCharacter.js`, `src/systems/EnemyAI.js`, `src/systems/BossAI.js`, `src/systems/AntManager.js`, `src/systems/SpawnSystem.js`, `src/systems/DrinkSystem.js`, `src/systems/AbilityRuntime.js`, `src/ui/ArenaBackdrop.js`, `src/ui/EffectsManager.js` e `src/scenes/MainScene.js`. Zero novas dependências npm adicionadas.
- **Testes realizados:** suíte completa com Vitest (`npx vitest run --pool=vmThreads` — `14` arquivos e `93` testes aprovados, incluindo `tests/perspective_phases.test.js` e `tests/horizontal_gameplay.test.js`). Nenhum comando de build ou servidor de jogo executado, conforme `GEMINI.md`.
- **Problemas conhecidos:** nenhum erro nos testes automatizados ou na revisão estática; validação visual manual fica a cargo do usuário.
- **Próxima tarefa:** aguardar validação manual do usuário e instruções dos próximos prompts.

## Atualização — regras de economia de tokens

- **Implementado:** adicionada a seção `## Economia de tokens` em `GEMINI.md` e atualizada a seção `14. Economia de contexto, tokens e desenvolvimento` em `docs/TECHNICAL_DECISIONS.md`, além do registro em `docs/CHANGELOG.md`.
- **Testes:** não aplicável (alteração exclusiva em documentação/regras do projeto).
- **Problemas conhecidos:** nenhum.
- **Próxima tarefa:** aguardar novas instruções de configuração do projeto.

## Dev Tools — Controle de Progressão de Fases (`12345`)

Status: Implementada e validada via suíte automatizada Vitest (exclusiva do ambiente `DEV`; validação visual manual no navegador pelo usuário).

- [x] Manter a ferramenta exclusiva do ambiente de desenvolvimento (`import.meta.env.DEV`).
- [x] Permitir selecionar diretamente entre as 4 fases na modal aberta por `12345`.
- [x] Permitir avançar imediatamente para a próxima fase.
- [x] Permitir ativar/desativar progressão automática, avançando de fase a cada `25` inimigos simulados.
- [x] Atualizar cenário, perspectiva, dificuldade e sistemas correspondentes (`PhaseSystem`, `DifficultySystem`, `ShopSystem`, `SpawnSystem`, `HorizontalTrackSystem`, `PerspectiveSystem`, `AntManager`, `MusicDirector` e HUDs) ao selecionar ou avançar de fase.
- [x] Simular aleatoriamente bebidas e upgrades em quantidade proporcional à fase selecionada, utilizando os catálogos e sistemas reais (`UpgradeSystem`, `DrinkSystem` e `DrinkEffectManager`).
- [x] Criar testes automatizados direcionados (`tests/dev_tools.test.js`) e validar regressão nos testes relevantes.

Registro da Dev Tools:
- **Implementado:** novo módulo desacoplado `src/systems/DevToolsController.js` e evolução da modal `12345` em `src/scenes/MainScene.js` (protegida por `isDevEnvironment()`), com botões diretos para Fases 1–4, avanço imediato, modo automático a cada 25 inimigos simulados e alternância do modo imortal, sincronizando cenário, dificuldade e build proporcional de upgrades/bebidas.
- **Testes realizados:** Vitest direcionado (`npx vitest run tests/dev_tools.test.js tests/expansion.test.js tests/perspective_phases.test.js tests/horizontal_gameplay.test.js` — `4` arquivos / `36` testes aprovados).
- **Problemas conhecidos:** nenhum erro nos testes automatizados ou na revisão estática.

## Unificação do Gameplay em 2D Lateral (`side_2d`) nas 4 Fases

Status: Concluída e validada via suíte automatizada Vitest (validação visual manual no navegador pelo usuário).

- [x] Remover completamente implementações específicas de FPS 3D (Fase 2) e Top-Down (Fases 3 e 4): `Stage3DRenderer.js`, `TopDownRenderer.js` e `PerspectiveSystem.js`.
- [x] Limpar referências de perspectiva (`firstPersonMode`, `topDownMode`, `laneZ`, `customRenderHidden`, `FP_JUMP`, `FP_DASH`, `TOP_DOWN_DASH`) em `MainScene.js`, entidades, combate, IA, controles, `HorizontalTrackSystem`, `SpawnSystem`, `DrinkSystem`, `AntManager`, `AbilityRuntime`, `EffectsManager` e `DevToolsController`.
- [x] Preservar integralmente a progressão das 4 fases, abertura de fase, dificuldade escalonada, plataformas (`static` na Fase 1, `moving` a partir da Fase 2, `crumbling` a partir da Fase 3), buracos com ricochete, combate, bebidas, upgrades, habilidades, chuva de formigas e bosses em `side_2d`.
- [x] Atualizar testes automatizados (`tests/dev_tools.test.js` e `tests/perspective_phases.test.js`) e validar toda a suíte Vitest sem referências residuais.

Registro da Unificação 2D Lateral:
- **Implementado:** remoção de `Stage3DRenderer.js`, `TopDownRenderer.js` e `PerspectiveSystem.js` e simplificação localizada dos sistemas, entidades e `MainScene.js` para operar exclusivamente em `side_2d` nas 4 fases.
- **Testes realizados:** suíte completa Vitest (`npx vitest run --pool=vmThreads --reporter=dot` — `15` arquivos / `96` testes aprovados) + verificação estática sem referências residuais de FPS/Top-Down.
- **Problemas conhecidos:** nenhum erro nos testes automatizados ou na revisão estática.
- **Próxima tarefa:** aguardar validação manual do usuário e novas instruções.

## Regras de atualização

Ao finalizar uma tarefa:
1. Executar somente os testes automatizados relevantes com Vitest e corrigir eventuais falhas.
2. Fazer revisão estática das alterações (lógica e integração), sem gerar builds, iniciar o jogo ou produzir evidências visuais (salvo se solicitado pelo usuário).
3. Atualizar o status correspondente, registrar o que foi implementado, quais testes automatizados foram executados, problemas conhecidos e a próxima tarefa.
4. Atualizar `CHANGELOG.md`.
5. Informar ao usuário o que foi implementado e quais testes automatizados foram executados.

Não marcar tarefas como concluídas sem implementação e validação.

Não iniciar fases futuras sem aprovação.
