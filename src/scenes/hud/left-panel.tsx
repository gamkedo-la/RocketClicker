import { RESOURCES } from "@game/assets";
import { signal } from "@game/core/signals/signals";
import { ALIGN_ITEMS, DIRECTION } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { BUILDINGS } from "@game/entities/buildings/index";
import { Building } from "@game/entities/buildings/types";
import { MATERIALS } from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { FlexItem } from "../../core/ui/FlexItem";
import { FlexRow } from "../../core/ui/FlexRow";
import { BuildingDetailsPanel } from "./components/left/BuildingDetailsPanel";
import { BuildingSelector } from "./components/left/BuildingSelector";
import { CometSpinMeter } from "./components/left/CometSpinMeter";
import { NineSlice } from "./components/NineSlice";
import { BulldozeBuildingButton } from "./components/left/BulldozeBuildingButton";
import { SoundManager } from "@game/core/sound/sound-manager";
export const LeftPanel = ({
  width,
  gameState,
  soundManager,
}: {
  width: number;
  gameState: GameStateManager;
  soundManager: SoundManager;
}) => {
  const material_storage =
    gameState.state.get().material_storage[MATERIALS.CometDust];

  /*
  const button = (
    <Button material={MATERIALS.StarDust} amount={material_storage} />
  );*/

  const x = signal(150);
  const panelWidth = signal(150);
  const contentAlpha = signal(0);

  const minWidth = 40;
  const maxWidth = 180;

  const hoveredBuilding = signal<Building | null>(null);

  const mm = (
    <motionMachine initial="hidden">
      <state id="hidden">
        <animation>
          <tween signal={contentAlpha} from={1} to={0} duration={200} />
          <tween signal={panelWidth} to={minWidth} duration={200} />
          <wait duration={50} />
          <tween signal={x} to={150} duration={300} />
        </animation>
        <transition on="visible" target="visible" />
      </state>
      <state id="visible">
        <animation>
          <parallel>
            <tween signal={x} to={270} duration={200} />
            <tween signal={panelWidth} to={maxWidth} duration={300} />
          </parallel>
          <tween signal={contentAlpha} from={0} to={1} duration={300} />
        </animation>
        <transition on="hidden" target="hidden" />
      </state>
    </motionMachine>
  );

  const buildFlex = (
    <FlexItem attachTo={-1} offsetX={0} offsetY={10}>
      <BuildingDetailsPanel
        building={hoveredBuilding}
        width={panelWidth}
        contentAlpha={contentAlpha}
      />
    </FlexItem>
  );

  x.subscribe((x) => {
    buildFlex.setX(x);
  });

  let timeout: NodeJS.Timeout | null = null;

  hoveredBuilding.subscribe((building) => {
    if (building) {
      console.log("building", building);
      mm.transition("visible");
      if (timeout) {
        clearTimeout(timeout);
      }
    } else {
      console.log("no building");
      timeout = setTimeout(() => {
        mm.transition("hidden");
      }, 100);
    }
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
          <Flex
            width={width - 20}
            direction={DIRECTION.COLUMN}
            alignContent={ALIGN_ITEMS.STRETCH}
            padding={2}
          >
            {[
              ...BUILDINGS.map((building, i) => (
                <BuildingSelector
                  id={i}
                  hoveredBuilding={hoveredBuilding}
                  building={building}
                  gameState={gameState}
                  soundManager={soundManager}
                />
              )),
              <BulldozeBuildingButton gameState={gameState} />,
            ]}
          </Flex>
          {buildFlex}
        </Flex>
      </FlexItem>
    </Flex>
  );

  return z;
};
