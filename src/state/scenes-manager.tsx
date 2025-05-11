import { signal } from "@game/core/signals/signals";
import { SCENES } from "@game/scenes/scenes";
import { MotionMachine } from "../core/motion-machine/motion-machine";
import { GameStateManager } from "./game-state";

export type SceneStates =
  | "loading"
  | "intro"
  | "game-loading"
  | "game"
  | "end-game";

export type SceneEvents = "loaded" | "start" | "end-game-loading" | "end-game";

export class ScenesManager extends Phaser.Plugins.BasePlugin {
  scenePlugin: Phaser.Scenes.ScenePlugin;
  scenes: MotionMachine<SceneStates, SceneEvents>;

  transitionSignal = signal(0, {
    label: "Transition Signal",
    tweakpaneOptions: {
      min: 0,
      max: 1,
    },
  });

  constructor(pluginManager: Phaser.Plugins.PluginManager) {
    super(pluginManager);
  }

  boot(sceneManager: Phaser.Scenes.ScenePlugin) {
    this.scenePlugin = sceneManager;

    this.scenes = (
      <motionMachine initialState="preloader">
        <state id="preloader">
          <animation on="enter">
            <step
              run={() => {
                this.scenePlugin.launch(SCENES.PRELOADER);
              }}
            />
          </animation>
          <transition on="loaded" target="intro" />
        </state>
        <state id="intro">
          <animation on="enter">
            <step
              run={() => {
                this.scenePlugin.launch(SCENES.INTRO);
              }}
            />
          </animation>
          <transition on="start" target="game" />
        </state>
        <state id="game">
          <animation on="enter">
            <step
              run={() => {
                this.scenePlugin.launch(SCENES.TRANSITIONS);
                this.scenePlugin.bringToTop(SCENES.TRANSITIONS);
              }}
            />
            <tween
              signal={this.transitionSignal}
              from={0}
              to={1}
              duration={1000}
            />
            <step
              run={() => {
                this.scenePlugin.stop(SCENES.TRANSITIONS);
              }}
            />
          </animation>
          <animation on="active">
            <step
              run={() => {
                this.scenePlugin.launch(SCENES.GAME);
              }}
            />
          </animation>
          <transition on="end" target="end" />
        </state>
        <state id="end">
          <animation on="exit">
            <step
              run={() => {
                this.scenePlugin.stop(SCENES.THREE_COMET);
              }}
            />
          </animation>
        </state>
      </motionMachine>
    );

    const gameStateManager: GameStateManager = this.pluginManager.get(
      "GameStateManager"
    ) as GameStateManager;

    gameStateManager?.state.subscribe((state) => {
      if (
        state.loading_state.game &&
        state.loading_state.three_comet &&
        state.loading_state.hud
      ) {
        this.transitionTo("end-game-loading");
      }
    });
  }

  transitionTo(scene: SceneEvents) {
    this.scenes.transition(scene);
  }

  getTransitionSignal() {
    return this.transitionSignal;
  }
}
