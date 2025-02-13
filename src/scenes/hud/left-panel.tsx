import { Flex } from "../../ui/components/Flex";

export const LeftPanel = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  const r: Phaser.GameObjects.Rectangle = <rectangle strokeColor={0xffff00} />;

  return (
    <Flex width={width} height={height} backgroundElement={r}>
      <text text="Left Panel" />
    </Flex>
  );
};
