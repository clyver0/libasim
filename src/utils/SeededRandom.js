/**
 * Converte uma seed arbitrária (número ou string) em um inteiro de 32 bits não-assinado.
 */
export function normalizeSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return (seed >>> 0) || 1;
  }

  const str = String(seed ?? 'default-seed');
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

/**
 * Gerador pseudoaleatório determinístico baseado em Mulberry32.
 * Garante reprodutibilidade completa para uma mesma seed.
 */
export class SeededRandom {
  constructor(seed) {
    this.seed = normalizeSeed(seed);
    this.state = this.seed;
  }

  next() {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  pick(items) {
    if (!items || items.length === 0) return undefined;
    return items[this.int(0, items.length - 1)];
  }
}
