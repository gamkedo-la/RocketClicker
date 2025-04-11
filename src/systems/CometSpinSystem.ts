import { COMET_SPIN_FORCE } from "@game/state/consts";
import { GameStateManager } from "@game/state/game-state";
import { System } from ".";

export default class CometSpinSystem implements System {
  constructor(private gameState: GameStateManager) {}

  create(): this {
    return this;
  }

  update(_time: number, delta: number): void {
    const spin = this.gameState.getCometSpin().get();

    const spinSignal = Math.sign(spin);
    // The spin always wants to go back to 10, and it does it linearly from spin 10 to 100.
    const spinDrag = (Math.abs(spin) - 10) / 90;
    const force = 3 * COMET_SPIN_FORCE * delta * spinDrag;
    const newSpin = spin - force * spinSignal;

    this.gameState.getCometSpin().set(newSpin);
  }

  destroy(): void {}
}
