import { describe, it, expect } from "vitest";
import { AnimationPlan, linear } from "./animation-timed";
import { signal } from "@game/state/lib/signals";
import { vi } from "vitest";

describe("interpolate", () => {
  it.each([
    { start: 0, end: 100, progress: 0, expected: 0 },
    { start: 0, end: 100, progress: 1, expected: 100 },
    { start: 0, end: 100, progress: 0.5, expected: 50 },
    { start: 100, end: 50, progress: 0.5, expected: 75 },
    { start: 0, end: 100, progress: 1.5, expected: 150 },
    { start: 0, end: 100, progress: -0.5, expected: -50 },
    { start: 10, end: 20, progress: 0.3, expected: 13 },
    { start: -100, end: 100, progress: 0.5, expected: 0 },
  ])(
    "should interpolate $start to $end at $progress => $expected",
    ({ start, end, progress, expected }) => {
      expect(linear(start, end, progress)).toBe(expected);
    }
  );
});

describe("AnimationEngine", () => {
  it("should correctly interpolate between two numbers", () => {
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <tween signal={x} from={0} to={100} duration={1000} />
      </animation>
    );

    engine.update(1000);

    expect(engine.clock).toBe(1000);
    expect(x.get()).toBe(100);
  });

  it("should correctly interpolate between three numbers", () => {
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <tween signal={x} from={0} to={100} duration={1000} />
        <tween signal={x} from={100} to={200} duration={1000} />
      </animation>
    );

    engine.update(1000);

    expect(engine.clock).toBe(1000);
    expect(x.get()).toBe(100);

    engine.update(1000);

    expect(engine.clock).toBe(2000);
    expect(x.get()).toBe(200);
  });

  it("should interpolate between three numbers and care about overshots", () => {
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <tween signal={x} from={0} to={100} duration={1000} />
        <tween signal={x} from={100} to={200} duration={1000} />
      </animation>
    );

    engine.update(1005);

    expect(engine.clock).toBe(1005);
    expect(x.get()).toBe(100.5);

    engine.update(500);
    engine.update(495);

    expect(engine.clock).toBe(2000);
    expect(x.get()).toBe(200);
  });

  it("should not skip overshoot steps", () => {
    const x = signal(0);
    const y = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <tween signal={x} from={0} to={100} duration={1000} />
        <tween signal={y} from={0} to={100} duration={10} />
        <tween signal={x} from={100} to={200} duration={1000} />
      </animation>
    );

    engine.update(1110);

    expect(engine.clock).toBe(1110);
    expect(x.get()).toBe(110);
    expect(y.get()).toBe(100);
  });

  it("should handle sequences", () => {
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <sequence>
          <tween signal={x} from={0} to={100} duration={1000} />
          <tween signal={x} from={100} to={200} duration={1000} />
        </sequence>
      </animation>
    );

    engine.update(1000);

    expect(engine.clock).toBe(1000);
    expect(x.get()).toBe(100);

    engine.update(1000);

    expect(engine.clock).toBe(2000);
    expect(x.get()).toBe(200);
  });

  it("should handle parallel animations", () => {
    const x = signal(0);
    const y = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <parallel>
          <tween signal={x} from={0} to={100} duration={1000} />
          <tween signal={y} from={0} to={200} duration={2000} />
        </parallel>
      </animation>
    );

    // Halfway through first tween
    engine.update(500);
    expect(x.get()).toBe(50);
    expect(y.get()).toBe(50);

    // End of first tween
    engine.update(500);
    expect(x.get()).toBe(100);
    expect(y.get()).toBe(100);

    // Beyond first tween duration
    engine.update(1000);
    expect(x.get()).toBe(100); // Should stay at final value
    expect(y.get()).toBe(200); // Should complete
  });

  it("should handle nested sequences and parallels", () => {
    const x = signal(0);
    const y = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <sequence>
          <parallel>
            <tween signal={x} from={0} to={100} duration={1000} />
            <tween signal={y} from={0} to={50} duration={500} />
          </parallel>
          <tween signal={x} from={100} to={200} duration={1000} />
        </sequence>
      </animation>
    );

    // First 500ms of parallel
    engine.update(500);
    expect(x.get()).toBe(50);
    expect(y.get()).toBe(50); // Should have completed

    // Finish parallel
    engine.update(500);
    expect(x.get()).toBe(100);
    expect(y.get()).toBe(50);

    // First half of second tween
    engine.update(500);
    expect(x.get()).toBe(150);
  });

  it("should handle empty durations gracefully", () => {
    const x = signal(0);
    const engine: AnimationPlan = (
      <animation>
        <tween signal={x} from={0} to={100} duration={0} />
      </animation>
    );

    engine.update(1000);
    expect(x.get()).toBe(100); // Should jump immediately
  });

  it("should handle empty sequence durations gracefully", () => {
    const x = signal(0);
    const y = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <sequence>
          <tween signal={x} from={0} to={100} duration={0} />
          <tween signal={y} from={0} to={100} duration={0} />
        </sequence>
      </animation>
    );

    engine.update(1000);
    expect(x.get()).toBe(100); // Should jump immediately
    expect(y.get()).toBe(100); // Should jump immediately
  });

  it("should handle empty parallel durations gracefully", () => {
    const x = signal(0);
    const y = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <parallel>
          <tween signal={x} from={0} to={100} duration={0} />
          <tween signal={y} from={0} to={100} duration={0} />
        </parallel>
      </animation>
    );

    engine.update(1000);
    expect(x.get()).toBe(100); // Should jump immediately
    expect(y.get()).toBe(100); // Should jump immediately
  });

  it("should handle complex nested structures", () => {
    const a = signal(0);
    const b = signal(0);
    const c = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <sequence>
          <parallel>
            <sequence>
              <tween signal={a} from={0} to={100} duration={500} />
              <tween signal={a} from={100} to={200} duration={500} />
            </sequence>
            <tween signal={b} from={0} to={100} duration={1000} />
          </parallel>
          <tween signal={c} from={0} to={100} duration={500} />
        </sequence>
      </animation>
    );

    // At 250ms
    engine.update(250);
    expect(a.get()).toBe(50); // First sequence step
    expect(b.get()).toBe(25); // Parallel tween
    expect(c.get()).toBe(0); // Not started yet

    // At 750ms
    engine.update(500);
    expect(a.get()).toBe(150); // Second sequence step
    expect(b.get()).toBe(75);
    expect(c.get()).toBe(0);

    // At 1250ms
    engine.update(500);
    expect(a.get()).toBe(200); // Sequence complete
    expect(b.get()).toBe(100); // Parallel complete
    expect(c.get()).toBe(50); // Second sequence step started

    // Finish animation
    engine.update(500);
    expect(c.get()).toBe(100);
  });

  it("should handle wait elements", () => {
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <tween signal={x} from={0} to={100} duration={500} />
        <wait duration={500} />
        <tween signal={x} from={100} to={200} duration={500} />
      </animation>
    );

    engine.update(500);
    expect(x.get()).toBe(100);

    engine.update(500); // During wait
    expect(x.get()).toBe(100);

    engine.update(500); // Second tween
    expect(x.get()).toBe(200);
  });

  it("should handle finite repeats", () => {
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <repeat times={2}>
          <tween signal={x} from={0} to={100} duration={1000} />
        </repeat>
      </animation>
    );

    engine.update(1500);
    expect(x.get()).toBe(50);

    engine.update(500);
    expect(x.get()).toBe(100);
  });

  it("should handle finite repeats with multiple children", () => {
    const x = signal(0);
    const y = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <repeat times={2}>
          <tween signal={x} from={0} to={100} duration={1000} />
          <tween signal={y} from={0} to={100} duration={1000} />
        </repeat>
      </animation>
    );

    engine.update(1500);
    expect(x.get()).toBe(100);
    expect(y.get()).toBe(50);

    engine.update(500);
    expect(x.get()).toBe(0);
    expect(y.get()).toBe(100);

    engine.update(500);
    expect(x.get()).toBe(50);
    expect(y.get()).toBe(100);

    engine.update(1500);
    expect(x.get()).toBe(100);
    expect(y.get()).toBe(100);
  });

  it("should handle infinite repeats", () => {
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <repeat times={-1}>
          <tween signal={x} from={0} to={100} duration={1000} />
        </repeat>
      </animation>
    );

    engine.update(2500);
    expect(x.get()).toBe(50);
  });

  it("should handle zero-duration repeats", () => {
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <repeat times={3}>
          <tween signal={x} to={100} duration={0} />
        </repeat>
      </animation>
    );

    expect(() => engine.update(1000));
  });

  it("should fail on infinite zero-duration repeats", () => {
    const x = signal(0);

    expect(() => (
      <animation>
        <repeat times={-1}>
          <tween signal={x} to={100} duration={0} />
        </repeat>
      </animation>
    )).toThrow();
  });

  it("should handle nested repeats", () => {
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <repeat times={2}>
          <repeat times={2}>
            <tween signal={x} from={0} to={10} duration={500} />
          </repeat>
        </repeat>
      </animation>
    );

    engine.update(400);
    expect(x.get()).toBe(8);
    engine.update(100);
    expect(x.get()).toBe(0);
    engine.update(100);
    expect(x.get()).toBe(2);
    engine.update(1400);
    expect(x.get()).toBe(10);
    engine.update(100);
    expect(x.get()).toBe(10);
  });

  it("should initialize nested controls", () => {
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <sequence>
          <repeat times={2}>
            <tween signal={x} from={0} to={100} duration={1000} />
          </repeat>
        </sequence>
      </animation>
    );

    engine.update(1500);
    expect(x.get()).toBe(50); // First repeat iteration complete
  });

  it("should execute step callbacks at correct times", () => {
    const x = signal(0);
    const stepCallback = vi.fn();

    const engine: AnimationPlan = (
      <animation>
        <sequence>
          <tween signal={x} from={0} to={100} duration={1000} />
          <step run={stepCallback} />
          <tween signal={x} from={100} to={200} duration={1000} />
        </sequence>
      </animation>
    );

    engine.update(500);
    expect(stepCallback).not.toHaveBeenCalled();

    engine.update(500); // Reaches 1000ms
    expect(stepCallback).toHaveBeenCalledOnce();
    expect(x.get()).toBe(100);

    engine.update(1000); // Completes second tween
    expect(stepCallback).toHaveBeenCalledOnce(); // Should still only be called once
    expect(x.get()).toBe(200);
  });

  it("should handle multiple steps in sequence", () => {
    const stepsCalled: number[] = [];
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <sequence>
          <step run={() => stepsCalled.push(1)} />
          <tween signal={x} from={0} to={100} duration={1000} />
          <step run={() => stepsCalled.push(2)} />
          <tween signal={x} from={100} to={200} duration={1000} />
          <step run={() => stepsCalled.push(3)} />
        </sequence>
      </animation>
    );

    engine.update(0); // Should execute first step immediately
    expect(stepsCalled).toEqual([1]);

    engine.update(1000); // Complete first tween and reach second step
    expect(stepsCalled).toEqual([1, 2]);

    engine.update(1000); // Complete second tween and reach third step
    expect(stepsCalled).toEqual([1, 2, 3]);
  });

  it("should execute steps even when jumping time", () => {
    const stepCallback = vi.fn();
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <sequence>
          <tween signal={x} from={0} to={100} duration={1000} />
          <step run={stepCallback} />
        </sequence>
      </animation>
    );

    engine.update(1500); // Jump past step time
    expect(stepCallback).toHaveBeenCalledOnce();
    expect(x.get()).toBe(100);
  });

  it("should handle steps in parallel blocks", () => {
    const parallelSteps: string[] = [];
    const x = signal(0);
    const y = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <parallel>
          <sequence>
            <tween signal={x} from={0} to={100} duration={1000} />
            <step run={() => parallelSteps.push("x")} />
          </sequence>
          <sequence>
            <tween signal={y} from={0} to={50} duration={500} />
            <step run={() => parallelSteps.push("y")} />
          </sequence>
        </parallel>
      </animation>
    );

    engine.update(500);
    expect(parallelSteps).toEqual(["y"]); // Y sequence completes first

    engine.update(500);
    expect(parallelSteps).toEqual(["y", "x"]); // X sequence completes
  });

  it.only("should handle steps in repeated blocks", () => {
    const stepsCalled: number[] = [];
    const x = signal(0);

    const engine: AnimationPlan = (
      <animation>
        <repeat times={2}>
          <tween signal={x} from={0} to={100} duration={1000} />
          <step run={() => stepsCalled.push(1)} />
        </repeat>
      </animation>
    );

    engine.update(1000);
    expect(stepsCalled).toEqual([1]);

    engine.update(1000);
    expect(stepsCalled).toEqual([1, 1]);
  });

  it("should throw when step has duration", () => {
    expect(() => (
      <animation>
        <step run={() => {}} duration={100} />
      </animation>
    )).toThrow("Step elements cannot have duration");
  });
});
