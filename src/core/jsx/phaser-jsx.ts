import { getSignalValue, SignalImpl } from "@game/core/signals/signals";
import { Signal } from "@game/core/signals/types";

import {
  ContainerElement,
  ImageElement,
  NineSliceElement,
  PhaserGameObjectProps,
  RectangleElement,
  SpriteElement,
  TextElement,
  TileSpriteElement,
} from "./types";

import { cleanupSymbol, SignalCleanup } from "@game/core/signals/types";
import { TEXT_STYLE } from "@game/consts";

export const JsxElementsRegistry = {
  elements: new Map<
    Phaser.GameObjects.GameObject,
    Phaser.GameObjects.GameObject | null
  >(),

  register(
    element: Phaser.GameObjects.GameObject,
    parent: Phaser.GameObjects.GameObject | null = null
  ) {
    this.elements.set(element, parent);
    element.on("destroy", () => this.unregister(element));
  },

  unregister(element: Phaser.GameObjects.GameObject) {
    this.elements.delete(element);
  },

  getChildren(
    parent: Phaser.GameObjects.GameObject | null
  ): Phaser.GameObjects.GameObject[] {
    return Array.from(this.elements.entries())
      .filter(([child, _p]) => child.parentContainer === parent)
      .map(([child]) => child);
  },
};

function setGameObjectProperty(
  gameObject: Phaser.GameObjects.GameObject,
  property: string,
  value: any
) {
  if (property === "style") {
    (gameObject as any).setStyle(value);
  } else if (property === "frame") {
    (gameObject as any).setFrame(value);
  } else if (property === "origin") {
    if (typeof value === "object") {
      (gameObject as any).setOrigin(value.x, value.y);
    } else {
      (gameObject as any).setOrigin(value);
    }
  } else if (property === "scrollFactor") {
    if (typeof value === "object") {
      (gameObject as any).setScrollFactor(value.x, value.y);
    } else {
      (gameObject as any).setScrollFactor(value);
    }
  } else if (property === "interactive") {
    if (value) {
      gameObject.setInteractive();
    } else {
      gameObject.disableInteractive();
    }
  } else if (property === "onPointerdown") {
    gameObject.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        localX: number,
        localY: number,
        event: Phaser.Types.Input.EventData
      ) => value(gameObject, pointer, localX, localY, event)
    );
  } else if (property === "onPointerup") {
    gameObject.on(
      "pointerup",
      (
        pointer: Phaser.Input.Pointer,
        localX: number,
        localY: number,
        event: Phaser.Types.Input.EventData
      ) => value(gameObject, pointer, localX, localY, event)
    );
  } else if (property === "onPointerover") {
    gameObject.on(
      "pointerover",
      (
        pointer: Phaser.Input.Pointer,
        localX: number,
        localY: number,
        event: Phaser.Types.Input.EventData
      ) => value(gameObject, pointer, localX, localY, event)
    );
  } else if (property === "onPointermove") {
    gameObject.on(
      "pointermove",
      (
        pointer: Phaser.Input.Pointer,
        localX: number,
        localY: number,
        event: Phaser.Types.Input.EventData
      ) => value(gameObject, pointer, localX, localY, event)
    );
  } else if (property === "onPointerout") {
    gameObject.on(
      "pointerout",
      (pointer: Phaser.Input.Pointer, event: Phaser.Types.Input.EventData) =>
        value(gameObject, pointer, event)
    );
  } else if (property === "depth") {
    (gameObject as any).setDepth(value);
  } else if (property === "resolution") {
    (gameObject as any).setResolution(value);
  } else if (property === "wordWrapWidth") {
    (gameObject as any).setWordWrapWidth(value, true);
  } else {
    (gameObject as any)[property] = value;
  }
}

function createSignalBinding(
  gameObject: Phaser.GameObjects.GameObject & Partial<SignalCleanup>,
  property: string,
  signal: Signal<any>
): () => void {
  const cleanup = signal.subscribe((value) =>
    setGameObjectProperty(gameObject, property, value)
  );

  if (!gameObject[cleanupSymbol]) {
    gameObject[cleanupSymbol] = [];
  }

  gameObject[cleanupSymbol].push(cleanup);

  return cleanup;
}

export function setupGameObject<T extends Phaser.GameObjects.GameObject>(
  type: string,
  props: PhaserGameObjectProps<T>
) {
  const scene = window.currentScene;

  if (!scene) {
    throw new Error("No scene found");
  }

  assertChildren(props.children);

  let gameObject: T;

  switch (type) {
    case "sprite":
      const spriteProps = props as SpriteElement;

      gameObject = scene.make.sprite(
        {
          x: getSignalValue(spriteProps.x, 0),
          y: getSignalValue(spriteProps.y, 0),
          key: getSignalValue(spriteProps.texture),
          frame: getSignalValue(spriteProps.frame),
        },
        false
      ) as unknown as T;
      break;

    case "tileSprite":
      const tileSpriteProps = props as TileSpriteElement;

      gameObject = scene.make.tileSprite(
        {
          x: getSignalValue(tileSpriteProps.x, 0),
          y: getSignalValue(tileSpriteProps.y, 0),
          width: getSignalValue(tileSpriteProps.width),
          height: getSignalValue(tileSpriteProps.height),
          key: getSignalValue(tileSpriteProps.texture),
          frame: getSignalValue(tileSpriteProps.frame),
        },
        false
      ) as unknown as T;
      break;

    case "image":
      const imageProps = props as ImageElement;

      gameObject = scene.make.image(
        {
          x: getSignalValue(imageProps.x, 0),
          y: getSignalValue(imageProps.y, 0),
          key: getSignalValue(imageProps.texture),
        },
        false
      ) as unknown as T;
      break;

    case "text":
      const textProps = props as TextElement;

      gameObject = scene.make.text(
        {
          x: getSignalValue(textProps.x, 0),
          y: getSignalValue(textProps.y, 0),
          text: getSignalValue(textProps.text),
          style: getSignalValue(textProps.style) || TEXT_STYLE,
        },
        false
      ) as unknown as T;
      break;

    case "rectangle":
      const rectangleProps = props as RectangleElement;

      gameObject = new Phaser.GameObjects.Rectangle(
        scene,
        getSignalValue(rectangleProps.x, 0),
        getSignalValue(rectangleProps.y, 0),
        getSignalValue(rectangleProps.width),
        getSignalValue(rectangleProps.height),
        getSignalValue(rectangleProps.fillColor)
      ) as unknown as T;

      if (rectangleProps.strokeColor) {
        (gameObject as unknown as Phaser.GameObjects.Rectangle).setStrokeStyle(
          getSignalValue(rectangleProps.strokeWidth, 1),
          getSignalValue(rectangleProps.strokeColor)
        );
      }

      break;

    case "nineslice":
      const nineSliceProps = props as NineSliceElement;

      gameObject = scene.make.nineslice(
        {
          x: getSignalValue(nineSliceProps.x, 0),
          y: getSignalValue(nineSliceProps.y, 0),
          width: getSignalValue(nineSliceProps.width),
          height: getSignalValue(nineSliceProps.height),
          key: getSignalValue(nineSliceProps.texture),
          frame: getSignalValue(nineSliceProps.frame),
          leftWidth: nineSliceProps.leftWidth,
          rightWidth: nineSliceProps.rightWidth,
          topHeight: nineSliceProps.topHeight,
          bottomHeight: nineSliceProps.bottomHeight,
        },
        false
      ) as unknown as T;
      break;

    case "container":
      const containerProps = props as unknown as ContainerElement;

      const children = (
        Array.isArray(containerProps.children)
          ? containerProps.children.flat(2)
          : containerProps.children
          ? [containerProps.children]
          : []
      ) as Phaser.GameObjects.GameObject[];

      const container = scene.make.container(
        {
          x: getSignalValue(containerProps.x, 0),
          y: getSignalValue(containerProps.y, 0),
          children,
        },
        false
      );

      container.setSize(
        getSignalValue(containerProps.width),
        getSignalValue(containerProps.height)
      );

      if (import.meta.env.DEV) {
        // Register container children
        children.forEach((child) => {
          if (!JsxElementsRegistry.elements.has(child)) {
            JsxElementsRegistry.register(child, container);
          }
        });
      }

      gameObject = container as unknown as T;
      break;

    default:
      throw new Error(`Unknown JSX element type: ${type}`);
  }

  const ignoreProperties = ["texture", "children"];

  Object.entries(props).forEach(([key, value]) => {
    if (value instanceof SignalImpl) {
      createSignalBinding(gameObject, key, value);
    } else if (typeof value !== "undefined") {
      if (ignoreProperties.includes(key)) {
        return;
      }
      setGameObjectProperty(gameObject, key, value);
    }
  });

  if (props.bind) {
    Object.entries(props.bind).forEach(([key, value]) => {
      createSignalBinding(gameObject, key, value);
    });
  }

  if (props.ref) {
    props.ref(gameObject);
  }

  if (import.meta.env.DEV) {
    // Register the game object with its parent (if any)
    const parent = gameObject.parentContainer || null;
    JsxElementsRegistry.register(gameObject, parent);
  }

  return gameObject;
}

function assertChildren(children: any | any[] = []) {
  if (
    (Array.isArray(children) && children.some(isValidChild)) ||
    (!Array.isArray(children) && isValidChild(children))
  ) {
    throw new Error(
      `Conditional rendering is not supported.

If you are seeing this error it might mean not all your components are being rendered within the first render. Functional components are not rerendered so you need to handle dynamic components with effects`
    );
  }
}

function isValidChild(child: any): boolean {
  if (Array.isArray(child)) {
    // TODO: If you are debugging this again, it probably means you caused an infinite loop or some very deep nested components
    return child.every(isValidChild);
  }
  return (
    child !== null &&
    !(child?.call || child instanceof Phaser.GameObjects.GameObject)
  );
}
