import { mutable } from "./lib/signals";
import { MutableSignal } from "./lib/types";

export const GameStatus = {
  LOADING: "loading",
  RUNNING: "running",
  ENDED: "ended",
} as const;

export interface State {
  status: (typeof GameStatus)[keyof typeof GameStatus];
  time: number;
  score: number;
}

export interface GameState {
  state: MutableSignal<State | null>;
}

export class GameStateManager
  extends Phaser.Plugins.BasePlugin
  implements GameState
{
  state: MutableSignal<State> = mutable({
    status: GameStatus.LOADING,
    time: 0,
    score: 0,
  });

  constructor(pluginManager: Phaser.Plugins.PluginManager) {
    super(pluginManager);
  }

  private mutateState(mutation: (state: State) => boolean): void {
    this.state.mutate(mutation);
  }

  setGameStatus(status: (typeof GameStatus)[keyof typeof GameStatus]) {
    this.mutateState((state) => {
      state.status = status;
      return true;
    });
  }
}
