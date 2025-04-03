import { Signal } from "@game/core/signals/types";
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
  tint = 0xffffff,
  container,
}: {
  texture: string;
  frame: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  tint?: number | Signal<number>;
  container?: Phaser.GameObjects.Container;
}) => {
  x = Math.floor(x);
  y = Math.floor(y);
  width = Math.floor(width);
  height = Math.floor(height);

  return (
    <Flex
      direction={DIRECTION.COLUMN}
      alignContent={ALIGN_ITEMS.STRETCH}
      x={x}
      y={y}
      width={width}
      height={height}
      containerElement={container ?? undefined}
    >
      <Flex>
        <image texture={texture} frame={`${frame}#0.0`} tint={tint} />
        <FlexItem grow={1}>
          <tileSprite texture={texture} frame={`${frame}#0.1`} tint={tint} />
        </FlexItem>
        <image texture={texture} frame={`${frame}#0.2`} tint={tint} />
      </Flex>
      <FlexItem grow={1}>
        <Flex alignContent={ALIGN_ITEMS.STRETCH}>
          <tileSprite texture={texture} frame={`${frame}#0.3`} tint={tint} />
          <FlexItem grow={1}>
            <tileSprite texture={texture} frame={`${frame}#0.4`} tint={tint} />
          </FlexItem>
          <tileSprite texture={texture} frame={`${frame}#0.5`} tint={tint} />
        </Flex>
      </FlexItem>
      <Flex>
        <image texture={texture} frame={`${frame}#0.6`} tint={tint} />
        <FlexItem grow={1}>
          <tileSprite texture={texture} frame={`${frame}#0.7`} tint={tint} />
        </FlexItem>
        <image texture={texture} frame={`${frame}#0.8`} tint={tint} />
      </Flex>
    </Flex>
  );
};
