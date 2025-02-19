import { RESOURCES } from "@game/assets";
import { ALIGN_ITEMS, DIRECTION } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexItem, Spacer } from "@game/core/ui/FlexItem";

export const NineOne = () => {
  const bg = (
    <Flex margin={0} padding={18} align={ALIGN_ITEMS.STRETCH}>
      <FlexItem grow={1}>
        <tileSprite texture={RESOURCES["bg"]} />
      </FlexItem>
    </Flex>
  );

  return (
    <Flex
      direction={DIRECTION.COLUMN}
      align={ALIGN_ITEMS.STRETCH}
      backgroundElement={bg}
      margin={0}
    >
      <Flex margin={0} padding={0}>
        <image texture={"eleven"} frame={0} />
        <FlexItem grow={1}>
          <tileSprite texture={"eleven"} frame={1} />
        </FlexItem>
        <image texture={"eleven"} frame={2} />
      </Flex>
      <FlexItem grow={1}>
        <Flex margin={0} padding={0} align={ALIGN_ITEMS.STRETCH}>
          <tileSprite texture={"eleven"} frame={3} />
          <Spacer grow={1} />
          <tileSprite texture={"eleven"} frame={5} />
        </Flex>
      </FlexItem>
      <Flex margin={0} padding={0}>
        <image texture={"eleven"} frame={6} />
        <FlexItem grow={1}>
          <tileSprite texture={"eleven"} frame={7} />
        </FlexItem>
        <image texture={"eleven"} frame={8} />
      </Flex>
    </Flex>
  );
};
