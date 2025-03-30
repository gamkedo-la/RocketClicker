import { SignalValue, Signal } from "@game/core/signals/types";
import { AbstractScene } from "@game/scenes/index";

declare global {
  interface Window {
    currentScene: AbstractScene;
  }

  namespace JSX {
    interface IntrinsicElements {
      container: ContainerElement;
      text: TextElement;
      rectangle: RectangleElement;
      sprite: SpriteElement;
      tileSprite: TileSpriteElement;
      image: ImageElement;
      circle: CircleElement;
      zone: ZoneElement;
      nineslice: NineSliceElement;
    }
  }
}

export type TransformablePhaserGameObject = Phaser.GameObjects.GameObject & {
  width: number;
  height: number;
  setSize: (width: number, height: number) => void;
} & Phaser.GameObjects.Components.Transform &
  Phaser.GameObjects.Components.ScrollFactor &
  Phaser.GameObjects.Components.Origin;

export type ContainerElement =
  PhaserGameObjectProps<Phaser.GameObjects.Container>;

export type TextElement = PhaserGameObjectProps<Phaser.GameObjects.Text> & {
  text?: SignalValue<string>;
  style?: SignalValue<Phaser.Types.GameObjects.Text.TextStyle>;
  resolution?: SignalValue<number>;
  wordWrapWidth?: SignalValue<number>;
};

export type RectangleElement =
  PhaserGameObjectProps<Phaser.GameObjects.Rectangle> & {
    fillColor?: SignalValue<number>;
    strokeColor?: SignalValue<number>;
    strokeWidth?: SignalValue<number>;
  };

export type SpriteElement = PhaserGameObjectProps<Phaser.GameObjects.Sprite> & {
  texture: SignalValue<string>;
  frame?: SignalValue<string | number>;
};

export type TileSpriteElement =
  PhaserGameObjectProps<Phaser.GameObjects.TileSprite> & {
    texture: SignalValue<string>;
    frame?: SignalValue<string | number>;
  };

export type ImageElement = PhaserGameObjectProps<Phaser.GameObjects.Image> & {
  texture: SignalValue<string>;
  frame?: SignalValue<string | number>;
};

export type CircleElement = PhaserGameObjectProps<Phaser.GameObjects.Arc> & {
  radius: SignalValue<number>;
  fillColor?: SignalValue<number>;
};

export type ZoneElement = PhaserGameObjectProps<Phaser.GameObjects.Zone> & {
  width: SignalValue<number>;
  height: SignalValue<number>;
};

export type NineSliceElement =
  PhaserGameObjectProps<Phaser.GameObjects.NineSlice> & {
    texture: SignalValue<string>;
    frame?: SignalValue<string | number>;

    leftWidth: number;
    rightWidth: number;
    topHeight: number;
    bottomHeight: number;
  };

export type PhaserJsxElement =
  | PhaserGameObjectProps<Phaser.GameObjects.GameObject>
  | PhaserGameObjectProps<Phaser.GameObjects.GameObject>[];

export interface PhaserGameObjectProps<
  T extends Phaser.GameObjects.GameObject
> {
  // JSX children prop
  children?: PhaserJsxElement;

  key?: string;
  name?: string;
  active?: SignalValue<boolean>;
  visible?: SignalValue<boolean>;

  x?: SignalValue<number>;
  y?: SignalValue<number>;

  width?: SignalValue<number>;
  height?: SignalValue<number>;

  alpha?: SignalValue<number>;
  tint?: SignalValue<number>;

  angle?: SignalValue<number>;
  scale?: SignalValue<number>;
  scaleX?: SignalValue<number>;
  scaleY?: SignalValue<number>;

  origin?: SignalValue<[number, number] | { x: number; y: number }>;

  depth?: SignalValue<number>;
  scrollFactor?: SignalValue<number>;
  scrollFactorX?: SignalValue<number>;
  scrollFactorY?: SignalValue<number>;

  interactive?: SignalValue<boolean>;
  onPointerdown?: (
    self: T,
    pointer: Phaser.Input.Pointer,
    localX: number,
    localY: number,
    event: Phaser.Types.Input.EventData
  ) => void;
  onPointerup?: (
    self: T,
    pointer: Phaser.Input.Pointer,
    localX: number,
    localY: number,
    event: Phaser.Types.Input.EventData
  ) => void;
  onPointerover?: (
    self: T,
    pointer: Phaser.Input.Pointer,
    localX: number,
    localY: number,
    event: Phaser.Types.Input.EventData
  ) => void;
  onPointermove?: (
    self: T,
    pointer: Phaser.Input.Pointer,
    localX: number,
    localY: number,
    event: Phaser.Types.Input.EventData
  ) => void;
  onPointerout?: (
    self: T,
    pointer: Phaser.Input.Pointer,
    event: Phaser.Types.Input.EventData
  ) => void;

  bind?: Record<string, Signal<any>>;
  ref?: (gameObject: T) => void;
}
