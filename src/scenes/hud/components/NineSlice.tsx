import { ALIGN_ITEMS } from "@game/core/ui/AbstractFlex";

import { DIRECTION } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexItem } from "@game/core/ui/FlexItem";

export const NineSlice = ({
  texture,
  frame,
  x = 0,
  y = 0,
  width = 0,
  height = 0,
}: {
  texture: string;
  frame: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) => {
  x = Math.round(x);
  y = Math.round(y);
  width = Math.round(width);
  height = Math.round(height);

  return (
    <Flex
      direction={DIRECTION.COLUMN}
      alignContent={ALIGN_ITEMS.STRETCH}
      x={x}
      y={y}
      width={width}
      height={height}
    >
      <Flex>
        <image texture={texture} frame={`${frame}#0.0`} />
        <FlexItem grow={1}>
          <tileSprite texture={texture} frame={`${frame}#0.1`} />
        </FlexItem>
        <image texture={texture} frame={`${frame}#0.2`} />
      </Flex>
      <FlexItem grow={1}>
        <Flex alignContent={ALIGN_ITEMS.STRETCH}>
          <tileSprite texture={texture} frame={`${frame}#0.3`} />
          <FlexItem grow={1}>
            <tileSprite texture={texture} frame={`${frame}#0.4`} />
          </FlexItem>
          <tileSprite texture={texture} frame={`${frame}#0.5`} />
        </Flex>
      </FlexItem>
      <Flex>
        <image texture={texture} frame={`${frame}#0.6`} />
        <FlexItem grow={1}>
          <tileSprite texture={texture} frame={`${frame}#0.7`} />
        </FlexItem>
        <image texture={texture} frame={`${frame}#0.8`} />
      </Flex>
    </Flex>
  );
};
