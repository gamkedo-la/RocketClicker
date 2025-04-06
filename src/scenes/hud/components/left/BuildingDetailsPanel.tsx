import { RESOURCES } from "@game/assets";
import { DIRECTION } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { Building } from "@game/entities/buildings/types";

import { computed } from "@game/core/signals/signals";
import { Signal } from "@game/core/signals/types";

import { STRING_COLORS_NAMES } from "@game/consts";
import { MATERIALS_NAMES } from "@game/entities/materials/index";
import { FlexItem, Spacer } from "../../../../core/ui/FlexItem";
import { NineSlice } from "../NineSlice";
import { FlexColumn } from "../../../../core/ui/FlexColumn";
import { EFFECTS_EXPLANATIONS } from "@game/entities/buildings/index";

export const BuildingDetailsPanel = ({
  building,
  width,
  contentAlpha,
}: {
  building: Signal<Building | null>;
  width: Signal<number>;
  contentAlpha: Signal<number>;
}) => {
  const background = (
    <NineSlice
      texture={RESOURCES["ui-left-panel"]}
      frame="bg-floating-screen"
    />
  );

  const building_cost = computed(() => {
    if (!building.get()) {
      return "";
    }

    return `Cost: ${Number(
      Object.values(building.get()?.building_cost || {})[0]
    ).toLocaleString()} ${
      MATERIALS_NAMES[
        Object.keys(
          building.get()?.building_cost || {}
        )[0] as keyof typeof MATERIALS_NAMES
      ]
    }`;
  });

  const inputFlexItem = (
    <FlexItem height={35}>
      <text
        text={computed(() =>
          Object.entries(building.get()?.input || {})
            .map(([key, value]) => `${Number(value).toLocaleString()} ${key}`)
            .join("\n")
        )}
        height={100}
        style={{
          align: "center",
          color: STRING_COLORS_NAMES["pleasing-pink"],
        }}
        alpha={contentAlpha}
        resolution={2}
      />
    </FlexItem>
  );

  const outputFlexItem = (
    <FlexItem height={35}>
      <text
        text={computed(() =>
          Object.entries(building.get()?.output || {})
            .map(([key, value]) => `${Number(value).toLocaleString()} ${key}`)
            .join("\n")
        )}
        style={{
          align: "center",
          color: STRING_COLORS_NAMES["pleasing-pink"],
        }}
        alpha={contentAlpha}
        resolution={2}
      />
    </FlexItem>
  );

  const flex: FlexColumn = (
    <Flex
      direction={DIRECTION.COLUMN}
      backgroundElement={background}
      width={width}
      height={220}
      padding={10}
      depth={-1}
    >
      <text
        text={computed(() => building?.get()?.name || "")}
        alpha={contentAlpha}
        style={{ fontSize: 22 }}
        resolution={2}
      />
      <Spacer grow={0} height={10} />
      <text
        text={building_cost}
        alpha={contentAlpha}
        style={{ color: STRING_COLORS_NAMES["vaporwave-blue"] }}
        resolution={2}
      />
      <Spacer grow={0} height={20} />
      {inputFlexItem}
      <image
        alpha={contentAlpha}
        texture={RESOURCES["ui-left-panel"]}
        frame={"building-arrow#0"}
        height={12}
      />
      {outputFlexItem}
      <Spacer grow={0} height={5} />
      <text
        text={computed(() => building?.get()?.effect || "")}
        alpha={contentAlpha}
        style={{ color: STRING_COLORS_NAMES["strawberry-field"] }}
        resolution={2}
      />
      <text
        text={computed(
          () => EFFECTS_EXPLANATIONS[building?.get()?.effect] || ""
        )}
        alpha={contentAlpha}
        style={{
          color: STRING_COLORS_NAMES["vicious-violet"],
          align: "center",
          wordWrap: { width: width.get() },
        }}
        resolution={2}
      />
    </Flex>
  );

  building.subscribe((building) => {
    if (building) {
      // TODO: why u no work
      /*
      if (Object.keys(building?.input || {}).length > 1) {
        inputFlexItem.height = 305;
        console.log("inputFlexItem.height", inputFlexItem.height);
      } else {
        inputFlexItem.height = 10;
      }
      */

      // but this actually works, wow
      flex.layout();
    }
  });

  return flex;
};
