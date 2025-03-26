import { describe, expect, it } from "vitest";
import { signal } from "@game/core/signals/signals";
import { AnimationPlan } from "./animation-timed";

describe("AnimationPlan", () => {
  it("should reset all internal state variables", () => {
    const alpha = signal(0);
    const scale = signal(1);

    const plan: AnimationPlan = (
      <animation>
        <sequence>
          <tween signal={alpha} from={0} to={1} duration={100} />
          <tween signal={scale} from={1} to={2} duration={100} />
        </sequence>
      </animation>
    );

    // Run the animation partially
    plan.update(50);
    expect(plan.progress).toBe(0.25);
    expect(plan.currentStep).toBe(0);
    expect(plan.stepClock).toBe(0);
    expect(alpha.get()).toBe(0.5);
    expect(scale.get()).toBe(1);

    // Reset the animation
    plan.reset();

    // Check that all state variables are reset
    expect(plan.progress).toBe(0);
    expect(plan.currentStep).toBe(0);
    expect(plan.stepClock).toBe(0);
    expect(plan.clock).toBe(0);
    expect(plan.state).toBe("pristine");

    // Run the animation again
    plan.update(0);

    // Check that signals are reset to their initial values
    expect(alpha.get()).toBe(0);
    expect(scale.get()).toBe(1);
  });

  it("should reset nested animation states", () => {
    const alpha = signal(0);
    const scale = signal(1);

    const plan: AnimationPlan = (
      <animation>
        <sequence>
          <parallel>
            <tween signal={alpha} from={0} to={1} duration={100} />
            <tween signal={scale} from={1} to={2} duration={100} />
          </parallel>
        </sequence>
      </animation>
    );

    // Run the animation partially
    plan.update(50);
    expect(plan.progress).toBe(0.5);
    expect(alpha.get()).toBe(0.5);
    expect(scale.get()).toBe(1.5);

    // Reset the animation
    plan.reset();

    // Check that all state variables are reset
    expect(plan.progress).toBe(0);
    expect(plan.currentStep).toBe(0);
    expect(plan.stepClock).toBe(0);
    expect(plan.clock).toBe(0);
    expect(plan.state).toBe("pristine");

    // Run the animation again
    plan.update(0);

    // Check that signals are reset to their initial values
    expect(alpha.get()).toBe(0);
    expect(scale.get()).toBe(1);
  });

  it("should reset repeat animations", () => {
    const rotation = signal(0);

    const plan: AnimationPlan = (
      <animation>
        <repeat times={2}>
          <tween signal={rotation} from={0} to={360} duration={100} />
        </repeat>
      </animation>
    );

    // Run the animation partially
    plan.update(150);
    expect(plan.progress).toBe(0.75);
    expect(rotation.get()).toBe(180);

    // Reset the animation
    plan.reset();

    // Check that all state variables are reset
    expect(plan.progress).toBe(0);
    expect(plan.currentStep).toBe(0);
    expect(plan.stepClock).toBe(0);
    expect(plan.clock).toBe(0);
    expect(plan.state).toBe("pristine");

    // Run the animation again
    plan.update(0);

    // Check that signals are reset to their initial values
    expect(rotation.get()).toBe(0);
  });

  it("should reset step animations", () => {
    let triggered = false;
    const plan: AnimationPlan = (
      <animation>
        <step
          run={() => {
            triggered = true;
          }}
        />
      </animation>
    );

    // Run the animation
    plan.update(0);
    expect(triggered).toBe(true);

    // Reset the animation
    plan.reset();
    triggered = false;

    // Run the animation again
    plan.update(0);
    expect(triggered).toBe(true);
  });
});
