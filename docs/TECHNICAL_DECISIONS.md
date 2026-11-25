
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
- **Bebidas repetidas:** coletar a mesma bebida enquanto seu efeito está ativo renova o temporizador para a nova duração efetiva, sem duplicar modificadores (mantendo apenas uma instância ativa por bebida) e aplicando novamente a cura instantânea (`instantHeal`), quando aplicável.
- **Resistência na coleta:** a duração efetiva é calculada com a resistência efetiva do personagem registrada no exato momento da coleta (`duraçãoBase × multiplicadorDaBebida ÷ resistênciaEfetiva`), com limites mínimo/máximo configuráveis.
- **Efeitos de HP:** suporte simultâneo a recuperação instantânea (`instantHeal`) e aumento temporário de HP máximo (`flat.maxHp`), garantindo que cura nunca reviva um jogador morto.
- **Atração automática (resolução de divergência entre `PROGRESS.md` e `GAME_DESIGN.md`):** o sistema de atração automática já existe na Fase 5 com um raio base pequeno e configurável (`DRINK_CONFIG.MAGNET_BASE_RADIUS`), exposto via `extraRadius` em `DrinkSystem.computeAttractionVelocity` para ser ampliado pelos upgrades *Ímã de Bebidas* e *Mochila de Bebidas* na Fase 6.

Decisões complementares (Fases 6 a 10):
- **Preservação de contrato em `StatCalculator`:** mantido `StatCalculator.calculateEffectiveStats` retornando `{ maxHp, strength, drinkResistance }` e adicionado `StatCalculator.calculateGameplayModifiers` para centralizar todos os multiplicadores secundários dos 30 upgrades sem quebrar contratos existentes.
- **Compatibilidade visual em `CharacterAppearanceSystem`:** resolvidos explicitamente o empilhamento vertical de acessórios de cabeça (`Capacete de Obra` + `Chapéu da Sorte` + `Coroa do Caos`), a sobreposição de `Braços de Gorila` + `Luvas de Boxe` + `Luvas de Seda`, `Pernas de Mola` + `Tênis de Foguete`, e o posicionamento oposto de `Mochila de Bebidas` + `Ímã de Bebidas`.
- **Agendamento do Coquinho Extra e fila de lojas:** `GoldenEventScheduler` garante matematicamente 1ª aparição com probabilidade `1.0` e até 2 aparições extras com probabilidades decrescentes por seed; `ShopSystem` processa lojas oficiais e especiais em fila FIFO sequencial para impedir substituição ou perda de recompensa em eventos simultâneos.
- **Boss Final em duas fases:** `Boss` e `BossAI` reutilizam `CombatSystem.resolveHits` e a navegação de plataformas de `EnemyAI`, escalonando atributos pelo número de lojas oficiais visitadas e transicionando para Fase 2 em `<= 50%` do HP máximo.
- **Áudio sem dependências adicionais:** `SoundBank.js` sintetiza amostras PCM WAV leves em memória (Data URI) carregadas via `Howler.js`, fornecendo efeitos sonoros e música sem adicionar novas bibliotecas nem exigir arquivos binários externos.

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
