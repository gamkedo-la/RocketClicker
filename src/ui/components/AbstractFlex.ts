import { SignalValue } from "@game/state/lib/types";

export const ALIGN_ITEMS = {
  CENTER: "center",
  FLEX_START: "start",
  FLEX_END: "end",
  STRETCH: "stretch",
} as const;

export const JUSTIFY = {
  CENTER: "center",
  FLEX_START: "flex-start",
  FLEX_END: "flex-end",
  SPACE_BETWEEN: "space-between",
  SPACE_AROUND: "space-around",
  SPACE_EVENLY: "space-evenly",
} as const;

export const DIRECTION = {
  ROW: "row",
  COLUMN: "column",
} as const;

export type AlignmentItems = (typeof ALIGN_ITEMS)[keyof typeof ALIGN_ITEMS];
export type Justify = (typeof JUSTIFY)[keyof typeof JUSTIFY];
export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];

export interface FlexElement {
  setWidth: any;
  setHeight: any;
  x: number;
  y: number;
  isFlex: boolean;
  flexParent: AbstractFlex | null;
  basis: number;
  width: number;
  height: number;
  flexGrow: number;
  flexShrink: number;

  setY: (y: number) => void;
  setX: (x: number) => void;
  setScrollFactor: (x: number, y: number) => void;
  setOrigin: (x: number, y: number) => void;
}

export interface FlexProps {
  x?: SignalValue<number>;
  y?: SignalValue<number>;
  width?: SignalValue<number>;
  height?: SignalValue<number>;
  padding?: number;
  margin?: number;
  align?: AlignmentItems;
  justify?: Justify;
  direction?: Direction;
  children: FlexElement | FlexElement[];
  alignContent?: Justify;
  wrapped?: boolean;
}

export abstract class AbstractFlex implements FlexElement {
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;

  padding: number;
  margin: number;

  align: AlignmentItems;
  justify: Justify;
  direction: Direction;

  alignContent?: Justify;

  children: FlexElement[];

  basis: number;
  flexGrow: number;
  flexShrink: number;

  protected origin: Phaser.Math.Vector2;
  protected scrollFactor: Phaser.Math.Vector2;

  protected outerBounds: Phaser.Geom.Rectangle;
  protected innerBounds: Phaser.Geom.Rectangle;

  protected axisSizeSum: number;
  protected growSum: number;
  protected shrinkSum: number;

  protected widths: number[];
  protected heights: number[];

  isFlex: boolean;
  flexParent: AbstractFlex | null;

  constructor(config: FlexProps) {
    this.origin = new Phaser.Math.Vector2(0, 0);
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.width = config.width ?? 1;
    this.height = config.height ?? 0;
    this.minWidth = config.width ?? 0;
    this.minHeight = config.height ?? 0;
    this.padding = config.padding ?? 10;
    this.margin = config.margin ?? 4;
    this.align = config.align ?? ALIGN_ITEMS.CENTER;
    this.justify = config.justify ?? JUSTIFY.FLEX_START;
    this.alignContent = config.alignContent ?? JUSTIFY.CENTER;

    this.children = [];

    this.origin = new Phaser.Math.Vector2(0, 0);
    this.scrollFactor = new Phaser.Math.Vector2(0, 0);

    this.axisSizeSum = 0;
    this.growSum = 0;
    this.shrinkSum = 0;

    this.widths = [];
    this.heights = [];

    this.outerBounds = new Phaser.Geom.Rectangle(this.x, this.y, 0, 0);
    this.innerBounds = new Phaser.Geom.Rectangle(
      this.x + this.padding,
      this.y + this.padding,
      0,
      0
    );

    this.isFlex = true;
    this.flexParent = null;

    return this;
  }

  abstract getFreeSpace(): number;
  abstract getAxisTotalSizeSum(): number;
  abstract setJustify(justify: Justify): void;
  abstract setAlign(align: AlignmentItems): void;

  add(
    child: FlexElement,
    flexGrow: number = 0,
    flexShrink: number = 1
  ): FlexElement {
    if (child.setOrigin) {
      child.setOrigin(0, 0);
      child.setScrollFactor(0, 0);
    }

    if (child instanceof AbstractFlex) {
      child.flexGrow = flexGrow;
      child.flexShrink = flexShrink;
      child.flexParent = this;
    } else {
      // no????
      // I mean, yes, because this was build on the assumption only other flexes should be changing dimensions
      // Because it can't handle something without children.
      child.flexGrow = 0;
      child.flexShrink = 1;
    }

    child.basis = this.direction === DIRECTION.ROW ? child.width : child.height;

    this.axisSizeSum += child.basis;
    this.growSum += child.flexGrow;
    this.shrinkSum += child.flexShrink * child.basis;

    this.widths.push(child.width);
    this.heights.push(child.height);

    this.children.push(child);

    return child;
  }

  layout(): void {
    this.updateBounds();
    this.setJustify(this.justify);
    this.setAlign(this.align);
  }

  trashLayout(): void {
    this.widths = [];
    this.heights = [];

    this.axisSizeSum = 0;
    this.growSum = 0;
    this.shrinkSum = 0;

    this.children.forEach((child) => {
      child.basis =
        this.direction === DIRECTION.ROW ? child.width : child.height;

      this.axisSizeSum += child.basis;
      this.growSum += child.flexGrow;
      this.shrinkSum += child.flexShrink * child.basis;

      this.widths.push(child.width);
      this.heights.push(child.height);
    });
  }

  updateBounds(): void {
    this.outerBounds.setSize(this.width, this.height);
    this.innerBounds.setSize(
      this.width - this.padding * 2,
      this.height - this.padding * 2
    );

    this.outerBounds.setPosition(this.x, this.y);
    this.innerBounds.setPosition(
      this.outerBounds.left + this.padding,
      this.outerBounds.top + this.padding
    );
  }

  getDebug(
    graphics: Phaser.GameObjects.Graphics,
    withChildren: boolean = false
  ): void {
    graphics.lineStyle(3, 0x0000ff);
    graphics.strokeRect(
      this.outerBounds.left,
      this.outerBounds.top,
      this.outerBounds.width,
      this.outerBounds.height
    );

    graphics.lineStyle(3, 0x00ff00);
    graphics.strokeRect(
      this.innerBounds.left,
      this.innerBounds.top,
      this.innerBounds.width,
      this.innerBounds.height
    );

    if (withChildren) {
      this.children.forEach((item) => {
        graphics.lineStyle(1, 0xff0000);
        graphics.strokeRect(item.x, item.y, item.width, item.height);
      });
    }

    // axis
    graphics.lineStyle(
      this.direction === DIRECTION.ROW ? 2 : 3,
      this.direction === DIRECTION.ROW ? 0x000000 : 0xff00ff
    );
    graphics.lineBetween(
      this.outerBounds.left + this.outerBounds.width / 2,
      this.outerBounds.top,
      this.outerBounds.left + this.outerBounds.width / 2,
      this.outerBounds.bottom
    );
    graphics.lineStyle(
      this.direction === DIRECTION.ROW ? 3 : 2,
      this.direction === DIRECTION.ROW ? 0xff00ff : 0x000000
    );
    graphics.lineBetween(
      this.outerBounds.left,
      this.outerBounds.top + this.outerBounds.height / 2,
      this.outerBounds.right,
      this.outerBounds.top + this.outerBounds.height / 2
    );
  }

  setX(x: number): void {
    this.x = x;
    this.layout();
  }

  setY(y: number): void {
    this.y = y;
    this.layout();
  }

  setWidth(width: number): void {
    this.width = width;
    this.minWidth = width;
    this.layout();
  }

  setHeight(height: number): void {
    this.height = height;
    this.minHeight = height;
    this.layout();
  }

  setScrollFactor(x: number, y: number): void {
    this.scrollFactor.set(x, y);
    // TODO: handle proper scroll factor
  }

  setOrigin(x: number, y: number): void {
    this.origin.set(x, y);
    // TODO: handle proper origin
  }

  addToScene(scene: Phaser.Scene = window.currentScene) {
    this.children.forEach((child) => {
      if (child instanceof AbstractFlex) {
        child.addToScene(scene);
      } else if (child instanceof Phaser.GameObjects.GameObject) {
        scene.add.existing(child);
      }
    });
  }

  /**
   * Adding this to notify if someone is trying to add Flex directly into the scene
   */
  get renderWebGL(): void {
    throw new Error(
      "You should call addToScene instead of adding Flex to the scene"
    );
  }
}
