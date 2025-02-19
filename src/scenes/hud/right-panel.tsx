import { Flex } from "@game/core/ui/Flex";
import { NineOne } from "./components/nine-one";

export const RightPanel = ({ width }: { width: number }) => {
  const r: Phaser.GameObjects.Rectangle = <rectangle strokeColor={0x00ffff} />;

  return (
    <Flex width={width} padding={30} backgroundElement={<NineOne />}>
      <text text="Right Panel" />
    </Flex>
  );
};
