/** For dealing with the .oztour file format */

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { parseEditorTour } from './parse';
import { tourFileSlug } from './tour';
import type { EditorTour } from './types';

/** Format version stored in ``manifest.json`` inside a ``.oztour`` zip. */
export const TOUR_FILE_VERSION = 1;
export const MANIFEST_FILENAME = 'manifest.json';
export const TOUR_FILENAME = 'tour.json';

export class OzTourError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OzTourError';
    }
}

export function packOzTour(tour: EditorTour): Uint8Array {
    return zipSync({
        [MANIFEST_FILENAME]: strToU8(`${JSON.stringify({ version: TOUR_FILE_VERSION }, null, 2)}\n`),
        [TOUR_FILENAME]: strToU8(`${JSON.stringify(tour, null, 2)}\n`),
    });
}

export function unpackOzTour(bytes: Uint8Array): EditorTour {
    let files: Record<string, Uint8Array>;
    try {
        files = unzipSync(bytes);
    } catch {
        throw new OzTourError('This file is not a valid tour archive.');
    }

    const manifest = readZipJson(files, MANIFEST_FILENAME);
    if (!isRecord(manifest) || manifest.version !== TOUR_FILE_VERSION) {
        throw new OzTourError('This tour file version is not supported.');
    }

    return parseEditorTour(readZipJson(files, TOUR_FILENAME));
}

export function downloadFilename(tour: EditorTour): string {
    return `${tourFileSlug(tour)}.oztour`;
}

function readZipJson(files: Record<string, Uint8Array>, name: string): unknown {
    const bytes = zipEntry(files, name);
    if (!bytes) {
        throw new OzTourError(`Tour archive is missing ${name}.`);
    }
    try {
        return JSON.parse(strFromU8(bytes));
    } catch {
        throw new OzTourError(`${name} is not valid JSON.`);
    }
}

function zipEntry(files: Record<string, Uint8Array>, name: string): Uint8Array | undefined {
    if (files[name]) return files[name];
    const match = Object.keys(files).find((key) => key === name || key.endsWith(`/${name}`));
    return match ? files[match] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
