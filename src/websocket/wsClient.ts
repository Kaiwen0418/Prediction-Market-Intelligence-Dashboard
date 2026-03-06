type MessageHandler<T> = (payload: T) => void;

type MockSocketOptions<T> = {
  intervalMs?: number;
  createMessage: () => T;
};

export class MockWebSocketClient<T> {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: MockSocketOptions<T>) {}

  connect(handler: MessageHandler<T>) {
    if (this.timer) return;
    this.timer = setInterval(() => {
      handler(this.options.createMessage());
    }, this.options.intervalMs ?? 2_500);
  }

  disconnect() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
