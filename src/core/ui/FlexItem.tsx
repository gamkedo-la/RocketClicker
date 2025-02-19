import { assert } from "@game/core/common/assert";

import { AlignmentItems, FlexElement } from "./AbstractFlex";

export const FlexItem = ({
  grow,
  align,
  children,
}: {
  grow?: number;
  align?: AlignmentItems;
  children: FlexElement;
}) => {
  assert(!(children instanceof Array), "FlexItem must be a single child");
  if (grow) {
    children.flexGrow = grow;
  }
  if (align) {
    children.selfAlign = align;
  }
  return children;
};

export const Spacer = ({ grow = 1 }: { grow?: number }): FlexElement => {
  return {
    flexGrow: grow,
    width: 1,
    height: 1,
    setX: () => {},
    setY: () => {},
  } as unknown as FlexElement;
};
