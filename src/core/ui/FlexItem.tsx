import { assert } from "@game/core/common/assert";

import {
  AbstractFlex,
  AlignmentItems,
  ATTACH_TO_PARENT,
  FlexElement,
} from "./AbstractFlex";
import { PhaserJsxElement } from "../jsx/types";

export const FlexItem = ({
  grow,
  align,
  children,
  width,
  height,
  attach,
  attachTo,
  offsetX,
  offsetY,
  stretchWidth,
  stretchHeight,
}: {
  grow?: number;
  align?: AlignmentItems;
  width?: number;
  height?: number;
  attach?: boolean;
  attachTo?: number; // Index of the sibling to attach to, or ATTACH_TO_PARENT
  offsetX?: number | string; // Can be a percentage like "100%" or a number
  offsetY?: number | string; // Can be a percentage like "50%" or a number
  stretchWidth?: number | string; // Width as percentage of target or absolute pixels
  stretchHeight?: number | string; // Height as percentage of target or absolute pixels
  children: FlexElement | PhaserJsxElement;
}) => {
  assert(!(children instanceof Array), "FlexItem must be a single child");

  if (grow) {
    (children as FlexElement).flexGrow = grow;
  }
  if (align) {
    (children as FlexElement).selfAlign = align;
  }

  if (width) {
    (children as FlexElement).width = width;
  }

  if (height) {
    (children as FlexElement).height = height;
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

export const Spacer = ({ grow = 1 }: { grow?: number }): FlexElement => {
  return {
    flexGrow: grow,
    width: 1,
    height: 1,
    setX: () => {},
    setY: () => {},
  } as unknown as FlexElement;
};
