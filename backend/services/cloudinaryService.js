import cloudinary from '../config/cloudinary.js';

class CloudinaryService {
  /**
   * Check if Cloudinary is properly configured with valid credentials
   */
  isConfigured() {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY !== 'demo' &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_API_SECRET !== 'demo'
    );
  }

  /**
   * Generates secure signed upload parameters for browser direct-to-Cloudinary upload.
   * This bypasses the Node.js backend completely for video binary streams,
   * saving server RAM, CPU, and Render bandwidth.
   *
   * @param {Object} options
   * @param {string} options.folder - Destination folder (e.g. 'socialx/reels', 'socialx/posts')
   * @param {string} options.resourceType - 'video' | 'image' | 'auto'
   * @returns {Object} Signed upload parameters (NO API SECRET EXPOSED)
   */
  generateUploadSignature({ folder = 'socialx/posts', resourceType = 'auto' } = {}) {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary credentials are not configured on the server');
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      folder,
      timestamp
    };

    // Calculate SHA1/SHA256 signature using Cloudinary API Secret securely on server
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return {
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
      resourceType
    };
  }

  /**
   * Helper to construct an optimized Cloudinary delivery URL
   * Applies f_auto (best format) and q_auto (optimal compression)
   */
  getOptimizedUrl(url, resourceType = 'video') {
    if (!url || !url.includes('cloudinary.com')) return url;
    // Insert f_auto,q_auto into Cloudinary path if not already present
    if (url.includes('/upload/') && !url.includes('/f_auto,q_auto/')) {
      return url.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    return url;
  }

  /**
   * Generates an image poster thumbnail URL for a video asset
   * Takes the first frame (start_offset 0s) and exports as JPG
   */
  getVideoThumbnail(videoUrl, publicId) {
    if (publicId && this.isConfigured()) {
      return cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [
          { start_offset: '0', quality: 'auto:good' }
        ],
        secure: true
      });
    }

    if (videoUrl && videoUrl.includes('cloudinary.com')) {
      // Cloudinary video thumbnail pattern: swap extension to .jpg and inject so_0
      return videoUrl
        .replace(/\.(mp4|webm|mov|mkv)$/i, '.jpg')
        .replace('/upload/', '/upload/so_0,q_auto,f_auto/');
    }

    return '';
  }

  /**
   * Uploads a buffer to Cloudinary (image or video)
   * Enforces NO BASE64 IN MONGODB.
   *
   * @param {Buffer} buffer - File buffer
   * @param {string} folder - Destination folder on Cloudinary
   * @param {string} resourceType - 'image' | 'video' | 'auto'
   * @param {string} mimeType - File mimetype
   * @returns {Promise<{ url: string, publicId: string, resourceType: string, thumbnailUrl: string, duration?: number, width?: number, height?: number, format?: string, bytes?: number }>}
   */
  async uploadMedia(buffer, folder = 'socialx/posts', resourceType = 'auto', mimeType = '') {
    if (!this.isConfigured()) {
      // Local development / testing fallback when Cloudinary is not configured
      const mockId = `local_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return {
        url: `https://res.cloudinary.com/demo/image/upload/sample.jpg`,
        publicId: mockId,
        resourceType: resourceType === 'raw' ? 'raw' : (mimeType.startsWith('video/') ? 'video' : 'image'),
        thumbnailUrl: '',
        duration: 0,
        bytes: buffer.length
      };
    }

    const isRaw = resourceType === 'raw' || folder.includes('secret_chat') || mimeType === 'application/octet-stream';
    const isVideo = !isRaw && (resourceType === 'video' || (mimeType && mimeType.startsWith('video/')));
    const isAudio = !isRaw && (resourceType === 'audio' || (mimeType && mimeType.startsWith('audio/')));
    
    let targetResourceType = 'image';
    if (isRaw) targetResourceType = 'raw';
    else if (isVideo || isAudio) targetResourceType = 'video'; // Cloudinary handles audio as video resource_type

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder,
        resource_type: targetResourceType
      };

      if (!isRaw) {
        uploadOptions.quality = 'auto';
        uploadOptions.fetch_format = 'auto';

        if (!isVideo && !isAudio) {
          uploadOptions.transformation = [
            { width: 1920, height: 1920, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ];
        }
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(new Error(error.message || 'Media upload failed'));
          }

          let thumbnailUrl = '';
          if (targetResourceType === 'video' && !isAudio) {
            thumbnailUrl = this.getVideoThumbnail(result.secure_url, result.public_id);
          } else {
            thumbnailUrl = result.secure_url;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type || targetResourceType,
            thumbnailUrl,
            duration: result.duration || 0,
            width: result.width || 0,
            height: result.height || 0,
            format: result.format || '',
            bytes: result.bytes || 0
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Removes a media asset from Cloudinary
   * @param {string} publicId - Cloudinary asset public ID
   * @param {string} resourceType - 'image' | 'video'
   */
  async deleteMedia(publicId, resourceType = 'image') {
    if (!publicId || publicId.startsWith('local_')) {
      return { result: 'ok' };
    }

    if (!this.isConfigured()) {
      console.warn('Cloudinary not configured, skipping asset delete:', publicId);
      return null;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType || 'image',
        invalidate: true
      });
      return result;
    } catch (error) {
      console.warn(`Could not delete Cloudinary asset ${publicId}:`, error.message);
      return null;
    }
  }
}

export default new CloudinaryService();
