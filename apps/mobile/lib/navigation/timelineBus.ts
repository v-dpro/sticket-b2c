// timelineBus — one tiny signal: the center ticket button asks the wheel
// to spin home to today. The timeline screen registers a handler while
// mounted; the button emits on tap.

type Handler = () => void;

let handler: Handler | null = null;

export function onSnapToToday(h: Handler): () => void {
  handler = h;
  return () => {
    if (handler === h) handler = null;
  };
}

export function emitSnapToToday(): void {
  handler?.();
}
