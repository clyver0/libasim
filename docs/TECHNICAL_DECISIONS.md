
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

## 7. Câmera

Decisão:
A câmera da gameplay será fixa.

Justificativa:
O jogador se movimenta dentro da área visível utilizando plataformas.

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

## 11. Upgrades

Decisão:
Separar efeitos mecânicos dos efeitos visuais.

O UpgradeSystem aplica os efeitos mecânicos.

O CharacterAppearanceSystem aplica os efeitos visuais.

## 12. Testes

Decisão:
Utilizar Vitest para testar regras e cálculos independentes da engine.

Complementar com testes de integração e validação manual no navegador.

## 13. Controle de versão

Decisão:
Utilizar Git.

Branches principais:
- main: versões estáveis.
- develop: integração do desenvolvimento.

Criar commits após funcionalidades concluídas e testadas.

## 14. Economia de contexto e desenvolvimento

Decisões:
- Dividir o desenvolvimento em etapas.
- Evitar análise completa do projeto em tarefas pequenas.
- Consultar somente arquivos relevantes.
- Evitar reescrever arquivos inteiros.
- Utilizar testes direcionados.
- Evitar agentes paralelos em sistemas interdependentes.
- Atualizar documentação após cada etapa.
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
