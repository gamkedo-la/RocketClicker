import { assert } from "@game/core/common/assert";

import { PhaserJsxElement } from "../jsx/types";
import { AlignmentItems, ATTACH_TO_PARENT, FlexElement } from "./AbstractFlex";

export const FlexItem = ({
  grow,
  align,
  children,
  width,
  height,
  depth,
  attach,
  attachTo,
  offsetX,
  offsetY,
  stretchWidth,
  stretchHeight,
  origin,
}: {
  grow?: number;
  align?: AlignmentItems;
  width?: number;
  height?: number;
  depth?: number;

  attach?: boolean;
  attachTo?: number; // Index of the sibling to attach to, or ATTACH_TO_PARENT
  offsetX?: number | string; // Can be a percentage like "100%" or a number
  offsetY?: number | string; // Can be a percentage like "50%" or a number
  stretchWidth?: number | string; // Width as percentage of target or absolute pixels
  stretchHeight?: number | string; // Height as percentage of target or absolute pixels
  origin?: [number, number] | { x: number; y: number };
  children: FlexElement | PhaserJsxElement;
}) => {
  assert(!(children instanceof Array), "FlexItem must be a single child");

  if (grow) {
    (children as FlexElement).flexGrow = grow;
  }
  if (align) {
    (children as FlexElement).selfAlign = align;
  }

  if (origin) {
    (children as FlexElement).origin = origin;
  }

  if (width) {
    (children as FlexElement).width = width;
  }

  if (height) {
    (children as FlexElement).height = height;
  }

  if (depth) {
    (children as FlexElement).depth = depth;
  }

  if (attach || attachTo !== undefined) {
    (children as FlexElement).attachToIndex =
      attachTo !== undefined ? attachTo : ATTACH_TO_PARENT;

    if (offsetX !== undefined) {
      (children as FlexElement).attachOffsetX = offsetX;
    }

    if (offsetY !== undefined) {
      (children as FlexElement).attachOffsetY = offsetY;
    }

    if (stretchWidth !== undefined) {
      (children as FlexElement).stretchWidth = stretchWidth;
    }

    if (stretchHeight !== undefined) {
      (children as FlexElement).stretchHeight = stretchHeight;
    }
  }

  return children;
};

export const Spacer = ({
  grow = 1,
  height = 1,
  width = 1,
}: {
  grow?: number;
  height?: number;
  width?: number;
}): FlexElement => {
  return {
    flexGrow: grow,
    width: width,
    height: height,
    setX: () => {},
    setY: () => {},
  } as unknown as FlexElement;
};
