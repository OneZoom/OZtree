import UkIcon from './UkIcon';
import { createTextBlock, moveItem } from './tour';
import type { EditorTextBlock } from './types';

interface TextBlocksProps {
    blocks: EditorTextBlock[];
    onChange: (blocks: EditorTextBlock[]) => void;
}

export default function TextBlocks({ blocks, onChange }: TextBlocksProps) {
    const updateText = (blockId: string, text: string) => {
        onChange(blocks.map((block) => (block.id === blockId ? { ...block, text } : block)));
    };

    const removeBlock = (blockId: string) => {
        onChange(blocks.filter((block) => block.id !== blockId));
    };

    const moveBlock = (blockId: string, direction: number) => {
        const index = blocks.findIndex((block) => block.id === blockId);
        onChange(moveItem(blocks, index, direction));
    };

    return (
        <div>
            {blocks.map((block, index) => (
                <div key={block.id} className="uk-card uk-card-small uk-card-default uk-margin-small">
                    <div className="uk-card-body">
                        <textarea
                            className="uk-textarea"
                            rows={4}
                            value={block.text}
                            onChange={(e) => updateText(block.id, e.target.value)}
                            placeholder="Stop text"
                        />
                        <div className="tour-editor-item-actions uk-margin-small-top">
                            <button
                                className="uk-button uk-button-small uk-button-danger uk-margin-small-right"
                                title="Remove text"
                                type="button"
                                onClick={() => removeBlock(block.id)}
                            >
                                <UkIcon icon="trash" />
                            </button>
                            <button
                                className="uk-button uk-button-small uk-button-default uk-margin-small-right"
                                title="Move up"
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveBlock(block.id, -1)}
                            >
                                <UkIcon icon="chevron-up" />
                            </button>
                            <button
                                className="uk-button uk-button-small uk-button-default"
                                title="Move down"
                                type="button"
                                disabled={index === blocks.length - 1}
                                onClick={() => moveBlock(block.id, 1)}
                            >
                                <UkIcon icon="chevron-down" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            <button
                className="uk-button uk-button-default uk-margin-small-top"
                type="button"
                onClick={() => onChange([...blocks, createTextBlock()])}
            >
                <UkIcon icon="plus" className="uk-margin-small-right" />
                Add text
            </button>
        </div>
    );
}
