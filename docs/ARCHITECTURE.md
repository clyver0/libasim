
# ARCHITECTURE — Arquitetura Técnica

## 1. Stack tecnológica

Stack inicialmente definida:

- JavaScript ES Modules.
- Vite.
- Phaser 3.
- Phaser Arcade Physics.
- Howler.js para áudio.
- Vitest para testes automatizados.

Não trocar a versão principal do Phaser, engine ou bibliotecas sem apresentar justificativa e obter aprovação.

Não adicionar React ao núcleo do jogo.

HTML e CSS podem ser utilizados para elementos de interface quando fizer sentido, mantendo o Phaser responsável pela gameplay.

## 2. Princípios arquiteturais

1. Separação de responsabilidades.
2. Sistemas independentes e reutilizáveis.
3. Dados separados da lógica.
4. Cálculos centralizados.
5. Dependências explícitas.
6. Testabilidade.
7. Evitar abstrações desnecessárias.
8. Implementação incremental.

A arquitetura deve suportar a expansão do jogo sem exigir reescritas constantes.

## 3. Estrutura de pastas sugerida

A estrutura pode evoluir conforme a necessidade, mas deve manter responsabilidades claras.

src/
- scenes/
- entities/
- systems/
- combat/
- data/
- constants/
- ui/
- utils/
- main.js
- config.js

docs/
- GAME_DESIGN.md
- ARCHITECTURE.md
- PROGRESS.md
- CHANGELOG.md
- TECHNICAL_DECISIONS.md

tests/

### scenes/

Responsável pelo fluxo de telas e estados principais do jogo.

Possíveis cenas:
- TitleScene
- MainScene
- GameOverScene
- VictoryScene

A MainScene deve coordenar os sistemas de gameplay, mas não concentrar toda a lógica do jogo.

### entities/

Responsável pelas entidades do jogo.

Exemplos:
- Player
- Enemy
- Boss
- Drink
- GoldenCharacter

Entidades encapsulam seu estado e comportamento próprio, delegando responsabilidades especializadas aos sistemas.

### systems/

Responsável pelas regras e mecânicas independentes.

Exemplos:
- InputController
- PlatformGenerator
- PlatformCollision
- KeySequenceDetector
- DifficultySystem
- SpawnSystem
- DrinkSystem
- UpgradeSystem
- ShopSystem
- AppearanceSystem
- RunManager
- CollisionSystem

### combat/

Responsável por:
- AttackSystem
- ComboSystem
- Hitbox
- Hurtbox
- DamageCalculator

A lógica de combate não deve ficar misturada à movimentação do personagem.

### data/

Contém configurações e catálogos.

Exemplos:
- characters.js
- enemies.js
- drinks.js
- upgrades.js
- combos.js

Dados não devem depender diretamente da engine quando isso puder ser evitado.

### constants/

Contém configurações centralizadas.

Exemplos:
- physics.js
- gameplay.js
- controls.js

Evitar números mágicos espalhados pelo código.

### ui/

Responsável pela apresentação:
- HUD
- Menus
- ComboGuide
- ShopUI
- Tooltips
- Timers

A interface apresenta dados e envia comandos, mas não deve ser responsável por calcular atributos ou aplicar regras de gameplay.

A pausa da run é coordenada pela `MainScene`: congela física/relógio da cena e oferece continuar, reiniciar a run com o mesmo personagem ou voltar à seleção.

### utils/

Funções auxiliares reutilizáveis.

Exemplos:
- Random
- SeededRandom
- MathUtils
- Validation

## 4. Personagem e atributos

O Player deve separar:

- Representação visual.
- Corpo físico.
- Estado de atributos.
- Entrada do jogador.
- Movimentação.
- Animações.

O estado de atributos deve ser independente da renderização.

Criar uma estrutura que permita calcular atributos efetivos a partir de:

1. Dados-base do personagem.
2. Multiplicadores do personagem.
3. Upgrades permanentes da run.
4. Efeitos temporários ativos.

Atributos calculados devem ser centralizados em um sistema de cálculo, evitando alterações diretas e dispersas.

## 5. Sistemas de movimentação e física

Utilizar Phaser Arcade Physics.

A física deve considerar:
- Gravidade.
- Velocidade horizontal.
- Velocidade vertical.
- Pulo.
- Colisões.
- Limites do cenário.
- Plataformas.

A movimentação deve ser independente da lógica de combate, suportando controle manual horizontal estilo *beat 'em up*, pulo e dash/slide nas Fases 1 e 2 (`side_2d` e `side_3d`) e movimentação + dash em 8 direções sem gravidade vertical nas Fases 3 e 4 (`top_down`).

A progressão de perspectiva por fase é coordenada por `PerspectiveSystem` (`src/systems/PerspectiveSystem.js`):
- **Fase 1 (`side_2d`)**: física lateral com gravidade vertical e renderização 2D original (`ParallaxBackdrop` + `ArenaBackdrop` + visuais 2D das entidades).
- **Fase 2 (`side_3d`)**: preserva a simulação física e colisões 2D do Arcade Physics, delegando a apresentação visual ao `Stage3DRenderer` (`src/ui/Stage3DRenderer.js`) sobre o mesmo canvas WebGL do Phaser (mantendo `DrunkEffect` PostFX restrito à câmera do mundo e a `uiCamera` limpa).
- **Fases 3 e 4 (`top_down`)**: desativa a gravidade vertical (`gravity.y = 0`), converte plataformas `static`/`moving` em obstáculos 4-vias e `crumbling` em grades de piso, orienta hitboxes/knockback/IA em 360° no plano `(X, Y)` e delega a apresentação ao `TopDownRenderer` (`src/ui/TopDownRenderer.js`).

A câmera da gameplay acompanha o jogador horizontalmente (`scrollX` com *lookahead* à direita e `scrollY = 0`), sem limite artificial à direita, mantendo todos os elementos de HUD/modais fixos na viewport (`setScrollFactor(0)`) e isolados na `uiCamera`.

A configuração global pode manter gravidade zero caso isso seja necessário para preservar o contrato de inicialização e testes existentes. A gravidade vertical da gameplay deve ser configurada na cena correspondente.

## 6. InputController

Centraliza a leitura dos comandos.

Responsabilidades:
- Movimento horizontal.
- Pulo.
- Ataques.
- Combos.
- Atalhos de interface.
- Pausa (`P`).
- Interações com lojas.

As teclas devem ser configuráveis em um único lugar.

A leitura dos comandos não deve conter as regras completas de combate ou de movimentação.

## 7. PlatformGenerator

Responsável por gerar e validar plataformas.

Deve receber:
- Dimensões da área de jogo.
- Limites de quantidade.
- Regras de espaçamento.
- Limites de altura.
- Seed da run.

Deve validar:
- Ausência de sobreposições indevidas.
- Acessibilidade.
- Distâncias alcançáveis.
- Região segura.
- Limites da tela.

A geração deve ser determinística quando a seed e os parâmetros forem iguais.

O sistema deve permitir regeneração nas visitas oficiais do Chiquinho.

O Coquinho Extra não deve acionar o gerador.

## 8. Inimigos e SpawnSystem

Separar:
- Dados do inimigo.
- Estado do inimigo.
- Comportamento de IA.
- Sistema de spawn.
- Escalonamento de dificuldade.

A IA deve utilizar o estado do jogador e informações do cenário para decidir como se movimentar e atacar.

Controlar a quantidade simultânea de inimigos para evitar sobrecarga.

A contagem de inimigos derrotados deve ser independente da quantidade de inimigos ativos.

Personagens especiais como Coquinho Extra não devem ser contabilizados como inimigos comuns.

## 9. CombatSystem

Centralizar as regras de:
- Ataques.
- Dano.
- Alcance.
- Hitboxes.
- Hurtboxes.
- Recuperação.
- Knockback.
- Combos.

Criar um DamageCalculator para aplicar força, modificadores de upgrades, resistências e demais regras.

Evitar cálculos de dano duplicados em entidades diferentes.

## 10. DrinkSystem

Separar:
- Catálogo de bebidas.
- Geração e raridade.
- Queda.
- Coleta.
- Efeitos temporários.
- Temporizadores.
- Efeitos visuais.

Cada bebida deve ser definida por dados configuráveis.

O cálculo da duração efetiva deve considerar o multiplicador da bebida e a resistência efetiva do personagem.

Os efeitos temporários devem possuir controle independente para evitar sobrescrita indevida.

## 11. UpgradeSystem

O catálogo de upgrades deve ser orientado a dados.

Cada upgrade deve declarar:
- Identificador.
- Nome.
- Descrição.
- Efeitos mecânicos.
- Efeitos visuais.
- Regras de acúmulo.
- Incompatibilidades.
- Requisitos de seleção.

O sistema deve:
- Selecionar opções válidas.
- Impedir repetições não permitidas.
- Aplicar efeitos.
- Recalcular atributos.
- Comunicar mudanças ao sistema visual.

A regra de cálculo dos atributos deve ser centralizada.

## 12. CharacterAppearanceSystem

Responsável exclusivamente pelas alterações visuais.

Deve permitir:
- Alteração de escala.
- Acessórios.
- Modificações corporais.
- Texturas.
- Auras.
- Elementos vinculados às articulações.

Deve permitir múltiplos efeitos visuais simultâneos.

Deve respeitar as regras de compatibilidade entre upgrades.

Não deve modificar os atributos mecânicos do personagem.

## 13. ShopSystem

Deve controlar:
- Eventos de abertura.
- Pausa da gameplay.
- Seleção de upgrades.
- Aplicação da recompensa.
- Retomada da gameplay.

Diferenciar:
- Loja oficial do Chiquinho.
- Loja especial do Coquinho Extra.

A loja oficial pode atualizar dificuldade e plataformas.

A loja especial não pode alterar esses sistemas.

Se dois eventos coincidirem, devem ser processados sequencialmente, sem perder recompensas ou substituir eventos.

## 14. RunManager

Responsável pelo estado global da run.

Deve acompanhar:
- Personagem selecionado.
- Inimigos derrotados.
- Lojas oficiais visitadas.
- Upgrades adquiridos.
- Bebidas e efeitos ativos.
- Seed da run.
- Eventos especiais.
- Estado do boss.
- Condição de vitória ou derrota.

Não deve concentrar a lógica interna de todos os sistemas.

## 15. Boss

O boss deve ser uma entidade independente, com:
- Estado próprio.
- Atributos próprios.
- IA própria.
- Ataques próprios.
- Balanceamento próprio.

Pode reutilizar sistemas genéricos de dano, colisão e combate.

## 16. Comunicação entre sistemas

A comunicação deve ser explícita.

Exemplos:

- InputController envia comandos ao Player.
- Player utiliza física do Phaser.
- CombatSystem recebe comandos de ataque e calcula dano.
- UpgradeSystem modifica atributos efetivos.
- CharacterAppearanceSystem aplica mudanças visuais.
- DrinkSystem administra efeitos temporários.
- ShopSystem controla eventos de loja.
- RunManager acompanha a progressão.

Evitar dependências circulares.

## 17. Testes

Utilizar Vitest para lógica independente da engine.

Priorizar testes para:
- Cálculo de atributos.
- Compatibilidade de upgrades.
- Duração de bebidas.
- Raridade.
- Geração determinística de plataformas.
- Regras de progressão.
- Seleção de upgrades.
- Contagem de inimigos.
- Eventos especiais.

Testes de integração e validação visual devem complementar os testes unitários.

## 18. Desempenho

- Não manter inimigos ilimitados simultaneamente.
- Evitar atualizações desnecessárias.
- Evitar cálculos repetidos em cada frame quando puderem ser centralizados.
- Reutilizar objetos quando isso trouxer benefício real.
- Evitar excesso de partículas e efeitos.
- Não criar abstrações complexas sem necessidade.

## 19. Regras de evolução da arquitetura

A arquitetura pode evoluir conforme as necessidades reais do jogo.

Entretanto:
- Não refatorar sistemas estáveis sem justificativa.
- Não substituir bibliotecas sem aprovação.
- Não implementar sistemas futuros antes de existir necessidade.
- Não duplicar responsabilidades.
- Não alterar contratos de sistemas existentes sem avaliar impactos.
- Documentar decisões arquiteturais relevantes.

## 20. Módulos da Expansão de Gameplay e Audiovisual

Para manter baixo acoplamento e responsabilidade única, a expansão foi estruturada em módulos independentes integrados pela `MainScene`:

- **Constantes e catálogos**: `src/constants/expansion.js` (parâmetros de fases, formigas, efeitos, pós-processamento e áudio), `src/data/abilities.js`, `src/data/characters.js` (3 personagens), `src/data/enemies.js` (10 arquétipos) e `src/data/music.js` (catálogo de trilhas em domínio público).
- **Habilidades especiais**: `src/systems/SpecialAbilitySystem.js` (máquina de estados pura: `charging` -> `ready` -> `active`), `src/systems/AbilityRuntime.js` (execução de chuva de Cantinhos, atropelamento do carro e formigas auxiliares) e `src/ui/AbilityVisuals.js` / `src/ui/AbilityHud.js`.
- **Colisão e atalhos especiais**: `src/systems/PlatformCollision.js` configura colisão unidirecional para plataformas elevadas; `src/systems/KeySequenceDetector.js` reconhece sequências sem misturá-las ao `InputController`.
- **Progressão em 4 Fases e Formigas**: `src/systems/PhaseSystem.js` (transições a cada 25 abates e escalonamento em camada sobre `DifficultySystem`), `src/entities/Ant.js` e `src/systems/AntManager.js` (chuva hostil da Fase 4 com imunidade de Tonegi + formigas auxiliares).
- **Efeitos Visuais e Pós-Processamento**: `src/systems/DrunkIntensity.js` (cálculo puro 0..1), `src/ui/DrunkEffect.js` (`phaser3-rex-plugins` `WarpPostFxPipeline` + `SwirlPostFxPipeline` + aberração cromática/visão dupla + Phaser 3.90 PostFX nativo) e `src/ui/EffectsManager.js` (`ParticleEmitter` nativo + `ShockwavePostFxPipeline` + câmera/tweens). O HUD renderiza os timers de bebida em uma câmera sem pós-processamento; a `MainScene` suspende o efeito visual na loja oficial.
- **Direção Musical**: `src/audio/MusicDirector.js` sobre `src/audio/AudioManager.js` (`Howler.js`), com troca sincronizada por boss/fase, silêncio inicial e fade-in nas aberturas de fase, fade sem sobreposição, volume configurável e modulação de velocidade proporcional à embriaguez.
- **Progressão Horizontal, Plataformas Dinâmicas e Cinematografia**:
  - `src/systems/HorizontalTrackSystem.js`: geração determinística em chunks horizontais com poda de chunks antigos atrás da câmera, segmentos de chão intercalados por buracos validados e três categorias de plataformas (`static`, `moving` horizontal/vertical e `crumbling` com ciclo `intact -> shaking -> broken -> intact`), reutilizando `canJumpBetween` de `PlatformGenerator`.
  - `src/systems/PhaseOpeningSystem.js`: máquina de estados pura que coordena a abertura de todas as 4 fases (`0`, `25`, `50`, `75` abates) com caminhada autônoma, silêncio inicial, seta cartunesca piscando e retomada com fade-in musical.
  - `src/ui/ArenaBackdrop.js` (`ParallaxBackdrop`) e `src/constants/typography.js`: camadas de *parallax* contínuo e tipografia cartunesca (`Bangers` e `Fredoka` com fallbacks nativos), aliadas a *letterbox*, cortina de fase e *hitstop* pontual em `EffectsManager.js`.
