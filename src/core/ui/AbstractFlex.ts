import {
  PhaserJsxElement,
  TransformablePhaserGameObject,
} from "@game/core/jsx/types";
import { SignalValue } from "@game/core/signals/types";
import { getSignalValue } from "../signals/signals";

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

// Special value to indicate attachment to the parent flex container
export const ATTACH_TO_PARENT = -1;

export type AlignmentItems = (typeof ALIGN_ITEMS)[keyof typeof ALIGN_ITEMS];
export type Justify = (typeof JUSTIFY)[keyof typeof JUSTIFY];
export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];

export interface FlexElement {
  _flexWidth: number;
  _flexHeight: number;
  x: number;
  y: number;
  basis: number;
  width: number;
  height: number;
  flexGrow: number;
  flexShrink: number;
  selfAlign: AlignmentItems;
  depth: number;

  // For attaching to other flex items
  origin?: [number, number] | { x: number; y: number };
  attachToIndex?: number;
  attachOffsetX?: number | string;
  attachOffsetY?: number | string;
  stretchWidth?: number | string;
  stretchHeight?: number | string;

  containerElement: Phaser.GameObjects.Container | null;

  setY: (y: number) => void;
  setX: (x: number) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setPosition: (x: number, y: number) => void;
  setSize: (width: number, height: number) => void;
  setScrollFactor: (x: number, y: number) => void;
  setOrigin: (x: number, y: number) => void;
  setDepth: (depth: number) => void;
}

export interface FlexProps {
  x?: SignalValue<number>;
  y?: SignalValue<number>;
  width?: SignalValue<number>;
  height?: SignalValue<number>;
  depth?: SignalValue<number>;
  // 4 values like css: top, right, bottom, left
  padding?:
    | number
    | [number, number]
    | [number, number, number]
    | [number, number, number, number];
  margin?: number;
  alignContent?: AlignmentItems;
  justify?: Justify;
  direction?: Direction;
  children?: FlexElement | FlexElement[] | PhaserJsxElement;
  // Note for future: Was it enough to have only Container here? Thinking about layers and groups...
  containerElement?: Phaser.GameObjects.Container;
  backgroundElement?: TransformablePhaserGameObject;
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

  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;

  margin: number;

  alignContent: AlignmentItems;
  justify: Justify;
  direction: Direction;

  children: FlexElement[];

  backgroundElement: TransformablePhaserGameObject;
  containerElement: Phaser.GameObjects.Container;

  basis: number;
  flexGrow: number;
  minFlexGrow: number;
  flexShrink: number;
  selfAlign: AlignmentItems;

  depth: number;
  origin: { x: number; y: number };
  scrollFactor: { x: number; y: number };

  protected outerBounds: Phaser.Geom.Rectangle;
  protected innerBounds: Phaser.Geom.Rectangle;

  protected axisSizeSum: number;
  protected growSum: number;
  protected shrinkSum: number;

  constructor(config: FlexProperties) {
    this.origin = { x: 0, y: 0 };
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.width = config.width ?? 1;
    this.height = config.height ?? 0;
    this._flexWidth = config.width ?? 0;
    this._flexHeight = config.height ?? 0;
    this.margin = config.margin ?? 4;
    this.alignContent = config.alignContent ?? ALIGN_ITEMS.CENTER;
    this.justify = config.justify ?? JUSTIFY.FLEX_START;

    if (Array.isArray(config.padding)) {
      if (config.padding.length === 2) {
        this.paddingTop = this.paddingBottom = config.padding[0] ?? 0;
        this.paddingRight = this.paddingLeft = config.padding[1] ?? 0;
      } else if (config.padding.length === 3) {
        this.paddingTop = config.padding[0] ?? 0;
        this.paddingRight = this.paddingLeft = config.padding[1] ?? 0;
        this.paddingBottom = config.padding[2] ?? 0;
      } else if (config.padding.length === 4) {
        this.paddingTop = config.padding[0] ?? 0;
        this.paddingRight = config.padding[1] ?? 0;
        this.paddingBottom = config.padding[2] ?? 0;
        this.paddingLeft = config.padding[3] ?? 0;
      }
    } else {
      this.paddingTop = config.padding ?? 0;
      this.paddingRight = config.padding ?? 0;
      this.paddingBottom = config.padding ?? 0;
      this.paddingLeft = config.padding ?? 0;
    }

    this.children = [];

    this.depth = getSignalValue(config.depth);
    this.origin = { x: 0, y: 0 };
    this.scrollFactor = { x: 0, y: 0 };

    this.axisSizeSum = 0;
    this.minFlexGrow = 0;
    this.growSum = 0;
    // TODO: shrinkSum
    // this.shrinkSum = 0;

    if (config.containerElement) {
      this.containerElement = config.containerElement;
      this.containerElement.setScrollFactor(0, 0);
      this.containerElement.setDepth(this.depth);
    }

    if (config.backgroundElement) {
      this.backgroundElement = config.backgroundElement;
      this.backgroundElement.setOrigin(0, 0);
      this.backgroundElement.setScrollFactor(0, 0);
      this.backgroundElement.setDepth(this.depth);
    }

    this.outerBounds = new Phaser.Geom.Rectangle(this.x, this.y, 0, 0);
    this.innerBounds = new Phaser.Geom.Rectangle(
      this.x + this.paddingLeft,
      this.y + this.paddingTop,
      0,
      0
    );

    return this;
  }

  abstract getFreeSpace(): number;
  abstract getAxisTotalSizeSum(): number;
  abstract updateJustify(justify: Justify): void;
  abstract updateCrossAxis(): void;

  add(
    child: FlexElement,
    flexGrow: number = 0
    // TODO: flexShrink
    // flexShrink: number = 1
  ): FlexElement {
    /*
    ???
    child.setOrigin(0, 0);
    child.setScrollFactor(0, 0);
    }
    */
    if (child.setOrigin) {
      if (Array.isArray(child.origin)) {
        child.setOrigin(child.origin[0], child.origin[1]);
      } else {
        child.setOrigin(child.origin?.x || 0, child.origin?.y || 0);
      }
    }

    if (this.containerElement) {
      if (child instanceof AbstractFlex) {
        child.addToContainer(this.containerElement);
      } else {
        this.containerElement.add(
          child as unknown as Phaser.GameObjects.GameObject
        );
      }
    }

    if (this.depth && child.setDepth) {
      if (this.depth !== 0 || child.depth !== 0) {
        console.log("setting depth", this.depth, child.depth);
      }
      child.setDepth(this.depth);
    }

    if (!child.flexGrow) {
      child.flexGrow = flexGrow;
    }
    // TODO: flexShrink
    // child.flexShrink = flexShrink;
    child.selfAlign = child.selfAlign ?? this.alignContent;

    child.basis = this.direction === DIRECTION.ROW ? child.width : child.height;

    // Only add to layout calculations if not attached to another item
    if (child.attachToIndex === undefined) {
      this.axisSizeSum += child.basis;
      this.growSum += child.flexGrow;
      this.minFlexGrow += child.flexGrow ? child.basis : 0;
      // this.shrinkSum += child.flexShrink * child.basis;
    }

    child._flexWidth = child.width;
    child._flexHeight = child.height;

    this.children.push(child);

    return child;
  }

  layout(): void {
    this.updateBounds();
    this.updateJustify(this.justify);
    this.updateCrossAxis();

    // After the regular layout is done, position any attached items
    this.positionAttachedItems();
  }

  /**
   * Positions items that are attached to other items
   * Called after the main layout is complete
   */
  positionAttachedItems(): void {
    this.children.forEach((child) => {
      if (child.attachToIndex === undefined) {
        return;
      }

      // Reference target - either a sibling or the parent container
      let targetBounds: { width: number; height: number; x: number; y: number };

      // Special case for attaching to the parent container
      if (child.attachToIndex === -1) {
        targetBounds = {
          x: this.containerElement ? 0 : this.innerBounds.left,
          y: this.containerElement ? 0 : this.innerBounds.top,
          width: this.innerBounds.width,
          height: this.innerBounds.height,
        };
      } else {
        // Skip if the attachment target doesn't exist
        if (
          child.attachToIndex < 0 ||
          child.attachToIndex >= this.children.length
        ) {
          console.warn(
            "Flex: attachToIndex out of range:",
            child.attachToIndex
          );
          return;
        }

        const targetChild = this.children[child.attachToIndex];
        targetBounds = {
          x: targetChild.x,
          y: targetChild.y,
          width: targetChild.width,
          height: targetChild.height,
        };
      }

      // Calculate x position
      let offsetX = 0;
      if (child.attachOffsetX !== undefined) {
        if (typeof child.attachOffsetX === "string") {
          // Handle percentage values
          const percentage = parseFloat(child.attachOffsetX) / 100;
          offsetX = targetBounds.width * percentage;
        } else {
          offsetX = child.attachOffsetX;
        }
      }

      // Calculate y position
      let offsetY = 0;
      if (child.attachOffsetY !== undefined) {
        if (typeof child.attachOffsetY === "string") {
          // Handle percentage values
          const percentage = parseFloat(child.attachOffsetY) / 100;
          offsetY = targetBounds.height * percentage;
        } else {
          offsetY = child.attachOffsetY;
        }
      }

      // Set position relative to the target
      child.setPosition(targetBounds.x + offsetX, targetBounds.y + offsetY);

      // Handle percentage-based width if specified
      if (child.stretchWidth !== undefined) {
        if (typeof child.stretchWidth === "string") {
          // Handle percentage values
          const percentage = parseFloat(child.stretchWidth) / 100;
          child.setWidth(targetBounds.width * percentage);
        } else {
          child.setWidth(child.stretchWidth);
        }
      }

      // Handle percentage-based height if specified
      if (child.stretchHeight !== undefined) {
        if (typeof child.stretchHeight === "string") {
          // Handle percentage values
          const percentage = parseFloat(child.stretchHeight) / 100;
          child.setHeight(targetBounds.height * percentage);
        } else {
          child.setHeight(child.stretchHeight);
        }
      }
    });
  }

  trashLayout(): void {
    this.axisSizeSum = 0;
    this.growSum = 0;
    this.shrinkSum = 0;

    this.children.forEach((child) => {
      // Skip attached items in layout calculations
      if (child.attachToIndex !== undefined) {
        return;
      }

      child.basis =
        this.direction === DIRECTION.ROW ? child.width : child.height;

      this.axisSizeSum += child.basis;
      this.growSum += child.flexGrow;
      this.minFlexGrow += child.flexGrow ? child.basis : 0;
      //this.shrinkSum += child.flexShrink * child.basis;
    });
  }

  updateBounds(): void {
    this.outerBounds.setSize(Math.floor(this.width), Math.floor(this.height));
    this.innerBounds.setSize(
      Math.floor(this.width - this.paddingLeft - this.paddingRight),
      Math.floor(this.height - this.paddingTop - this.paddingBottom)
    );

    this.outerBounds.setPosition(
      Math.floor(this.x) - this.origin.x * this.width,
      Math.floor(this.y) - this.origin.y * this.height
    );
    this.innerBounds.setPosition(
      Math.floor(this.outerBounds.left + this.paddingLeft),
      Math.floor(this.outerBounds.top + this.paddingTop)
    );

    if (this.containerElement) {
      this.containerElement.setPosition(
        Math.floor(this.outerBounds.left),
        Math.floor(this.outerBounds.top)
      );
      this.containerElement.setSize(
        Math.floor(this.outerBounds.width),
        Math.floor(this.outerBounds.height)
      );

      this.containerElement.input?.hitArea?.setPosition(
        Math.floor(this.containerElement.width / 2),
        Math.floor(this.containerElement.height / 2)
      );
      this.containerElement.input?.hitArea?.setSize(
        Math.floor(this.containerElement.width),
        Math.floor(this.containerElement.height)
      );
    }

    if (this.backgroundElement) {
      this.backgroundElement.setPosition(
        Math.floor(this.outerBounds.left),
        Math.floor(this.outerBounds.top)
      );
      this.backgroundElement.setSize(
        Math.floor(this.outerBounds.width),
        Math.floor(this.outerBounds.height)
      );
    }
  }

  getDebug(
    graphics: Phaser.GameObjects.Graphics,
    withChildren: boolean = false
  ): void {
    if (!withChildren) {
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
    }

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

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.layout();
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this._flexWidth = width;
    this.height = height;
    this._flexHeight = height;
    this.layout();
  }

  setDepth(depth: number): void {
    this.depth = depth;
    this.children.forEach((child) => {
      child.setDepth(depth);
    });
  }

  setScrollFactor(x: number, y: number): void {
    this.scrollFactor = { x, y };
    // TODO: handle proper scroll factor
  }

  setOrigin(x: number, y: number): void {
    this.origin = { x, y };
    // TODO: handle proper origin
  }

  addToContainer(container: Phaser.GameObjects.Container): void {
    if (this.backgroundElement) {
      if (this.backgroundElement instanceof AbstractFlex) {
        this.backgroundElement.addToContainer(container);
      } else {
        container.add(this.backgroundElement);
      }
    }

    if (this.containerElement) {
      container.add(this.containerElement);
      return;
    }

    this.children.forEach((child) => {
      if (child instanceof AbstractFlex) {
        child.addToContainer(container);
      } else {
        container.add(child as unknown as Phaser.GameObjects.GameObject);
      }
    });
  }

  addToScene(scene: Phaser.Scene = window.currentScene) {
    if (this.backgroundElement) {
      if (this.backgroundElement instanceof AbstractFlex) {
        this.backgroundElement.addToScene(scene);
      } else {
        scene.add.existing(this.backgroundElement);
      }
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

  removeFromScene() {
    if (this.backgroundElement) {
      if (this.backgroundElement instanceof AbstractFlex) {
        this.backgroundElement.removeFromScene();
      } else {
        this.backgroundElement.destroy();
      }
    }

    if (this.containerElement) {
      this.containerElement.destroy();
      // If we have a container element, we don't need to remove the children from the scene
      return;
    }

    this.children.forEach((child) => {
      if (child instanceof AbstractFlex) {
        child.removeFromScene();
      } else if (child instanceof Phaser.GameObjects.GameObject) {
        child.destroy();
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
