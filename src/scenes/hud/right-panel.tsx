import { RESOURCES } from "@game/assets";
import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { MATERIALS } from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { FlexItem } from "@game/core/ui/FlexItem";

import { NineSlice } from "./components/NineSlice";
import { BuildingsPanel } from "./components/right/BuildingDialsPanel";
import { RocketLauncher } from "./components/right/RocketLauncher";
import { Counter, ResourcesCounter } from "./components/right/ResourcesCounter";

export const RightPanel = ({
  width,
  gameState,
  bus,
}: {
  width: number;
  gameState: GameStateManager;
  bus: Phaser.Events.EventEmitter;
}) => (
  <Flex direction={DIRECTION.COLUMN} width={width} margin={1}>
    <Flex
      backgroundElement={
        <NineSlice
          texture={RESOURCES["ui-left-panel"]}
          frame="bg-rocket-goal"
        />
      }
      padding={[10, 9]}
      width={width}
      justify={JUSTIFY.SPACE_AROUND}
    >
      <Flex
        direction={DIRECTION.COLUMN}
        padding={2}
        alignContent={ALIGN_ITEMS.FLEX_END}
      >
        {...Object.keys(MATERIALS)
          .filter((material) => material === "LOX" || material === "LH2")
          .map((material) => (
            <Counter
              title={material}
              material={material}
              value={
                gameState.state.get().material_storage[
                  material as keyof typeof MATERIALS
                ]
              }
            />
          ))}
      </Flex>
      <Flex direction={DIRECTION.COLUMN} margin={5}>
        <RocketLauncher gameState={gameState} bus={bus} />
      </Flex>
    </Flex>
    <FlexItem grow={1}>
      <Flex
        width={width}
        justify={JUSTIFY.CENTER}
        padding={[10, 9]}
        backgroundElement={
          <NineSlice texture={RESOURCES["ui-left-panel"]} frame="bg-panel" />
        }
      >
        <ResourcesCounter gameState={gameState} />
      </Flex>
    </FlexItem>
    <Flex
      direction={DIRECTION.COLUMN}
      backgroundElement={
        <NineSlice texture={RESOURCES["ui-left-panel"]} frame="bg-buildings" />
      }
      padding={[10, 9]}
      width={width}
    >
      <BuildingsPanel gameState={gameState} />
    </Flex>
  </Flex>
);
