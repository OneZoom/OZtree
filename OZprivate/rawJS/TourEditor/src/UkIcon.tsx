import type { HTMLAttributes } from 'react';
import type { UkIconName } from './types';

interface UkIconProps extends HTMLAttributes<HTMLSpanElement> {
    icon: UkIconName;
    ratio?: number;
}

export default function UkIcon({ icon, ratio, ...props }: UkIconProps) {
    const ukIcon = ratio ? `icon: ${icon}; ratio: ${ratio}` : icon;
    return <span uk-icon={ukIcon} {...props} />;
}
