import { signal } from "@game/core/signals/signals";

import {
  ParallelProps,
  ParticlesProps,
  RepeatProps,
  SequenceContext,
  SequenceProps,
  SequenceStep,
  StateTransitionConfig,
  StateTransitionSignal,
  StepProps,
  TransitionProps,
  TransitionSignal,
  WaitProps,
} from "./types";

export function createTransitionSignal(
  initial: number
): TransitionSignal<number> {
  const value = signal(initial) as TransitionSignal<number>;
  let currentTween: Phaser.Tweens.Tween | null = null;

  value.transition = (
    target: number | (() => number),
    from: number | (() => number) | undefined,
    duration = 1,
    ease = "Quad.easeOut"
  ) => {
    const scene = window.currentScene as Phaser.Scene;

    // Stop existing transition
    if (currentTween) {
      currentTween.stop();
      currentTween = null;
    }

    if (from !== undefined) {
      from = typeof from === "function" ? from() : from;
      value.set(from);
    }

    // Start new transition
    currentTween = scene.tweens.add({
      targets: { v: value.get() },
      v: target,
      duration,
      ease,
      onUpdate: (tween) => {
        value.set(tween.getValue());
      },
      onComplete: () => {
        currentTween = null;
      },
    });
  };

  return value;
}

function createStateTransitionSignal(
  initial: number,
  config: StateTransitionConfig
): StateTransitionSignal {
  const value = signal(initial) as StateTransitionSignal;
  let currentTween: Phaser.Tweens.Tween | null = null;

  value.transitionTo = (state: string, duration = 1, ease = "Quad.easeOut") => {
    const target = config.states[state];
    if (target === undefined) return;

    const scene = window.currentScene as Phaser.Scene;

    if (currentTween) {
      currentTween.stop();
      currentTween = null;
    }

    currentTween = scene.tweens.add({
      targets: { v: value.get() },
      v: target,
      duration,
      ease,
      onUpdate: (tween) => {
        value.set(tween.getValue());
      },
      onComplete: () => {
        currentTween = null;
      },
    });
  };

  return value;
}

export function createParticleEffect(
  scene: Phaser.Scene,
  config: {
    texture: string;
    scale?: number | [number, number];
    alpha?: number | [number, number];
    speed?: number | [number, number];
    lifespan?: number;
    quantity?: number;
    emitZone?: Phaser.Types.GameObjects.Particles.EmitZoneData;
  }
) {
  return (x: number, y: number) => {
    const particles = scene.add.particles(0, 0, config.texture, {
      scale:
        typeof config.scale === "number"
          ? { start: config.scale, end: 0 }
          : { start: config.scale?.[0] ?? 1, end: config.scale?.[1] ?? 0 },
      alpha:
        typeof config.alpha === "number"
          ? { start: config.alpha, end: 0 }
          : { start: config.alpha?.[0] ?? 1, end: config.alpha?.[1] ?? 0 },
      speed:
        typeof config.speed === "number"
          ? config.speed
          : { min: config.speed?.[0] ?? 50, max: config.speed?.[1] ?? 100 },
      lifespan: config.lifespan ?? 1000,
      quantity: config.quantity ?? 10,
      emitZone: config.emitZone,
    });

    particles.setPosition(x, y);

    // Return promise that resolves when particles are done
    return new Promise<void>((resolve) => {
      scene.time.delayedCall(config.lifespan ?? 1000, () => {
        particles.destroy();
        resolve();
      });
    });
  };
}

function Transition<T>({
  signal,
  from,
  to,
  duration = 1,
  ease = "Quad.easeOut",
}: TransitionProps<T>): SequenceStep {
  return {
    duration,
    run: () => signal.transition(to, from, duration, ease),
  };
}

function Sequence({ children }: SequenceProps): SequenceStep {
  if (!children) return { duration: 0, run: () => {} };

  if (!Array.isArray(children)) {
    children = [children];
  }

  return {
    duration: children
      .map((child) => child.duration ?? 0)
      .reduce((sum, duration) => sum + duration, 0),
    run: async (ctx) => {
      for (const child of children) {
        if (!ctx.isPlaying) break;
        child.run(ctx);
        // If child has duration, wait for it
        if (child.duration) {
          await new Promise((resolve) =>
            ctx.scene.time.delayedCall(child.duration!, resolve)
          );
        }
      }
    },
  };
}

function Parallel({ children = [] }: ParallelProps): SequenceStep {
  if (!children) return { duration: 0, run: () => {} };

  if (!Array.isArray(children)) {
    children = [children];
  }

  const duration = Math.max(0, ...children.map((child) => child.duration ?? 0));

  return {
    duration,
    run: async (ctx) => {
      children.map((child) => child.run(ctx));
      await new Promise((resolve) =>
        ctx.scene.time.delayedCall(duration, resolve)
      );
    },
  };
}

function Wait({ duration }: WaitProps): SequenceStep {
  return {
    duration,
    run: () => {}, // Handled by SequenceEngine
  };
}

function Step({ action, duration }: StepProps): SequenceStep {
  return {
    duration,
    run: action,
  };
}

function Repeat({ times, children = [] }: RepeatProps): SequenceStep {
  if (!children) return { duration: 0, run: () => {} };
  if (!Array.isArray(children)) {
    children = [children];
  }

  return {
    duration:
      children
        .map((child) => child.duration ?? 0)
        .reduce((sum, duration) => sum + duration, 0) * times,
    run: async (ctx) => {
      for (let i = 0; i < times && ctx.isPlaying; i++) {
        await Sequence({ children }).run(ctx);
      }
    },
  };
}

function Particles({ effect, x, y, duration }: ParticlesProps): SequenceStep {
  return {
    duration,
    run: () => effect(x, y),
  };
}

// Sequence engine
class SequenceEngine {
  private isPlaying = false;
  private elapsed = 0;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private getContext(): SequenceContext {
    return {
      scene: this.scene,
      elapsed: this.elapsed,
      isPlaying: this.isPlaying,
    };
  }

  async run(step: SequenceStep) {
    this.stop();
    this.isPlaying = true;
    this.elapsed = 0;

    try {
      await step.run(this.getContext());
      this.elapsed += step.duration!;
    } catch (error) {
      console.error("Error in sequence step:", error);
    }

    this.isPlaying = false;
  }

  stop() {
    this.isPlaying = false;
  }
}

export {
  Parallel,
  Particles,
  Repeat,
  Sequence,
  SequenceEngine,
  Step,
  Transition,
  Wait
};

