import { DebugPanel } from "@game/scenes/debug/debug-panel";
import { BindingApi, BindingParams, FolderApi } from "@tweakpane/core";
import { SignalImpl } from "./signals";
import { Signal } from "./types";

export interface SignalDebugOptions {
  /**
   * The label to display in the debug panel
   */
  label: string;
  folder?: FolderApi;
  readOnly?: boolean;
  tweakpaneOptions?: Partial<BindingParams>;
}

// WeakMap to store debug artifacts associated with a signal instance
const signalDebugRegistry = new WeakMap<
  Signal<any>,
  { binding: BindingApi; unsubscribe: () => void }
>();

export function registerSignalForDebug<T>(
  signalInstance: SignalImpl<T>,
  debugOptions: SignalDebugOptions
) {
  // "Makes sure" the debug panel is initialized
  setTimeout(() => {
    asyncRegisterSignalForDebug(signalInstance, debugOptions);
  }, 0);
}

function asyncRegisterSignalForDebug<T>(
  signalInstance: SignalImpl<T>,
  debugOptions: SignalDebugOptions
) {
  if (!DebugPanel.pane) return;

  const isComputed = !!signalInstance.computeFn;
  const isReadOnly = debugOptions.readOnly ?? isComputed;
  const label = debugOptions.label;

  const debugTarget = {
    get value(): T {
      return signalInstance.get();
    },
    set value(newValue: T) {
      // Setter so we can reflect the changes in the debug panel back into the signal
      if (!isReadOnly) {
        try {
          if (signalInstance.computeFn) {
            console.warn(
              `Cannot set computed signal "${label}" from debug panel.`
            );
            signalDebugRegistry.get(signalInstance)?.binding.refresh();
            return;
          }
          // We need to cast to SignalImpl to access 'set'
          (signalInstance as SignalImpl<T>).set(newValue);
        } catch (e) {
          console.error(`Error setting signal "${label}" from debug panel:`, e);
          signalDebugRegistry.get(signalInstance)?.binding.refresh();
        }
      } else {
        console.warn(`Signal "${label}" is read-only.`);
        signalDebugRegistry.get(signalInstance)?.binding.refresh();
      }
    },
  };

  try {
    const parentPane =
      debugOptions.folder || DebugPanel.signalsFolder || DebugPanel.pane;

    const bindingOptions: BindingParams = {
      label,
      readonly: isReadOnly,
      ...debugOptions.tweakpaneOptions,
      // YOLO, sorry tweakpane, I can't be bothered about you
    } as any;

    const binding = parentPane.addBinding(
      debugTarget,
      "value",
      bindingOptions as any
    );

    const unsubscribe = signalInstance.subscribe(() => {
      const debugInfo = signalDebugRegistry.get(signalInstance);
      if (debugInfo) {
        debugInfo.binding.refresh();
      } else {
        // If binding is gone or signal not in registry, clean up
        signalDebugRegistry.get(signalInstance)?.unsubscribe();
        signalDebugRegistry.delete(signalInstance);
      }
    });

    // Store binding and unsubscribe function
    signalDebugRegistry.set(signalInstance, { binding, unsubscribe });

    // Override signal dispose to clean up the debug binding
    // JS :love: forever
    const originalDispose = signalInstance.dispose.bind(signalInstance);
    signalInstance.dispose = () => {
      const debugInfo = signalDebugRegistry.get(signalInstance);
      if (debugInfo) {
        debugInfo.unsubscribe();
        if (!(debugInfo.binding as any).controller_.view.disposed) {
          debugInfo.binding.dispose();
        }
        signalDebugRegistry.delete(signalInstance);
      }
      originalDispose(); // Call the original dispose logic
    };
  } catch (error) {
    // TODO: Crazy idea, send these to the debug panel or make the debug panel red?
    console.error(`Failed to add signal "${label}" to debug panel:`, error);
  }
}
