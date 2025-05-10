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
  type?: "state";
  id: S;
  children?: Array<
    MotionStateElement<S, E> | AnimationElement | TransitionElement<E>
  >;
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

interface MotionMachineAnimationStack<S extends StateId> {
  state: S;
  phase: MotionMachineLifecycle;
  duration: number;
  goal: boolean;
}

export const motionMachineIntrinsicElements = ["motionMachine"] as const;

export class MotionMachine<
  S extends StateId,
  E extends EventId = never
> extends FiniteStateMachine<S, E> {
  private stateAnimations: Map<S, StateAnimations> = new Map();

  private stateLifecycle: MotionMachineLifecycle = "entering";

  private targetState: S | null = null;
  private targetEvent: E | null = null;

  private currentAnimations: AnimationPlan[] = [];
  private transitionStack: MotionMachineAnimationStack<S>[] = [];

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
      this.setStateLifecycle("entering", state.id);
    }
  }

  private getAnimationsFor(
    state: S,
    phase: "enter" | "exit" | "active"
  ): AnimationPlan[] {
    return (
      this.stateAnimations.get(state)?.[phase]?.map((anim) => {
        anim.reset();
        anim.update(0);
        return anim;
      }) || []
    );
  }

  getAnimationDuration(state: S, phase: "enter" | "exit" | "active") {
    return (
      this.stateAnimations.get(state)?.[phase]?.reduce((acc, anim) => {
        return Math.max(acc, anim.duration);
      }, 0) || 0
    );
  }

  collectAnimationTasks(current: S, goal: S) {
    const currentPath = current.split(".");
    const goalPath = goal.split(".");

    // Find the common ancestor level
    let commonAncestorIndex = 0;
    while (
      commonAncestorIndex < Math.min(currentPath.length, goalPath.length) &&
      currentPath[commonAncestorIndex] === goalPath[commonAncestorIndex]
    ) {
      commonAncestorIndex++;
    }

    const tasks: {
      state: S;
      phase: MotionMachineLifecycle;
      duration: number;
      goal: boolean;
    }[] = [];

    // Generate exit tasks from current state up to common ancestor
    for (let i = currentPath.length - 1; i >= commonAncestorIndex; i--) {
      const state = currentPath.slice(0, i + 1).join(".") as S;
      tasks.push({
        state,
        phase: "exiting",
        duration: this.getAnimationDuration(state, "exit"),
        goal: false,
      });
    }

    // Generate enter tasks from common ancestor to goal
    for (let i = commonAncestorIndex; i < goalPath.length; i++) {
      const state = goalPath.slice(0, i + 1).join(".") as S;
      tasks.push({
        state,
        phase: "entering",
        duration: this.getAnimationDuration(state, "enter"),
        // Only mark the final state as the goal
        goal: i === goalPath.length - 1,
      });
    }

    return tasks;
  }

  setState(state: S, lastEvent: E | null = null) {
    if (this.stateLifecycle !== "active") {
      // TODO: At some point this will never happen and it will be an error
      // The transition should handle enqueuing the state transitions
      //throw new Error("Cannot set state while not in active state");
    }

    this.transitionStack = this.collectAnimationTasks(
      this.current.get(),
      state
    );

    this.targetState = state;
    this.targetEvent = lastEvent;

    this.transitionStack.shift()!;
    this.setStateLifecycle("exiting", this.current.get());
  }

  animationsCompleted() {
    // Animations are done! Where should I be going next?
    if (this.transitionStack.length > 0) {
      const next = this.transitionStack.shift();
      if (next) {
        if (next.goal) {
          super.setState(next.state, this.targetEvent);
          this.targetState = null;
          this.targetEvent = null;
        }

        this.setStateLifecycle(next.phase, next.state);
        return;
      }
    }

    if (this.stateLifecycle === "entering") {
      this.setStateLifecycle("active", this.current.get());
    }

    if (this.stateLifecycle === "exiting") {
      assert(this.targetState, "Next state is not set");
      super.setState(this.targetState, this.targetEvent);
      this.setStateLifecycle("entering", this.targetState);
      this.targetState = null;
      this.targetEvent = null;
    }
  }

  setStateLifecycle(lifecycle: MotionMachineLifecycle, state: string) {
    this.stateLifecycle = lifecycle;

    this.currentAnimations = this.getAnimationsFor(
      state as S,
      MotionMachineLifecycleMap[lifecycle]
    );
  }

  j = 0;

  update(delta: number) {
    let infiniteLoopProtection = 0;

    let anim;
    let frameBudget = delta;

    while (frameBudget > 0) {
      // Find the maximum consumable frame budget
      let consumed = 0;

      for (let i = 0; i < this.currentAnimations.length; i++) {
        anim = this.currentAnimations[i];
        //anim.clock - anim.duration;
        consumed = Math.max(consumed, anim.update(frameBudget));

        if (anim.progress >= 1 && anim.duration !== Infinity) {
          if (anim.loop && this.stateLifecycle === "active") {
            anim.reset();
          } else {
            this.currentAnimations.splice(i, 1);
          }
        }
      }

      frameBudget -= consumed;

      if (
        this.stateLifecycle === "active" ||
        this.currentAnimations.length > 0
      ) {
        return;
      }

      this.animationsCompleted();

      infiniteLoopProtection++;
      if (infiniteLoopProtection > 1000) {
        throw new Error("Animation loop");
      }
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
  const states: MotionStateElement<S, E>[] = [];

  function processNestedStates(
    state: MotionStateElement<S, E>,
    parentId?: string
  ) {
    const id: S = parentId ? (`${parentId}.${state.id}` as S) : state.id;

    states.push({
      ...state,
      id,
    });

    makeArray(state.children).forEach((child) => {
      // Recursively process nested state elements
      if (child && child.type === "state") {
        processNestedStates(child, id);
      }
    });
  }

  for (const state of children) {
    if (state && state.type === "state") {
      processNestedStates(state);
    }
  }

  for (const state of states) {
    const config = processState<S, E>(state);
    mm.addState(config);
  }

  //if (!mm.stateIds.includes(props.initialState as S)) {
  //  throw new Error(`Initial state ${props.initialState} not found`);
  //}

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
