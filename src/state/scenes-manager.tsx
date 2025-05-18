import { signal } from "@game/core/signals/signals";
import { SCENES } from "@game/scenes/scenes";
import { MotionMachine } from "../core/motion-machine/motion-machine";
import { GameStateManager } from "./game-state";
import { SoundManager } from "@game/core/sound/sound-manager";

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
  soundManager: SoundManager;
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

  boot(sceneManager: Phaser.Scenes.ScenePlugin, soundManager: SoundManager) {
    this.scenePlugin = sceneManager;
    this.soundManager = soundManager;

    const TransitionSignal = ({
      duration,
      direction = "in",
    }: {
      duration: number;
      direction?: "in" | "out";
    }) => (
      <>
        <step
          run={() => {
            this.scenePlugin.bringToTop(SCENES.TRANSITIONS);
          }}
        />
        <tween
          signal={this.transitionSignal}
          from={direction === "in" ? 0 : 1}
          to={direction === "in" ? 1 : 0}
          duration={duration}
        />
      </>
    );

    const TransitionScene = this.scenePlugin.get(SCENES.TRANSITIONS);

    const intro_music_volume = signal(0);
    const game_music_volume = signal(0);

    const registerVolumeListeners = () => {
      intro_music_volume.subscribe((vol) => {
        this.soundManager.getSound("placeholder-music-loop").setVolume(vol);
      });
      game_music_volume.subscribe((vol) => {
        this.soundManager.getSound("music_loop_TheViewFromHere").setVolume(vol);
      });
    };

    this.scenes = (
      <motionMachine initialState="preloader">
        <state id="preloader">
          <animation on="enter">
            <step
              run={() => {
                this.scenePlugin.launch(SCENES.PRELOADER);
                this.scenePlugin.bringToTop(SCENES.PRELOADER);
                this.scenePlugin.launch(SCENES.TRANSITIONS);
              }}
            />
          </animation>
          <animation on="exit">
            <TransitionSignal duration={100} direction="out" />
            <step
              run={() => {
                this.scenePlugin.stop(SCENES.PRELOADER);
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
                registerVolumeListeners();
                this.soundManager.play("placeholder-music-loop", {
                  volume: 0,
                  loop: true,
                });
              }}
            />
            <parallel>
              <tween
                signal={intro_music_volume}
                from={0}
                to={1}
                duration={4000}
              />
              <TransitionSignal duration={4000} />
            </parallel>
          </animation>
          <animation on="exit">
            <TransitionSignal duration={500} direction="out" />
          </animation>
          <transition on="start" target="game-loading" />
        </state>
        <state id="game-loading">
          <animation on="active">
            <tween
              signal={intro_music_volume}
              from={1}
              to={0}
              duration={1000}
            />
            <step
              run={() => {
                this.scenePlugin.launch(SCENES.GAME);
              }}
            />
            <step
              run={() => {
                this.soundManager.stop("placeholder-music-loop");
              }}
            />
          </animation>
          <transition on="end-game-loading" target="game" />
        </state>
        <state id="game">
          <animation on="enter">
            <TransitionSignal duration={1500} />
            <step
              run={() => {
                this.soundManager.play("music_loop_TheViewFromHere", {
                  volume: 0,
                  seek: 31.8,
                  loop: true,
                });
              }}
            />
          </animation>
          <animation on="active">
            <tween signal={game_music_volume} from={0} to={1} duration={2000} />
          </animation>
          <transition on="end-game" target="end-game" />
        </state>
        <state id="end-game">
          <animation on="enter">
            <wait duration={1000} />
            <step
              run={() => {
                this.scenePlugin.stop(SCENES.GAME);
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
