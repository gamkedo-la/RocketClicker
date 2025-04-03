import { RESOURCES } from "@game/assets";
import { DIRECTION } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { Building } from "@game/entities/buildings/types";

import { Signal } from "@game/core/signals/types";
import { computed } from "@game/core/signals/signals";

import { NineSlice } from "../nineslice";

export const BuildingDetailsPanel = ({
  building,
  width,
}: {
  width: Signal<number>;
  building: Signal<Building | null>;
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
      <text text={computed(() => building.get()?.name || "")} />
    </Flex>
  );

  return flex;
};
