import { Signal } from "@game/state/lib/types";
import { createParticleEffect } from "./animation";
import { EaseMap } from "@game/lib/easing";

// Core animation signal with transition tracking
export type TransitionSignal<T> = Signal<T> & {
  transition: (
    target: T | (() => T),
    from?: T | (() => T),
    duration?: number,
    ease?: string
  ) => void;
};

export interface TransitionProps<T> {
  signal: TransitionSignal<T>;
  from?: T | (() => T);
  to: T | (() => T);
  duration?: number;
  ease?: (typeof EaseMap)[number];
}

export type StateTransitionConfig = {
  states: Record<string, number>;
};

export type StateTransitionSignal = Signal<number> & {
  transitionTo: (state: string) => void;
};

// Sequence primitives
export type SequenceContext = {
  scene: Phaser.Scene;
  elapsed: number;
  isPlaying: boolean;
};

export interface SequenceStep {
  duration?: number;
  run: (ctx: SequenceContext) => Promise<void> | void;
}

export interface SequenceProps {
  children?: SequenceStep[] | SequenceStep;
}

export interface ParallelProps {
  children?: SequenceStep[] | SequenceStep;
}

export interface WaitProps {
  duration: number;
}

export interface StepProps {
  duration?: number;
  action: () => void;
}

export interface RepeatProps {
  times: number;
  children?: SequenceStep[] | SequenceStep;
}

export interface ParticlesProps {
  effect: ReturnType<typeof createParticleEffect>;
  x: number;
  y: number;
  duration?: number;
}
