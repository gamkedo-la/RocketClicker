import { SignalImpl } from "@game/state/lib/signals";
import { Signal } from "@game/state/lib/types";

import {
  cleanupSymbol,
  ContainerElement,
  ImageElement,
  NineSliceElement,
  PhaserGameObjectProps,
  RectangleElement,
  SignalCleanup,
  SpriteElement,
  TextElement,
} from "./types";

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
    (gameObject as any).setWordWrapWidth(value);
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
          x:
            spriteProps.x instanceof SignalImpl
              ? spriteProps.x.get()
              : spriteProps.x || 0,
          y:
            spriteProps.y instanceof SignalImpl
              ? spriteProps.y.get()
              : spriteProps.y || 0,
          key:
            spriteProps.texture instanceof SignalImpl
              ? spriteProps.texture.get()
              : spriteProps.texture,
          frame:
            spriteProps.frame instanceof SignalImpl
              ? spriteProps.frame.get()
              : spriteProps.frame,
        },
        false
      ) as unknown as T;
      break;

    case "image":
      const imageProps = props as ImageElement;

      gameObject = scene.make.image(
        {
          x:
            imageProps.x instanceof SignalImpl
              ? imageProps.x.get()
              : imageProps.x || 0,
          y:
            imageProps.y instanceof SignalImpl
              ? imageProps.y.get()
              : imageProps.y || 0,
          key:
            imageProps.texture instanceof SignalImpl
              ? imageProps.texture.get()
              : imageProps.texture,
        },
        false
      ) as unknown as T;
      break;

    case "text":
      const textProps = props as TextElement;

      gameObject = scene.make.text(
        {
          x:
            textProps.x instanceof SignalImpl ? textProps.x.get() : textProps.x,
          y:
            textProps.y instanceof SignalImpl ? textProps.y.get() : textProps.y,
          text:
            textProps.text instanceof SignalImpl
              ? textProps.text.get()
              : textProps.text,
          style:
            textProps.style instanceof SignalImpl
              ? textProps.style.get()
              : textProps.style,
        },
        false
      ) as unknown as T;
      break;

    case "rectangle":
      const rectangleProps = props as RectangleElement;

      gameObject = new Phaser.GameObjects.Rectangle(
        scene,
        rectangleProps.x instanceof SignalImpl
          ? rectangleProps.x.get()
          : rectangleProps.x,
        rectangleProps.y instanceof SignalImpl
          ? rectangleProps.y.get()
          : rectangleProps.y,
        rectangleProps.width instanceof SignalImpl
          ? rectangleProps.width.get()
          : rectangleProps.width,
        rectangleProps.height instanceof SignalImpl
          ? rectangleProps.height.get()
          : rectangleProps.height,
        rectangleProps.fillColor instanceof SignalImpl
          ? rectangleProps.fillColor.get()
          : rectangleProps.fillColor
      ) as unknown as T;

      if (rectangleProps.strokeColor) {
        (gameObject as unknown as Phaser.GameObjects.Rectangle).setStrokeStyle(
          rectangleProps.strokeWidth instanceof SignalImpl
            ? rectangleProps.strokeWidth.get()
            : rectangleProps.strokeWidth || 1,
          rectangleProps.strokeColor instanceof SignalImpl
            ? rectangleProps.strokeColor.get()
            : rectangleProps.strokeColor
        );
      }

      break;

    case "nineslice":
      const nineSliceProps = props as NineSliceElement;

      gameObject = scene.make.nineslice(
        {
          x:
            nineSliceProps.x instanceof SignalImpl
              ? nineSliceProps.x.get()
              : nineSliceProps.x || 0,
          y:
            nineSliceProps.y instanceof SignalImpl
              ? nineSliceProps.y.get()
              : nineSliceProps.y || 0,
          width:
            nineSliceProps.width instanceof SignalImpl
              ? nineSliceProps.width.get()
              : nineSliceProps.width,
          height:
            nineSliceProps.height instanceof SignalImpl
              ? nineSliceProps.height.get()
              : nineSliceProps.height,
          key:
            nineSliceProps.texture instanceof SignalImpl
              ? nineSliceProps.texture.get()
              : nineSliceProps.texture,
          frame:
            nineSliceProps.frame instanceof SignalImpl
              ? nineSliceProps.frame.get()
              : nineSliceProps.frame,
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
      ) as Phaser.GameObjects.GameObject[];

      const container = scene.make.container(
        {
          x:
            containerProps.x instanceof SignalImpl
              ? containerProps.x.get()
              : containerProps.x || 0,
          y:
            containerProps.y instanceof SignalImpl
              ? containerProps.y.get()
              : containerProps.y || 0,
          children,
        },
        false
      );

      container.setSize(
        containerProps.width instanceof SignalImpl
          ? containerProps.width.get()
          : containerProps.width,
        containerProps.height instanceof SignalImpl
          ? containerProps.height.get()
          : containerProps.height
      );

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
