import {
  AbstractFlex,
  ALIGN_ITEMS,
  DIRECTION,
  FlexElement,
  FlexProperties,
  JUSTIFY,
  Justify,
} from "./AbstractFlex";
import { FlexColumn } from "./FlexColumn";
import { FlexRow } from "./FlexRow";

export class FlexWrapped extends AbstractFlex {
  private linesContainer: AbstractFlex;
  private currentLine: AbstractFlex;
  private isRowLayout: boolean;

  constructor(config: FlexProperties) {
    super(config);
    this.direction = config.direction ?? DIRECTION.ROW;
    this.isRowLayout = this.direction === DIRECTION.ROW;

    // Create lines container (column for row layout, row for column layout)
    this.linesContainer = this.isRowLayout
      ? new FlexColumn({
          x: this.x,
          y: this.y,
          width: this.width,
          height: this.height,
          padding: [this.paddingX, this.paddingY],
          margin: this.margin,
          align: this.align,
          justify: this.alignContent,
          children: [],
        })
      : new FlexRow({
          x: this.x,
          y: this.y,
          width: this.width,
          height: this.height,
          padding: [this.paddingX, this.paddingY],
          margin: this.margin,
          align: this.align,
          justify: this.alignContent,
          children: [],
        });

    this.currentLine = this.createNewLine();
    this.linesContainer.add(this.currentLine);
  }

  private createNewLine(): AbstractFlex {
    return this.isRowLayout
      ? new FlexRow({
          width: this.width,
          margin: this.margin,
          padding: 0,
          justify: this.justify,
          align: this.align,
          children: [],
        })
      : new FlexColumn({
          height: this.height,
          margin: this.margin,
          padding: 0,
          justify: this.justify,
          align: this.align,
          children: [],
        });
  }

  add(child: FlexElement, flexGrow?: number): FlexElement {
    this.children.push(child);

    if (flexGrow && flexGrow > 0) {
      console.warn("flexGrow with wrapped flexes wass not tested");
    }

    if (!this.fitsInCurrentLine(child)) {
      this.currentLine = this.createNewLine();
      this.linesContainer.add(this.currentLine);
    }

    const flex = this.currentLine.add(child, flexGrow);
    this.linesContainer.trashLayout();

    return flex;
  }

  private fitsInCurrentLine(child: FlexElement): boolean {
    const variedSpaceJustifications: Partial<Justify>[] = [
      JUSTIFY.SPACE_BETWEEN,
      JUSTIFY.SPACE_AROUND,
    ];
    const isSpaceJustification = variedSpaceJustifications.includes(
      this.justify
    );
    const margin = isSpaceJustification ? 0 : this.margin;

    if (this.isRowLayout) {
      const currentWidth = this.currentLine.children.reduce(
        (sum, c) => sum + c.width + margin,
        -margin
      );
      return currentWidth + child.width + margin <= this.width;
    } else {
      const currentHeight = this.currentLine.children.reduce(
        (sum, c) => sum + c.height + margin,
        -margin
      );
      return currentHeight + child.height + margin <= this.height;
    }
  }

  layout(): void {
    this.linesContainer.setX(this.x);
    this.linesContainer.setY(this.y);
    this.linesContainer.setWidth(this.width);
    this.linesContainer.setHeight(this.height);

    // Update our dimensions to match the lines container
    this.width = this.linesContainer.width;
    this.height = this.linesContainer.height;
  }

  getAxisTotalSizeSum(): number {
    return this.linesContainer.getAxisTotalSizeSum();
  }

  getFreeSpace(): number {
    return this.linesContainer.getFreeSpace();
  }

  updateJustify(justify: (typeof JUSTIFY)[keyof typeof JUSTIFY]): this {
    this.linesContainer.updateJustify(justify);
    return this;
  }

  updateAlign(align: (typeof ALIGN_ITEMS)[keyof typeof ALIGN_ITEMS]): this {
    (this.linesContainer as FlexWrapped).updateAlign(align);
    return this;
  }

  updateCrossAxis(): void {
    this.linesContainer.updateCrossAxis();
  }

  getDebug(
    graphics: Phaser.GameObjects.Graphics,
    withChildren: boolean = false
  ): void {
    this.linesContainer.children.forEach((line) => {
      (line as AbstractFlex).getDebug(graphics, withChildren);
    });
    this.linesContainer.getDebug(graphics, withChildren);
  }
}
