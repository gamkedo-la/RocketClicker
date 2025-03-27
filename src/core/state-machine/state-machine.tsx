import { makeArray } from "@game/core/common/arrays";
import { assert } from "@game/core/common/assert";
import { signal } from "@game/core/signals/signals";
import { Signal } from "@game/core/signals/types";

declare global {
  namespace JSX {
    type ElementType =
      | keyof IntrinsicElements
      // Function components
      | ((props: any) => Element)
      | ((props: any) => void)
      // Class components
      | (new (props: any) => ElementClass);

    interface StateMachineElements<S extends StateId, E extends EventId> {
      /**
       * Creates a finite state machine.
       *
       * @param initialState - The initial state of the state machine
       */
      stateMachine: StateMachineElement<S, E>;

      /**
       * Creates a state.
       *
       * @param id - The id of the state
       */
      state: StateElement<S, E>;

      /**
       * Creates a transition.
       *
       * @param on - The event of the transition
       * @param target - The target state of the transition
       */
      transition: TransitionElement<E>;
    }

    interface IntrinsicElements
      extends StateMachineElements<StateId, EventId> {}

    type Element = any;
    type ElementClass = any;

    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

export const stateMachineIntrinsicElements: (keyof JSX.StateMachineElements<
  StateId,
  EventId
>)[] = ["stateMachine", "state", "transition"];

export interface TransitionElement<E extends EventId> {
  type?: "transition";
  on: E;
  target: StateId;
  guard?: () => boolean;
}

export interface StateMachineElement<S extends StateId, E extends EventId> {
  type?: "stateMachine";
  initialState: S;
  children?: StateElement<S, E> | StateElement<S, E>[];
}

export interface StateElement<S extends StateId, E extends EventId> {
  type?: "state";
  id: S;
  children?: Array<TransitionElement<E>>;
}

export type StateId = string;
export type EventId = string;

export interface TransitionConfig<S extends StateId, E extends EventId> {
  on: E;
  target: S;
  guard?: () => boolean;
}

export interface StateConfig<S extends StateId, E extends EventId> {
  id: S;
  transitions: TransitionConfig<S, E>[];
}

export function setupStateMachineElement<S extends StateId, E extends EventId>(
  type: keyof JSX.StateMachineElements<S, E>,
  props: JSX.StateMachineElements<S, E>[keyof JSX.StateMachineElements<S, E>]
) {
  if (type === "stateMachine") {
    return createStateMachine(props as StateMachineElement<S, E>);
  }

  return { ...props, type };
}

// TODO: At some point there was something to keep track of available events, but I removed and I don't know if it's needed
// private availableEvents: Signal<E[]>;

/**
 * A finite state machine.
 *
 * @param S - The type of the state id
 * @param E - The type of the event id
 */
export class FiniteStateMachine<S extends StateId, E extends EventId> {
  private states: Map<S, StateConfig<S, E>>;
  private currentState: Signal<S>;
  private previousState: Signal<S>;
  private lastTriggeredEvent: Signal<E | null>;

  constructor(initialState: S) {
    this.states = new Map();
    this.currentState = signal(initialState);
    this.previousState = signal(initialState);
    this.lastTriggeredEvent = signal<E | null>(null);
  }

  addState(state: StateConfig<S, E>) {
    if (this.states.has(state.id)) {
      throw new Error(`State ${state.id} already exists`);
    }

    this.states.set(state.id, state);
  }

  transition(event: E): boolean {
    const currentState = this.states.get(this.currentState.get());
    assert(currentState, "Current state is not defined");

    const transition = currentState.transitions.find((t) => t.on === event);

    if (import.meta.env.DEV) {
      console.log(`Current state: ${currentState.id}`, `Event: ${event}`);

      if (!transition) {
        console.log(
          "Available events:",
          currentState.transitions.map((t) => t.on)
        );
        console.warn(`No transition found for event ${event}`);
        return false;
      }
    }
    if (!transition) return false;

    if (import.meta.env.DEV && transition.guard && !transition.guard()) {
      console.warn(
        `Transition ${currentState.id}->${transition.target} failed guard for event ${event}`
      );
      return false;
    }

    if (transition.guard && !transition.guard()) return false;

    this.setState(transition.target, event);
    return true;
  }

  setState(state: S, lastEvent: E | null = null) {
    const nextState = this.states.get(state);
    assert(nextState, `State ${state} not found`);

    this.lastTriggeredEvent.set(lastEvent);
    this.previousState.set(this.currentState.get());
    this.currentState.set(state);
  }

  get current(): Signal<S> {
    return this.currentState;
  }

  get previous(): Signal<S> {
    return this.previousState;
  }

  get lastEvent(): Signal<E | null> {
    return this.lastTriggeredEvent;
  }

  get stateIds(): S[] {
    return Array.from(this.states.keys());
  }
}

function createStateMachine<S extends StateId, E extends EventId>(
  props: StateMachineElement<S, E>
): FiniteStateMachine<S, E> {
  const fsm = new FiniteStateMachine<S, E>(props.initialState as S);
  const children = makeArray(props.children);

  children.forEach((child) => {
    assert(child, "Child is not defined");

    const stateChildren = child.children ? makeArray(child.children) : [];

    const transitions: TransitionConfig<S, E>[] = stateChildren.map(
      (child) => ({
        on: child.on as E,
        target: child.target as S,
        guard: child.guard,
      })
    );

    fsm.addState({
      id: child.id as S,
      transitions,
    });
  });

  return fsm;
}
