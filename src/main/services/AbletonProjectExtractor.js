import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';

class AbletonProjectExtractor {
    constructor() {
        this.extractionCache = new Map();
    }

    async extractProjectMetadata(alsFilePath) {
        try {
            const fileHash = await this.getFileHash(alsFilePath);

            // Check cache first
            if (this.extractionCache.has(fileHash)) {
                console.log(`Using cached metadata for ${alsFilePath}`);
                return this.extractionCache.get(fileHash);
            }

            console.log(`Extracting metadata from ${alsFilePath}...`);

            const stats = await fs.promises.stat(alsFilePath);
            const fileBuffer = await fs.promises.readFile(alsFilePath);
            const decompressedData = zlib.gunzipSync(fileBuffer).toString('utf-8');
            const parsedData = await parseStringPromise(decompressedData);

            const metadata = {
                bpm: this.extractBPM(parsedData),
                key: this.extractKey(parsedData),
                version: this.extractVersion(parsedData),
                tracks: this.extractTrackInfo(parsedData),
                devices: this.extractDeviceInfo(parsedData),
                fileSize: stats.size,
                lastModified: stats.mtime.toISOString()
            };

            console.log(`Extracted metadata for ${path.basename(alsFilePath)}:`, metadata);

            // Cache the result
            this.extractionCache.set(fileHash, metadata);

            return metadata;
        } catch (error) {
            console.error(`Failed to extract metadata from ${alsFilePath}:`, error);
            return {
                bpm: null,
                key: null,
                version: null,
                tracks: [],
                devices: [],
                fileSize: 0,
                lastModified: null
            };
        }
    }

    extractBPM(parsedData) {
        try {
            const liveSet = parsedData.Ableton?.LiveSet?.[0];
            if (!liveSet) return null;

            // Multiple BPM extraction strategies
            const bpmPaths = [
                // Master track tempo
                () => liveSet.MasterTrack?.[0]?.DeviceChain?.[0]?.Mixer?.[0]?.Tempo?.[0]?.Manual?.[0]?.$?.Value,
                // Transport tempo  
                () => liveSet.Transport?.[0]?.Tempo?.[0]?.Manual?.[0]?.$?.Value,
                // LiveSet level tempo
                () => liveSet.Tempo?.[0]?.Manual?.[0]?.$?.Value,
                // Alternative path
                () => liveSet.MasterTrack?.[0]?.DeviceChain?.[0]?.Mixer?.[0]?.Tempo?.[0]?.$?.Value
            ];

            for (const extractPath of bpmPaths) {
                const bpmValue = extractPath();
                if (bpmValue !== undefined && bpmValue !== null) {
                    const bpm = parseFloat(bpmValue);
                    if (!isNaN(bpm) && bpm > 0 && bpm < 500) {
                        console.log(`Found BPM: ${bpm}`);
                        return bpm;
                    }
                }
            }

            console.log('BPM not found in any expected location');
            return null;
        } catch (error) {
            console.error('Error extracting BPM:', error);
            return null;
        }
    }

    extractKey(parsedData) {
        try {
            const liveSet = parsedData.Ableton?.LiveSet?.[0];
            if (!liveSet) return null;

            // Key extraction strategies
            const keyPaths = [
                // Master track name
                () => liveSet.MasterTrack?.[0]?.Name?.[0]?.$?.Value,
                // LiveSet annotation
                () => liveSet.Annotation?.[0]?.$?.Value,
                // Project name
                () => liveSet.Name?.[0]?.$?.Value
            ];

            const keyRegex = /\b([A-G][b#]?(?:m|min|maj|major)?)\b/i;

            for (const extractPath of keyPaths) {
                const textValue = extractPath();
                if (textValue) {
                    const keyMatch = textValue.match(keyRegex);
                    if (keyMatch) {
                        const key = this.normalizeKey(keyMatch[1]);
                        console.log(`Found key: ${key}`);
                        return key;
                    }
                }
            }

            console.log('Key not found in any expected location');
            return null;
        } catch (error) {
            console.error('Error extracting key:', error);
            return null;
        }
    }

    extractVersion(parsedData) {
        try {
            return parsedData.Ableton?.$?.MinorVersion ||
                parsedData.Ableton?.$?.Creator ||
                null;
        } catch (error) {
            return null;
        }
    }

    extractTrackInfo(parsedData) {
        try {
            const liveSet = parsedData.Ableton?.LiveSet?.[0];
            const tracks = liveSet?.Tracks?.[0]?.AudioTrack || [];

            return tracks.map((track, index) => ({
                id: index,
                name: track.Name?.[0]?.$?.Value || `Track ${index + 1}`,
                type: 'audio',
                muted: track.DeviceChain?.[0]?.Mixer?.[0]?.IsMuted?.[0]?.$?.Value === 'true',
                solo: track.DeviceChain?.[0]?.Mixer?.[0]?.IsSoloed?.[0]?.$?.Value === 'true'
            }));
        } catch (error) {
            return [];
        }
    }

    extractDeviceInfo(parsedData) {
        try {
            const liveSet = parsedData.Ableton?.LiveSet?.[0];
            // Extract device information from tracks
            // This is a simplified version - the actual structure can be very complex
            return [];
        } catch (error) {
            return [];
        }
    }

    normalizeKey(key) {
        // Normalize key names (e.g., "Cm" -> "C minor", "Fsharp" -> "F#")
        const keyMap = {
            'm': ' minor',
            'min': ' minor',
            'maj': ' major',
            'major': ' major'
        };

        let normalized = key.replace(/[mb#]/g, match => {
            if (match === 'm') return keyMap['m'];
            return match;
        });

        return normalized;
    }

    async getFileHash(filePath) {
        const stats = await fs.promises.stat(filePath);
        const input = filePath + stats.mtime.toISOString() + stats.size;
        return crypto.createHash('md5').update(input).digest('hex');
    }

    clearCache() {
        this.extractionCache.clear();
    }
}

export default AbletonProjectExtractor;
