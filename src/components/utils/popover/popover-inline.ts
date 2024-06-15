import { isMobileScreen } from '../../utils';
import { PopoverItem, PopoverItemDefault, PopoverItemType } from './components/popover-item';
import { PopoverItemHtml } from './components/popover-item/popover-item-html/popover-item-html';
import { PopoverDesktop } from './popover-desktop';
import { CSSVariables, css } from './popover.const';
import { PopoverParams } from './popover.types';

/**
 * Horizontal popover that is displayed inline with the content
 */
export class PopoverInline extends PopoverDesktop {
  /**
   * Item nested popover is displayed for
   */
  private nestedPopoverTriggerItem: PopoverItemDefault | PopoverItemHtml | null = null;

  /**
   * Constructs the instance
   *
   * @param params - instance parameters
   */
  constructor(params: PopoverParams) {
    const isHintEnabled = !isMobileScreen();

    super(
      {
        ...params,
        class: css.popoverInline,
      },
      {
        [PopoverItemType.Default]: {
          /**
           * We use button instead of div here to fix bug associated with focus loss (which leads to selection change) on click in safari
           *
           * @todo figure out better way to solve the issue
           */
          wrapperTag: 'button',
          hint: {
            position: 'top',
            alignment: 'center',
            enabled: isHintEnabled,
          },
        },
        [PopoverItemType.Html]: {
          hint: {
            position: 'top',
            alignment: 'center',
            enabled: isHintEnabled,
          },
        },
      }
    );

    /**
     * If active popover item has children, show them.
     * This is needed to display link url text (which is displayed as a nested popover content)
     * once you select <a> tag content in text
     */
    this.items
      .forEach((item) => {
        if (!(item instanceof PopoverItemDefault) && !(item instanceof PopoverItemHtml)) {
          return;
        }

        if (item.hasChildren && item.isActive) {
          this.showNestedItems(item);
        }
      });
  }

  /**
   * Returns visible element offset top
   */
  public get offsetLeft(): number {
    if (this.nodes.popoverContainer === null) {
      return 0;
    }

    return this.nodes.popoverContainer.offsetLeft;
  }

  /**
   * Open popover
   */
  public override show(): void {
    /**
     * If this is not a nested popover, set CSS variable with width of the popover
     */
    if (this.nestingLevel === 0) {
      this.nodes.popover.style.setProperty(
        CSSVariables.InlinePopoverWidth,
        this.renderParams.size.width + 'px'
      );
    }
    super.show();
  }

  /**
   * Disable hover event handling
   */
  protected override handleHover(): void {
    // Do nothing
  }

  /**
   * Sets CSS variable with position of item near which nested popover should be displayed.
   * Is used for correct positioning of the nested popover
   *
   * @param nestedPopoverEl - nested popover element
   * @param item – item near which nested popover should be displayed
   */
  protected override setTriggerItemPositionProperty(
    nestedPopoverEl: HTMLElement,
    item: PopoverItemDefault
  ): void {
    const itemEl = item.getElement();
    const itemOffsetLeft = itemEl ? itemEl.offsetLeft : 0;
    const totalLeftOffset = this.offsetLeft + itemOffsetLeft;

    nestedPopoverEl.style.setProperty(
      CSSVariables.TriggerItemLeft,
      totalLeftOffset + 'px'
    );
  }

  /**
   * Handles displaying nested items for the item.
   * Overriding in order to add toggling behaviour
   *
   * @param item – item to toggle nested popover for
   */
  protected override showNestedItems(item: PopoverItemDefault | PopoverItemHtml): void {
    if (this.nestedPopoverTriggerItem === item) {
      this.nestedPopoverTriggerItem = null;
      this.destroyNestedPopoverIfExists();

      return;
    }

    this.nestedPopoverTriggerItem = item;
    super.showNestedItems(item);
  }

  /**
   * Overrides default item click handling to handle nested popover closing correctly
   *
   * @param item - clicked item
   */
  protected override handleItemClick(item: PopoverItem): void {
    if (item !== this.nestedPopoverTriggerItem) {
      /**
       * In case tool had special handling for toggling button (like link tool which modifies selection)
       * we need to call handleClick on nested popover trigger item
       */
      this.nestedPopoverTriggerItem?.handleClick();

      /**
       * Then close the nested popover
       */
      super.destroyNestedPopoverIfExists();
    }

    super.handleItemClick(item);
  }
}
