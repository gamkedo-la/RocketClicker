import { computed } from "@game/core/signals/signals";
import { GameStateManager } from "@game/state/game-state";
import { Flex } from "../../../../core/ui/Flex";
import { ALIGN_ITEMS, DIRECTION } from "@game/core/ui/AbstractFlex";
import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { FlexItem, Spacer } from "../../../../core/ui/FlexItem";
import { Signal } from "@game/core/signals/types";

const Bar = ({
  value,
  width = 1,
  height = 5,
  color = COLORS_NAMES["pleasing-pink"],
}: {
  value: Signal<number>;
  width?: number;
  height?: number;
  color?: number;
}) => {
  return (
    <Flex>
      <rectangle
        width={width}
        height={height}
        strokeColor={color}
        strokeWidth={1}
      />
      <FlexItem attachTo={0}>
        <rectangle
          width={computed(() => value.get() * width)}
          height={height}
          fillColor={color}
        />
      </FlexItem>
    </Flex>
  );
};

export const BuildingDialsInformation = ({
  gameState,
}: {
  gameState: GameStateManager;
}) => {
  const hoveredBuilding = gameState.state.get().hovered_building;

  return (
    <Flex direction={DIRECTION.COLUMN} alignContent={ALIGN_ITEMS.FLEX_START}>
      <text
        text={computed(() => hoveredBuilding.get()?.name || "")}
        style={{ wordWrap: { width: 70 } }}
      />
      <text
        text={computed(() => hoveredBuilding.get()?.effect || "")}
        style={{ fontSize: 12, color: STRING_COLORS_NAMES["strawberry-field"] }}
      />
      <Spacer grow={0} height={20} />
      <text
        text={"Efficiency"}
        style={{ fontSize: 14, color: STRING_COLORS_NAMES["pleasing-pink"] }}
      />
      <Bar
        value={computed(
          () =>
            gameState.state
              .get()
              .hovered_building.get()
              ?.current_efficiency.get() || 0
        )}
        width={70}
        color={COLORS_NAMES["pleasing-pink"]}
      />
      <Spacer grow={0} height={5} />
      <text
        text={"Allowance"}
        style={{ fontSize: 14, color: STRING_COLORS_NAMES["namibia"] }}
      />
      <Bar
        value={computed(
          () =>
            gameState.state
              .get()
              .hovered_building.get()
              ?.maximum_success_rate.get() || 0
        )}
        width={70}
        color={COLORS_NAMES["namibia"]}
      />
      <Spacer grow={0} height={5} />
      <text
        text={"Consumption"}
        style={{ fontSize: 14, color: STRING_COLORS_NAMES["vicious-violet"] }}
      />
      <Bar
        value={computed(
          () =>
            gameState.state
              .get()
              .hovered_building.get()
              ?.current_success_rate.get() || 0
        )}
        width={70}
        color={COLORS_NAMES["vicious-violet"]}
      />
      <text
        text={computed(() => {
          const successRate =
            hoveredBuilding.get()?.current_success_rate?.get() || 0;

          return Object.entries(hoveredBuilding.get()?.input || {})
            .map(
              ([key, value]) =>
                `${key}: ${Number(
                  Math.round(value * successRate)
                ).toLocaleString()}`
            )
            .join("\n");
        })}
        style={{ fontSize: 12, color: STRING_COLORS_NAMES["vicious-violet"] }}
      />
      <Spacer grow={0} height={15} />
      <text
        text={"Production"}
        style={{ fontSize: 14, color: STRING_COLORS_NAMES["vaporwave-blue"] }}
      />
      <Bar
        value={computed(
          () =>
            gameState.state
              .get()
              .hovered_building.get()
              ?.current_success_rate.get() || 0
        )}
        width={70}
        color={COLORS_NAMES["vaporwave-blue"]}
      />
      <text
        text={computed(() => {
          const successRate =
            hoveredBuilding.get()?.current_success_rate?.get() || 0;

          return Object.entries(hoveredBuilding.get()?.output || {})
            .map(
              ([key, value]) =>
                `${key}: ${Number(
                  Math.round(value * successRate)
                ).toLocaleString()}`
            )
            .join("\n");
        })}
        style={{ fontSize: 12, color: STRING_COLORS_NAMES["vaporwave-blue"] }}
      />
    </Flex>
  );
};
