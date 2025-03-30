import {
  AbstractFlex,
  ALIGN_ITEMS,
  AlignmentItems,
  DIRECTION,
  FlexElement,
  FlexProperties,
  JUSTIFY,
  Justify,
} from "./AbstractFlex";
import { FlexColumn } from "./FlexColumn";
import { FlexRow } from "./FlexRow";

const swapAlignContent = (alignContent: AlignmentItems): Justify => {
  switch (alignContent) {
    case ALIGN_ITEMS.FLEX_START:
      return JUSTIFY.FLEX_START;
    case ALIGN_ITEMS.FLEX_END:
      return JUSTIFY.FLEX_END;
    case ALIGN_ITEMS.CENTER:
      return JUSTIFY.CENTER;
    case ALIGN_ITEMS.STRETCH:
      return JUSTIFY.CENTER;
    default:
      return JUSTIFY.CENTER;
  }
};

export class FlexWrapped extends AbstractFlex {
  private linesContainer: FlexColumn | FlexRow;
  private currentLine: FlexColumn | FlexRow;
  private isRowLayout: boolean;

  private lineStartIndex: number[] = [0];

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
          padding: [
            this.paddingLeft,
            this.paddingTop,
            this.paddingRight,
            this.paddingBottom,
          ],
          margin: this.margin,
          justify: swapAlignContent(this.alignContent),
          backgroundElement: this.backgroundElement,
          containerElement: this.containerElement,
          children: [],
        })
      : new FlexRow({
          x: this.x,
          y: this.y,
          width: this.width,
          height: this.height,
          padding: [
            this.paddingLeft,
            this.paddingTop,
            this.paddingRight,
            this.paddingBottom,
          ],
          margin: this.margin,
          justify: swapAlignContent(this.alignContent),
          backgroundElement: this.backgroundElement,
          containerElement: this.containerElement,
          children: [],
        });

    this.currentLine = this.createNewLine();
    this.linesContainer.add(this.currentLine);
  }

  private createNewLine(): FlexColumn | FlexRow {
    return this.isRowLayout
      ? new FlexRow({
          width: this.width - this.paddingLeft - this.paddingRight,
          margin: this.margin,
          padding: 0,
          justify: this.justify,
          children: [],
        })
      : new FlexColumn({
          height: this.height - this.paddingTop - this.paddingBottom,
          margin: this.margin,
          padding: 0,
          justify: this.justify,
          children: [],
        });
  }

  add(child: FlexElement, flexGrow?: number): FlexElement {
    this.children.push(child);

    if (flexGrow && flexGrow > 0) {
      console.warn("flexGrow with wrapped flexes was not tested");
    }

    if (!this.fitsInCurrentLine(child)) {
      this.currentLine = this.createNewLine();
      this.linesContainer.add(this.currentLine);
      this.lineStartIndex.push(this.children.length - 1);
    }

    if (child.attachToIndex !== undefined) {
      child.attachToIndex -=
        this.lineStartIndex[this.linesContainer.children.length - 1];
    }

    const flex = this.currentLine.add(child, flexGrow);
    this.layout();

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
    this.linesContainer.x = this.x;
    this.linesContainer.y = this.y;
    this.linesContainer.width = this.width;
    this.linesContainer.height = this.height;
    this.linesContainer._flexWidth = this.width;
    this.linesContainer._flexHeight = this.height;

    this.linesContainer.trashLayout();

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
