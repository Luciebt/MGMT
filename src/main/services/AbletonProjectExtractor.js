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

            const tracks = this.extractTrackInfo(parsedData);
            const bpm = this.extractBPM ? this.extractBPM(parsedData) : null;
            const sampleCount = this.extractSampleCount(parsedData);
            const setLength = this.extractSetLength(parsedData);

            const metadata = {
                version: this.extractVersion(parsedData),
                tracks,
                devices: this.extractDeviceInfo(parsedData),
                bpm,
                trackCount: tracks.length,
                sampleCount,
                setLength,
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
                version: null,
                tracks: [],
                devices: [],
                bpm: null,
                trackCount: 0,
                sampleCount: 0,
                setLength: null,
                fileSize: 0,
                lastModified: null
            };
        }
    }

    async readALSFile(alsFilePath) {
        try {
            console.log(`Reading ALS file: ${alsFilePath}...`);

            const fileBuffer = await fs.promises.readFile(alsFilePath);
            const decompressedData = zlib.gunzipSync(fileBuffer).toString('utf-8');
            const parsedData = await parseStringPromise(decompressedData);

            console.log(`Successfully parsed ALS file: ${path.basename(alsFilePath)}`);
            return parsedData;
        } catch (error) {
            console.error(`Failed to read ALS file ${alsFilePath}:`, error);
            throw error;
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

    async getFileHash(filePath) {
        const stats = await fs.promises.stat(filePath);
        const input = filePath + stats.mtime.toISOString() + stats.size;
        return crypto.createHash('md5').update(input).digest('hex');
    }

    clearCache() {
        this.extractionCache.clear();
    }

    extractSampleCount(parsedData) {
        try {
            // Count all samples in all tracks (simplified: count all occurrences of 'SampleRef' in the parsed ALS)
            let count = 0;
            function countSamples(obj) {
                if (!obj || typeof obj !== 'object') return;
                if (Array.isArray(obj)) {
                    obj.forEach(countSamples);
                } else {
                    for (const key in obj) {
                        if (key === 'SampleRef') {
                            count += Array.isArray(obj[key]) ? obj[key].length : 1;
                        } else {
                            countSamples(obj[key]);
                        }
                    }
                }
            }
            countSamples(parsedData);
            return count;
        } catch (error) {
            return 0;
        }
    }

    extractSetLength(parsedData) {
        try {
            // Try to extract set length from MasterTrack or Arrangement (if available)
            const liveSet = parsedData.Ableton?.LiveSet?.[0];
            // Example: Arrangement > Length (in beats or seconds)
            const arrangement = liveSet?.Arrangement?.[0];
            const lengthBeats = arrangement?.Length?.[0]?.$?.Value;
            if (lengthBeats) {
                // Convert beats to mm:ss (assuming 4/4 and using BPM if available)
                const bpm = this.extractBPM(parsedData) || 120;
                const minutes = Math.floor((lengthBeats / bpm) / 4);
                const seconds = Math.round((((lengthBeats / bpm) / 4) - minutes) * 60);
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}

export default AbletonProjectExtractor;
