import {
  AnimationElement,
  AnimationPlan,
} from "@game/core/animation/animation-timed";
import { makeArray } from "@game/core/common/arrays";
import {
  EventId,
  FiniteStateMachine,
  StateId,
  TransitionConfig,
  TransitionElement,
} from "@game/core/state-machine/state-machine";
import { assert } from "../common/assert";
import { MotionMachineLifecycle } from "./types";
import { MotionMachineLifecycleEvent } from "./types";

declare global {
  namespace JSX {
    interface MotionMachineElements {
      /**
       * Creates a motion machine.
       *
       * @param initialState - The initial state of the motion machine
       */
      motionMachine: MotionMachineElement;
    }

    interface IntrinsicElements extends MotionMachineElements {}
  }
}

export const MotionMachineLifecycleMap: Record<
  MotionMachineLifecycle,
  MotionMachineLifecycleEvent
> = {
  entering: "enter",
  exiting: "exit",
  active: "active",
};

interface StateAnimations {
  enter: AnimationPlan[];
  active: AnimationPlan[];
  exit: AnimationPlan[];
}

export interface MotionMachineElement<
  S extends string = string,
  E extends string = string
> {
  initialState?: S;
  initial?: S;
  children?: Array<MotionStateElement<S, E>>;
}

export interface MotionStateElement<
  S extends string = string,
  E extends string = string
> {
  id: S;
  children?: Array<MotionAnimationElement | TransitionElement>;
}

export interface MotionStateConfig<S extends StateId, E extends EventId> {
  id: S;
  transitions: TransitionConfig<S, E>[];
  animations: {
    enter?: AnimationPlan[];
    active?: AnimationPlan[];
    exit?: AnimationPlan[];
  };
  states?: MotionStateConfig<S, E>[];
}

export const motionMachineIntrinsicElements = ["motionMachine"] as const;

export class MotionMachine<
  S extends StateId,
  E extends EventId
> extends FiniteStateMachine<S, E> {
  private stateAnimations: Map<S, StateAnimations> = new Map();

  private currentAnimations: AnimationPlan[] = [];

  private nextState: S | null = null;
  private nextEvent: E | null = null;

  private lifecycleState: MotionMachineLifecycle = "entering";

  constructor(initialState: S) {
    super(initialState);
    window.currentScene?.addMotionMachine(this);
  }

  addState(state: MotionStateConfig<S, E>) {
    super.addState({
      id: state.id as S,
      transitions: state.transitions,
    });

    this.stateAnimations.set(state.id as S, {
      enter: state.animations.enter || [],
      active: state.animations.active || [],
      exit: state.animations.exit || [],
    });

    if (state.id === this.current.get()) {
      this.setLifecycleState("entering");
    }
  }

  setState(state: S, lastEvent: E | null = null) {
    if (this.lifecycleState !== "active") {
      // TODO: At some point this will never happen and it will be an error
      // The transition should handle enqueuing the state transitions
      //throw new Error("Cannot set state while not in active state");
    }

    const stateAnimations = this.stateAnimations.get(this.current.get());
    const nextStateAnimations = this.stateAnimations.get(state)!;

    if (!stateAnimations) {
      throw new Error(`State ${state} not found`);
    }

    // Future me, remember when I though that jumping states outside of update was a good idea?
    if (stateAnimations.exit.length > 0) {
      this.setLifecycleState("exiting");
      this.nextState = state;
      this.nextEvent = lastEvent;
    } else if (nextStateAnimations?.enter.length > 0) {
      super.setState(state, lastEvent);
      this.setLifecycleState("entering");
    } else {
      super.setState(state, lastEvent);
      this.setLifecycleState("active");
    }
  }

  setLifecycleState(state: MotionMachineLifecycle) {
    this.lifecycleState = state;

    this.currentAnimations =
      this.stateAnimations
        .get(this.current.get())
        ?.[MotionMachineLifecycleMap[state]]?.map((anim) => {
          anim.reset();
          anim.update(0);
          return anim;
        }) || [];
  }

  update(delta: number, _time?: number) {
    let anim;

    // TODO: There must be a while here consuming the delta until the animations are finished and the state transitions are completed

    for (let i = 0; i < this.currentAnimations.length; i++) {
      anim = this.currentAnimations[i];
      anim.update(delta);
      if (anim.progress >= 1 && anim.duration !== Infinity) {
        this.currentAnimations.splice(i, 1);
      }
    }

    if (this.lifecycleState === "active" || this.currentAnimations.length > 0) {
      return;
    }

    if (this.lifecycleState === "entering") {
      this.setLifecycleState("active");
    }

    if (this.lifecycleState === "exiting") {
      assert(this.nextState, "Next state is not set");
      super.setState(this.nextState, this.nextEvent);
      this.setLifecycleState("entering");
      this.nextState = null;
      this.nextEvent = null;
    }
  }
}

export function createMotionMachine<S extends StateId, E extends EventId>(
  props: MotionMachineElement<S, E>
): MotionMachine<S, E> {
  const mm = new MotionMachine<S, E>(
    props.initial || (props.initialState as S)
  );

  const children = makeArray(props.children);
  for (const state of children) {
    if (state) {
      const config = processState<S, E>(state);
      mm.addState(config);
    }
  }

  if (!mm.stateIds.includes(props.initialState as S)) {
    throw new Error(`Initial state ${props.initialState} not found`);
  }

  return mm;
}

function processState<S extends StateId, E extends EventId>(
  state: MotionStateElement<S, E>
): MotionStateConfig<S, E> {
  const transitions: TransitionConfig<S, E>[] = [];
  const animations: {
    enter: AnimationPlan[];
    active: AnimationPlan[];
    exit: AnimationPlan[];
  } = {
    enter: [],
    active: [],
    exit: [],
  };

  const children = makeArray(state.children);
  for (const child of children) {
    if (!child) continue;

    if (child.type === "transition") {
      transitions.push(child as TransitionConfig<S, E>);
    } else if (child instanceof AnimationPlan) {
      if (child.on === "active") {
        animations.active.push(child);
      }

      // TODO: Validate enter and exit animations (like no infinite duration)
      //

      if (child.on === "exit") {
        animations.exit.push(child);
      } else {
        // Default animation is enter
        animations.enter.push(child);
      }
    }
  }

  return {
    id: state.id,
    transitions,
    animations,
  };
}
