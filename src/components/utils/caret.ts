import $, { isCollapsedWhitespaces } from '../dom';

/**
 * Checks if caret is at the start of the passed input
 *
 * Cases:
 *  Native input:
 *   - if offset is 0, caret is at the start
 *  Contenteditable:
 *   - caret at the first text node and offset is 0 — caret is at the start
 *   - caret not at the first text node — we need to check left siblings for emptiness
 *   - caret offset > 0, but all left part is visible (nbsp) — caret is not at the start
 *   - caret offset > 0, but all left part is invisible (whitespaces) — caret is at the start
 *
 * @param input - input where caret should be checked
 */
export function isAtStartOfInput(input: HTMLElement): boolean {
  /** @tood test and move out */
  // /**
  //  * If Block does not contain inputs, treat caret as "at start"
  //  */
  // if (!block.focusable) {
  //   return true;
  // }

  const firstNode = $.getDeepestNode(input);

  if (firstNode === null || $.isEmpty(input)) {
    return true;
  }

  /**
   * In case of native input, we simply check if offset is 0
   */
  if ($.isNativeInput(firstNode)) {
    return (firstNode as HTMLInputElement).selectionEnd === 0;
  }

  if ($.isEmpty(input)) {
    return true;
  }

  const [ caretNode, caretOffset ] = getCaretNodeAndOffset();

  /**
   * If there is no selection, caret is not at the start
   */
  if (caretNode === null) {
    return false;
  }

  /**
   * If there is nothing visible to the left of the caret, it is considered to be at the start
   */
  return checkContenteditableSliceForEmptiness(input, caretNode, caretOffset, 'left');
}

/**
   * Checks if caret is at the end of the passed input
   *
   * Cases:
   * Native input:
   * - if offset is equal to value length, caret is at the end
   * Contenteditable:
   * - caret at the last text node and offset is equal to text length — caret is at the end
   * - caret not at the last text node — we need to check right siblings for emptiness
   * - caret offset < text length, but all right part is visible (nbsp) — caret is at the end
   * - caret offset < text length, but all right part is invisible (whitespaces) — caret is at the end
   */
export function isAtEndOfInput(input: HTMLElement): boolean {
  const lastNode = $.getDeepestNode(input, true);

  if (lastNode === null) {
    return true;
  }

  /**
   * In case of native input, we simply check if offset is equal to value length
   */
  if ($.isNativeInput(lastNode)) {
    return (lastNode as HTMLInputElement).selectionEnd === (lastNode as HTMLInputElement).value.length;
  }

  const [ caretNode, caretOffset ] = getCaretNodeAndOffset();

  /**
   * If there is no selection, caret is not at the end
   */
  if (caretNode === null) {
    return false;
  }

  /**
   * If there is nothing visible to the right of the caret, it is considered to be at the end
   */
  return checkContenteditableSliceForEmptiness(input, caretNode, caretOffset, 'right');
}

/**
 * Returns TextNode containing a caret and a caret offset in it
 * Returns null if there is no caret set
 *
 * Handles a case when focusNode is an ElementNode and focusOffset is a child index,
 * returns child node with focusOffset index as a new focusNode
 */
export function getCaretNodeAndOffset(): [ Node, number ] {
  const selection = window.getSelection();

  if (selection === null) {
    return [null, 0];
  }

  let focusNode = selection.focusNode;
  let focusOffset = selection.focusOffset;

  if (focusNode === null) {
    return [null, 0];
  }

  /**
   * Case when focusNode is an Element (or Document). In this case, focusOffset is a child index.
   * We need to return child with focusOffset index as a new focusNode.
   *
   * <div>|hello</div> <---- Selection references to <div> instead of text node
   *
   *
   */
  if (focusNode.nodeType !== Node.TEXT_NODE && focusNode.childNodes.length > 0) {
    focusNode = focusNode.childNodes[focusOffset] ?? null;
    focusOffset = 0;
  }

  return [ focusNode, focusOffset ];
}

/**
 * Checks content at left or right of the passed node for emptiness.
 *
 * @param contenteditable - The contenteditable element containing the nodes.
 * @param fromNode - The starting node to check from.
 * @param offsetInsideNode - The offset inside the starting node.
 * @param direction - The direction to check ('left' or 'right').
 * @returns true if adjacent content is empty, false otherwise.
 */
export function checkContenteditableSliceForEmptiness(contenteditable: HTMLElement, fromNode: Node, offsetInsideNode: number, direction: 'left' | 'right'): boolean {
  let range = document.createRange();
  let startNode: Node | null = null;
  let endNode: Node | null = null;

  /**
   * In case of "left":
   * Set range from the start of the contenteditable to the passed offset
   */
  if (direction === 'left') {
    range.setStart(contenteditable, 0);
    range.setEnd(fromNode, offsetInsideNode);
    startNode = contenteditable;
    endNode = fromNode;

  /**
   * In case of "right":
   * Set range from the passed offset to the end of the contenteditable
   */
  } else {
    range.setStart(fromNode, offsetInsideNode);
    range.setEnd(contenteditable, contenteditable.childNodes.length);
    startNode = fromNode;
    endNode = contenteditable;
  }

  /**
   * Clone the range's content and check its text content
   */
  let clonedContent = range.cloneContents();
  let tempDiv = document.createElement('div');
  tempDiv.appendChild(clonedContent);

  let textContent = tempDiv.textContent || '';

  /**
   * In HTML there are two types of whitespaces:
   * - visible (&nbsp;)
   * - invisible (trailing spaces, tabs, etc.)
   *
   * If text contains only invisible whitespaces, it is considered to be empty
   */
  return isCollapsedWhitespaces(textContent);
}

