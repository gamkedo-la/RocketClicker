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
    mm.update(1);
    expect(mm.current.get()).toBe("running");
    expect(mm.transition("STOP")).toBe(true);
    mm.update(1);
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
  beforeEach(() => {
    (window as any).currentScene = {
      addMotionMachine: vi.fn(),
      tweens: {
        add: vi.fn(),
      },
    };
  });

  it("should handle basic nested state", () => {
    type States = "hidden" | "visible.info" | "visible.form";
    type Events = "SHOW" | "SHOW_FORM" | "SHOW_INFO" | "HIDE";

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="hidden">
        <state id="hidden">
          <transition on="SHOW" target="visible.info" />
        </state>
        <state id="visible">
          <state id="info" />
        </state>
      </motionMachine>
    );

    // Show dialog in info state
    mm.transition("SHOW");
    mm.update(16);
    expect(mm.current.get()).toBe("visible.info");
  });

  it("should handle nested states with animations", () => {
    const dialogAlpha = signal(0);
    const infoAlpha = signal(0);
    const formAlpha = signal(0);

    type States = "hidden" | "visible.info" | "visible.form";
    type Events = "SHOW" | "SHOW_FORM" | "SHOW_INFO" | "HIDE";

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="hidden">
        <state id="hidden">
          <animation on="exit">
            <tween signal={dialogAlpha} to={0.5} duration={50} />
          </animation>
          <transition on="SHOW" target="visible.info" />
        </state>
        <state id="visible">
          <animation on="enter">
            <tween signal={dialogAlpha} to={1} duration={100} />
          </animation>
          <animation on="exit">
            <tween signal={dialogAlpha} to={0} duration={100} />
          </animation>

          <state id="info">
            <animation on="enter">
              <tween signal={infoAlpha} to={1} duration={50} />
            </animation>
            <animation on="exit">
              <tween signal={infoAlpha} to={0} duration={50} />
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

    // Hidden exit + Dialog fade in + Info fade in should happen in sequence
    mm.update(50);
    expect(dialogAlpha.get()).toBe(0.5); // Hidden exit complete
    expect(infoAlpha.get()).toBe(0);

    mm.update(50);
    expect(dialogAlpha.get()).toBe(0.75); // Dialog halfway
    expect(infoAlpha.get()).toBe(0);

    mm.update(50);
    expect(dialogAlpha.get()).toBe(1); // Dialog complete
    expect(infoAlpha.get()).toBe(0); // Info did not start

    mm.update(50);
    expect(dialogAlpha.get()).toBe(1);
    expect(infoAlpha.get()).toBe(1); // Info complete

    // Switch to form
    mm.transition("SHOW_FORM");

    // Info exit + Form enter should happen in sequence
    mm.update(25);
    expect(infoAlpha.get()).toBe(0.5); // Info exit halfway
    expect(formAlpha.get()).toBe(0);

    mm.update(25);
    expect(infoAlpha.get()).toBe(0); // Info exit complete
    expect(formAlpha.get()).toBe(0);

    mm.update(25);
    expect(infoAlpha.get()).toBe(0);
    expect(formAlpha.get()).toBe(0.5); // Form enter halfway

    mm.update(25);
    expect(infoAlpha.get()).toBe(0);
    expect(formAlpha.get()).toBe(1); // Form enter complete

    /* TODO: trying to transition before we're done
    // probably it's just a matter of enqueuing the transition, not cleaning it
    // Hide dialog
    mm.transition("HIDE");

    // Form exit + Dialog exit should happen in sequence
    mm.update(25);
    expect(formAlpha.get()).toBe(0.5); // Form exit halfway
    expect(dialogAlpha.get()).toBe(1);

    mm.update(25);
    expect(formAlpha.get()).toBe(0); // Form exit complete
    expect(dialogAlpha.get()).toBe(1);

    mm.update(50);
    expect(formAlpha.get()).toBe(0);
    expect(dialogAlpha.get()).toBe(0.5); // Dialog exit halfway

    mm.update(50);
    expect(formAlpha.get()).toBe(0);
    expect(dialogAlpha.get()).toBe(0); // Dialog exit complete
    */
  });

  it("should handle deeply nested states", () => {
    const level1 = signal(0);
    const level2 = signal(0);
    const level3 = signal(0);

    type States = "a" | "b.x" | "b.y.deep";
    type Events = "NEXT" | "DEEPER" | "BACK";

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="a">
        <state id="a">
          <animation on="exit">
            <tween signal={level1} to={1} duration={50} />
          </animation>
          <transition on="NEXT" target="b.x" />
        </state>
        <state id="b">
          <animation on="enter">
            <tween signal={level2} to={1} duration={50} />
          </animation>
          <animation on="exit">
            <tween signal={level2} to={0} duration={50} />
          </animation>

          <state id="x">
            <transition on="DEEPER" target="b.y.deep" />
          </state>

          <state id="y">
            <state id="deep">
              <animation on="enter">
                <tween signal={level3} to={1} duration={50} />
              </animation>
              <animation on="exit">
                <tween signal={level3} to={0} duration={50} />
              </animation>
              <transition on="BACK" target="b.x" />
            </state>
          </state>
        </state>
      </motionMachine>
    );

    // Transition to first nested state
    mm.transition("NEXT");

    // Level 1 exit + Level 2 enter should happen in sequence
    mm.update(50);
    expect(level1.get()).toBe(1); // Level 1 exit complete
    expect(level2.get()).toBe(0);

    mm.update(50);
    expect(level1.get()).toBe(1);
    expect(level2.get()).toBe(1); // Level 2 enter complete

    // Go deeper
    mm.transition("DEEPER");

    // Level 3 enter
    mm.update(50);
    expect(level2.get()).toBe(1);
    expect(level3.get()).toBe(1);

    // Go back
    mm.transition("BACK");

    // Level 3 exit
    mm.update(50);
    expect(level2.get()).toBe(1);
    expect(level3.get()).toBe(0);
  });

  it("should handle parallel animations in nested states", () => {
    const parent = signal(0);
    const child = signal(0);

    type States = "a" | "b.x" | "b.y";
    type Events = "NEXT" | "SWITCH";

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="a">
        <state id="a">
          <transition on="NEXT" target="b.x" />
        </state>
        <state id="b">
          <animation on="enter">
            <parallel>
              <tween signal={parent} to={1} duration={100} />
              <sequence>
                <wait duration={50} />
                <tween signal={child} to={1} duration={50} />
              </sequence>
            </parallel>
          </animation>

          <state id="x">
            <transition on="SWITCH" target="b.y" />
          </state>

          <state id="y" />
        </state>
      </motionMachine>
    );

    // Transition to nested state
    mm.transition("NEXT");

    // Parent animation starts immediately, child waits
    mm.update(25);
    expect(parent.get()).toBe(0.25);
    expect(child.get()).toBe(0);

    mm.update(25);
    expect(parent.get()).toBe(0.5);
    expect(child.get()).toBe(0);

    // Child animation starts
    mm.update(25);
    expect(parent.get()).toBe(0.75);
    expect(child.get()).toBe(0.5);

    mm.update(25);
    expect(parent.get()).toBe(1);
    expect(child.get()).toBe(1);

    // Switch between sibling states (should not re-run parent animations)
    mm.transition("SWITCH");
    mm.update(50);
    expect(parent.get()).toBe(1); // Parent stays at final value
    expect(child.get()).toBe(1); // Child stays at final value
  });

  it("should handle re-entering nested states", () => {
    const parent = signal(0);
    const child = signal(0);

    type States = "a" | "b.x" | "b.y";
    type Events = "ENTER" | "SWITCH" | "EXIT";

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="a">
        <state id="a">
          <transition on="ENTER" target="b.x" />
        </state>
        <state id="b">
          <animation on="enter">
            <tween signal={parent} to={1} duration={50} />
          </animation>
          <animation on="exit">
            <tween signal={parent} to={0} duration={50} />
          </animation>

          <state id="x">
            <animation on="enter">
              <tween signal={child} to={1} duration={50} />
            </animation>
            <animation on="exit">
              <tween signal={child} to={0} duration={50} />
            </animation>
            <transition on="SWITCH" target="b.y" />
          </state>

          <state id="y">
            <transition on="EXIT" target="a" />
            <transition on="ENTER" target="b.x" />
          </state>
        </state>
      </motionMachine>
    );

    // Enter nested state
    mm.transition("ENTER");
    mm.update(50);
    mm.update(50);
    expect(parent.get()).toBe(1);
    expect(child.get()).toBe(1);

    // Switch to sibling
    mm.transition("SWITCH");
    mm.update(50);
    expect(parent.get()).toBe(1); // Parent unchanged
    expect(child.get()).toBe(0); // Child resets

    // Exit to root
    mm.transition("EXIT");
    mm.update(50);
    expect(parent.get()).toBe(0);
    expect(child.get()).toBe(0);

    // Re-enter nested state
    mm.transition("ENTER");
    mm.update(50);
    mm.update(50);
    expect(parent.get()).toBe(1);
    expect(child.get()).toBe(1);
  });

  it("should handle nested state parent transitions", () => {
    const parent = signal(0);

    type States = "a" | "b.x" | "b.y";
    type Events = "NEXT" | "SWITCH";

    const mm: MotionMachine<States, Events> = (
      <motionMachine initialState="a">
        <state id="a">
          <animation on="exit">
            <tween signal={parent} to={0} duration={100} />
          </animation>
          <transition on="NEXT" target="b.x" />
        </state>
        <state id="b">
          <animation on="enter">
            <tween signal={parent} to={1} duration={100} />
          </animation>
          <state id="x">
            <animation on="enter">
              <tween signal={parent} to={1} duration={100} />
            </animation>
            <animation on="exit">
              <tween signal={parent} to={0} duration={100} />
            </animation>
            <transition on="SWITCH" target="b" />
          </state>
        </state>
      </motionMachine>
    );

    mm.transition("NEXT");
    mm.update(200);
    expect(mm.current.get()).toBe("b.x");

    mm.transition("SWITCH");
    mm.update(100);
    expect(mm.current.get()).toBe("b");
  });
});
