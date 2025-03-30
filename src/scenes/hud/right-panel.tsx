import { RESOURCES } from "@game/assets";
import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { MATERIALS } from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { Counter } from "./components/counter";
import { NineSlice } from "./components/nineslice";
import { FlexItem } from "../../core/ui/FlexItem";
import { BuildingsPanel } from "./components/BuildingsPanel";

export const RightPanel = ({
  width,
  gameState,
}: {
  width: number;
  gameState: GameStateManager;
}) => (
  <Flex direction={DIRECTION.COLUMN} width={width} margin={1}>
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
          {...Object.keys(MATERIALS).map((material) => (
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
