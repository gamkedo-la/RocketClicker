import { Flex } from "@game/core/ui/Flex";

export const RightPanel = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  const r: Phaser.GameObjects.Rectangle = <rectangle strokeColor={0x00ffff} />;

  return (
    <Flex width={width} height={height} backgroundElement={r}>
      <text text="Right Panel" />
    </Flex>
  );
};
