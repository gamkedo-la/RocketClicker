import { describe, expect, it, vi } from "vitest";

import { signal } from "@game/core/signals/signals";
import { FiniteStateMachine } from "@game/core/state-machine/state-machine";

describe("FiniteStateMachine", () => {
  it("should transition between states with valid event", () => {
    const fsm: FiniteStateMachine<"A" | "B", "NEXT"> = (
      <stateMachine initialState="A">
        <state id="A">
          <transition event="NEXT" target="B" />
        </state>
        <state id="B" />
      </stateMachine>
    );

    expect(fsm.current.get()).toBe("A");
    expect(fsm.transition("NEXT")).toBe(true);
    expect(fsm.current.get()).toBe("B");
    expect(fsm.previous.get()).toBe("A");
  });

  it("should respect guard conditions", () => {
    const guard = vi.fn().mockReturnValue(false);
    const fsm: FiniteStateMachine<"A" | "B", "NEXT"> = (
      <stateMachine initialState="A">
        <state id="A">
          <transition event="NEXT" target="B" guard={guard} />
        </state>
        <state id="B" />
      </stateMachine>
    );

    expect(fsm.transition("NEXT")).toBe(false);
    expect(fsm.current.get()).toBe("A");
    expect(guard).toHaveBeenCalled();

    guard.mockReturnValue(true);
    expect(fsm.transition("NEXT")).toBe(true);
    expect(fsm.current.get()).toBe("B");
  });

  /**
   * TODO: I removed this from the FSM, because I'm not sure if it'll be useful and seems a bit of a hassle to make
   *
  it.only("should track available events", () => {
    const enabled = signal(false);
    const fsm: FiniteStateMachine<"A" | "B", "NEXT" | "OTHER"> = (
      <stateMachine initialState="A">
        <state id="A">
          <transition event="NEXT" target="B" guard={() => enabled.get()} />
          <transition event="OTHER" target="A" />
        </state>
        <state id="B" />
      </stateMachine>
    );

    // Initial state with disabled NEXT transition
    expect(fsm.events.get()).toEqual(["OTHER"]);

    // Enable NEXT transition
    enabled.set(true);
    expect(fsm.events.get()).toEqual(["NEXT", "OTHER"]);
  });
  /**/

  it("should trigger state observers", () => {
    const onEnterA = vi.fn();
    const onExitA = vi.fn();
    const onEventNext = vi.fn();

    const fsm: FiniteStateMachine<"A" | "B", "NEXT"> = (
      <stateMachine initialState="A">
        <state id="A">
          <transition event="NEXT" target="B" />
        </state>
        <state id="B" />
      </stateMachine>
    );

    <stateObserver fsm={fsm}>
      <onExit state="A" run={onExitA} />
      <onEnter state="B" run={onEnterA} />
      <onEvent event="NEXT" run={onEventNext} />
    </stateObserver>;

    fsm.transition("NEXT");

    expect(onExitA).toHaveBeenCalledWith({
      previous: "A",
      current: "B",
      event: "NEXT",
      type: "exit",
      fsm,
    });
    expect(onEnterA).toHaveBeenCalledWith({
      previous: "A",
      current: "B",
      event: "NEXT",
      type: "enter",
      fsm,
    });
    expect(onEventNext).toHaveBeenCalledWith({
      previous: "A",
      current: "B",
      event: "NEXT",
      type: "event",
      fsm,
    });
  });

  it("should handle multiple transitions", () => {
    const fsm: FiniteStateMachine<"A" | "B" | "C", "NEXT"> = (
      <stateMachine initialState="A">
        <state id="A">
          <transition event="NEXT" target="B" />
        </state>
        <state id="B">
          <transition event="NEXT" target="C" />
        </state>
        <state id="C" />
      </stateMachine>
    );

    fsm.transition("NEXT");
    expect(fsm.current.get()).toBe("B");

    fsm.transition("NEXT");
    expect(fsm.current.get()).toBe("C");

    fsm.transition("NEXT"); // No transition defined
    expect(fsm.current.get()).toBe("C");
  });

  it("should handle invalid transitions", () => {
    const fsm: FiniteStateMachine<"A" | "B", "NEXT"> = (
      <stateMachine initialState="A">
        <state id="A">
          <transition event="NEXT" target="B" />
        </state>
        <state id="B" />
      </stateMachine>
    );

    expect(fsm.transition("INVALID" as any)).toBe(false);
    expect(fsm.current.get()).toBe("A");
  });

  it("should track transition history", () => {
    const fsm: FiniteStateMachine<"A" | "B" | "C", "NEXT"> = (
      <stateMachine initialState="A">
        <state id="A">
          <transition event="NEXT" target="B" />
        </state>
        <state id="B">
          <transition event="NEXT" target="C" />
        </state>
        <state id="C" />
      </stateMachine>
    );

    fsm.transition("NEXT");
    expect(fsm.previous.get()).toBe("A");
    expect(fsm.lastEvent.get()).toBe("NEXT");

    fsm.transition("NEXT");
    expect(fsm.previous.get()).toBe("B");
    expect(fsm.lastEvent.get()).toBe("NEXT");
  });

  it("should handle onEvent observers", () => {
    const onEventNext = vi.fn();

    const fsm: FiniteStateMachine<"A" | "B", "NEXT"> = (
      <stateMachine initialState="A">
        <state id="A">
          <transition event="NEXT" target="B" />
        </state>
        <state id="B">
          <transition event="NEXT" target="C" />
        </state>
        <state id="C" />
      </stateMachine>
    );

    <stateObserver fsm={fsm}>
      <onEvent event="NEXT" run={onEventNext} />
    </stateObserver>;

    fsm.transition("NEXT");
    expect(onEventNext).toHaveBeenCalledWith({
      previous: "A",
      current: "B",
      event: "NEXT",
      type: "event",
      fsm,
    });

    fsm.transition("NEXT");
    expect(onEventNext).toHaveBeenCalledWith({
      previous: "B",
      current: "C",
      event: "NEXT",
      type: "event",
      fsm,
    });
  });

  it("should handle onTransition observers", () => {
    const onTransitionAB = vi.fn();
    const onTransitionBC = vi.fn();

    const fsm: FiniteStateMachine<"A" | "B" | "C", "NEXT"> = (
      <stateMachine initialState="A">
        <state id="A">
          <transition event="NEXT" target="B" />
        </state>
        <state id="B">
          <transition event="NEXT" target="C" />
        </state>
        <state id="C" />
      </stateMachine>
    );

    <stateObserver fsm={fsm}>
      <onTransition from="A" to="B" run={onTransitionAB} />
      <onTransition from="B" to="C" run={onTransitionBC} />
    </stateObserver>;

    fsm.transition("NEXT");
    expect(onTransitionAB).toHaveBeenCalledWith({
      previous: "A",
      current: "B",
      event: "NEXT",
      type: "transition",
      fsm,
    });

    fsm.transition("NEXT");
    expect(onTransitionBC).toHaveBeenCalledWith({
      previous: "B",
      current: "C",
      event: "NEXT",
      type: "transition",
      fsm,
    });
  });

  it("should throw error for duplicate state IDs", () => {
    expect(() => {
      <stateMachine initialState="A">
        <state id="A" />
        <state id="A" />
      </stateMachine>;
    }).toThrow("State A already exists");
  });

  it("should handle complex guard conditions", () => {
    const condition = signal(false);
    const fsm: FiniteStateMachine<"A" | "B", "NEXT"> = (
      <stateMachine initialState="A">
        <state id="A">
          <transition event="NEXT" target="B" guard={() => condition.get()} />
        </state>
        <state id="B" />
      </stateMachine>
    );

    // Initial attempt with false condition
    expect(fsm.transition("NEXT")).toBe(false);

    // Update condition
    condition.set(true);
    expect(fsm.transition("NEXT")).toBe(true);
  });
});
