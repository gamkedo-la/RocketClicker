import { makeArray } from "@game/common/arrays";
import { assert } from "@game/common/assert";
import { EventId, FiniteStateMachine, StateId } from "./state-machine";

declare global {
  namespace JSX {
    interface StateObserverElements<S extends StateId, E extends EventId> {
      /**
       * Creates a state observer.
       *
       * @param fsm - The finite state machine to observe
       */
      stateObserver: StateObserverElement<S, E>;

      /**
       * Runs a function when the state is entered.
       *
       * @param state - The state to enter
       * @param run - The function to run when the state is entered
       */
      onEnter: OnEnterElement<S, E>;

      /**
       * Runs a function when the state is exited.
       *
       * @param state - The state to exit
       * @param run - The function to run when the state is exited
       */
      onExit: OnExitElement<S, E>;

      /**
       * Runs a function when an event is triggered.
       *
       * @param event - The event to trigger
       * @param run - The function to run when the event is triggered
       */
      onEvent: OnEventElement<S, E>;

      /**
       * Runs a function when a transition is triggered.
       *
       * @param from - The state to transition from
       * @param to - The state to transition to
       * @param run - The function to run when the transition is triggered
       */
      onTransition: OnTransitionElement<S, E>;
    }

    interface IntrinsicElements
      extends StateObserverElements<StateId, EventId> {}
  }
}

interface StateObserverElement<S extends StateId, E extends EventId> {
  fsm: FiniteStateMachine<S, E>;
  children?: StateObserverAction<S, E>[];
}

interface StateObserverContext<S extends StateId, E extends EventId> {
  fsm: FiniteStateMachine<S, E>;
  type: "enter" | "exit" | "event" | "transition";
  previous: S;
  current: S;
  event: E;
}

interface StateObserverAction<S extends StateId, E extends EventId> {
  type?: string;
  run?: (ctx: StateObserverContext<S, E>) => void;
}

interface OnEnterElement<S extends StateId, E extends EventId>
  extends StateObserverAction<S, E> {
  state: S;
}

interface OnExitElement<S extends StateId, E extends EventId>
  extends StateObserverAction<S, E> {
  state: S;
}

interface OnEventElement<S extends StateId, E extends EventId>
  extends StateObserverAction<S, E> {
  event: E;
}

interface OnTransitionElement<S extends StateId, E extends EventId>
  extends StateObserverAction<S, E> {
  from: S;
  to: S;
}

export const stateObserverIntrinsicElements: (keyof JSX.StateObserverElements<
  StateId,
  EventId
>)[] = ["stateObserver", "onEnter", "onExit", "onEvent", "onTransition"];

function createStateObserver<S extends StateId, E extends EventId>(
  props: StateObserverElement<S, E>
) {
  const current = props.fsm.current;
  const previous = props.fsm.previous;
  const lastEvent = props.fsm.lastEvent;
  const children = makeArray(props.children);

  const observers = {
    enter: new Map<S, ((previous: S, current: S, event: E) => void)[]>(),
    exit: new Map<S, ((previous: S, current: S, event: E) => void)[]>(),
    event: new Map<E, ((previous: S, current: S, event: E) => void)[]>(),
    transition: new Map<
      string,
      ((previous: S, current: S, event: E) => void)[]
    >(),
  };

  children.forEach((child) => {
    assert(child, "Child is not defined");
    switch (child.type) {
      case "onEnter": {
        const { state } = child as OnEnterElement<S, E>;
        observers.enter.set(state, [
          ...(observers.enter.get(state) || []),
          (previous, current, event) => {
            child.run?.({
              fsm: props.fsm,
              previous,
              current,
              event,
              type: "enter",
            });
          },
        ]);
        break;
      }
      case "onExit": {
        const { state } = child as OnExitElement<S, E>;
        observers.exit.set(state, [
          ...(observers.exit.get(state) || []),
          (previous, current, event) => {
            child.run?.({
              fsm: props.fsm,
              previous,
              current,
              event,
              type: "exit",
            });
          },
        ]);
        break;
      }
      case "onEvent": {
        const { event } = child as OnEventElement<S, E>;
        observers.event.set(event, [
          ...(observers.event.get(event) || []),
          (previous, current, event) => {
            child.run?.({
              fsm: props.fsm,
              previous,
              current,
              event,
              type: "event",
            });
          },
        ]);
        break;
      }
      case "onTransition": {
        const { from, to } = child as OnTransitionElement<S, E>;
        observers.transition.set(`${from}->${to}`, [
          ...(observers.transition.get(`${from}->${to}`) || []),
          (previous, current, event) => {
            child.run?.({
              fsm: props.fsm,
              previous,
              current,
              event,
              type: "transition",
            });
          },
        ]);
        break;
      }
    }
  });

  current.subscribe((state) => {
    const previousState = previous.get();
    const event = lastEvent.get()!;

    observers.event
      .get(event)
      ?.forEach((handler) => handler(previousState, state, event));
    observers.exit
      .get(previousState)
      ?.forEach((handler) => handler(previousState, state, event));
    observers.transition
      .get(`${previousState}->${state}`)
      ?.forEach((handler) => handler(previousState, state, event));
    observers.enter
      .get(state)
      ?.forEach((handler) => handler(previousState, state, event));
  });
}

export function setupStateObserverElement<S extends StateId, E extends EventId>(
  type: keyof JSX.StateObserverElements<S, E>,
  props: JSX.StateObserverElements<S, E>[keyof JSX.StateObserverElements<S, E>]
) {
  if (type === "stateObserver") {
    const stateObserverProps = props as StateObserverElement<S, E>;
    return createStateObserver(stateObserverProps);
  }

  return { ...props, type };
}
