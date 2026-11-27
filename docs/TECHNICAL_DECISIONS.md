
# TECHNICAL DECISIONS — Decisões Técnicas

## 1. Engine

Decisão:
Utilizar Phaser 3.

Justificativa:
Engine especializada em jogos 2D, com suporte a cenas, física, animações, entrada de comandos e gerenciamento de entidades.

Regra:
Não migrar para Phaser 4 ou outra engine sem apresentar justificativa técnica e obter aprovação.

## 2. Ferramentas de desenvolvimento

Decisões:
- Vite para desenvolvimento e build.
- JavaScript ES Modules.
- Vitest para testes automatizados.
- Howler.js para áudio.
- Phaser Arcade Physics para física.

Não adicionar dependências sem necessidade concreta.

## 3. Interface

Decisão:
Utilizar a interface nativa do Phaser sempre que isso for suficiente.

HTML e CSS podem ser usados para menus e elementos externos de interface quando trouxerem benefício real.

Não adicionar React ao núcleo do jogo.

## 4. Arquitetura

Decisão:
Adotar arquitetura modular, separando entidades, sistemas, dados, combate e interface.

Justificativa:
Permitir evolução incremental e reduzir acoplamento entre funcionalidades.

## 5. Dados e balanceamento

Decisão:
Manter atributos, bebidas, inimigos e upgrades em catálogos configuráveis.

Justificativa:
Permitir balanceamento sem alterar a lógica dos sistemas.

## 6. Física

Decisão:
Utilizar Phaser Arcade Physics.

A gravidade da gameplay deve ser configurada na cena correspondente.

A configuração global pode permanecer com gravidade zero para preservar o comportamento das cenas de menu e os testes de inicialização existentes.

## 7. Câmera e Progressão Horizontal

Decisão:
Substituir a câmera estática por acompanhamento horizontal contínuo (`scrollX` suave com *lookahead* à direita e `scrollY` fixo em `0`), combinado a limites físicos dinâmicos sem barreira à direita nem fundo bloqueante artificial (`checkRight = false`, `checkDown = false`).

Justificativa:
Permitir que o personagem corra continuamente para a direita em um cenário infinito/progressivo em chunks sem esbarrar em paredes invisíveis de `960px`, mantendo leitura vertical estável para o combate, permitindo quedas reais nos buracos do chão e isolando toda a interface com `setScrollFactor(0)`.

## 8. Geração procedural

Decisão:
Utilizar geração baseada em seed.

Justificativa:
Permitir reprodução de cenários e testes determinísticos.

## 9. Progressão

Decisão:
Separar a progressão de dificuldade da lógica de lojas.

A loja oficial pode solicitar a atualização de dificuldade e plataformas.

A loja especial do Coquinho Extra não pode provocar essas alterações.

O `DifficultySystem` aplica multiplicadores exclusivamente sobre `baseStats` do catálogo no momento do spawn de cada inimigo, evitando escalonamento cumulativo duplicado, e expõe interface explícita (`registerOfficialShopVisit` / `handleShopVisit({ isOfficial })`) além do evento `shop:official-visit`.

## 10. Atributos, cálculos e IA de inimigos

Decisão:
Centralizar os cálculos de atributos, dano, resistência e duração de bebidas.

Justificativa:
Evitar divergências e facilitar balanceamento.

Decisões complementares (Fase 4):
- Unificar a resolução de acertos em `CombatSystem.resolveHits` + `DamageCalculator` para ataques do jogador e dos inimigos.
- Manter a movimentação vertical dos inimigos exclusivamente sob controle do Arcade Physics; a `EnemyAI` emite apenas intenções (`moveDir`, `jump`, `shouldAttack`) e reutiliza `canJumpBetween` de `PlatformGenerator` para evitar saltos para plataformas inalcançáveis.

Decisões complementares (Fase 5 — Bebidas e Efeitos Temporários):
- **Bebidas repetidas:** cada coleta cria uma instância independente de efeito com seu próprio temporizador; modificadores de bebidas iguais acumulam até a expiração individual, e a cura instantânea (`instantHeal`) é aplicada em cada coleta.
- **Sinergia do Açougue com Cantinho do Vale:** o primeiro acúmulo concede `2×` força, cada acúmulo seguinte soma outro multiplicador-base até `10×`; efeitos visuais de fogo e avermelhamento da tela escalam junto, sem aplicar o pós-processamento genérico de embriaguez ao Açougue.
- **Sprites de bebidas:** `Drink` usa a textura fotográfica pré-carregada definida por `spriteKey`, mantendo o visual procedural como fallback se a textura não estiver disponível. Créditos e licenças de cada imagem estão em `public/drinks/CREDITS.md`.
- **Resistência na coleta:** a duração efetiva é calculada com a resistência efetiva do personagem registrada no exato momento da coleta (`duraçãoBase × multiplicadorDaBebida ÷ resistênciaEfetiva`), com limites mínimo/máximo configuráveis.
- **Efeitos de HP:** suporte simultâneo a recuperação instantânea (`instantHeal`) e aumento temporário de HP máximo (`flat.maxHp`), garantindo que cura nunca reviva um jogador morto.
- **Atração automática:** o sistema usa um raio base configurável (`DRINK_CONFIG.MAGNET_BASE_RADIUS`), exposto via `extraRadius` em `DrinkSystem.computeAttractionVelocity`; atualmente, o upgrade *Mochila de Bebidas* amplia esse raio. O antigo *Ímã de Bebidas* foi substituído por *Aliado Chiquinho Promos*.

Decisões complementares (Fases 6 a 10):
- **Preservação de contrato em `StatCalculator`:** mantido `StatCalculator.calculateEffectiveStats` retornando `{ maxHp, strength, drinkResistance }` e adicionado `StatCalculator.calculateGameplayModifiers` para centralizar todos os multiplicadores secundários dos 30 upgrades sem quebrar contratos existentes.
- **Compatibilidade visual em `CharacterAppearanceSystem`:** resolvidos explicitamente o empilhamento vertical de acessórios de cabeça (`Capacete de Obra` + `Coroa do Caos`), a sobreposição de `Braços de Gorila` + `Luvas de Boxe` + `Luvas de Seda` e a coexistência de `Pernas de Mola` + `Tênis de Foguete`. Os upgrades originais de chapéu e ímã foram substituídos por itens sem esses acessórios.
- **Agendamento do Coquinho Extra e fila de lojas:** `GoldenEventScheduler` garante matematicamente 1ª aparição com probabilidade `1.0` e até 2 aparições extras com probabilidades decrescentes por seed; `ShopSystem` processa lojas oficiais e especiais em fila FIFO sequencial para impedir substituição ou perda de recompensa em eventos simultâneos.
- **Boss Final em duas fases:** `Boss` e `BossAI` reutilizam `CombatSystem.resolveHits` e a navegação de plataformas de `EnemyAI`, escalonando atributos pelo número de lojas oficiais visitadas e transicionando para Fase 2 em `<= 50%` do HP máximo.
- **Áudio sem dependências adicionais:** `SoundBank.js` sintetiza amostras PCM WAV leves em memória (Data URI) carregadas via `Howler.js`, fornecendo efeitos sonoros e música sem adicionar novas bibliotecas nem exigir arquivos binários externos.

Decisões complementares (Expansão — Personagens, Habilidades, Inimigos, Efeitos Visuais e Áudio):
- **Substituição dos personagens iniciais (aprovada pelo usuário):** substituídos os dois personagens iniciais por **Açougue**, **Piri** e **Tonegi** em `src/data/characters.js`, mantendo todo o cálculo centralizado via `StatCalculator` (inclusive `bodyScale` e sinergia `cantinho_do_vale` com `flat.strength: 0` + `multiplier.strength: 2` para garantir força exatamente `2×` em Açougue).
- **Combinação de dificuldade (aprovada pelo usuário):** mantido `DifficultySystem` (lojas oficiais) e adicionado `PhaseSystem` em camada sobre ele (fases a cada 25 abates: `0–24`, `25–49`, `50–74`, `75–99`), com ajuste proporcional dos inimigos já ativos na transição de fase e desbloqueio progressivo de 10 arquétipos em `src/data/enemies.js`.
- **Bibliotecas avaliadas e escolhidas:**
  - Adotada **`phaser3-rex-plugins@1.80.20`** (MIT) com importação ESM sob demanda apenas de `warppipeline.js`, `swirlpipeline.js` e `shockwavepipeline.js` (apenas `2,75 kB` gzip no bundle final via *code-splitting* do Vite), combinada aos recursos nativos do **Phaser 3.90** (`PostFX` `Barrel`/`ColorMatrix`/`Bloom`, `ParticleEmitter`, `Tweens`, `Camera`) e **`Howler.js`** já instalada.
  - Descartadas: `gsap` (licença proprietária não-MIT e redundante com `Phaser.Tweens`), `tsparticles` (canvas DOM externo desconectado da câmera/PostFX do Phaser), `pixi-filters` e `@flare-engine/postfx` (incompatíveis com WebGL do Phaser) e `Tone.js` (redundante e pesada frente a `Howler.js` + faixas reais).
- **Trilha sonora legal em domínio público:** adotadas gravações clássicas verificadas (`Public Domain Mark 1.0` / `CC0`) em `public/audio/music/` com mapeamento por boss e por fase em `src/data/music.js` + `src/audio/MusicDirector.js`, preservando `SOUND_KEYS.BGM_LOOP` como fallback automático.

Decisões complementares (Transformação do Gameplay e Movimentação Horizontal):
- **Pesquisa e avaliação técnica de bibliotecas para Phaser 3.90 (zero novas dependências npm):**
  - *Câmera e scrolling*: adotada `Phaser.Cameras.Scene2D.Camera` nativa (`setScroll` com interpolação exponencial compensada por `delta`, `shake`, `flash`, `fadeIn` e câmera secundária `drinkTimerCamera`). Plugins externos de câmera para Phaser mostraram-se obsoletos ou redundantes.
  - *Parallax*: implementado `ParallaxBackdrop` em `src/ui/ArenaBackdrop.js` com `TileSprite` nativo + faixas gráficas modulares em `scrollFactor(0)` deslocadas proporcionalmente a `scrollX` (`0.16x`, `0.18x`, `0.36x`, `0.62x`), evitando assets pesados extras.
  - *Geração procedural de plataformas*: bibliotecas como `rot-js` e `@mikewesthad/dungeon` focam em grades top-down e não modelam arcos parabólicos com gravidade. Por isso, foi criado `HorizontalTrackSystem` reutilizando `SeededRandom` (Mulberry32) e `canJumpBetween` de `PlatformGenerator`, gerando chunks sob demanda à frente do jogador e descartando chunks atrás da câmera (`O(1)` corpos ativos).
  - *Animações*: descartadas `gsap` (licença restritiva e loop externo desconectado de `scene.time.paused`) e `animejs` em favor de `Phaser.Tweens` nativo + cinemática inversa procedural a 60 FPS (`computePoseSkeleton`, incluindo nova pose dedicada `'dash'`).
  - *Partículas*: mantido `Phaser.GameObjects.Particles.ParticleEmitter` nativo com cache de emissores em `EffectsManager`, descartando `tsparticles` por operar em canvas DOM fora do espaço de mundo/câmera do Phaser.
  - *Transições cinematográficas e efeitos visuais*: combinados recursos nativos do Phaser (`Tweens`, *letterbox* em `scrollFactor(0)`, cortina de transição e *hitstop* físico controlado) com `ShockwavePostFxPipeline` já instalada em `phaser3-rex-plugins@1.80.20` (convertendo coordenadas de mundo para tela via `x - cam.scrollX`) e `Howler.fade()` para fade-in musical.
  - *Identidade visual e fontes cartunescas*: adotadas as fontes Google Fonts `Bangers` e `Fredoka` via CSS em `index.html` centralizadas em `src/constants/typography.js`, com fallback nativo imediato para ambientes offline/testes.
- **Plataformas móveis e desintegráveis no Arcade Physics:** plataformas `moving` usam corpos dinâmicos cinemáticos (`allowGravity: false`, `immovable: true`, `friction.x: 1`) em grupo separado (`movingPlatforms`) com correção contínua de fase senoidal; plataformas `crumbling` alternam `body.enable` conforme a máquina `intact -> shaking -> broken -> intact`.
- **Buracos no chão e proteção contra dano repetido:** quedas abaixo de `groundTopY + TRIGGER_DEPTH_BELOW_GROUND` aplicam exatamente `30` de dano via `Player.handlePitFall`, disparam ricochete vertical/horizontal para solo seguro e travam novos danos por `pitContactLocked` + `pitRecoveryTimerMs` até a recuperação em solo firme.
- **Reciclagem horizontal de inimigos comuns:** inimigos que ficam muito atrás da câmera ou caem em abismos são removidos via `removeEnemyWithoutDefeat` (`SpawnSystem.unregisterActiveEnemy`), devolvendo a cota ao `SpawnSystem` sem incrementar abates falsos nem travar a meta de 100 inimigos.

Decisões complementares (Mudança de Perspectiva — 3D na Fase 2 e Top-Down nas Fases 3 e 4):
- **Avaliação técnica de soluções 3D para Phaser `3.90.0` (zero novas dependências npm):**
  - Avaliadas `three` (`Three.js`) em canvas secundário sobreposto, `Three.js` via `Phaser.GameObjects.Extern` compartilhando contexto WebGL e `@enable3d/phaser-extension`.
  - Descartadas porque: (1) `@enable3d/phaser-extension` traz motor de física Ammo.js redundante e conflita com pipelines PostFX do Phaser `3.90.0`; (2) um segundo canvas DOM com `Three.js` cria múltiplos renderizadores, quebra o pós-processamento `DrunkEffect` (`Warp`, `Swirl`, `Shockwave`, `Barrel`, `Bloom`) aplicado sobre `cameras.main` e exige sincronização extra de camadas com a `uiCamera`; e (3) `Extern` compartilhando WebGL exige resets manuais de VAO/stencil/blend a cada frame que conflitam com os quad shaders do `phaser3-rex-plugins`.
  - **Solução escolhida:** manter a simulação física e colisões 2D do Arcade Physics intactas na Fase 2 e introduzir `Stage3DRenderer` (`src/ui/Stage3DRenderer.js`) + `PerspectiveSystem` (`src/systems/PerspectiveSystem.js`) renderizando volumes 3D reais projetados em perspectiva (`projectPoint3D`), ordenados por profundidade (Painter's Algorithm) e iluminados por normal Lambertiana + luz pontual dinâmica (`shadeColor3D`) diretamente no WebGL nativo do Phaser (`depth: 15`, abaixo da `uiCamera`). Isso garante compatibilidade total com `DrunkEffect`, `Shockwave`, upgrades visuais, habilidades especiais e testes determinísticos sem adicionar peso nem múltiplos renderizadores.
- **Arquitetura unificada para Visão Superior nas Fases 3 e 4 (`top_down`):**
  - Em vez de duplicar classes de jogador, inimigos, combate ou IA, as entidades existentes (`Player`, `Enemy`, `Boss`, `Ant`, `Drink`, `GoldenCharacter`) e sistemas (`Hitbox`, `CombatSystem`, `EnemyAI`, `BossAI`, `AntManager`, `SpawnSystem`, `DrinkSystem`, `HorizontalTrackSystem`) foram estendidos com `setPerspectiveMode('top_down')` e vetor direcional `aimVector`.
  - Nas Fases 3 e 4, `gravity.y = 0`, a movimentação e o dash operam em 8 direções normalizadas no plano `(X, Y)`, as hitboxes de golpes e combos rotacionam/escalam em 360° pelo `aimVector`, plataformas `static`/`moving` tornam-se coberturas sólidas 4-vias e `crumbling` tornam-se grades frágeis sobre o asfalto, mantendo toda a lógica de dano, combos, bebidas, lojas e upgrades 100% compartilhada.

## 11. Upgrades

Decisão:
Separar efeitos mecânicos dos efeitos visuais.

O UpgradeSystem aplica os efeitos mecânicos.

O CharacterAppearanceSystem aplica os efeitos visuais.

## 12. Testes e validação

Decisão:
Utilizar Vitest para testes unitários e de integração, aliados à revisão estática do código e análise de erros de lógica e integração.

Manter:
- Testes automatizados com Vitest (unitários e de integração).
- Correção de falhas encontradas nos testes.
- Revisão estática do código e análise de erros de lógica e integração.

Não executar (salvo solicitação explícita do usuário):
- `npm run build` ou qualquer outro comando de build.
- `npm run dev`.
- Abrir navegador ou iniciar o jogo para validação.
- Playwright, Cypress ou outras ferramentas de automação visual.
- Capturas de tela (screenshots) ou gravações de vídeo.
- Validações visuais ou manuais do gameplay (realizadas manualmente pelo usuário).

Fluxo ao concluir cada etapa:
1. Executar somente os testes automatizados relevantes com Vitest.
2. Corrigir eventuais falhas.
3. Fazer revisão estática das alterações.
4. Atualizar a documentação do projeto (`PROGRESS.md` e `CHANGELOG.md`).
5. Informar o que foi implementado e quais testes automatizados foram executados.

## 13. Controle de versão

Decisão:
Utilizar Git.

Branches principais:
- main: versões estáveis.
- develop: integração do desenvolvimento.

Criar commits após funcionalidades concluídas e testadas.

## 14. Economia de contexto, tokens e desenvolvimento

Decisões:
- Dividir o desenvolvimento em etapas.
- Evitar análise completa do projeto em tarefas pequenas.
- Consultar somente arquivos relevantes e ler apenas os trechos necessários de arquivos grandes (usar busca/grep e intervalos de linhas, especialmente em `GAME_DESIGN.md`, `ARCHITECTURE.md`, `PROGRESS.md` e `CHANGELOG.md`).
- Para atualizar `PROGRESS.md` e `CHANGELOG.md`, ler apenas o trecho onde a nova entrada será inserida (topo ou final), nunca o histórico inteiro.
- Não reler arquivos que já estão no contexto e não foram alterados.
- Agrupar leituras, buscas e edições independentes no mesmo turno.
- Evitar reescrever arquivos inteiros.
- Utilizar testes direcionados com Vitest filtrados pelo arquivo/teste específico com saída compacta (`--reporter=dot` ou `--bail=1`) e revisão estática de código; não reexecutar testes já aprovados sem novas edições.
- Não gastar tempo, tokens ou recursos iniciando o jogo, gerando builds ou produzindo evidências visuais (screenshots, vídeos, automação visual) sem solicitação explícita do usuário.
- Evitar agentes paralelos em sistemas interdependentes e evitar delegar tarefas simples para subagentes.
- Atualizar documentação após cada etapa e manter respostas diretas e concisas (sem colar blocos inteiros já editados nem repetir resumos de `PROGRESS.md`/`CHANGELOG.md`).
- Não implementar funcionalidades não solicitadas.

## 15. Decisões pendentes

Os seguintes pontos ainda precisam de definição:

- Nome definitivo do jogo.
- Nome e identidade dos dois personagens.
- Atributos-base e multiplicadores dos personagens.
- Valores numéricos dos upgrades.
- Valores de HP, força e velocidade dos inimigos.
- Fórmula e curva de escalonamento de dificuldade.
- Valores de duração e efeitos das bebidas.
- Probabilidades de raridade.
- Teclas definitivas dos controles.
- Sequências dos cinco combos.
- Regras numéricas de geração das plataformas.
- Frequência e probabilidades das aparições adicionais do Coquinho Extra.
- Atributos e padrões do boss.

Não preencher decisões pendentes com valores definitivos sem aprovação.
