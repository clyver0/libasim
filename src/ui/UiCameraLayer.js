/**
 * Determina se um GameObject da cena pertence à camada de UI/modais que deve ser
 * renderizada em uma câmera limpa (`uiCamera`) acima da câmera principal (`cameras.main`),
 * completamente imune ao pós-processamento de embriaguez (Warp, Swirl, Chroma, Barrel, Bloom).
 */
export function isUiOverlayObject(object, { excluded = null, minUiDepth = 19 } = {}) {
  if (!object) return false;
  if (excluded && excluded.has(object)) return false;

  const isScreenFixed =
    object.scrollFactorX === 0 && object.scrollFactorY === 0;
  if (!isScreenFixed) return false;

  const depth = typeof object.depth === 'number' ? object.depth : 0;
  return depth >= minUiDepth;
}

/**
 * Sincroniza `mainCamera` (mundo com pós-processamento) e `uiCamera` (UI/modais sem distorção):
 * - Objetos de UI/modal são ignorados por `mainCamera` e renderizados apenas por `uiCamera`.
 * - Objetos do mundo (jogador, inimigos, plataformas, cenário parallax, bebidas) são ignorados por `uiCamera`.
 */
export function syncUiCameraObjects(
  mainCamera,
  uiCamera,
  displayList = [],
  state = { uiObjects: new WeakSet(), worldObjects: new WeakSet() },
  options = {}
) {
  if (!mainCamera || !uiCamera || !Array.isArray(displayList)) return state;

  for (const object of displayList) {
    if (!object) continue;
    if (state.uiObjects.has(object) || state.worldObjects.has(object)) continue;

    if (isUiOverlayObject(object, options)) {
      mainCamera.ignore?.(object);
      state.uiObjects.add(object);
    } else {
      uiCamera.ignore?.(object);
      state.worldObjects.add(object);
    }
  }

  return state;
}
