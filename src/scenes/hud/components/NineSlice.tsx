import { Signal, SignalValue } from "@game/core/signals/types";
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
  container,
  tint = 0xffffff,
  alpha = 1,
}: {
  texture: string;
  frame: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  container?: Phaser.GameObjects.Container;
  tint?: SignalValue<number>;
  alpha?: SignalValue<number>;
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
        <image
          texture={texture}
          frame={`${frame}#0.0`}
          tint={tint}
          alpha={alpha}
        />
        <FlexItem grow={1}>
          <tileSprite
            texture={texture}
            frame={`${frame}#0.1`}
            tint={tint}
            alpha={alpha}
          />
        </FlexItem>
        <image
          texture={texture}
          frame={`${frame}#0.2`}
          tint={tint}
          alpha={alpha}
        />
      </Flex>
      <FlexItem grow={1}>
        <Flex alignContent={ALIGN_ITEMS.STRETCH}>
          <tileSprite
            texture={texture}
            frame={`${frame}#0.3`}
            tint={tint}
            alpha={alpha}
          />
          <FlexItem grow={1}>
            <tileSprite
              texture={texture}
              frame={`${frame}#0.4`}
              tint={tint}
              alpha={alpha}
            />
          </FlexItem>
          <tileSprite
            texture={texture}
            frame={`${frame}#0.5`}
            tint={tint}
            alpha={alpha}
          />
        </Flex>
      </FlexItem>
      <Flex>
        <image
          texture={texture}
          frame={`${frame}#0.6`}
          tint={tint}
          alpha={alpha}
        />
        <FlexItem grow={1}>
          <tileSprite
            texture={texture}
            frame={`${frame}#0.7`}
            tint={tint}
            alpha={alpha}
          />
        </FlexItem>
        <image
          texture={texture}
          frame={`${frame}#0.8`}
          tint={tint}
          alpha={alpha}
        />
      </Flex>
    </Flex>
  );
};
