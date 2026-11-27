# HANDOFF — Resumo Técnico do Projeto LibaSim

Documento de contexto rápido para continuidade do desenvolvimento por outro agente/bot.

---

## 1. Visão Geral e Stack

- **Projeto:** LibaSim (`d:\Users\leona\programacao\LibaSim`)
- **Stack:** Phaser `3.90.0` + Arcade Physics + Howler.js + Vite + Vitest (`ES Modules`)
- **Dependências:** Nenhuma dependência npm extra foi adicionada nas transformações recentes; toda renderização 2D, FPS 3D e Top-Down roda em **canvas WebGL único do Phaser**.
- **Regras obrigatórias (`GEMINI.md`):**
  - **NUNCA** executar `npm run build`, `npm run dev`, abrir navegador/jogo, usar Playwright/Cypress ou gerar screenshots/vídeos (validação visual é manual pelo usuário).
  - Sempre rodar testes unitários/integração direcionados com `npx vitest run --pool=vmThreads --reporter=dot`.
  - Ao concluir etapas: rodar Vitest, fazer revisão estática, atualizar `docs/PROGRESS.md` e `docs/CHANGELOG.md` e responder de forma concisa com links `file:///`.

---

## 2. Estado Atual do Gameplay por Fase

A run possui **4 fases** baseadas em abates (`0–24`, `25–49`, `50–74`, `75–99` + Boss Final), gerenciadas por `PhaseSystem` e `PerspectiveSystem` (`src/systems/PerspectiveSystem.js`):

1. **Fase 1 (`0–24` abates) — `side_2d` (Beat 'em up Lateral 2D)**
   - Estilo lateral 2D original preservado.
   - Movimentação manual livre (sem auto-run no gameplay normal), câmera acompanhando horizontalmente (`scrollX` com *lookahead*, `scrollY = 0`) e geração procedural infinita em chunks (`HorizontalTrackSystem`).
   - Plataformas `static` desde a Fase 1.

2. **Fase 2 (`25–49` abates) — `first_person_3d` (FPS 3D sem mouse)**
   - **Perspectiva:** Primeira pessoa pura com câmera frontal (`yaw = 0`, sem rotação por mouse), *head-bob*, *roll* lateral no strafe, *pitch* no pulo/queda, *kick* nos golpes e variação de FOV + *speed lines* no dash.
   - **Controles:** `W/S` (ou `↑/↓`) avançam/recuam ao longo da avenida; `A/D` (ou `←/→`) fazem strafe lateral no eixo `laneZ`; `Espaço` pula; `Shift` executa dash 3D; `J/K/L` atacam; `E` ativa especial.
   - **Combate e IA em 3D:** `CombatSystem.resolveHits` valida alinhamento lateral (`|target.laneZ - attacker.laneZ|`). `EnemyAI` e `BossAI` perseguem/separam em `laneZ` e reposicionam inimigos que ficarem atrás da câmera para a frente do jogador.
   - **Renderização (`src/ui/Stage3DRenderer.js`):**
     - `worldToFirstPersonSpace`, `projectCameraPointFP`, `clipPolygonNear` (Sutherland-Hodgman no plano próximo) e `solveIK3D` (cinemática inversa analítica 3D).
     - Inimigos e bosses articulados em 3D com cilindros cônicos (`_drawLimbFrustum3D`), ordenação de profundidade por membro, visor escuro e todos os acessórios da Fase 1 2D (`ninja_headband`, `rocket_shoes`, `concrete_shoulders`, `beer_belly`, `precision_glasses`, `boxing_gloves`, `hard_hat`, `chaos_crown`, `hero_cape`, `spring_legs` e lança 3D do `spear_thrower`).
     - Animações reais de ataque em 3D (`WINDUP` → `ATTACKING` investindo em `-X` rumo à câmera → `RECOVERING`, além de `HURT`).
     - Cenário urbano Liberdade 3D (prédios com janelas iluminadas, postes com lanternas duplas vermelhas, buracos com meios-fios listrados e plataformas 3D `static`/`moving` com trilhos e propulsores).
     - Viewmodel FPS (antebraços cônicos, punhos/luvas de upgrades, capô/volante no carro do Piri, mandíbulas na formiga) e retícula central dinâmica.

3. **Fase 3 (`50–74` abates) — `top_down` (Visão Superior)**
   - Gravidade desativada (`gravity.y = 0`), movimentação e dash em **8 direções** normalizadas (`SHIFT` / `SPACE`).
   - Combate 360° (`Hitbox.getWorldBounds` orientado por `aimVector` + knockback 2D).
   - IA 360° para inimigos, Mini-Chefão, Boss Final e Formigas (`EnemyAI`, `BossAI`, `AntManager`).
   - `TopDownRenderer` (`src/ui/TopDownRenderer.js`): obstáculos sólidos (`static`/`moving`), grades frágeis de piso (`crumbling`) e crateras 2D no asfalto (`-30 HP` + ricochete radial + trava de recuperação; dash atravessa com segurança).

4. **Fase 4 (`75–99` abates + Boss Final) — `top_down`**
   - Preserva integralmente a visão superior da Fase 3 integrada ao enxame/chuva de formigas em 2D.

---

## 3. Sistemas Transversais Importantes

- **Abertura de Fase (`PhaseOpeningSystem`):** No início de todas as 4 fases, o jogador caminha sozinho para a direita sem música, guiado por uma seta piscando (`SIGA!`), seguido de *fade-in* musical e retomada dos spawns.
- **Buracos no Chão (`HorizontalTrackSystem` + `Player.handlePitFall`):** Buracos frequentes e longos com plataformas alcançáveis; cair causa exatamente `-30 HP`, ricochete para área segura e proteção contra dano repetido na recuperação.
- **Dash / Slide:** Comando normal sem cooldown (`COOLDOWN_MS = 0`) e sem indicador de habilidade na HUD.
- **Isolamento de UI e Efeito de Bebida (`src/ui/UiCameraLayer.js`):** `uiCamera` dedicada renderiza HUD, Pause, Loja do Chiquinho, Guia de Combos e Tooltips acima da câmera principal, garantindo que `DrunkEffect` (PostFX) distorça apenas o gameplay.

---

## 4. Arquivos-Chave Modificados/Criados Recentemente

- **Perspectiva & Renderização:**
  - `src/systems/PerspectiveSystem.js`
  - `src/ui/Stage3DRenderer.js`
  - `src/ui/TopDownRenderer.js`
  - `src/ui/UiCameraLayer.js`
  - `src/ui/EffectsManager.js`
- **Entidades, Controles & Combate:**
  - `src/constants/controls.js`, `src/systems/InputController.js`
  - `src/entities/Player.js`, `src/entities/Enemy.js`, `src/entities/Boss.js`, `src/entities/Drink.js`, `src/entities/GoldenCharacter.js`, `src/entities/Ant.js`
  - `src/combat/Hitbox.js`, `src/combat/CombatSystem.js`
  - `src/systems/EnemyAI.js`, `src/systems/BossAI.js`, `src/systems/HorizontalTrackSystem.js`
  - `src/scenes/MainScene.js`
- **Testes:**
  - `tests/perspective_phases.test.js`
  - `tests/horizontal_gameplay.test.js`

---

## 5. Última Validação Executada

- **Comando:** `npx vitest run --pool=vmThreads --reporter=dot; git diff --check`
- **Resultado:** `15/15` arquivos de teste e `98/98` testes passando (`0` falhas).
- **Documentação:** `docs/PROGRESS.md` e `docs/CHANGELOG.md` atualizados.
