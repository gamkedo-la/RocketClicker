import { RESOURCES } from "@game/assets";
import { ALIGN_ITEMS, DIRECTION } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexItem, Spacer } from "@game/core/ui/FlexItem";
import { FlexRow } from "@game/core/ui/FlexRow";
import PhaserGamebus from "@game/lib/gamebus";

import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { computed, effect, signal } from "@game/core/signals/signals";
import { SoundManager } from "@game/core/sound/sound-manager";
import { GameStateManager, GameStatus } from "@game/state/game-state";
import { AbstractScene } from "../index";
import { SCENES } from "../scenes";
import { NineSlice } from "./components/NineSlice";
import { SoundButtons } from "./components/sound-buttons";
import { LeftPanel } from "./left-panel";
import { RightPanel } from "./right-panel";

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

    let timer_spacer = <Spacer width={280} grow={0} />;

    const topBar: FlexRow = (
      <Flex
        width={width}
        height={33}
        backgroundElement={<rectangle fillColor={COLORS_NAMES["black"]} />}
        padding={[0, 10]}
      >
        <SoundButtons scene={this} />
        <text
          text="THE SPINNING COMET ESCAPE"
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
        <Spacer width={180} grow={0} />
        {timer_text}
        {timer_spacer}
        {rocket_text}
      </Flex>
    );

    effect(() => {
      if (this.gameState.state.get().status === GameStatus.ROCKET_LAUNCHED) {
        timer_event.remove();
        timer_text.setColor("#aaff00");
        rocket_text.setColor("#ffaa00");
        rocket_text.setText("Rocket launched!");
        timer_spacer.setWidth(515);
        topBar.layout();
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
        padding={[42, 9, 12, 8]}
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
