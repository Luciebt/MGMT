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
                version: null,
                tracks: [],
                devices: [],
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
}

export default AbletonProjectExtractor;
