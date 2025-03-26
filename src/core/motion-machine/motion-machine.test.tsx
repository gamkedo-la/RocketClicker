import { describe, expect, it, vi, beforeEach } from "vitest";
import { signal } from "@game/core/signals/signals";
import { MotionMachine } from "./motion-machine";

describe("MotionMachine", () => {
  // Mock window.currentScene
  beforeEach(() => {
    (window as any).currentScene = {
      addMotionMachine: vi.fn(),
      tweens: {
        add: vi.fn(),
      },
    };
  });

  it("should handle basic state transitions", () => {
    const mm: MotionMachine<"idle" | "running", "START" | "STOP"> = (
      <motionMachine initialState="idle">
        <state id="idle">
          <transition on="START" target="running" />
        </state>
        <state id="running">
          <transition on="STOP" target="idle" />
        </state>
      </motionMachine>
    );

    expect(mm.current.get()).toBe("idle");
    expect(mm.transition("START")).toBe(true);
    expect(mm.current.get()).toBe("running");
    expect(mm.transition("STOP")).toBe(true);
    expect(mm.current.get()).toBe("idle");
  });

  it("should execute enter animations when entering a state", () => {
    const alpha = signal(0);
    const scale = signal(1);

    const mm: MotionMachine<"hidden" | "visible", "SHOW"> = (
      <motionMachine initialState="hidden">
        <state id="hidden">
          <transition on="SHOW" target="visible" />
        </state>
        <state id="visible">
          <animation on="enter">
            <parallel>
              <tween signal={alpha} to={1} duration={100} />
              <tween signal={scale} to={1.2} duration={200} />
            </parallel>
          </animation>
        </state>
      </motionMachine>
    );

    // Initial state
    expect(alpha.get()).toBe(0);
    expect(scale.get()).toBe(1);

    mm.transition("SHOW");

    // Half-way through first tween
    mm.update(50);
    expect(alpha.get()).toBe(0.5);
    expect(scale.get()).toBe(1.05);

    // First tween complete, second still going
    mm.update(50);
    expect(alpha.get()).toBe(1);
    expect(scale.get()).toBe(1.1);

    // All complete
    mm.update(100);
    expect(alpha.get()).toBe(1);
    expect(scale.get()).toBe(1.2);
  });

  it("should execute exit animations before transitioning", () => {
    const alpha = signal(1);
    const scale = signal(1);

    const mm: MotionMachine<"visible" | "hidden", "HIDE"> = (
      <motionMachine initialState="visible">
        <state id="visible">
          <animation on="exit">
            <parallel>
              <tween signal={alpha} to={0} duration={100} />
              <tween signal={scale} to={0.8} duration={100} />
            </parallel>
          </animation>
          <transition on="HIDE" target="hidden" />
        </state>
        <state id="hidden" />
      </motionMachine>
    );

    // Start transition
    mm.transition("HIDE");

    // Should still be in 'visible' state until exit animation completes
    expect(mm.current.get()).toBe("visible");

    // Half-way through exit animation
    mm.update(50);
    expect(mm.current.get()).toBe("visible");
    expect(alpha.get()).toBe(0.5);
    expect(scale.get()).toBe(0.9);

    // Complete exit animation
    mm.update(50);

    // Should now be in hidden state
    expect(mm.current.get()).toBe("hidden");
    expect(alpha.get()).toBe(0);
    expect(scale.get()).toBe(0.8);
  });

  it("should handle active animations that loop indefinitely", () => {
    const rotation = signal(0);

    const mm: MotionMachine<"spinning" | "idle", "STOP"> = (
      <motionMachine initialState="spinning">
        <state id="spinning">
          <animation on="active">
            <repeat times={-1}>
              <tween signal={rotation} from={0} to={360} duration={1000} />
            </repeat>
          </animation>
          <transition on="STOP" target="idle" />
        </state>
        <state id="idle" />
      </motionMachine>
    );

    // Should start rotating
    mm.update(250);
    expect(rotation.get()).toBe(90);

    mm.update(250);
    expect(rotation.get()).toBe(180);

    // Should keep rotating past 360
    mm.update(500);
    expect(rotation.get()).toBe(0);
    mm.update(500);
    expect(rotation.get()).toBe(180);

    // Should stop when transitioning
    mm.transition("STOP");
    mm.update(250);
    expect(rotation.get()).toBe(180); // Should remain at last value
  });

  it("should handle transitions during animations", () => {
    const alpha = signal(1);

    type States = "a" | "b" | "c";
    type Events = "NEXT";

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="a">
        <state id="a">
          <animation on="exit">
            <tween signal={alpha} to={0} duration={100} />
          </animation>
          <transition on="NEXT" target="b" />
        </state>
        <state id="b">
          <animation on="enter">
            <tween signal={alpha} to={1} duration={100} />
          </animation>
          <transition on="NEXT" target="c" />
        </state>
        <state id="c" />
      </motionMachine>
    );

    // Start first transition
    mm.transition("NEXT");

    // Half-way through exit animation
    mm.update(50);
    expect(mm.current.get()).toBe("a");
    expect(alpha.get()).toBe(0.5);

    // Try to transition again (should be ignored until current transition completes)
    // TODO: mm.transition("NEXT");
    expect(mm.current.get()).toBe("a");

    // Complete exit animation and start enter animation
    mm.update(50);
    expect(mm.current.get()).toBe("b");
    expect(alpha.get()).toBe(0);

    mm.update(50);
    expect(alpha.get()).toBe(0.5);

    mm.update(50);
    expect(alpha.get()).toBe(1);
  });

  it("should handle large time steps gracefully", () => {
    const alpha = signal(0);
    const scale = signal(1);

    type States = "a" | "b";
    type Events = "NEXT";

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="a">
        <state id="a">
          <animation on="exit">
            <sequence>
              <tween signal={alpha} to={0} duration={100} />
              <tween signal={scale} to={0.8} duration={100} />
            </sequence>
          </animation>
          <transition on="NEXT" target="b" />
        </state>
        <state id="b" />
      </motionMachine>
    );

    // Start transition
    mm.transition("NEXT");

    // Update with a time step larger than both animations combined
    mm.update(300);

    // Both animations should have completed properly
    expect(alpha.get()).toBe(0);
    expect(scale.get()).toBe(0.8);
    expect(mm.current.get()).toBe("b");
  });

  it("should handle state re-entry correctly", () => {
    const count = signal(0);

    type States = "a";
    type Events = "RESET";

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="a">
        <state id="a">
          <animation on="enter">
            <tween signal={count} to={1} duration={100} />
          </animation>
          <animation on="exit">
            <tween signal={count} to={0} duration={100} />
          </animation>
          <transition on="RESET" target="a" />
        </state>
      </motionMachine>
    );

    // Initial enter animation
    mm.update(100);
    expect(count.get()).toBe(1);

    // Transition to self
    mm.transition("RESET");

    // Exit animation
    mm.update(100);
    expect(count.get()).toBe(0);

    // Re-enter animation
    mm.update(100);
    expect(count.get()).toBe(1);
  });

  it("should cleanup completed non-looping animations", () => {
    const alpha = signal(0);

    type States = "visible";
    type Events = never;

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="visible">
        <state id="visible">
          <animation>
            <tween signal={alpha} to={1} duration={100} />
          </animation>
        </state>
      </motionMachine>
    );

    // Complete the animation
    mm.update(100);
    expect(alpha.get()).toBe(1);

    // Animation should be removed from active animations
    const currentAnimations = (mm as any).currentAnimations;
    expect(currentAnimations.length).toBe(0);
  });

  it("should handle parallel animations with different durations", () => {
    const x = signal(0);
    const y = signal(0);
    const scale = signal(1);

    type States = "animating";
    type Events = never;

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="animating">
        <state id="animating">
          <animation>
            <parallel>
              <tween signal={x} to={100} duration={100} />
              <tween signal={y} to={100} duration={200} />
              <tween signal={scale} to={2} duration={300} />
            </parallel>
          </animation>
        </state>
      </motionMachine>
    );

    // Update to complete first animation
    mm.update(100);
    expect(x.get()).toBe(100);
    expect(y.get()).toBe(50);
    expect(scale.get()).toBe(1 + 1 / 3);

    // Update to complete second animation
    mm.update(100);
    expect(x.get()).toBe(100);
    expect(y.get()).toBe(100);
    expect(scale.get()).toBe(1 + 2 / 3);

    // Update to complete third animation
    mm.update(100);
    expect(x.get()).toBe(100);
    expect(y.get()).toBe(100);
    expect(scale.get()).toBe(2);
  });
});

describe("Nested MotionMachine", () => {
  it("should handle nested states with animations", () => {
    const dialogAlpha = signal(0);
    const infoAlpha = signal(0);
    const formAlpha = signal(0);

    type States = "hidden" | "visible.info" | "visible.form";
    type Events = "SHOW" | "SHOW_FORM" | "SHOW_INFO" | "HIDE";

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="hidden">
        <state id="hidden">
          <transition on="SHOW" target="visible.info" />
        </state>
        <state id="visible">
          <animation on="enter">
            <tween signal={dialogAlpha} to={1} duration={100} />
          </animation>

          <state id="info">
            <animation on="enter">
              <tween signal={infoAlpha} to={1} duration={50} />
            </animation>
            <transition on="SHOW_FORM" target="visible.form" />
          </state>

          <state id="form">
            <animation on="enter">
              <tween signal={formAlpha} to={1} duration={50} />
            </animation>
            <animation on="exit">
              <tween signal={formAlpha} to={0} duration={50} />
            </animation>
            <transition on="SHOW_INFO" target="visible.info" />
          </state>

          <transition on="HIDE" target="hidden" />
        </state>
      </motionMachine>
    );

    // Show dialog in info state
    mm.transition("SHOW");

    // Dialog fade in
    mm.update(50);
    expect(dialogAlpha.get()).toBe(0.5);
    expect(infoAlpha.get()).toBe(0.5);

    mm.update(50);
    expect(dialogAlpha.get()).toBe(1);
    expect(infoAlpha.get()).toBe(1);

    // Switch to form
    mm.transition("SHOW_FORM");

    // Form fade in, info should be hidden
    mm.update(25);
    expect(formAlpha.get()).toBe(0.5);
    expect(infoAlpha.get()).toBe(1); // Info hasn't started exit animation yet

    mm.update(25);
    expect(formAlpha.get()).toBe(1);
    expect(infoAlpha.get()).toBe(1);
  });
});
