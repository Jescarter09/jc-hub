import crypto from 'node:crypto';

function getCloudinaryConfig() {
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary server credentials are missing.');
  }

  return { cloudName, apiKey, apiSecret };
}

function signUploadParams(params, apiSecret) {
  const signatureBase = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto.createHash('sha1').update(`${signatureBase}${apiSecret}`).digest('hex');
}

export async function uploadRemoteResourceToCloudinary(remoteUrl, options = {}) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const resourceType = options.resourceType || 'raw';
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    timestamp,
    overwrite: 'true'
  };

  if (options.folder) params.folder = options.folder;
  if (options.publicId) params.public_id = options.publicId;

  const formData = new FormData();
  formData.append('file', remoteUrl);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('overwrite', 'true');

  if (options.folder) formData.append('folder', options.folder);
  if (options.publicId) formData.append('public_id', options.publicId);

  formData.append('signature', signUploadParams(params, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: formData
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Cloudinary upload failed.');
  }

  return payload;
}
