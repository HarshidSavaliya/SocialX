import cloudinary from '../config/cloudinary.js';

class CloudinaryService {
  /**
   * Uploads a buffer to Cloudinary (image or video)
   * @param {Buffer} buffer - File buffer from multer memoryStorage
   * @param {string} folder - Destination folder on Cloudinary
   * @param {string} resourceType - 'image' | 'video' | 'auto'
   * @param {string} mimeType - File mimetype
   * @returns {Promise<{ url: string, publicId: string, resourceType: string }>}
   */
  async uploadMedia(buffer, folder = 'socialx/posts', resourceType = 'auto', mimeType = '') {
    const isCloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY !== 'demo';

    // If Cloudinary is configured with real credentials, stream upload
    if (isCloudinaryConfigured) {
      return new Promise((resolve, reject) => {
        const uploadOptions = {
          folder,
          resource_type: resourceType,
          quality: 'auto',
          fetch_format: 'auto'
        };

        if (resourceType === 'image' || (!resourceType && !mimeType.startsWith('video/'))) {
          uploadOptions.transformation = [
            { width: 1920, height: 1920, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ];
        }

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return reject(new Error(error.message || 'Media upload failed'));
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              resourceType: result.resource_type || (mimeType.startsWith('video/') ? 'video' : 'image')
            });
          }
        );

        uploadStream.end(buffer);
      });
    }

    // Graceful fallback for local development or testing without live Cloudinary credentials
    const detectedType = mimeType.startsWith('video/') ? 'video' : 'image';
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;
    const mockPublicId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      url: dataUrl,
      publicId: mockPublicId,
      resourceType: detectedType
    };
  }

  /**
   * Removes a media asset from Cloudinary
   * @param {string} publicId - Cloudinary asset public ID
   * @param {string} resourceType - 'image' | 'video'
   * @returns {Promise<any>}
   */
  async deleteMedia(publicId, resourceType = 'image') {
    if (!publicId || publicId.startsWith('local_')) {
      return { result: 'ok' };
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType || 'image'
      });
      return result;
    } catch (error) {
      console.warn(`Could not delete Cloudinary asset ${publicId}:`, error.message);
      return null;
    }
  }
}

export default new CloudinaryService();
