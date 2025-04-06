import { Pane, FolderApi } from "tweakpane";
import { JsxElementsRegistry } from "@game/core/jsx/phaser-jsx";
import * as THREE from "three";

export type DebugInputType =
  | { type: "slider"; min?: number; max?: number; step?: number }
  | { type: "vector2" | "point2d"; min?: number; max?: number; step?: number }
  | { type: "text" }
  | { type: "color" }
  | { type: "boolean" }
  | { type: "button"; label: string; onClick: () => void }
  | {
      type: "monitor";
      interval?: number;
      bufferSize?: number;
      graph?: boolean;
    };

export interface DebugOptions {
  label?: string;
  view?: DebugInputType;
  disabled?: boolean;
  hidden?: boolean;
  format?: (value: any) => string;
}

export interface FolderOptions {
  title: string;
  expanded?: boolean;
  parent?: FolderApi | null;
}

export const DebugParameters: any = {
  fps: 0,
  frameBudget: 0,
  jsxCounts: "",
  jsxTree: "",
};

export class DebugPanel {
  static pane: Pane | null = false
    ? new Pane({
        expanded: false,
        title: "Debug",
      })
    : null;
  static tabApi: any;
  static jsxTab: any;
  static i = 0;

  static init() {
    if (!DebugPanel.pane) return;

    DebugPanel.tabApi = DebugPanel.pane.addTab({
      pages: [{ title: "General" }, { title: "JSX" }],
    });

    DebugParameters.fps = 0;
    DebugPanel.tabApi.pages[0].addBinding(DebugParameters, "fps", {
      readonly: true,
      format: (v: number) => v.toFixed(0),
    });

    DebugPanel.tabApi.pages[0].addBinding(DebugParameters, "frameBudget", {
      readonly: true,
      format: (v: number) => v.toFixed(4),
    });

    DebugPanel.tabApi.pages[0].addBinding(DebugParameters, "fps", {
      label: "",
      readonly: true,
      view: "graph",
      min: 0,
      max: 100,
    });

    DebugPanel.jsxTab = DebugPanel.tabApi.pages[1].addTab({
      pages: [{ title: "Counts" }, { title: "Tree" }],
    });

    const countsPage = DebugPanel.jsxTab.pages[0];
    const countsControls = countsPage.addFolder({
      title: "Controls",
      expanded: true,
    });
    countsControls
      .addButton({ title: "Refresh Counts" })
      .on("click", () => this.updateCounts());

    const countsContent = countsPage.addFolder({
      title: "Element Counts",
      expanded: true,
    });

    const jsxTreePage = DebugPanel.jsxTab.pages[1];
    const treeControls = jsxTreePage.addFolder({
      title: "Controls",
      expanded: true,
    });
    treeControls
      .addButton({ title: "Refresh Tree" })
      .on("click", () => this.refreshTree());
    treeControls
      .addButton({ title: "Collapse All" })
      .on("click", () => this.collapseAllFolders(jsxTreePage));
  }

  static add(key: string, value: any) {
    if (!DebugPanel.pane) return;

    DebugPanel.pane.addBinding(DebugParameters, key, {
      readonly: true,
      format: (v: number) => v.toFixed(0),
    });
  }

  static addSlider(
    key: string,
    value: any,
    step: number = 0.01,
    min: number = 0,
    max: number = 1
  ) {
    if (!DebugPanel.pane) return;
    DebugPanel.pane.addBinding(DebugParameters, key, {
      min: min,
      max: max,
      step: step,
    });

    DebugParameters[key] = value;
  }

  static update() {
    DebugPanel.i++;
    if (DebugPanel.i > 10) {
      DebugPanel.i = 0;
      // Only update FPS here
      DebugPanel.pane!.refresh();
    }
  }

  private static buildJsxTree(
    pane: any,
    parent:
      | Phaser.GameObjects.GameObject[]
      | Phaser.GameObjects.GameObject
      | null = null,
    depth: number = 0
  ) {
    const children =
      parent instanceof Array
        ? parent
        : JsxElementsRegistry.getChildren(parent);

    children.forEach((element) => {
      const isContainer = element instanceof Phaser.GameObjects.Container;
      const directChildren = isContainer
        ? (element as Phaser.GameObjects.Container).list.length
        : 0;

      // Create main element folder
      const elementFolder = pane.addFolder({
        title: `${element.constructor.name}${
          isContainer ? ` (${directChildren} children)` : ""
        }`,
        expanded: false,
      });

      // Common properties for all elements
      elementFolder.addBinding(element, "visible", {
        label: "Visible",
      });
      elementFolder.addBinding(element, "active", {
        label: "Active",
      });
      elementFolder.addBinding(element, "x", {
        label: "X",
        format: (v: number) => v.toFixed(0),
      });
      elementFolder.addBinding(element, "y", {
        label: "Y",
        format: (v: number) => v.toFixed(0),
      });
      elementFolder.addBinding(element, "width", {
        label: "Width",
        format: (v: number) => v.toFixed(0),
      });
      elementFolder.addBinding(element, "height", {
        label: "Height",
        format: (v: number) => v.toFixed(0),
      });

      // Special handling for containers
      if (isContainer) {
        // Recursively add children as nested folders
        this.buildJsxTree(elementFolder, element, depth + 1);
      }

      // Add type-specific properties
      if (element instanceof Phaser.GameObjects.Text) {
        elementFolder.addBinding(element, "text", {
          label: "Content",
        });
      }
    });
  }

  private static updateCounts(contentFolder?: any) {
    const countsPage = DebugPanel.jsxTab.pages[0];
    const targetFolder =
      contentFolder ||
      countsPage.children.find((c: any) => c.title === "Element Counts");

    // Clear previous counts
    targetFolder.children
      .slice()
      .forEach((child: any) => targetFolder.remove(child));

    const counts = new Map<string, number>();
    JsxElementsRegistry.elements.forEach((parent, element) => {
      const type = element.constructor.name;
      counts.set(type, (counts.get(type) || 0) + 1);
    });

    // Group elements by type
    const types = Array.from(counts.keys()).sort();
    const categoryMap = {
      Containers: types.filter((t) => t.includes("Container")),
      Graphics: types.filter((t) =>
        ["Rectangle", "Sprite", "Image"].includes(t)
      ),
      Text: types.filter((t) => t.includes("Text")),
      Other: types.filter(
        (t) =>
          !t.includes("Container") &&
          !t.includes("Text") &&
          !["Rectangle", "Sprite", "Image"].includes(t)
      ),
    };

    Object.entries(categoryMap).forEach(([category, types]) => {
      if (types.length === 0) return; // Skip empty categories
      const catFolder = targetFolder.addFolder({
        title: `${category} (${types.reduce(
          (acc, t) => acc + (counts.get(t) || 0),
          0
        )})`,
        expanded: true,
      });

      types.forEach((type) => {
        const count = counts.get(type) || 0;
        catFolder.addBinding({ [type]: count }, type, {
          readonly: true,
          label: "Count",
          format: (v: number) => v.toFixed(0),
        });
      });
    });

    countsPage.addBlade({
      view: "separator",
    });
  }

  private static collapseAllFolders(folder: any) {
    folder.children.forEach((child: any) => {
      if (child.title === "Controls") return;
      if (child.children) {
        child.expanded = false;
        this.collapseAllFolders(child);
      }
    });
  }

  private static refreshTree() {
    const jsxTreePage = DebugPanel.jsxTab.pages[1];
    // Clear only the tree content, not the controls
    const contentFolder = jsxTreePage.children.find(
      (c: any) => c.title === "JSX Elements"
    );
    if (contentFolder) {
      jsxTreePage.remove(contentFolder);
    }

    const newContent = jsxTreePage.addFolder({
      title: "JSX Elements",
      expanded: true,
    });

    const parent = JsxElementsRegistry.getChildren(null).filter(
      (p) => p.parentContainer === null
    );

    this.buildJsxTree(newContent, parent);

    newContent.addBlade({
      view: "separator",
    });
  }

  static folder(options: FolderOptions): FolderApi | null {
    if (!DebugPanel.pane) return null;

    const parent = options.parent || DebugPanel.pane;
    return parent.addFolder({
      title: options.title,
      expanded: options.expanded ?? true,
    });
  }

  static debug<T>(
    target: any,
    key: string,
    value: T,
    options: DebugOptions = {}
  ): T {
    if (!this.pane) return value;

    const { view, ...bindingOptions } = options;

    if (!view) {
      this.pane.addBinding(target, key, bindingOptions);
      return value;
    }

    switch (view.type) {
      case "slider":
        target[key] = 0;
        this.pane.addBinding(target, key, {
          ...bindingOptions,
          min: view.min ?? 0,
          max: view.max ?? 1,
          step: view.step ?? 0.1,
        });
        break;

      case "vector2":
      case "point2d":
        target[key] = { x: 0, y: 0 };
        if (value instanceof THREE.Vector2) {
          this.pane.addBinding(target, key, {
            ...bindingOptions,
            view: "point2d",
            min: view.min ?? -1,
            max: view.max ?? 1,
            step: view.step ?? 0.01,
          });
        }
        break;

      case "text":
        target[key] = "";
        this.pane.addBinding(target, key, {
          ...bindingOptions,
          view: view.type,
        });
        break;

      case "color":
        target[key] = { r: 0, g: 0, b: 0, a: 1 };
        this.pane.addBinding(target, key, {
          ...bindingOptions,
          view: view.type,
        });
        break;

      case "boolean":
        target[key] = false;
        this.pane.addBinding(target, key, {
          ...bindingOptions,
          view: view.type,
        });
        break;

      case "button":
        target[key] = null;
        this.pane
          .addButton({
            title: view.label,
            label: options.label,
          })
          .on("click", view.onClick);
        break;

      case "monitor":
        target[key] = 0;
        this.pane.addBinding(target, key, {
          ...bindingOptions,
          readonly: true,
          interval: view.interval ?? 100,
          view: view.graph ? "graph" : "text",
        });
        break;

      default:
        target[key] = null;
        this.pane.addBinding(target, key, {
          ...bindingOptions,
        });
    }

    return value;
  }

  static debugVector2(
    target: any,
    key: string,
    value: THREE.Vector2,
    options: Partial<DebugOptions> = {}
  ) {
    return this.debug(target, key, value, {
      ...options,
      view: { type: "vector2" },
    });
  }

  static debugSlider(
    target: any,
    key: string,
    value: number,
    min = 0,
    max = 1,
    step = 0.1
  ) {
    return this.debug(target, key, value, {
      view: { type: "slider", min, max, step },
    });
  }

  static debugMonitor(target: any, key: string, graph = false) {
    return this.debug(target, key, target[key], {
      view: { type: "monitor", graph },
    });
  }

  static debugButton(label: string, onClick: () => void) {
    return this.debug(null, "", null, {
      view: { type: "button", label, onClick },
    });
  }
}
