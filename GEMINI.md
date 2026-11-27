# Regras de desenvolvimento

- Antes de alterar código, consulte apenas os arquivos diretamente relevantes.
- Não analise o projeto inteiro sem necessidade.
- Consulte GAME_DESIGN.md e ARCHITECTURE.md quando precisar confirmar regras.
- Não altere decisões de arquitetura sem apresentar a justificativa e pedir aprovação.
- Implemente somente o escopo solicitado.
- Não adicione funcionalidades não solicitadas.
- Prefira alterações pequenas e localizadas.
- Não reescreva arquivos inteiros quando uma alteração pontual resolver.
- Não duplique sistemas ou regras de cálculo.
- Mantenha sistemas desacoplados e reutilizáveis.
- Execute testes direcionados após cada alteração (apenas testes unitários e de integração com Vitest), corrija falhas encontradas e faça revisão estática do código (lógica e integração).
- Nunca execute `npm run build` (ou qualquer comando de build), `npm run dev`, abertura de navegador/jogo, ferramentas de automação visual (Playwright, Cypress etc.), screenshots, gravações de vídeo ou validações visuais/manuais do gameplay — exceto se solicitado explicitamente pelo usuário.
- Não gaste tempo, tokens ou recursos iniciando o jogo, gerando builds ou produzindo evidências visuais; validações visuais e de execução são feitas manualmente pelo usuário.
- Ao concluir cada etapa: (1) execute somente os testes automatizados relevantes com Vitest, (2) corrija eventuais falhas, (3) faça revisão estática das alterações, (4) atualize PROGRESS.md e CHANGELOG.md e (5) informe o que foi implementado e quais testes automatizados foram executados.
- Não avance para a próxima etapa enquanto houver erros importantes.
- Não remova funcionalidades já implementadas sem autorização.
- Não use agentes paralelos em tarefas que alterem módulos interdependentes.
- Antes de implementar algo que conflite com decisões existentes, explique o conflito e aguarde aprovação.

## Economia de tokens

- Leia apenas os trechos necessários de arquivos grandes (use busca/grep antes de abrir e leia intervalos de linhas em vez do arquivo inteiro, especialmente em `GAME_DESIGN.md`, `ARCHITECTURE.md`, `PROGRESS.md` e `CHANGELOG.md`).
- Para atualizar `PROGRESS.md` e `CHANGELOG.md`, leia apenas o trecho onde a nova entrada será inserida (topo ou final), nunca o histórico inteiro.
- Não releia arquivos que já estão no contexto e não foram alterados.
- Agrupe leituras, buscas e edições independentes no mesmo turno para reduzir a quantidade de chamadas ao modelo.
- Ao rodar Vitest, filtre pelo arquivo/teste específico e use saída compacta (ex.: `--reporter=dot` ou `--bail=1`) para evitar logs extensos no contexto.
- Não rode novamente testes que já passaram se não houve novas edições.
- Evite delegar tarefas simples para subagentes (cada subagente consome contexto próprio).
- Seja direto e conciso nas respostas: não cole blocos inteiros de código já editados nem resuma novamente o que foi escrito em `PROGRESS.md`/`CHANGELOG.md`.