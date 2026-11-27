export const CONTROLS = {
  MOVE_LEFT: ['LEFT', 'A'],
  MOVE_RIGHT: ['RIGHT', 'D'],
  MOVE_UP: ['UP', 'W'],
  MOVE_DOWN: ['DOWN', 'S'],
  JUMP: ['UP', 'W', 'SPACE'],
  DASH: ['SHIFT', 'S', 'DOWN'],
  CONFIRM: ['ENTER', 'SPACE'],
  PAUSE: ['P'],
  // Teclas provisórias de combate e guia de combos (Seção 15 de TECHNICAL_DECISIONS.md)
  ATTACK_LIGHT: ['J', 'Z'],
  ATTACK_HEAVY: ['K', 'X'],
  ATTACK_SPECIAL: ['L', 'C'],
  COMBO_GUIDE: ['TAB', 'G'],
  MUTE_AUDIO: ['M'],
  // Expansão: habilidade especial, intensidade da embriaguez e volume da música
  SPECIAL_ABILITY: ['E', 'Q'],
  DRUNK_FX_LEVEL: ['N'],
  MUSIC_VOLUME_DOWN: ['OPEN_BRACKET'],
  MUSIC_VOLUME_UP: ['CLOSE_BRACKET'],
};
