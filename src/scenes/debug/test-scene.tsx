import { AbstractScene } from "..";

export class TestScene extends AbstractScene {
  constructor() {
    super("TEST");
  }

  create() {}
  update(_time: number, _delta: number) {}
  shutdown() {}
}
