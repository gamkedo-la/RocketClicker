import {
  EventId,
  setupStateMachineElement,
  StateId,
  stateMachineIntrinsicElements,
} from "../../state/lib/state-machine";
import {
  stateObserverIntrinsicElements,
  setupStateObserverElement,
} from "../../state/lib/state-observer";
import { setupGameObject } from "./phaser-jsx";

/*
  JSX runtime

  This is the runtime for JSX. It is used by esbuild to transform JSX into calls.
  It must exists as a separated file as it is hardcoded import in esbuild

  https://esbuild.github.io/api/#jsx-import-source
*/

export function jsx(
  type: string | Function,
  props: Record<string, any>,
  key: string
) {
  if (key) {
    throw new Error(
      "Key argument is not supported, we are not using this part on the JSX runtime"
    );
  }

  // Handle functional components
  if (typeof type === "function") {
    return type(props);
  }

  if (
    stateMachineIntrinsicElements.includes(
      type as keyof JSX.StateMachineElements
    )
  ) {
    return setupStateMachineElement(
      type as keyof JSX.StateMachineElements,
      props as JSX.StateMachineElements[keyof JSX.StateMachineElements]
    );
  }

  if (
    stateObserverIntrinsicElements.includes(
      type as keyof JSX.StateObserverElements<StateId, EventId>
    )
  ) {
    return setupStateObserverElement(
      type as keyof JSX.StateObserverElements<StateId, EventId>,
      props as JSX.StateObserverElements<
        StateId,
        EventId
      >[keyof JSX.StateObserverElements<StateId, EventId>]
    );
  }
  return setupGameObject(type, props);
}

export function jsxs(
  type: string | Function,
  props: any
): Phaser.GameObjects.GameObject {
  return jsx(type, props);
}

export function Fragment({ children }: { children: any[] }) {
  return children;
}
