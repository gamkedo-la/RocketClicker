import { RESOURCES } from "@game/assets";
import { DIRECTION } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { Building } from "@game/entities/buildings/types";

import { NineSlice } from "./nineslice";
import { Signal } from "@game/core/signals/types";

export const BuildingDetailsPanel = ({
  building,
  width,
}: {
  building: Building;
  width: Signal<number>;
}) => {
  const background = (
    <NineSlice
      texture={RESOURCES["ui-left-panel"]}
      frame="bg-floating-screen"
    />
  );

  const flex = (
    <Flex
      direction={DIRECTION.COLUMN}
      backgroundElement={background}
      width={width}
      height={100}
      padding={10}
      depth={-1}
    >
      <text text={building.name} />
    </Flex>
  );

  return flex;
};
