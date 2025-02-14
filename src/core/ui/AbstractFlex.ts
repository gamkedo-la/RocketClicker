import { TransformablePhaserGameObject } from "@game/core/jsx/types";
import { SignalValue } from "@game/core/signals/types";

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
  _flexWidth: number;
  _flexHeight: number;
  setWidth: any;
  setHeight: any;
  x: number;
  y: number;
  basis: number;
  width: number;
  height: number;
  flexGrow: number;
  flexShrink: number;

  containerElement: Phaser.GameObjects.Container | null;

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
  children?: FlexElement | FlexElement[];
  // Note for future: Was it enough to have only Container here? Thinking about layers and groups...
  containerElement?: Phaser.GameObjects.Container;
  backgroundElement?: TransformablePhaserGameObject;
  alignContent?: Justify;
  wrapped?: boolean;
}

export interface FlexProperties extends FlexProps {
  children: FlexElement | FlexElement[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export abstract class AbstractFlex implements FlexElement {
  x: number;
  y: number;
  width: number;
  height: number;

  _flexWidth: number;
  _flexHeight: number;

  padding: number;
  margin: number;

  align: AlignmentItems;
  justify: Justify;
  direction: Direction;

  alignContent?: Justify;

  children: FlexElement[];

  backgroundElement: TransformablePhaserGameObject;
  containerElement: Phaser.GameObjects.Container;

  basis: number;
  flexGrow: number;
  minFlexGrow: number;
  flexShrink: number;

  protected origin: Phaser.Math.Vector2;
  protected scrollFactor: Phaser.Math.Vector2;

  protected outerBounds: Phaser.Geom.Rectangle;
  protected innerBounds: Phaser.Geom.Rectangle;

  protected axisSizeSum: number;
  protected growSum: number;
  protected shrinkSum: number;

  constructor(config: FlexProperties) {
    this.origin = new Phaser.Math.Vector2(0, 0);
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.width = config.width ?? 1;
    this.height = config.height ?? 0;
    this._flexWidth = config.width ?? 0;
    this._flexHeight = config.height ?? 0;
    this.padding = config.padding ?? 10;
    this.margin = config.margin ?? 4;
    this.align = config.align ?? ALIGN_ITEMS.CENTER;
    this.justify = config.justify ?? JUSTIFY.FLEX_START;
    this.alignContent = config.alignContent ?? JUSTIFY.CENTER;

    this.children = [];

    this.origin = new Phaser.Math.Vector2(0, 0);
    this.scrollFactor = new Phaser.Math.Vector2(0, 0);

    this.axisSizeSum = 0;
    this.minFlexGrow = 0;
    this.growSum = 0;
    // TODO: shrinkSum
    // this.shrinkSum = 0;

    if (config.containerElement) {
      this.containerElement = config.containerElement;
      this.containerElement.setScrollFactor(0, 0);
    }

    if (config.backgroundElement) {
      this.backgroundElement = config.backgroundElement;
      this.backgroundElement.setOrigin(0, 0);
      this.backgroundElement.setScrollFactor(0, 0);
    }

    this.outerBounds = new Phaser.Geom.Rectangle(this.x, this.y, 0, 0);
    this.innerBounds = new Phaser.Geom.Rectangle(
      this.x + this.padding,
      this.y + this.padding,
      0,
      0
    );

    return this;
  }

  abstract getFreeSpace(): number;
  abstract getAxisTotalSizeSum(): number;
  abstract setJustify(justify: Justify): void;
  abstract setAlign(align: AlignmentItems): void;

  add(
    child: FlexElement,
    flexGrow: number = 0
    // TODO: flexShrink
    // flexShrink: number = 1
  ): FlexElement {
    if (child.setOrigin) {
      child.setOrigin(0, 0);
      child.setScrollFactor(0, 0);
    }

    if (this.containerElement) {
      this.containerElement.add(
        child as unknown as Phaser.GameObjects.GameObject
      );
    }

    child.flexGrow = flexGrow;
    // TODO: flexShrink
    // child.flexShrink = flexShrink;

    child.basis = this.direction === DIRECTION.ROW ? child.width : child.height;

    this.axisSizeSum += child.basis;
    this.growSum += child.flexGrow;
    this.minFlexGrow += child.flexGrow ? child.basis : 0;
    // this.shrinkSum += child.flexShrink * child.basis;

    child._flexWidth = child.width;
    child._flexHeight = child.height;

    this.children.push(child);

    return child;
  }

  layout(): void {
    this.updateBounds();
    this.setJustify(this.justify);
    this.setAlign(this.align);
  }

  trashLayout(): void {
    this.axisSizeSum = 0;
    this.growSum = 0;
    this.shrinkSum = 0;

    this.children.forEach((child) => {
      child.basis =
        this.direction === DIRECTION.ROW ? child.width : child.height;

      this.axisSizeSum += child.basis;
      this.growSum += child.flexGrow;
      this.minFlexGrow += child.flexGrow ? child.basis : 0;
      //this.shrinkSum += child.flexShrink * child.basis;
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

    if (this.containerElement) {
      this.containerElement.setPosition(
        this.outerBounds.left,
        this.outerBounds.top
      );
      this.containerElement.setSize(
        this.outerBounds.width,
        this.outerBounds.height
      );

      this.containerElement.input?.hitArea?.setPosition(
        this.containerElement.width / 2,
        this.containerElement.height / 2
      );
      this.containerElement.input?.hitArea?.setSize(
        this.containerElement.width,
        this.containerElement.height
      );
    }

    if (this.backgroundElement) {
      this.backgroundElement.setPosition(
        this.outerBounds.left,
        this.outerBounds.top
      );
      this.backgroundElement.setSize(
        this.outerBounds.width,
        this.outerBounds.height
      );
    }
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
    this._flexWidth = width;
    this.layout();
  }

  setHeight(height: number): void {
    this.height = height;
    this._flexHeight = height;
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
    if (this.backgroundElement) {
      scene.add.existing(this.backgroundElement);
    }

    if (this.containerElement) {
      scene.add.existing(this.containerElement);
      // If we have a container element, we can't add the children to the scene
      return;
    }

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
