import MediaBlockCard from './MediaBlockCard';
import UkIcon from './UkIcon';
import { createMediaBlock } from './media';
import { moveItem } from './tour';
import type { EditorMediaBlock } from './types';

interface MediaBlocksProps {
    blocks: EditorMediaBlock[];
    onChange: (blocks: EditorMediaBlock[]) => void;
}

export default function MediaBlocks({ blocks, onChange }: MediaBlocksProps) {
    const updateBlock = (next: EditorMediaBlock) => {
        onChange(blocks.map((block) => (block.id === next.id ? next : block)));
    };

    return (
        <div>
            {blocks.map((block, index) => (
                <MediaBlockCard
                    key={block.id}
                    block={block}
                    onChange={updateBlock}
                    onRemove={() => onChange(blocks.filter((item) => item.id !== block.id))}
                    canMoveUp={index > 0}
                    onMoveUp={() => onChange(moveItem(blocks, index, -1))}
                    canMoveDown={index < blocks.length - 1}
                    onMoveDown={() => onChange(moveItem(blocks, index, 1))}
                />
            ))}
            <button
                className="uk-button uk-button-default uk-margin-small-top"
                type="button"
                onClick={() => onChange([...blocks, createMediaBlock()])}
            >
                <UkIcon icon="plus" className="uk-margin-small-right" />
                Add media
            </button>
        </div>
    );
}
