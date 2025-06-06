import {
  Cleanup,
  Effect,
  MutableSignal,
  Signal,
  SignalValue,
  Subscriber,
} from "@game/core/signals/types";

import { registerSignalForDebug, SignalDebugOptions } from "./debug-signals";

/**
 * Signal implementation
 *
 * This is a very rough and initial implementation of signals like in Solid.js
 * https://docs.solidjs.com/concepts/signals
 *
 * There is a lot of room for improvement in performance and optimizations.
 * Examples of optimizations:
 *
 * - Batching updates
 * - Version tracking to avoid unnecessary notifications
 * - Build time optimizations (like inlining simple signals)
 */

export class SignalImpl<T> implements Signal<T> {
  displayName: string;
  _value: T;
  computeFn?: () => T;

  subscribers: Set<Subscriber<T>> = new Set();
  dependencies: Set<SignalImpl<any>> = new Set();

  private disposed = false;
  private static currentComputation: SignalImpl<any> | null = null;
  private static computationStack: Set<SignalImpl<any>> = new Set();

  protected static updateStack: Set<SignalImpl<any>> = new Set();
  protected static updateDepth = 0;
  protected static MAX_UPDATE_DEPTH = 100; // Keep depth limit as fallback

  constructor(initialValueOrComputeFn: T | (() => T)) {
    if (typeof initialValueOrComputeFn === "function") {
      this.computeFn = initialValueOrComputeFn as () => T;
      this._value = this.computeValue();
    } else {
      this._value = initialValueOrComputeFn;
    }
  }

  //TODO: Maybe in the future we can have get and set with keys
  get(): T {
    if (this.disposed) {
      throw new Error("Cannot get value of disposed signal");
    }

    if (this.computeFn && SignalImpl.computationStack.has(this)) {
      throw new Error("Circular dependency detected during get");
    }

    // Track this signal as a dependency if we're inside a computation
    if (SignalImpl.currentComputation) {
      this.dependencies.add(SignalImpl.currentComputation);
    }

    return this._value;
  }

  set(newValue: T): void {
    if (this.disposed) {
      throw new Error("Cannot set value of disposed signal");
    }

    if (this.computeFn) {
      throw new Error("Cannot set value of a computed signal directly");
    }

    if (!Object.is(this._value, newValue)) {
      this._value = newValue;
      this.notify();
    }
  }

  update(fn: (value: T) => T): void {
    if (this.disposed) {
      throw new Error("Cannot update disposed signal");
    }

    this.set(fn(this._value));
  }

  subscribe(subscriber: Subscriber<T>): () => void {
    if (this.disposed) {
      throw new Error("Cannot subscribe to disposed signal");
    }

    this.subscribers.add(subscriber);
    // Call subscriber immediately with current value
    subscriber(this._value);

    return () => {
      if (!this.disposed) {
        this.subscribers.delete(subscriber);
      }
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Clear all subscribers
    this.subscribers.clear();

    // Remove this signal from all dependencies
    this.dependencies.forEach((dependency) => {
      dependency.dependencies.delete(this);
    });

    this.dependencies.clear();
  }

  protected getDebugInfo(): string {
    const name = this.displayName || "unnamed signal";
    const value =
      typeof this._value === "object"
        ? JSON.stringify(this._value)
        : String(this._value);
    const type = this.computeFn ? "computed" : "signal";
    return `[${type}:${name}] (current value: ${value})`;
  }

  protected static getUpdateStackTrace(): string {
    return Array.from(SignalImpl.updateStack)
      .map((signal) => signal.getDebugInfo())
      .join(" → ");
  }

  notify(): void {
    if (this.disposed) {
      return;
    }

    if (SignalImpl.updateStack.has(this)) {
      throw new Error(
        `Circular dependency detected during notify.\nSignal: ${this.getDebugInfo()}\nUpdate Stack: ${SignalImpl.getUpdateStackTrace()}`
      );
    }

    SignalImpl.updateDepth++;
    SignalImpl.updateStack.add(this);

    try {
      // Depth check
      if (SignalImpl.updateDepth > SignalImpl.MAX_UPDATE_DEPTH) {
        throw new Error(
          `Maximum update depth of ${
            SignalImpl.MAX_UPDATE_DEPTH
          } exceeded. Check for unintended recursion in signal updates.\nSignal: ${this.getDebugInfo()}\nUpdate Stack: ${SignalImpl.getUpdateStackTrace()}`
        );
      }

      // Notify computed signals that depend on this one
      this.dependencies.forEach((signal) => {
        if (!signal.disposed) {
          signal.recompute();
        }
      });

      // Notify direct subscribers
      this.subscribers.forEach((subscriber) => {
        try {
          subscriber(this._value);
        } catch (error) {
          console.error(
            `Error in signal subscriber for ${this.getDebugInfo()}:`,
            error
          );
        }
      });
    } finally {
      SignalImpl.updateStack.delete(this);
      SignalImpl.updateDepth--;
    }
  }

  protected recompute(): void {
    const oldValue = this._value;
    this._value = this.computeValue();

    if (!Object.is(oldValue, this._value)) {
      this.notify();
    }
  }

  private computeValue(): T {
    if (!this.computeFn) return this._value;

    SignalImpl.computationStack.add(this);
    const previousComputation = SignalImpl.currentComputation;
    SignalImpl.currentComputation = this;

    try {
      return this.computeFn();
    } finally {
      SignalImpl.currentComputation = previousComputation;
      SignalImpl.computationStack.delete(this);
    }
  }
}

class MutableSignalImpl<T> extends SignalImpl<T> implements MutableSignal<T> {
  constructor(initialValue: T) {
    super(initialValue);
  }

  mutate(fn: (value: T) => boolean): void {
    const changed = fn(this._value);
    if (changed) {
      this.notify();
    }
  }
}

class EffectSignal extends SignalImpl<void> {
  constructor(fn: Effect) {
    super(fn);
  }

  recompute(): void {
    queueMicrotask(this.computeFn!);
  }
}

// Helper functions

export function signal<T>(
  initialValue: T,
  debugOptions?: SignalDebugOptions
): Signal<T> {
  const instance = new SignalImpl(initialValue);
  if (import.meta.env.VITE_DEBUG && debugOptions) {
    registerSignalForDebug(instance, debugOptions);
  }
  return instance;
}

export function computed<T>(
  computeFn: () => T,
  debugOptions?: SignalDebugOptions
): Signal<T> {
  const instance = new SignalImpl(computeFn);
  if (import.meta.env.VITE_DEBUG && debugOptions) {
    const finalDebugOptions = { ...debugOptions, readOnly: true };
    registerSignalForDebug(instance, finalDebugOptions);
  }
  return instance;
}

export function mutable<T>(
  initialValue: T,
  debugOptions?: SignalDebugOptions
): MutableSignal<T> {
  const instance = new MutableSignalImpl(initialValue);
  if (import.meta.env.VITE_DEBUG && debugOptions) {
    registerSignalForDebug(instance, debugOptions);
  }
  return instance;
}

export function effect(fn: Effect, displayName: string = ""): Cleanup {
  const signal = new EffectSignal(fn);
  signal.displayName = displayName;
  return () => signal.dispose();
}

export function isSignal(value: any): value is Signal<any> {
  return value instanceof SignalImpl;
}

export function getSignalValue<T>(
  value: SignalValue<T>,
  defaultValue: T = value as T
): NonNullable<T> {
  return (
    isSignal(value) ? value.get() : value ?? defaultValue
  ) as NonNullable<T>;
}
