import { STRING_COLORS_NAMES } from "@game/consts";
import { DIRECTION } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { MATERIALS } from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { FlexRow } from "../../core/ui/FlexRow";
import { BuildingSelector } from "./components/BuildingSelector";
import { NineOne } from "./components/nine-one";

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
    <Flex
      width={width}
      padding={10}
      backgroundElement={<NineOne />}
      direction={DIRECTION.COLUMN}
    >
      {title}
      <Flex width={width} wrapped>
        <BuildingSelector />
        <BuildingSelector />
        <BuildingSelector />
        <BuildingSelector />
        <BuildingSelector />
        <BuildingSelector />
        <BuildingSelector />
        <BuildingSelector />
        <BuildingSelector />
      </Flex>
    </Flex>
  );

  return z;
};
