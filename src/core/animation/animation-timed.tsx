import { makeArray } from "@game/core/common/arrays";
import { assert } from "@game/core/common/assert";
import { EaseMap } from "@game/core/common/easing";
import { Signal, SignalValue } from "@game/core/signals/types";
import { MotionMachineLifecycleEvent } from "../motion-machine/types";
import { getSignalValue } from "../signals/signals";

// IDEAS/TODO
//
// - Easings
// - Direction of a sequence (forward, backward, ping pong, etc.)
// - Amount of steps a control element will run (like you set it to 5 and then in 1s it will run only 5 times, not every update)

declare global {
  namespace JSX {
    interface AnimationElements {
      animation: AnimationElement;

      /**
       * Runs the children in order.
       *
       * The duration of the sequence is the sum of the durations of the children.
       */
      sequence: SequenceElement;

      /**
       * Runs the children in parallel.
       *
       * The duration of the parallel is the duration of the longest child.
       */
      parallel: ParallelElement;

      /**
       * Repeats the children a certain number of times.
       *
       * *Be warned* <repeat> doesn't handle small duration animations (<50ms) with large timesteps (>100ms) very well
       *
       * @param times - The number of times to repeat the children, if not provided, it will repeat indefinitely. If set to -1, it will repeat indefinitely.
       */
      repeat: RepeatElement;

      /**
       * Waits for a certain duration.
       *
       * @param duration - The duration to wait
       */
      wait: WaitElement;

      /**
       * Runs a function when the animation is triggered. It doesn't have a duration.
       *
       * @param run - The function to run when the animation is triggered
       */
      step: StepElement;

      /**
       * Tweens a signal from a value to another value over a certain duration.
       *
       * @param signal - The signal to tween
       * @param from - The starting value, if not provided, the signal's current value will be used
       * @param to - The ending value
       * @param duration - The duration of the tween
       */
      tween: TweenElement<any>;
    }

    interface IntrinsicElements extends AnimationElements {}

    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

export const animationIntrinsicElements: (keyof JSX.AnimationElements)[] = [
  "animation",
  "sequence",
  "parallel",
  "repeat",
  "wait",
  "step",
  "tween",
];

type ControlElements = RepeatElement | ParallelElement | SequenceElement;
type StepsElement = WaitElement | StepElement | TweenElement<any>;
type AnimationElements = ControlElements | StepsElement;

export interface AnimationElement {
  type?: "animation";
  children: AnimationElements[];
  duration?: number;

  on?: MotionMachineLifecycleEvent;
}

export interface SequenceElement {
  type?: "sequence";
  children: AnimationElements[];
  duration?: number;
  currentStep?: number;
  stepClock?: number;
}

export interface ParallelElement {
  type?: "parallel";
  children: AnimationElements[];
  duration?: number;
  currentStep?: number;
  stepClock?: number;
}

export interface RepeatElement {
  type?: "repeat";
  children: AnimationElements[];
  duration?: number;
  times?: number;
  currentIteration?: number;
  iterationStepClock?: number;
  iterationCurrentStep?: number;
  childDuration?: number;
}

export interface WaitElement {
  type?: "wait";
  duration?: number;
}

export interface StepElement {
  type?: "step";
  duration?: number;
  triggered?: boolean;
  run: (ctx: AnimationContext) => void;
}

export interface TweenElement<T> {
  type?: "tween";
  signal: Signal<T>;
  from?: SignalValue<T>;
  to: SignalValue<T> | (() => T);
  duration?: number;
  ease?: (typeof EaseMap)[number];
  initialValue?: SignalValue<T>;
}

export interface AnimationContext {
  progress: number;
  previousProgress: number;
  direction: "forward" | "backward" | "none";
}

export const setupAnimationElement = (
  type: keyof JSX.AnimationElements,
  props: JSX.AnimationElements[keyof JSX.AnimationElements]
) => {
  // Steps
  if (type === "tween") {
    return { ...props, type: "tween" };
  }

  if (type === "wait") {
    return { ...props, type: "wait" };
  }

  if (type === "step") {
    if (props.duration) {
      throw new Error("Step elements cannot have duration");
    }

    return { ...props, duration: 0, type: "step" };
  }

  // Controls
  assert((props as any).children, "Children are required for controls");
  const children = makeArray((props as any).children);

  if (type === "sequence") {
    let duration = 0;
    children.forEach((child) => {
      duration += child.duration ?? 0;
    });

    return { ...props, type: "sequence", duration, children };
  }

  if (type === "parallel") {
    let duration = 0;

    children.forEach((child) => {
      duration = Math.max(duration, child.duration ?? 0);
    });

    return { ...props, type: "parallel", duration, children };
  }

  if (type === "repeat") {
    let childDuration = 0;

    children.forEach((child) => {
      childDuration += child.duration ?? 0;
    });

    const times = (props as any).times ?? 1;
    const duration = times === -1 ? Infinity : childDuration * times;

    if (times === -1 && childDuration === 0) {
      throw new Error("Empty infinite repeats are not supported");
    }

    return {
      ...props,
      type: "repeat",
      duration,
      childDuration,
      times,
      children,
    };
  }

  if (type === "animation") {
    props = props as AnimationElement;
    props.duration = 0;
    children.forEach((child) => {
      props.duration += child.duration ?? 0;
    });
    props.children = children;

    return new AnimationPlan(props as AnimationElement);
  }

  return props;
};

export class AnimationPlan {
  steps: AnimationElements[] = [];
  duration: number;
  state: "pristine" | "running" | "paused" | "stopped" = "pristine";

  clock = 0;
  stepClock = 0;

  progress = 0;
  currentStep = 0;

  on?: MotionMachineLifecycleEvent;

  constructor(props: AnimationElement) {
    this.steps = props.children;
    this.duration = props.duration ?? 0;
    this.on = props.on;
  }

  reset() {
    this.clock = 0;
    this.stepClock = 0;
    this.progress = 0;
    this.currentStep = 0;

    this.state = "pristine";

    return this;
  }

  private initializeStepState(step: AnimationElements) {
    switch (step.type) {
      case "tween":
        step.initialValue = getSignalValue(step.from) ?? step.signal.get();
        break;

      case "step":
        step.triggered = false;
        break;

      case "sequence":
        step.currentStep = 0;
        step.stepClock = 0;
        this.initializeStepState(step.children[0]);
        break;

      case "parallel":
        step.currentStep = 0;
        step.stepClock = 0;
        step.children.forEach((child) => this.initializeStepState(child));
        break;

      case "repeat":
        step.currentIteration = 0;
        step.iterationStepClock = 0;
        step.iterationCurrentStep = 0;
        step.children.forEach((child) => this.initializeStepState(child));
        break;
    }
  }

  private processSteps(
    steps: AnimationElements[],
    clock: number,
    stepClock: number,
    currentStep: number
  ): { newStep: number; newStepClock: number } {
    let newStep = currentStep;
    let newStepClock = stepClock;

    while (steps[newStep]) {
      const step = steps[newStep];
      const stepDuration = step.duration ?? 0;

      // Initialize step state when entering new step
      if (newStep > currentStep) {
        this.initializeStepState(step);
      }

      if (clock >= newStepClock + stepDuration) {
        this.runStep(step, 1, stepDuration);
        newStepClock += stepDuration;
        newStep++;
      } else {
        break;
      }
    }

    return { newStep, newStepClock };
  }

  /**
   * @param step - The step to run
   * @param localProgress - Progress within the current step
   * @param localClock - Clock within the current step, used ONLY for repeat steps, values are probably wrong for other steps
   */
  private runStep(
    step: AnimationElements,
    localProgress: number,
    localClock: number
  ) {
    switch (step.type) {
      case "tween": {
        step.signal.set(
          linear(
            getSignalValue(step.initialValue),
            // FIXME: this is a hack to get a function working, but it's far from ideal (move it outisde of the step)
            typeof step.to === "function" ? step.to() : getSignalValue(step.to),
            localProgress
          )
        );
        break;
      }

      case "wait":
        // No operation - just consumes time
        break;

      case "step": {
        if (!step.triggered) {
          step.run({
            progress: localProgress,
            previousProgress: this.progress,
            direction: "forward",
          });
          step.triggered = true;
        }
        break;
      }

      case "sequence": {
        const seqClock = localProgress * step.duration!;
        const seqState = this.processSteps(
          step.children,
          seqClock,
          step.stepClock ?? 0,
          step.currentStep ?? 0
        );

        // Update sequence's internal state
        step.currentStep = seqState.newStep;
        step.stepClock = seqState.newStepClock;

        // Did we arrive at the end of the steps?
        if (step.currentStep < step.children.length) {
          const child = step.children[step.currentStep];
          const childProgress =
            (seqClock - seqState.newStepClock) / (child.duration ?? 1);
          this.runStep(child, childProgress, seqClock - seqState.newStepClock);
        }
        break;
      }

      case "parallel": {
        for (const child of step.children) {
          // Calculate progress relative to child's duration within parallel container
          const childMaxProgress =
            step.duration === 0
              ? 1
              : step.duration! / (child.duration ?? step.duration!);
          const childProgress = Math.min(localProgress * childMaxProgress, 1);
          this.runStep(child, childProgress, localClock);
        }
        break;
      }

      case "repeat": {
        const childDuration = step.childDuration!;
        const times = step.times ?? 1;

        // Handle zero-duration special case
        if (childDuration === 0) {
          const iterations = times === -1 ? 1 : times;
          for (let i = 0; i < iterations; i++) {
            step.children.forEach((child) => this.runStep(child, 1, 0));
          }
          break;
        }

        let currentIteration = step.currentIteration ?? 0;
        let iterationTime = localClock % childDuration;

        // Handle finite repeats
        if (times !== -1) {
          const maxIterations = times;
          currentIteration = Math.min(
            Math.floor(localClock / childDuration),
            maxIterations - 1
          );
          iterationTime = Math.min(
            localClock - currentIteration * childDuration,
            childDuration
          );
        }

        // TODO: this is probably wrong, as it should be a loop that runs until the current iteration is reached
        if (currentIteration !== step.currentIteration) {
          step.currentIteration = currentIteration;
          step.iterationCurrentStep = 0;
          step.iterationStepClock = 0;

          step.children.forEach((child) => {
            this.runStep(child, 1, 0);
          });
          this.initializeStepState(step.children[0]);
        }

        // Process current iteration
        const iterState = this.processSteps(
          step.children,
          iterationTime,
          step.iterationStepClock!,
          step.iterationCurrentStep!
        );

        // Update tracking
        step.iterationCurrentStep = iterState.newStep;
        step.iterationStepClock = iterState.newStepClock;

        // Run current child step
        if (iterState.newStep < step.children.length) {
          const child = step.children[iterState.newStep];
          const childProgress = Math.min(
            (iterationTime - iterState.newStepClock) / (child.duration || 1),
            1
          );
          this.runStep(
            child,
            childProgress,
            iterationTime - iterState.newStepClock
          );
        }
        break;
      }
    }
  }

  update(dt: number) {
    let consumed = 0;

    if (this.state === "pristine") {
      this.state = "running";
      this.initializeStepState(this.steps[0]);
    }

    if (this.state === "stopped") return 0;

    consumed = Math.max(0, Math.min(this.duration - this.clock, dt));

    // console.log("- #a", {
    //   dt,
    //   clock: this.clock,
    //   duration: this.duration,
    //   consumed,
    // });

    this.clock += dt;
    this.progress = Math.min(this.clock / this.duration, 1);

    const stepState = this.processSteps(
      this.steps,
      this.clock,
      this.stepClock,
      this.currentStep
    );

    this.currentStep = stepState.newStep;
    this.stepClock = stepState.newStepClock;

    if (this.currentStep < this.steps.length) {
      const step = this.steps[this.currentStep];
      const stepDuration = step.duration ?? 1;
      const localProgress = (this.clock - this.stepClock) / stepDuration;
      this.runStep(
        step,
        Math.min(localProgress, 1),
        this.clock - this.stepClock
      );
    }

    return consumed;
  }
}

export function linear(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}
