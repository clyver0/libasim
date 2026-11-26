
# GAME DESIGN — Jogo 2D de Ação Roguelite

## 1. Visão geral

Jogo 2D de ação com elementos roguelite e progressão incremental.

O jogador escolhe um entre dois personagens e enfrenta ondas de inimigos em uma única fase. Durante a partida, pode coletar bebidas que concedem efeitos temporários e visitar lojas que oferecem upgrades aleatórios.

O objetivo final é derrotar 100 inimigos e enfrentar o boss final.

A experiência deve priorizar:
- Combate fluido e responsivo.
- Combinações de golpes e combos.
- Movimentação vertical utilizando plataformas.
- Progressão perceptível durante a partida.
- Upgrades com efeitos mecânicos e visuais.
- Rejogabilidade por meio de elementos aleatórios.

A arte inicial pode ser minimalista, utilizando personagens estilo stick figure, diferenciados principalmente pelas cores.

A prioridade inicial é a qualidade da jogabilidade, não a complexidade gráfica.

## 2. Personagens

Existem **três personagens jogáveis** (definidos em `src/data/characters.js`), que compartilham a mesma estrutura de movimentação e combate, diferenciados por atributos configuráveis, tamanho corporal (`bodyScale`), visual-base e habilidades especiais próprias (acionadas por `E`/`Q`):

- **Açougue**: muito grande (`bodyScale: 1.55`), relativamente forte (`strength ×1.3`), altíssima resistência a bebidas (`drinkResistance ×1.8`), muito lento (`moveSpeed ×0.62`).
  - *Sinergia Cantinho do Vale*: cada coleta acumula força e possui temporizador independente: 1 Cantinho = `2×`, 2 = `3×`, até o limite de `10×`. O Açougue não recebe a embriaguez visual genérica dessa bebida; suas chamas e o tom avermelhado da tela aumentam com os acúmulos.
  - *Ataque Especial — Terça do Cantinho*: chuva exagerada e configurável de garrafas de *Cantinho do Vale* caindo do céu com confetes e animações de ativação/encerramento (não concede invulnerabilidade).
- **Piri**: porte médio/grande (`bodyScale: 1.25`), muito forte (`strength ×1.7`), muita resistência a bebidas (`drinkResistance ×1.7`), lento (`moveSpeed ×0.78`).
  - *Ataque Especial — O fit se calou*: carrega após derrotar **10 inimigos comuns** (1 unidade por abate). Ao ativar, transforma-se em um carro esportivo em alta velocidade, invulnerável por duração finita, avançando e atropelando tudo no caminho com partículas e feedback de impacto.
- **Tonegi**: muito pequeno (`bodyScale: 0.72`), relativamente rápido (`moveSpeed ×1.2`), muito forte (`strength ×1.6`), pouquíssima resistência a bebidas (`drinkResistance ×0.45`).
  - *Imunidade passiva a formigas*: imune às formigas da Fase 4 (com ou sem habilidade ativa); ao tocar Tonegi, a formiga morre imediatamente com feedback visual `SPLAT!`.
  - *Ataque Especial — Pisa ligeiro, pisa ligeiro*: transforma-se em uma formiga ainda menor (`bodyScale ×0.55`), extremamente rápida e invulnerável por duração finita, invocando formigas auxiliares com IA própria que perseguem e atacam inimigos e são destruídas ao término da habilidade/run.

Regras gerais:
- Os multiplicadores são aplicados aos atributos-base via `StatCalculator` (sem duplicar lógica).
- Nenhuma habilidade concede invulnerabilidade ou velocidade permanente; atributos-base nunca são contaminados por efeitos temporários.

### Expansão de Combate, Bebidas, Fases, Chuva de Formigas e Trilha Sonora
- **Efeitos de embriaguez**: pós-processamento WebGL combinando `phaser3-rex-plugins` (`WarpPostFxPipeline` + `SwirlPostFxPipeline`), aberração cromática/visão dupla, `Barrel`, `ColorMatrix` e `Bloom` do Phaser 3.90, proporcional à raridade/duração das bebidas, com redução/desligamento configurável (`[N]`) e restauração completa ao expirar.
- **Bebidas**: spawn menos frequente (`16s`), queda mais rápida com gravidade real, quique em plataformas (`BOUNCE: 0.52`) e *squash & stretch*.
- **Progressão em 4 Fases**: a cada 25 inimigos comuns derrotados (`0–24`, `25–49`, `50–74`, `75–99`), ocorre transição com anúncio, onda de choque, ajuste proporcional dos inimigos ativos, aumento de multiplicadores (em camada sobre a dificuldade das lojas oficiais) e desbloqueio de 10 arquétipos distintos de inimigos comuns.
- **Fase 4 — Chuva de Formigas**: formigas pequenas, rápidas e fracas caem constantemente até o fim da Fase 4 (100 abates), com teto rígido de entidades simultâneas e imunidade letal de Tonegi.
- **Trilha Sonora**: obras clássicas em domínio público/CC0 reproduzidas via `Howler.js` + `MusicDirector`, com faixas distintas para partida normal (*William Tell Overture*), Mini-Chefão (*In the Hall of the Mountain King*), Boss Final Fase 1 (*Beethoven — 5ª Sinfonia*) e Boss Final Fase 2 (*Cavalgada das Valquírias*), com crossfade, volume configurável (`[`/`]`) e sem sobreposição.

## 3. Atributos do jogador

### HP
Representa a quantidade de dano que o personagem pode receber.

### Força
Influencia o dano causado pelos golpes.

### Resistência contra bebidas
Determina a duração dos efeitos negativos associados à embriaguez.

Atributos devem ser calculados de maneira centralizada, considerando:
- Atributos-base do personagem.
- Multiplicadores individuais.
- Upgrades adquiridos.
- Efeitos temporários ativos.

Evitar modificações diretas e espalhadas nos atributos.

## 4. Combate

O jogador possui três tipos de golpes, acionados por teclas distintas.

Também existem cinco combos, que combinam comandos de ataque e causam mais dano que os golpes individuais.

Requisitos:
- Golpes precisam ter animações e feedback visual.
- Cada golpe possui dano, alcance e tempo de recuperação.
- Combos precisam reconhecer sequências de comandos.
- Combos causam dano superior aos ataques individuais.
- O sistema deve impedir comandos inválidos ou sequências impossíveis.
- Hitboxes e hurtboxes devem ser independentes da aparência visual.
- A movimentação não deve ficar acoplada à lógica de dano.

O jogador pode consultar um guia de combos por meio de uma tecla de atalho. O guia deve ser apresentado em uma aba ou painel de interface.

Os nomes, sequências exatas e teclas dos cinco combos ainda precisam ser definidos.

## 5. Inimigos

O objetivo principal é derrotar 100 inimigos comuns antes do boss final.

Características:
- HP individual.
- Força individual.
- Velocidade individual.
- Comportamento de perseguição.
- Capacidade de atacar quando estiverem ao alcance do jogador.

### Spawn

Os inimigos entram pela região superior da tela, em posições aleatórias.

Devem se deslocar pela tela em direção ao jogador, utilizando plataformas quando necessário.

A câmera permanece fixa.

### Inteligência artificial

A IA deve ser simples e eficiente:
1. Detectar a posição do jogador.
2. Aproximar-se utilizando a movimentação disponível.
3. Utilizar plataformas quando necessário.
4. Atacar quando estiver dentro do alcance.
5. Retomar a perseguição quando estiver distante.
6. Evitar ficar permanentemente preso em obstáculos ou plataformas.
7. Ao cair de uma plataforma, manter movimento horizontal estável até aterrissar; não alternar direção a cada frame.

### Quantidade simultânea

Não é necessário colocar os 100 inimigos simultaneamente na tela.

Utilizar um sistema de spawn controlado, com limite de inimigos ativos.

Como ponto inicial para testes:
- Primeira parte da run: até 5 inimigos simultâneos.
- Parte intermediária: até 7.
- Parte final: até 10.

Esses valores são provisórios e devem ser ajustáveis por configuração.

## 6. Progressão de dificuldade

A dificuldade aumenta a cada visita à loja oficial do Chiquinho Promos.

O escalonamento deve afetar progressivamente:
- HP dos inimigos.
- Força dos inimigos.
- Velocidade dos inimigos.

A progressão deve ser centralizada e configurável.

A visita à loja especial do Coquinho Extra NÃO aumenta a dificuldade.

O boss possui balanceamento próprio, considerando o estágio da run.

Os multiplicadores e curvas exatas de dificuldade ainda precisam ser definidos.

## 7. Bebidas

Bebidas caem do céu durante a partida e podem ser coletadas pelo jogador.

Cada bebida concede efeitos temporários.

Os efeitos possíveis incluem:
- Recuperação ou aumento de HP.
- Aumento de força.
- Alterações na resistência contra bebidas.

### Raridade

Ordem crescente de raridade:

1. Água
2. Cantinho do Vale
3. Cerveja
4. Gin de 10
5. Chevette
6. Mansão Maromba
7. Absinto
8. Caseirinha da Casa

A Água é a bebida mais comum: recupera 18 HP instantaneamente e não aplica bônus, penalidades ou efeito temporário.

Todos os sprites de bebidas são exibidos com o dobro da altura visual anterior, preservando a proporção original de cada imagem; o corpo físico de coleta permanece inalterado.

As bebidas mais raras concedem maiores benefícios de força e HP, porém oferecem menor resistência contra seus efeitos de embriaguez.

A raridade influencia a probabilidade de aparição e a potência dos efeitos.

Os valores exatos de duração, recuperação, força e raridade devem ser configuráveis.

A Caseirinha da Casa é a mais rara. Ao surgir, toca uma sequência curta de bipes e recebe um aro dourado pulsante e um aviso na tela.

### Resistência e duração

A resistência do personagem influencia a duração dos efeitos negativos da bebida.

Fórmula conceitual:

Duração efetiva = duração-base × multiplicador da bebida ÷ resistência efetiva do personagem.

A resistência efetiva considera o personagem escolhido e os upgrades aplicados.

Os cálculos devem ficar centralizados.

### Efeitos visuais

Cada bebida deve possuir uma identidade visual própria durante seu efeito.

Requisitos:
- Efeitos coloridos diferentes por bebida.
- Indicador de duração restante.
- Timer visível na interface.
- Indicação dos efeitos ativos.

Coletas repetidas da mesma bebida acumulam modificadores em instâncias independentes, cada uma com seu próprio temporizador e expiração.

### Sprites fotográficos e créditos

As bebidas usam sprites em `public/drinks/`, com altura visual fixa e largura calculada pela proporção da imagem original. O estado conhecido das fontes e atribuições está em [`public/drinks/CREDITS.md`](../public/drinks/CREDITS.md).

## 8. Sistema de upgrades

Existem 30 upgrades.

Todos os upgrades adquiridos precisam produzir:
1. Uma alteração mecânica real.
2. Uma alteração visual perceptível no personagem.

Upgrades normalmente permanecem ativos durante a run; a Cachaça de Cobra é uma exceção temporária de 15 segundos.

Os upgrades devem ser configuráveis em catálogo de dados, sem espalhar seus valores pelo código.

### Catálogo

#### Upgrades originais

1. Soco de Aço
   - Aumenta a força.

2. Mão de Alface
   - Diminui a força.

3. Coração Extra
   - Aumenta o HP máximo.

4. Saúde Frágil
   - Diminui o HP máximo.

5. Fígado de Ferro
   - Aumenta a resistência contra bebidas.

6. Fígado Sensível
   - Diminui a resistência contra bebidas.

7. Sorte no Copo
   - Aumenta a chance de bebidas raras.

8. Azar no Copo
   - Diminui a chance de bebidas raras.

9. Aliado Chiquinho Promos
   - Aumenta em 20 pontos percentuais a chance de aparições extras do Noia.
   - Concede um pequeno bônus de sorte.

10. Corpo de Aço
    - Aumenta a resistência geral contra dano.

#### Upgrades adicionais

11. Braços de Gorila
    - Aumenta bastante a força.
    - Reduz a velocidade de ataque.
    - Alteração visual nos braços.

12. Pernas de Mola
    - Aumenta a capacidade de pulo.
    - Alteração visual nas pernas.

13. Tênis de Foguete
    - Aumenta drasticamente a velocidade de movimento e a força/dano.
    - Reduz pela metade a resistência contra bebidas e diminui a sorte.
    - Adiciona tênis ao personagem.

14. Capacete de Obra
    - Aumenta o HP máximo.
    - Adiciona capacete.

15. Máscara de Gás
    - Aumenta a resistência contra bebidas.
    - Adiciona máscara.

16. Marmita com Ketchup Roubado do Coffe Corner
    - Aumenta o HP máximo e a defesa.
    - Deixa os inimigos 12% mais rápidos.

17. Luvas de Boxe
    - Aumenta o dano dos golpes leves.
    - Adiciona luvas.

18. Luvas de Seda
    - Aumenta a velocidade dos golpes.
    - Reduz o dano dos golpes.
    - Adiciona luvas.

19. Ombros de Concreto
    - Reduz o dano recebido.
    - Altera visualmente os ombros.

20. Chinês do GAB (São Paulo)
    - Dá uma camisa de time, aumenta a sorte e deixa os inimigos 10% mais lentos.
    - Reduz um pouco a velocidade e a resistência contra bebidas do jogador.

21. Capa de Super-Herói
    - Aumenta a velocidade de movimento.
    - Adiciona capa.

22. Miniatura
    - Reduz o tamanho e a hitbox.
    - Reduz o HP máximo.

23. Gigantismo
    - Aumenta o tamanho.
    - Aumenta HP.
    - Aumenta força.
    - Reduz velocidade.

24. Faixa branca de jiu do Emery
    - Aumenta força e dano, com pequena redução na velocidade dos ataques.
    - Adiciona uma faixa branca.

25. Cachaça de Cobra
    - Ativa por 15 segundos: aumenta força e velocidade.
    - Reduz a defesa e drena 4 HP por segundo.
    - Adiciona uma tatuagem de cobra.

26. Joelheiras Blindadas
    - Reduz o knockback recebido.
    - Adiciona joelheiras.

27. Óculos de Precisão
    - Aumenta o alcance dos golpes.
    - Adiciona óculos.

28. Mochila de Bebidas
    - Aumenta a capacidade de atração de bebidas próximas.
    - Adiciona mochila.

29. Tatuagem de Dragão
    - Aumenta o dano dos combos.
    - Adiciona tatuagem.

30. Coroa do Caos
    - Aumenta bastante a força.
    - Reduz o HP máximo.
    - Adiciona coroa.

### Regras de compatibilidade

- Não repetir upgrades já adquiridos, exceto quando forem explicitamente configurados como acumuláveis.
- Miniatura e Gigantismo devem possuir regra de incompatibilidade.
- Braços de Gorila e luvas precisam coexistir sem conflitos visuais.
- Tênis de Foguete e Pernas de Mola precisam coexistir.
- Capacete de Obra e Coroa do Caos precisam possuir regra visual de compatibilidade.
- Aliado Chiquinho Promos e Mochila de Bebidas podem coexistir.
- Efeitos mecânicos e visuais devem ser tratados separadamente.

O sistema visual deve permitir múltiplos acessórios simultâneos.

## 9. Sistema de aparência dos personagens

Criar um sistema modular chamado CharacterAppearanceSystem.

Responsabilidades:
- Aplicar mudanças visuais decorrentes de upgrades.
- Gerenciar acessórios.
- Alterar tamanho e proporções.
- Integrar elementos às articulações e animações.
- Evitar sobreposição e conflitos entre elementos.
- Permitir que vários upgrades visuais coexistam.

O sistema visual não deve ser responsável pelos cálculos de atributos ou efeitos mecânicos.

## 10. Loja oficial — Chiquinho Promos

A loja oficial aparece a cada 25 inimigos derrotados.

Eventos:
- 25 inimigos.
- 50 inimigos.
- 75 inimigos.

A loja deve:
1. Pausar a gameplay.
2. Apresentar três upgrades aleatórios.
3. Permitir escolher apenas um.
4. Aplicar o upgrade escolhido.
5. Retomar a gameplay.

As modais oficial e especial ocupam a tela inteira. A loja oficial usa `public/backgrounds/chiquinho-promos-shop.png` como fundo; a loja especial do Noia usa `public/backgrounds/noia-shop.png`. As imagens preservam a proporção e recebem uma camada escura para manter os cards legíveis.

O upgrade Aliado Chiquinho Promos aumenta em 20 pontos percentuais a chance de cada aparição extra do Noia; a primeira aparição continua garantida e o limite da run permanece em três.

O catálogo é composto pelos 30 upgrades.

Upgrades incompatíveis ou já adquiridos devem ser tratados pelo sistema de seleção.

A cada visita oficial:
- A dificuldade dos inimigos aumenta.
- As plataformas são regeneradas.
- A configuração das novas plataformas deve respeitar as regras de acessibilidade.

## 11. Coquinho Extra

O Coquinho Extra é um personagem especial dourado.

Ele não é um inimigo convencional:
- Não ataca.
- Não persegue o jogador.
- Não participa da contagem de inimigos.
- Não altera a dificuldade.
- Não altera as plataformas.

### Movimento

O personagem atravessa a tela horizontalmente, da esquerda para a direita ou da direita para a esquerda.

Ele aparece em uma posição que permita ao jogador tentar acertá-lo.

Pode ser atingido pelos golpes e combos.

### Recompensa

Caso o jogador acerte o Coquinho Extra:
- Ganha direito a uma visita adicional à loja.
- A loja possui identidade visual própria.
- O catálogo de upgrades é o mesmo da loja oficial.

Caso não seja atingido:
- Continua atravessando a tela.
- Desaparece ao sair dos limites da tela.
- Não concede recompensa.

### Frequência

Cada run deve possuir no mínimo uma aparição e no máximo três aparições.

A primeira aparição deve ser garantida quando o jogador alcançar o evento programado.

As aparições adicionais devem ter probabilidades progressivamente menores.

Os eventos devem ser controlados por um sistema próprio de agendamento.

Se a aparição coincidir com uma loja oficial:
- Não substituir a loja oficial.
- Não perder a recompensa.
- Tratar os eventos sequencialmente.

A loja especial não modifica a dificuldade nem regenera as plataformas.

## 12. Cenário e plataformas

A câmera permanece fixa durante a gameplay.

O jogador se movimenta dentro da área visível, utilizando plataformas.

### Geração

Criar um sistema modular PlatformGenerator.

As plataformas:
- Possuem posições diferentes em cada run.
- São regeneradas a cada visita oficial do Chiquinho.
- Devem permanecer dentro dos limites da tela.
- Não podem apresentar sobreposições indevidas.
- Devem respeitar distâncias horizontais e verticais alcançáveis.
- Devem manter uma região segura para o jogador.
- Não podem formar configurações impossíveis de atravessar.

O Coquinho Extra não altera as plataformas.

### Reprodutibilidade

Utilizar uma seed por run para permitir reproduzir configurações em testes e depuração.

A geração deve ser determinística quando a mesma seed e os mesmos parâmetros forem utilizados.

## 13. Boss final

Após a progressão dos 100 inimigos comuns, o jogador enfrenta um boss final.

Regras:
- Boss possui atributos próprios.
- Possui HP e força superiores aos inimigos comuns.
- Seu balanceamento considera o estágio da run.
- Possui ataques e padrões próprios.
- Sua derrota encerra o jogo com uma condição de vitória.

Não definir padrões ou valores definitivos sem planejamento específico da fase do boss.

## 14. Interface e experiência

A interface deve ser minimalista e funcional.

Elementos:
- HP.
- Força.
- Resistência contra bebidas.
- Contador de inimigos derrotados.
- Indicadores de efeitos ativos.
- Timers de bebidas.
- Atalhos de teclado.
- Guia de combos.
- Menus de loja.
- Seleção de personagem.
- Botão de pausa com opções para continuar, reiniciar a partida ou voltar à seleção de personagem (`P` também alterna a pausa).

Tooltips devem apresentar título e explicação ao passar o mouse sobre elementos relevantes.

As teclas e atalhos devem estar visíveis ou facilmente acessíveis.

## 15. Condição de vitória e fluxo da partida

Fluxo geral:

1. Tela inicial.
2. Seleção de personagem.
3. Início da run.
4. Combate contra inimigos.
5. Coleta de bebidas.
6. Primeira loja oficial aos 25 inimigos.
7. Progressão até 50 inimigos.
8. Segunda loja oficial.
9. Progressão até 75 inimigos.
10. Terceira loja oficial.
11. Derrota dos 100 inimigos comuns.
12. Enfrentamento do boss.
13. Tela de vitória ao derrotar o boss.

O evento Coquinho Extra pode ocorrer durante a run sem substituir ou alterar esse fluxo.

## 16. Princípios de implementação

- Priorizar fluidez e responsividade.
- Manter sistemas desacoplados.
- Centralizar cálculos.
- Utilizar dados configuráveis.
- Evitar lógica duplicada.
- Manter compatibilidade entre upgrades.
- Testar progressivamente.
- Não implementar funcionalidades fora do escopo aprovado.
- Não inventar valores ou regras ainda não definidos.
