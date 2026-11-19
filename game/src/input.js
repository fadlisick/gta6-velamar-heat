// Keyboard + mouse input. Tracks held keys, edge-triggered presses, and the
// pointer-lock look deltas the camera consumes each frame.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.lookDX = 0;
    this.lookDY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.locked = false;
    this.canvas = canvas;
    this.onPause = null;
    this.onAnyKey = null;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (e.code === 'KeyP' && this.onPause) this.onPause();
      if (this.onAnyKey) this.onAnyKey(e.code);
      if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.lookDX += e.movementX || 0;
      this.lookDY += e.movementY || 0;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouseDown = true; this.mouseClicked = true; }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    canvas.addEventListener('click', () => {
      if (!this.locked && document.pointerLockElement !== canvas) {
        try {
          const r = canvas.requestPointerLock?.();
          if (r && r.catch) r.catch(() => {});
        } catch { /* needs a user gesture */ }
      }
    });
  }
  down(code) { return this.keys.has(code); }
  hit(code) { return this.pressed.has(code); }
  axis(neg, pos) { return (this.keys.has(pos) ? 1 : 0) - (this.keys.has(neg) ? 1 : 0); }
  consumeLook() {
    const dx = this.lookDX, dy = this.lookDY;
    this.lookDX = 0; this.lookDY = 0;
    return { dx, dy };
  }
  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}
