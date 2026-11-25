import { GAMEPLAY } from '../constants/gameplay.js';

export const UI_FONT_FAMILY =
  "'Segoe UI', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

/**
 * Mantém as dimensões fixas padrão (960x540) sem alterar zoom/origem da câmera,
 * aplicando fonte limpa e alta resolução apenas na textura dos textos.
 */
export function setupCrispScene(scene) {
  const width = GAMEPLAY.SCREEN_WIDTH;
  const height = GAMEPLAY.SCREEN_HEIGHT;

  if (scene?.add?.text && !scene.add._crispPatched) {
    const rawText = scene.add.text.bind(scene.add);
    const dpr =
      typeof window !== 'undefined'
        ? Math.max(2, Math.ceil(window.devicePixelRatio || 2))
        : 2;

    scene.add.text = (x, y, content, style = {}) =>
      rawText(x, y, content, {
        fontFamily: UI_FONT_FAMILY,
        resolution: dpr,
        ...style,
      });
    scene.add._crispPatched = true;
  }

  return { width, height, zoom: 1 };
}
