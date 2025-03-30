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
            <BuildingSelector
              building={getBuildingById(BUILDINGS[0].id)}
              gameState={gameState}
            />
            <BuildingSelector
              building={getBuildingById(BUILDINGS[1].id)}
              gameState={gameState}
            />
            <BuildingSelector
              building={getBuildingById(BUILDINGS[2].id)}
              gameState={gameState}
            />
            <BuildingSelector
              building={getBuildingById(BUILDINGS[3].id)}
              gameState={gameState}
            />
            <BuildingSelector
              building={getBuildingById(BUILDINGS[4].id)}
              gameState={gameState}
            />
            <BuildingSelector
              building={getBuildingById(BUILDINGS[5].id)}
              gameState={gameState}
            />
            <BuildingSelector
              building={getBuildingById(BUILDINGS[6].id)}
              gameState={gameState}
            />
            <BuildingSelector
              building={getBuildingById(BUILDINGS[7].id)}
              gameState={gameState}
            />
            <BuildingSelector
              building={getBuildingById(BUILDINGS[8].id)}
              gameState={gameState}
            />
            <BuildingSelector
              building={getBuildingById(BUILDINGS[9].id)}
              gameState={gameState}
            />
          </Flex>
        </Flex>
      </FlexItem>
    </Flex>
  );

  return z;
};
