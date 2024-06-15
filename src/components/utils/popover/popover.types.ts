import { PopoverItemParams } from '../../../../types';

/**
 * Params required to render popover
 */
export interface PopoverParams {
  /**
   * Popover items config
   */
  items: PopoverItemParams[];

  /**
   * Element of the page that creates 'scope' of the popover.
   * Depending on its size popover position will be calculated
   */
  scopeElement?: HTMLElement;

  /**
   * True if popover should contain search field
   */
  searchable?: boolean;

  /**
   * Popover texts overrides
   */
  messages?: PopoverMessages

  /**
   * CSS class name for popover root element
   */
  class?: string;

  /**
   * Popover nesting level. 0 value means that it is a root popover
   */
  nestingLevel?: number;
}


/**
 * Texts used inside popover
 */
export interface PopoverMessages {
  /** Text displayed when search has no results */
  nothingFound?: string;

  /** Search input label */
  search?: string
}

/**
 * Event that can be triggered by the Popover
 */
export enum PopoverEvent {
  /**
   * When popover closes
   */
  Close = 'close',

  /**
   * When it closes because item with 'activateOnClose' property set was clicked
   */
  CloseOnActivate = 'close-on-activate',

  /**
   * When nested popover should opens
   */
  OpenNestedPopover = 'open-nested-popover',

  /**
   * When nested popover closes
   */
  CloseNestedPopover = 'close-nested-popover'
}


/**
 * Events fired by the Popover
 */
export interface PopoverEventMap {
  /**
   * Fired when popover closes
   */
  [PopoverEvent.Close]: undefined;

  /**
   * Fired when popover closes because item with 'activateOnClose' property set was clicked
   * Value is the item that was clicked
   */
  [PopoverEvent.CloseOnActivate]: undefined;

  /**
   * Fired when nested popover opens
   */
  [PopoverEvent.OpenNestedPopover]: {
    /**
     * True if nested popover has and input that will be autofocused on open
     */
    hasAutoFocusableElements: boolean;
  };

  /**
   * Fired when nested popover closes
   */
  [PopoverEvent.CloseNestedPopover]: undefined;
}

/**
 * HTML elements required to display popover
 */
export interface PopoverNodes {
  /** Root popover element */
  popover: HTMLElement;

  /** Wraps all the visible popover elements, has background and rounded corners */
  popoverContainer: HTMLElement;

  /** Message displayed when no items found while searching */
  nothingFoundMessage: HTMLElement;

  /** Popover items wrapper */
  items: HTMLElement;
}

/**
 * HTML elements required to display mobile popover
 */
export interface PopoverMobileNodes extends PopoverNodes {
  /** Popover header element */
  header: HTMLElement;

  /** Overlay, displayed under popover on mobile */
  overlay: HTMLElement;
}
