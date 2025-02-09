/**
 * Based off https://github.com/jjcapellan/phaser3-flex
 */

import { isSignal } from "@game/state/lib/signals";
import { ALIGN_ITEMS, DIRECTION, FlexProps, JUSTIFY } from "./AbstractFlex";
import { FlexColumn } from "./FlexColumn";
import { FlexRow } from "./FlexRow";
import { FlexWrapped } from "./FlexWrapped";

// TODO: test/fix/adapt stretching on the align axis
// TODO: implement the grow/shrink properties from flex-grow/flex-shrink
// TODO: allow containers/other objects to be stretched

export function Flex({
  x = 0,
  y = 0,
  width = 1,
  height = 1,
  padding = 10,
  margin = 4,
  align = ALIGN_ITEMS.CENTER,
  justify = JUSTIFY.FLEX_START,
  direction = DIRECTION.ROW,
  alignContent = JUSTIFY.CENTER,
  wrapped = false,
  ...props
}: FlexProps): FlexRow | FlexColumn | FlexWrapped {
  const children = Array.isArray(props.children)
    ? props.children
    : [props.children];

  const config = {
    x,
    y,
    width,
    height,
    padding,
    margin,
    align,
    justify,
    direction,
    alignContent,
    children,
  };

  let flex: FlexRow | FlexColumn | FlexWrapped;

  if (isSignal(x)) {
    config.x = x.get();
  }

  if (isSignal(y)) {
    config.y = y.get();
  }

  if (isSignal(width)) {
    config.width = width.get();
  }

  if (isSignal(height)) {
    config.height = height.get();
  }

  if (wrapped) {
    flex = new FlexWrapped(config);
  } else if (direction === DIRECTION.ROW) {
    flex = new FlexRow(config);
  } else {
    flex = new FlexColumn(config);
  }

  if (isSignal(x)) {
    x.subscribe((x) => {
      flex.setX(x);
    });
  }

  if (isSignal(y)) {
    y.subscribe((y) => {
      flex.setY(y);
    });
  }

  if (isSignal(width)) {
    width.subscribe((width) => {
      flex.setWidth(width);
    });
  }

  if (isSignal(height)) {
    height.subscribe((height) => {
      flex.setHeight(height);
    });
  }

  children.forEach((child) => flex.add(child));

  return flex;
}
