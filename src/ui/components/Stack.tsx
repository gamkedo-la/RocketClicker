import { getSignalValue } from "@game/state/lib/signals";
import { Signal } from "@game/state/lib/types";
import { PhaserGameObjectProps } from "@game/ui/lib/types";

type Alignment = "start" | "center" | "end";
type Direction = "horizontal" | "vertical";
type Size = number | "auto" | `${number}%`;

interface BaseContainerProps {
  x?: number;
  y?: number;
  width?: Size;
  height?: Size;
  visible?: Signal<boolean>;
  alpha?: Signal<number>;
}

interface StackProps
  extends PhaserGameObjectProps<Phaser.GameObjects.GameObject> {
  direction?: Direction;
  spacing?: number;
  align?: Alignment;
  justify?: Alignment;
  padding?: number | [number, number] | [number, number, number, number];
  debug?: boolean;
}

export function Stack({
  direction = "vertical",
  spacing = 0,
  align = undefined,
  justify = undefined,
  padding = 0,
  x = 0,
  y = 0,
  debug = false,
  ...props
}: StackProps) {
  if (align !== undefined || justify !== undefined) {
    throw new Error("Align and justify are not supported yet");
  }

  const [top, right, bottom, left] = Array.isArray(padding)
    ? padding.length === 2
      ? [padding[0], padding[1], padding[0], padding[1]]
      : padding
    : [padding, padding, padding, padding];

  const children = Array.isArray(props.children)
    ? props.children
    : [props.children];

  let totalWidth = 0;
  let totalHeight = 0;
  let maxWidth = 0;
  let maxHeight = 0;

  children.forEach((child) => {
    totalWidth += getSignalValue(child?.width) || 0;
    totalHeight += getSignalValue(child?.height) || 0;
    maxWidth = Math.max(maxWidth, getSignalValue(child?.width) || 0);
    maxHeight = Math.max(maxHeight, getSignalValue(child?.height) || 0);
  });

  console.log(totalWidth, totalHeight, maxWidth, maxHeight);

  //TODO: Containers don't have width and height properties
  //TODO: FC doesn't have width and height properties

  let width = 0;
  let height = 0;

  if (direction === "vertical") {
    width = maxWidth + left + right;
    height = totalHeight + top + bottom + spacing * (children.length - 1);
  } else {
    width = totalWidth + left + right + spacing * (children.length - 1);
    height = maxHeight + top + bottom;
  }

  console.log(width, height);

  const background = debug && (
    <rectangle width={width} height={height} fillColor={0xf00f30} origin={0} />
  );

  let bboxes: Phaser.GameObjects.Rectangle[] = [];

  children.forEach((child, index) => {
    let prev = children[index - 1];
    let x = 0;
    let y = 0;

    if (direction === "vertical") {
      x = left;
      y =
        top +
        (getSignalValue(prev?.height) || 0) +
        (getSignalValue(prev?.y) || 0) +
        spacing;
      console.log(x, y);
    } else {
      x =
        left +
        (getSignalValue(prev?.width) || 0) +
        (getSignalValue(prev?.x) || 0) +
        spacing;
      y = top;
    }

    if (debug) {
      bboxes.push(
        <rectangle
          x={x}
          y={y}
          origin={0}
          width={child?.width || 0}
          height={child?.height || 0}
          strokeColor={0x0000ff}
        />
      );
    }

    child!.x = x;
    child!.y = y;
  });

  if (debug) {
    return (
      <container x={x} y={y} width={width} height={height}>
        {background}
        {debug && bboxes}
        {props.children}
      </container>
    );
  }

  return (
    <container x={x} y={y} width={width} height={height}>
      {props.children}
    </container>
  );
}
