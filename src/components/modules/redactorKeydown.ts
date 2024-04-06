import Module from '../__module';
import type Block from '../block';
import type { API, BlockAPI } from '../../../types';
import { areBlocksMergeable } from '../utils/blocks';
import Dom from '../dom';
import { SelectionChanged } from '../events';
import { debounce } from '../utils';


/**
 * @todo fix Inline Toolbar position on cross-block selection
 * @todo handle backspace at start / delete at end
 * @todo handle char typing in cross-input selection as delete
 * @todo handle cross-block selection to block with enableLineBreaks():
 *   1. Only If 2 blocks selected
 *   2. Clear selection part from that block
 *   3. Leave only selection part in the second block
 *   4. Prevent cross-input selection
 * @todo cmd+A should select 1 block, second cmd+A should select all blocks
 * @todo handle cross-input selection with keyboard
 * @todo when cbs the inline-toolbar should contain intersected lists of tools for selected blocks
 * @todo emit "selection changed" event to hide/show the Inline Toolbar
 */


/**
 * @param node
 */
function getClosestElement(node: Node): Element {
  if (node instanceof Element) {
    return node;
  }

  return getClosestElement(node.parentElement);
}

/**
 * Return a Block API
 *
 * @param wrapper
 * @param api
 */
function resolveBlockByWrapper(wrapper: Element, api: API): BlockAPI {
  const blockId = wrapper.getAttribute('data-id');

  if (blockId === null) {
    throw Error('Block wrapped is lack of data-id attribute');
  }

  const block = api.blocks.getById(blockId);

  if (block === null) {
    throw Error(`Block with id ${blockId} not found`);
  }

  return block;
}

/**
 * Find Blocks that contains passed selection
 *
 * @param range - cross-block selection range
 * @param api - Editor API
 */
function findIntersectedBlocks(range: Range, api: API): BlockAPI[] {
  const startContainer = getClosestElement(range.startContainer);
  const endContainer = getClosestElement(range.endContainer);

  const startBlockWrapper = startContainer.closest('.ce-block');
  const endBlockWrapper = endContainer.closest('.ce-block');

  if (startBlockWrapper === null || endBlockWrapper === null) {
    return [];
  }

  if (startBlockWrapper === endBlockWrapper) {
    return [
      resolveBlockByWrapper(startBlockWrapper, api),
    ];
  }

  const blocks = [];

  let block: Node | null = startBlockWrapper;

  while (block !== null) {
    blocks.push(block);

    if (block === endBlockWrapper) {
      break;
    }

    block = block.nextSibling;
  }

  return (blocks as Element[]).map((blockWrapper: Element) => resolveBlockByWrapper(blockWrapper, api));
}

type BlockInput = HTMLElement;

type BlockInputIntersected = {
  input: BlockInput,
  block: BlockAPI,
};

/**
 * Each block may contain multiple inputs
 * This function finds all inputs that are intersected by passed range
 *
 * @param intersectedBlocks - blocks that contain selection
 * @param range - selection range
 */
function findIntersectedInputs(intersectedBlocks: BlockAPI[], range: Range): BlockInputIntersected[] {
  return intersectedBlocks.reduce((acc: BlockInputIntersected[], block: BlockAPI) => {
    const inputs = block?.inputs;

    if (!inputs) {
      return acc;
    }

    inputs.forEach((input: BlockInput) => {
      if (range.intersectsNode(input)) {
        acc.push({
          input,
          block,
        });
      }
    });

    return acc;
  }, []);
}

/**
 *
 * @param range
 * @param api
 */
function useCrossInputSelection(range: Range, api: API) {
  // const selection = window.getSelection();

  // /**
  //  * @todo handle native inputs
  //  */

  // if (selection === null || !selection.rangeCount) {
  //   return {
  //     blocks: [],
  //     inputs: [],
  //   }
  // }

  // const range = selection.getRangeAt(0);

  const intersectedBlocks = findIntersectedBlocks(range, api);
  const intersectedInputs = findIntersectedInputs(intersectedBlocks, range);

  return {
    blocks: intersectedBlocks,
    inputs: intersectedInputs,
  };
}

/**
 *
 */
export default class RedactorKeydown extends Module {
  /**
   *
   * @param {...any} params
   */
  constructor(...params) {
    console.log('RedactorKeydown  1');
    super(...params);
    console.log('RedactorKeydown  2');

    /**
     * Handle selection change to manipulate Inline Toolbar appearance
     */
    // const selectionChangeDebounced = debounce(() => {
    //   this.removeSelectionFromUnselectableBlocks();
    // }, 30);

    // this.eventsDispatcher.on(SelectionChanged, selectionChangeDebounced);
  }

  /**
   *
   */
  public prepare() {
    this.listeners.on(this.Editor.UI.nodes.redactor, 'mouseup', (event: KeyboardEvent) => {
      console.log('mouseup');
      this.removeSelectionFromUnselectableBlocks();
    });
  }


  /**
   *
   * @param event
   */
  public keydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        this.handleDelete(event, event.key === 'Backspace');
        break;
    }
  }

  /**
   *
   * @param event
   * @param api
   * @param isBackspace
   */
  private handleDelete(event: KeyboardEvent, isBackspace = false): void {
    const api = this.Editor.API.methods;
    const selection = window.getSelection();

    /**
     * @todo handle native inputs
     */

    if (selection === null || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);

    // const intersectedBlocks = findIntersectedBlocks(range, api);
    // const intersectedInputs = findIntersectedInputs(intersectedBlocks, range);

    const { blocks: intersectedBlocks, inputs: intersectedInputs } = useCrossInputSelection(range, api);

    console.log('intersectedInputs', intersectedInputs);

    if (!intersectedInputs.length) {
      return;
    }


    /**
     * Handle case when user select the whole block.
     * We should not allow to delete it along with tool and .ce-block__content.
     * We should delete a Block via api instead
     */
    if (intersectedInputs.length === 1) {
      const { input, block } = intersectedInputs[0];
      const isWholeInputSelected = range.toString() === input.textContent;

      if (isWholeInputSelected) {
        console.log('OPA');

        api.blocks.delete(block.id);

        event.preventDefault();
      } else {
        console.log('default behavior');

        return;
      }
    }


    const isCrossBlockSelection = intersectedBlocks.length > 1;


    if (!isCrossBlockSelection) {
      return;
    }

    event.preventDefault();

    const removedInputs: BlockInput[] = [];

    /**
     * @todo handle case when first block === last block
     */

    /**
     * Now we need:
     * 1. Get first input and remove selected content starting from the beginning of the selection to the end of the input
     * 2. Get last input and remove selected content starting from the beginning of the input to the end of the selection
     * 3. Get all inputs between first and last and remove them (and blocks if they are empty after removing inputs)
     */
    intersectedInputs.forEach(({ input, block }: BlockInputIntersected, index: number) => {
      const rangeClone = range.cloneRange();


      if (index === 0 || index === intersectedInputs.length - 1) {
        if (index === 0) {
          rangeClone.selectNodeContents(input);
          rangeClone.setStart(range.startContainer, range.startOffset);
        } else if (index === intersectedInputs.length - 1) {
          rangeClone.selectNodeContents(input);
          rangeClone.setEnd(range.endContainer, range.endOffset);
        }

        rangeClone.extractContents();

        // /**
        //  * If after extracting content Block is empty, remove it
        //  */
        // console.log('Dom.isEmpty(input)', input, Dom.isEmpty(input));

        // if (Dom.isEmpty(input)) {
        //   removedInputs.push(input);

        //   input.remove();
        // }
      } else {
        removedInputs.push(input);

        input.remove();
      }
    });

    /**
     * Remove blocks if they are empty
     */
    intersectedBlocks.forEach((block: BlockAPI) => {
      if (block.inputs.every(input => removedInputs.includes(input))) {
        api.blocks.delete(block.id);
      }
    });

    const startingBlockApi = intersectedBlocks[0];
    const endingBlockApi = intersectedBlocks[intersectedBlocks.length - 1];

    console.log('startingBlockApi', startingBlockApi);
    console.log('endingBlockApi', endingBlockApi);


    /**
     * get rid of this by adding 'merge' api method
     */
    const startingBlock = this.Editor.BlockManager.getBlockById(startingBlockApi.id);
    const endingBlock = this.Editor.BlockManager.getBlockById(endingBlockApi.id);

    // this.Editor.Caret.setToBlock(startingBlock!, 'end');
    const bothBlocksMergeable = areBlocksMergeable(startingBlock!, endingBlock!);

    /**
     * If Blocks could be merged, do it
     * Otherwise, just navigate to the next block
     */
    if (bothBlocksMergeable) {
      console.log('merge');
      this.mergeBlocks(startingBlock!, endingBlock!);
    } else {
      console.log('navigate');
      this.Editor.Caret.setToBlock(startingBlock!, this.Editor.Caret.positions.START);
    }
  }

  /**
   * Merge passed Blocks
   *
   * @param targetBlock - to which Block we want to merge
   * @param blockToMerge - what Block we want to merge
   */
  private mergeBlocks(targetBlock: Block, blockToMerge: Block): void {
    const { BlockManager, Caret, Toolbar } = this.Editor;

    Caret.createShadow(targetBlock.pluginsContent);

    BlockManager
      .mergeBlocks(targetBlock, blockToMerge)
      .then(() => {
        // window.requestAnimationFrame(() => {
        /** Restore caret position after merge */
        Caret.restoreCaret(targetBlock.pluginsContent as HTMLElement);
        // targetBlock.pluginsContent.normalize();s
        // Toolbar.close();
        // });
      });
  }


  /**
   *
   */
  private removeSelectionFromUnselectableBlocks(): void {
    const api = this.Editor.API.methods;
    const selection = window.getSelection();

    /**
     * @todo handle native inputs
     */

    if (selection === null || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);

    const { blocks: intersectedBlocks, inputs: intersectedInputs } = useCrossInputSelection(range, api);

    /**
     * If selection is not cross-input, do nothing
     */
    if (intersectedBlocks.length < 2) {
      return;
    }


    const startingBlockApi = intersectedBlocks[0];
    const endingBlockApi = intersectedBlocks[intersectedBlocks.length - 1];

    /**
     * get rid of this by adding 'merge' api method
     */
    const startingBlock = this.Editor.BlockManager.getBlockById(startingBlockApi.id);
    const endingBlock = this.Editor.BlockManager.getBlockById(endingBlockApi.id);

    /**
     * If selection started in a Block that is not selectable, remove range from this Block to the next selectable Block
     */
    if (!startingBlock?.selectable) {
      // range.setStart(range.endContainer, range.endOffset);

      const blockIndex = api.blocks.getBlockIndex(startingBlock.id);

      /**
       * @todo find next selectable block, not just the next one
       */
      const nextBlock = api.blocks.getBlockByIndex(blockIndex + 1);

      if (!nextBlock) {
        return;
      }

      const nextBlockElement = nextBlock.holder;

      range.setStart(nextBlockElement, 0);
    }

    /**
     * If selection ended in a Block that is not selectable, remove range from that Block to the previous selectable Block
     */
    if (!endingBlock?.selectable) {
      // range.setEnd(range.startContainer, range.startOffset);

      const blockIndex = api.blocks.getBlockIndex(endingBlock.id);

      /**
       * @todo find previous selectable block, not just the previous one
       */
      const previousBlock = api.blocks.getBlockByIndex(blockIndex - 1);

      if (!previousBlock) {
        return;
      }

      const previousBlockElement = previousBlock.holder;

      range.setEnd(previousBlockElement, previousBlockElement.childNodes.length);
    }
  }
}
