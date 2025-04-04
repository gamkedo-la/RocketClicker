import { RESOURCES } from "@game/assets";
import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { MATERIALS } from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { FlexItem } from "@game/core/ui/FlexItem";

import { Counter } from "./components/counter";
import { NineSlice } from "./components/NineSlice";
import { BuildingsPanel } from "./components/right/BuildingDialsPanel";

export const RightPanel = ({
  width,
  gameState,
}: {
  width: number;
  gameState: GameStateManager;
}) => (
  <Flex direction={DIRECTION.COLUMN} width={width} margin={1}>
    <Flex
      direction={DIRECTION.COLUMN}
      backgroundElement={
        <NineSlice
          texture={RESOURCES["ui-left-panel"]}
          frame="bg-rocket-goal"
        />
      }
      padding={[10, 9]}
      width={width}
    >
      <Flex
        direction={DIRECTION.COLUMN}
        padding={2}
        alignContent={ALIGN_ITEMS.FLEX_END}
      >
        {...Object.keys(MATERIALS)
          .filter((material) => material === "LOX" || material === "LH2")
          .map((material) => (
            // TODO: add material icons
            // <image texture={RESOURCES[material]} />
            <Counter
              title={material}
              value={
                gameState.state.get().material_storage[
                  material as keyof typeof MATERIALS
                ]
              }
            />
          ))}
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
        <Flex
          direction={DIRECTION.COLUMN}
          padding={2}
          alignContent={ALIGN_ITEMS.FLEX_END}
        >
          {...Object.keys(MATERIALS)
            .filter((material) => material !== "LOX" && material !== "LH2")
            .map((material) => (
              // TODO: add material icons
              // <image texture={RESOURCES[material]} />
              <Counter
                title={material}
                value={
                  gameState.state.get().material_storage[
                    material as keyof typeof MATERIALS
                  ]
                }
              />
            ))}
        </Flex>
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
