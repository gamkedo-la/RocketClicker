import { RESOURCES } from "@game/assets";
import { STRING_COLORS_NAMES } from "@game/consts";
import { DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { BUILDINGS, getBuildingById } from "@game/entities/buildings/index";
import { MATERIALS } from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { FlexRow } from "../../core/ui/FlexRow";
import { BuildingSelector } from "./components/BuildingSelector";
import { NineSlice } from "./components/nineslice";
import { FlexItem } from "../../core/ui/FlexItem";
import { CometSpinMeter } from "./components/CometSpinMeter";
import { BuildingDetailsPanel } from "./components/BuildingDetailsPanel";
import { signal } from "@game/core/signals/signals";

const UI_TEXT_STYLE = {
  color: STRING_COLORS_NAMES["cuba-libre"],
  fontSize: "32px",
  align: "center",
  fontFamily: "jersey15",
};

export const LeftPanel = ({
  width,
  gameState,
}: {
  width: number;
  gameState: GameStateManager;
}) => {
  const title: Phaser.GameObjects.Text = (
    <text text="Big left title" resolution={2} style={UI_TEXT_STYLE} />
  );
  title.setShadow(0, -2, STRING_COLORS_NAMES["dark-void"], 0, true, true);

  const material_storage =
    gameState.state.get().material_storage[MATERIALS.StarDust];

  /*
  const button = (
    <Button material={MATERIALS.StarDust} amount={material_storage} />
  );*/

  const x = signal(150);
  const panelWidth = signal(150);

  const minWidth = 40;
  const maxWidth = 300;

  const mm = (
    <motionMachine initial="hidden">
      <state id="hidden">
        <animation>
          <parallel>
            <tween signal={panelWidth} to={minWidth} duration={300} />
            <tween signal={x} to={150} duration={300} />
          </parallel>
        </animation>
        <transition on="mouseenter" target="visible" />
      </state>
      <state id="visible">
        <animation>
          <tween signal={x} to={270} duration={400} />
          <wait duration={100} />
          <tween signal={panelWidth} to={maxWidth} duration={300} />
        </animation>
        <transition on="mouseleave" target="hidden" />
      </state>
    </motionMachine>
  );

  const buildFlex = (
    <FlexItem attachTo={-1} offsetX={0} offsetY={10}>
      <BuildingDetailsPanel
        building={getBuildingById(BUILDINGS[0].id)}
        width={panelWidth}
      />
    </FlexItem>
  );

  x.subscribe((x) => {
    console.log("x", x);
    buildFlex.setX(x);
  });

  const z: FlexRow = (
    <Flex direction={DIRECTION.COLUMN} width={width}>
      <Flex
        direction={DIRECTION.COLUMN}
        backgroundElement={
          <NineSlice
            texture={RESOURCES["ui-left-panel"]}
            frame="bg-buildings"
          />
        }
        padding={[10, 9]}
        width={width}
      >
        <CometSpinMeter gameState={gameState} />
      </Flex>
      <FlexItem grow={1}>
        <Flex
          direction={DIRECTION.COLUMN}
          backgroundElement={
            <NineSlice texture={RESOURCES["ui-left-panel"]} frame="bg-panel" />
          }
          width={width}
          padding={[10, 9]}
        >
          {title}
          <Flex
            justify={JUSTIFY.SPACE_AROUND}
            width={width - 20}
            wrapped
            padding={2}
          >
            {BUILDINGS.map((building) => (
              <BuildingSelector
                buildingPanelMotionMachine={mm}
                building={building}
                gameState={gameState}
              />
            ))}
          </Flex>
          {buildFlex}
        </Flex>
      </FlexItem>
    </Flex>
  );

  return z;
};
