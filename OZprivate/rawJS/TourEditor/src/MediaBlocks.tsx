import MediaBlockCard from './MediaBlockCard';
import UkIcon from './UkIcon';
import { ALL_MEDIA_KINDS, createMediaBlock } from './media';
import { moveItem } from './tour';
import type { EditorMediaBlock, EditorMediaKind } from './types';

interface MediaBlocksProps {
    blocks: EditorMediaBlock[];
    onChange: (blocks: EditorMediaBlock[]) => void;
    kinds?: readonly EditorMediaKind[];
}

export default function MediaBlocks({
    blocks,
    onChange,
    kinds = ALL_MEDIA_KINDS,
}: MediaBlocksProps) {
    const updateBlock = (next: EditorMediaBlock) => {
        onChange(blocks.map((block) => (block.id === next.id ? next : block)));
    };

    return (
        <div>
            {blocks.map((block, index) => (
                <MediaBlockCard
                    key={block.id}
                    block={block}
                    kinds={kinds}
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
                onClick={() => onChange([...blocks, createMediaBlock(kinds[0])])}
            >
                <UkIcon icon="plus" className="uk-margin-small-right" />
                Add media
            </button>
        </div>
    );
}
