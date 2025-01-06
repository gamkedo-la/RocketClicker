export interface System {
  create(): this;
  update(time: number, delta: number): void;
  destroy(): void;
}
