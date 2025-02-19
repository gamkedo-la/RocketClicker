import { STRING_COLORS_NAMES } from "@game/consts";
import { Flex } from "@game/core/ui/Flex";
import { FlexRow } from "../../core/ui/FlexRow";
import { NineOne } from "./components/nine-one";

const UI_TEXT_STYLE = {
  color: STRING_COLORS_NAMES["cuba-libre"],
  fontSize: "32px",
  align: "center",
  fontFamily: "handjet",
};

export const LeftPanel = ({ width }: { width: number }) => {
  const r: Phaser.GameObjects.Rectangle = <rectangle strokeColor={0xffff00} />;

  const title: Phaser.GameObjects.Text = (
    <text text="Big left title" resolution={2} style={UI_TEXT_STYLE} />
  );
  title.setShadow(0, -2, STRING_COLORS_NAMES["dark-void"], 0, true, true);

  const z: FlexRow = (
    <Flex width={width} padding={30} backgroundElement={<NineOne />}>
      {title}
    </Flex>
  );

  return z;
};
