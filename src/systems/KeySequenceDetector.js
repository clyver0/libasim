export class KeySequenceDetector {
  constructor(sequence, timeoutMs = 1800) {
    this.sequence = [...sequence].map(String);
    this.timeoutMs = timeoutMs;
    this.reset();
  }

  reset() {
    this.progress = 0;
    this.lastInputAt = null;
  }

  push(key, timestampMs) {
    const value = String(key ?? '');
    if (!this.sequence.length || !Number.isFinite(timestampMs)) {
      this.reset();
      return false;
    }

    if (
      this.lastInputAt !== null &&
      (timestampMs < this.lastInputAt ||
        timestampMs - this.lastInputAt > this.timeoutMs)
    ) {
      this.progress = 0;
    }

    const expected = this.sequence[this.progress];
    if (value === expected) {
      this.progress += 1;
    } else {
      this.progress = value === this.sequence[0] ? 1 : 0;
    }
    this.lastInputAt = timestampMs;

    if (this.progress !== this.sequence.length) return false;
    this.reset();
    return true;
  }
}
