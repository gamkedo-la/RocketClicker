import { RESOURCES } from "@game/assets";
import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexItem, Spacer } from "@game/core/ui/FlexItem";
import { FlexRow } from "@game/core/ui/FlexRow";
import PhaserGamebus from "@game/lib/gamebus";

import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { computed, effect, signal } from "@game/core/signals/signals";
import { GameStateManager, GameStatus } from "@game/state/game-state";
import { AbstractScene } from "../index";
import { SCENES } from "../scenes";
import { NineSlice } from "./components/NineSlice";
import { LeftPanel } from "./left-panel";
import { RightPanel } from "./right-panel";
import { SoundManager } from "@game/core/sound/sound-manager";

export class HudScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;
  declare gameState: GameStateManager;
  declare soundManager: SoundManager;

  camera: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super(SCENES.HUD);
  }

  create() {
    this.bus = this.gamebus.getBus();

    const { width, height } = this.scale.gameSize;

    let timer = signal(0);

    const timer_event = this.time.addEvent({
      delay: 1000,
      repeat: -1,
      callback: () => {
        timer.update((timer) => timer + 1);
      },
    });

    let timer_text = (
      <text
        text={computed(() => {
          const minutes = Math.floor(timer.get() / 60);
          const seconds = timer.get() % 60;
          return `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;
        })}
        style={{ align: "center", fontSize: 22 }}
      />
    );

    const rocket_text = (
      <text
        text={`You need 140,000 LH2 and 30,000 LOX to launch the rocket`}
        style={{ align: "center", fontSize: 16 }}
      />
    );

    const topBar = (
      <Flex
        width={width}
        height={32}
        backgroundElement={<rectangle fillColor={COLORS_NAMES["black"]} />}
        padding={[0, 20]}
      >
        <text
          text="PLAYTESTING VERSION 0.1.0"
          style={{
            color: STRING_COLORS_NAMES["fever-dream"],
            fontSize: 20,
          }}
        />
        <Spacer width={5} grow={0} />
        <rectangle fillColor={COLORS_NAMES["white"]} width={10} height={10} />
        <Spacer width={5} grow={0} />
        <text
          text={computed(
            () =>
              `Selected Building: ${
                this.gameState.state.get().mouse_selected_building.get()
                  ?.building?.name || "None"
              }`
          )}
          style={{
            color: STRING_COLORS_NAMES["vaporwave-blue"],
            fontSize: 16,
          }}
        />
        <Spacer width={250} grow={0} />
        {timer_text}
        <Spacer width={275} grow={0} />
        {rocket_text}
      </Flex>
    );

    effect(() => {
      if (this.gameState.state.get().status === GameStatus.ROCKET_LAUNCHED) {
        timer_event.remove();
        timer_text.setColor("#aaff00");
        rocket_text.setColor("#ffaa00");
        rocket_text.setText("Rocket launched!");
      }
    });

    const screenBorder = (
      <Flex
        padding={0}
        margin={0}
        width={width}
        height={height}
        alignContent={ALIGN_ITEMS.STRETCH}
        direction={DIRECTION.COLUMN}
      >
        {topBar}
        <FlexItem grow={1}>
          <NineSlice
            texture={RESOURCES["ui-left-panel"]}
            frame="screen-frame"
          />
        </FlexItem>
      </Flex>
    );

    screenBorder.addToScene();

    const sidebarWidth = 250;

    const layout: FlexRow = (
      <Flex
        padding={[45, 12, 13]}
        margin={0}
        width={width}
        height={height}
        alignContent={ALIGN_ITEMS.STRETCH}
      >
        <LeftPanel
          width={sidebarWidth}
          gameState={this.gameState}
          soundManager={this.soundManager}
        />
        <Spacer />
        <RightPanel
          width={sidebarWidth}
          gameState={this.gameState}
          bus={this.bus}
        />
      </Flex>
    );

    layout.addToScene();

    this.gameState.setLoadingState({
      hud: true,
    });
  }

  shutdown() {}
}
