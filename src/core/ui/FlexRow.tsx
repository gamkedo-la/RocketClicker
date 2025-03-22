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
 * Alignment values for the flex row
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

export class FlexRow extends AbstractFlex {
  constructor(config: FlexProperties) {
    super(config);
    this.direction = DIRECTION.ROW;
  }

  add(
    child: FlexElement,
    flexGrow: number = 0
    // TODO: flexShrink
    //flexShrink: number = 1
  ): FlexElement {
    super.add(child, flexGrow);

    this.height = Math.max(
      this.height,
      child.height + this.paddingTop + this.paddingBottom
    );

    this.width = Math.max(
      this.width,
      this.getAxisTotalSizeSum() + this.paddingLeft + this.paddingRight
    );

    this.layout();
    return child;
  }

  updateJustify(justify: Justify): this {
    this.justify = justify;

    switch (justify) {
      case JUSTIFY.FLEX_START:
        this.updateAxis(ALIGNMENT.LEFT);
        break;
      case JUSTIFY.FLEX_END:
        this.updateAxis(ALIGNMENT.RIGHT);
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
    return this.innerBounds.width - this.axisSizeSum;
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
      align = ALIGNMENT.LEFT;
      // Undo the added margin from getAxisTotalSizeSum
      freeSpace -= this.margin * (this.children.length - 1);
    }

    let position = 0;
    let axisPadding = 0;

    switch (align) {
      case ALIGNMENT.LEFT: {
        position = this.innerBounds.left;
        axisPadding = this.margin;
        break;
      }
      case ALIGNMENT.CENTER: {
        position =
          this.innerBounds.left +
          (this.innerBounds.width / 2 - this.getAxisTotalSizeSum() / 2);
        axisPadding = this.margin;
        break;
      }
      case ALIGNMENT.RIGHT: {
        position = this.innerBounds.right - this.getAxisTotalSizeSum();
        axisPadding = this.margin;
        break;
      }
      case ALIGNMENT.SPACE_BETWEEN: {
        position = this.innerBounds.left;
        axisPadding = freeSpace / (this.children.length - 1);
        break;
      }
      case ALIGNMENT.SPACE_AROUND: {
        axisPadding = freeSpace / this.children.length;
        position = this.innerBounds.left + axisPadding / 2;
        break;
      }
      case ALIGNMENT.SPACE_EVENLY: {
        axisPadding = freeSpace / (this.children.length + 1);
        position = this.innerBounds.left + axisPadding;
        break;
      }
    }

    this.children.forEach((item) => {
      if (considerGrow && item.flexGrow) {
        item.width = item.basis + (item.flexGrow / this.growSum) * freeSpace;
      } else {
        if (item.width !== item._flexWidth) {
          item.width = item._flexWidth;
        }
      }

      if (item.setOrigin) {
        item.setOrigin(0, 0);
      }

      if (this.containerElement) {
        item.setX(position - this.containerElement.x);
      } else {
        item.setX(position);
      }

      position += item.width + axisPadding;
    });
  }

  getAlignPosition(align: AlignmentItems): Alignment {
    switch (align) {
      case ALIGN_ITEMS.FLEX_START:
        return ALIGNMENT.TOP;
      case ALIGN_ITEMS.FLEX_END:
        return ALIGNMENT.BOTTOM;
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
      [ALIGNMENT.STRETCH]: {
        position: this.innerBounds.top,
        scale: 0,
      },
      [ALIGNMENT.TOP]: {
        position: this.innerBounds.top,
        scale: 0,
      },
      [ALIGNMENT.CENTER]: {
        position: this.innerBounds.top + this.innerBounds.height / 2,
        scale: 0.5,
      },
      [ALIGNMENT.BOTTOM]: {
        position: this.innerBounds.bottom,
        scale: 1,
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
        item.setY(position - item.height * scale - this.containerElement.y);
      } else {
        item.setY(position - item.height * scale);
      }

      if (item.selfAlign === ALIGN_ITEMS.STRETCH) {
        if (item.setHeight) {
          item.setHeight(this.innerBounds.height);
        } else {
          item.height = this.innerBounds.height;
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
      if (child instanceof AbstractFlex) {
        child.trashLayout();
      }

      this.width = Math.max(
        this.width,
        axisSizeSum + this.paddingLeft + this.paddingRight
      );
      this.height = Math.max(
        this.height,
        child.height + this.paddingTop + this.paddingBottom
      );
    });

    this._flexWidth = this.width;
    this._flexHeight = this.height;

    this.layout();
  }
}
