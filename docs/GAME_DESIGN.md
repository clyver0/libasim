
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

Existem dois personagens jogáveis.

Regras:
- Ambos compartilham a mesma estrutura de movimentação e combate.
- A aparência inicial é baseada em stick figures.
- Cada personagem possui uma cor identificadora.
- Cada personagem possui multiplicadores próprios de atributos.
- Os multiplicadores devem ser aplicados aos atributos-base por meio de um sistema centralizado.
- Não duplicar a lógica de personagem para criar diferenças entre eles.

Atributos:
- HP máximo.
- Força.
- Resistência contra bebidas.

Os valores e multiplicadores exatos de cada personagem ainda precisam ser definidos. Não inventar valores definitivos sem aprovação.

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

1. Cantinho do Vale
2. Cerveja
3. Ginde 10
4. Chevette
5. Whisky com Energético
6. Absinto

As bebidas mais raras concedem maiores benefícios de força e HP, porém oferecem menor resistência contra seus efeitos de embriaguez.

A raridade influencia a probabilidade de aparição e a potência dos efeitos.

Os valores exatos de duração, recuperação, força e raridade devem ser configuráveis.

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

O sistema deve suportar efeitos simultâneos ou sucessivos sem sobrescrever indevidamente os temporizadores.

## 8. Sistema de upgrades

Existem 30 upgrades.

Todos os upgrades adquiridos precisam produzir:
1. Uma alteração mecânica real.
2. Uma alteração visual perceptível no personagem.

Os efeitos são temporários e válidos durante a run.

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

9. Ímã de Bebidas
   - Atrai automaticamente bebidas próximas.

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
    - Aumenta a velocidade de movimento.
    - Adiciona tênis ao personagem.

14. Capacete de Obra
    - Aumenta o HP máximo.
    - Adiciona capacete.

15. Máscara de Gás
    - Aumenta a resistência contra bebidas.
    - Adiciona máscara.

16. Barriga de Chope
    - Aumenta bastante o HP máximo.
    - Reduz a velocidade de movimento.
    - Altera o formato corporal.

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

20. Chapéu da Sorte
    - Aumenta a chance de bebidas raras.
    - Adiciona chapéu.

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

24. Faixa Ninja
    - Reduz o tempo de recuperação dos golpes.
    - Adiciona faixa.

25. Corrente de Ouro
    - Aumenta força.
    - Reduz resistência contra bebidas.
    - Adiciona corrente.

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
- Capacete de Obra e Chapéu da Sorte precisam possuir regra visual de compatibilidade.
- Mochila de Bebidas e Ímã de Bebidas precisam funcionar simultaneamente.
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
