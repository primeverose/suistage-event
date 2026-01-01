import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Upload file to Walrus decentralized storage
 */
export async function uploadToWalrus(fileBuffer: Buffer): Promise<string> {
    try {
        const response = await fetch(`${config.walrus.publisherUrl}/v1/store`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            body: fileBuffer
        });
        
        if (!response.ok) {
            throw new Error(`Walrus upload failed: ${response.statusText}`);
        }
        
        const data = await response.json() as any;
        
        // Extract blob ID from response
        const blobId = data.newlyCreated?.blobObject?.blobId || 
                      data.alreadyCertified?.blobId;
        
        if (!blobId) {
            throw new Error('No blob ID returned from Walrus');
        }
        
        logger.info('File uploaded to Walrus', { blobId });
        return blobId;
    } catch (error) {
        logger.error('Walrus upload error', { error });
        throw error;
    }
}

/**
 * Get Walrus file URL from blob ID
 */
export function getWalrusUrl(blobId: string): string {
    return `${config.walrus.aggregatorUrl}/v1/${blobId}`;
}

/**
 * Check if blob exists in Walrus
 */
export async function checkBlobExists(blobId: string): Promise<boolean> {
    try {
        const url = getWalrusUrl(blobId);
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        logger.error('Error checking blob existence', { blobId, error });
        return false;
    }
}

/**
 * Download file from Walrus
 */
export async function downloadFromWalrus(blobId: string): Promise<Buffer> {
    try {
        const url = getWalrusUrl(blobId);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to download from Walrus: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        logger.error('Walrus download error', { blobId, error });
        throw error;
    }
}

/**
 * Validate image file
 */
export function validateImageFile(buffer: Buffer, maxSizeMB: number = 10): boolean {
    // Check file size
    const sizeMB = buffer.length / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
        throw new Error(`File too large: ${sizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`);
    }
    
    // Check file signature (magic numbers)
    const signatures = {
        jpg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47],
        gif: [0x47, 0x49, 0x46],
        webp: [0x52, 0x49, 0x46, 0x46]
    };
    
    for (const [type, sig] of Object.entries(signatures)) {
        if (buffer.slice(0, sig.length).every((byte, i) => byte === sig[i])) {
            logger.debug('Valid image detected', { type });
            return true;
        }
    }
    
    throw new Error('Invalid image file format (only JPG, PNG, GIF, WebP allowed)');
}

/**
 * Upload image with validation
 */
export async function uploadImageToWalrus(fileBuffer: Buffer): Promise<string> {
    // Validate image
    validateImageFile(fileBuffer);
    
    // Upload to Walrus
    const blobId = await uploadToWalrus(fileBuffer);
    
    return blobId;
}

export default {
    uploadToWalrus,
    getWalrusUrl,
    checkBlobExists,
    downloadFromWalrus,
    validateImageFile,
    uploadImageToWalrus
};
