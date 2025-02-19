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

/**
 * Alignment values for the flex column
 *
 * This is meant not to be exported! We don't want to be confused with AlignItems
 */
const ALIGNMENT = {
  JUSTIFY: "justify",
  STRETCH: "stretch",
  TOP: "top",
  RIGHT: "right",
  BOTTOM: "bottom",
  LEFT: "left",
  CENTER: "center",
  SPACE_BETWEEN: "space-between",
  SPACE_AROUND: "space-around",
  SPACE_EVENLY: "space-evenly",
} as const;

type Alignment = (typeof ALIGNMENT)[keyof typeof ALIGNMENT];

export class FlexColumn extends AbstractFlex {
  constructor(config: FlexProperties) {
    super(config);
    this.direction = DIRECTION.COLUMN;
  }

  add(
    child: FlexElement,
    flexGrow: number = 0
    // TODO: flexShrink
    //flexShrink: number = 1
  ): FlexElement {
    super.add(child, flexGrow);

    this.width = Math.max(this.width, child.width + this.padding * 2);

    this.height = Math.max(
      this.height,
      this.getAxisTotalSizeSum() + this.padding * 2
    );

    this.layout();
    return child;
  }

  updateJustify(justify: Justify): this {
    this.justify = justify;

    switch (justify) {
      case JUSTIFY.FLEX_START:
        this.updateAxis(ALIGNMENT.TOP);
        break;
      case JUSTIFY.FLEX_END:
        this.updateAxis(ALIGNMENT.BOTTOM);
        break;
      case JUSTIFY.CENTER:
        this.updateAxis(ALIGNMENT.CENTER);
        break;
      case JUSTIFY.SPACE_BETWEEN:
        this.updateAxis(ALIGNMENT.SPACE_BETWEEN);
        break;
      case JUSTIFY.SPACE_AROUND:
        this.updateAxis(ALIGNMENT.SPACE_AROUND);
        break;
      case JUSTIFY.SPACE_EVENLY:
        this.updateAxis(ALIGNMENT.SPACE_EVENLY);
        break;
      default:
        throw new Error(`Unknown justify: ${justify}`);
    }

    return this;
  }

  getFreeSpace(): number {
    return this.innerBounds.height - this.axisSizeSum;
  }

  getAxisTotalSizeSum(): number {
    const spaceJustifications: Partial<Justify>[] = [
      JUSTIFY.SPACE_BETWEEN,
      JUSTIFY.SPACE_AROUND,
      JUSTIFY.SPACE_EVENLY,
    ];
    const isSpaceJustification = spaceJustifications.includes(this.justify);

    return (
      this.axisSizeSum +
      (isSpaceJustification ? 0 : this.margin * (this.children.length - 1))
    );
  }

  updateAxis(align: Alignment): void {
    let freeSpace = this.getFreeSpace();
    let considerGrow = false;

    if (this.growSum && freeSpace) {
      considerGrow = true;
      align = ALIGNMENT.TOP;
      // Undo the added margin from getAxisTotalSizeSum
      freeSpace -= this.margin * (this.children.length - 1);
    }

    let position = 0;
    let axisPadding = 0;

    switch (align) {
      case ALIGNMENT.TOP: {
        position = this.innerBounds.top;
        axisPadding = this.margin;
        break;
      }
      case ALIGNMENT.CENTER: {
        position =
          this.innerBounds.top +
          (this.innerBounds.height / 2 - this.getAxisTotalSizeSum() / 2);
        axisPadding = this.margin;
        break;
      }
      case ALIGNMENT.BOTTOM: {
        position = this.innerBounds.bottom - this.getAxisTotalSizeSum();
        axisPadding = this.margin;
        break;
      }
      case ALIGNMENT.SPACE_BETWEEN: {
        position = this.innerBounds.top;
        axisPadding = freeSpace / (this.children.length - 1);
        break;
      }
      case ALIGNMENT.SPACE_AROUND: {
        axisPadding = freeSpace / this.children.length;
        position = this.innerBounds.top + axisPadding / 2;
        break;
      }
      case ALIGNMENT.SPACE_EVENLY: {
        axisPadding = freeSpace / (this.children.length + 1);
        position = this.innerBounds.top + axisPadding;
        break;
      }
    }

    this.children.forEach((item) => {
      if (considerGrow && item.flexGrow) {
        item.height = item.basis + (item.flexGrow / this.growSum) * freeSpace;
      } else {
        if (item.height !== item._flexHeight) {
          item.height = item._flexHeight;
        }
      }

      if (item.setOrigin) {
        item.setOrigin(0, 0);
      }

      if (this.containerElement) {
        item.setY(position - this.containerElement.y);
      } else {
        item.setY(position);
      }

      position += item.height + axisPadding;
    });
  }

  getAlignPosition(align: AlignmentItems): Alignment {
    switch (align) {
      case ALIGN_ITEMS.FLEX_START:
        return ALIGNMENT.LEFT;
      case ALIGN_ITEMS.FLEX_END:
        return ALIGNMENT.RIGHT;
      case ALIGN_ITEMS.CENTER:
        return ALIGNMENT.CENTER;
      case ALIGN_ITEMS.STRETCH:
        return ALIGNMENT.STRETCH;
      default:
        throw new Error(`Unknown align: ${align}`);
    }
  }

  updateCrossAxis(): void {
    const alignmentDimensions = {
      [ALIGNMENT.LEFT]: {
        position: this.innerBounds.left,
        scale: 0,
      },
      [ALIGNMENT.CENTER]: {
        position: this.innerBounds.left + this.innerBounds.width / 2,
        scale: 0.5,
      },
      [ALIGNMENT.RIGHT]: {
        position: this.innerBounds.right,
        scale: 1,
      },
      [ALIGNMENT.STRETCH]: {
        position: this.innerBounds.left,
        scale: 0,
      },
    };

    this.children.forEach((item) => {
      const alignment = this.getAlignPosition(
        item.selfAlign
      ) as keyof typeof alignmentDimensions;
      const { position, scale } = alignmentDimensions[alignment];

      if (item.setOrigin) {
        item.setOrigin(0, 0);
      }

      if (this.containerElement) {
        item.setX(position - item.width * scale - this.containerElement.x);
      } else {
        item.setX(position - item.width * scale);
      }

      if (item.selfAlign === ALIGN_ITEMS.STRETCH) {
        if (item.setWidth) {
          item.setWidth(this.innerBounds.width);
        } else {
          item.width = this.innerBounds.width;
        }
      }
    });
  }

  trashLayout(): void {
    super.trashLayout();

    this.width = this._flexWidth;
    this.height = this._flexHeight;

    let axisSizeSum = this.getAxisTotalSizeSum();

    this.children.forEach((child) => {
      this.width = Math.max(this.width, child.width + this.padding * 2);
      this.height = Math.max(this.height, axisSizeSum + this.padding * 2);
    });

    this.layout();
  }
}
