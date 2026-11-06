import crypto from "node:crypto";

// All product images live in this folder, and only these formats are allowed.
export const CLOUDINARY_FOLDER = "my-store/products";
export const CLOUDINARY_ALLOWED_FORMATS = "jpg,png,webp";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

// Cloud name is public, so it is also safe to use during server validation.
export function getCloudinaryCloudName(): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error(
      "Missing Cloudinary env variable: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
    );
  }
  return cloudName;
}

// Read the secret only on the server. Never send it to the browser.
export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = getCloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const missing = [
    !apiKey && "CLOUDINARY_API_KEY",
    !apiSecret && "CLOUDINARY_API_SECRET",
  ].filter(Boolean);

  if (!apiKey || !apiSecret) {
    throw new Error(
      `Missing Cloudinary env variables: ${missing.join(", ")}`,
    );
  }

  return { cloudName, apiKey, apiSecret };
}

// Build the signed upload data the browser needs. The secret stays here.
export function createUploadSignature() {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);

  // These parameters must match exactly what the browser sends.
  const params: Record<string, string> = {
    allowed_formats: CLOUDINARY_ALLOWED_FORMATS,
    folder: CLOUDINARY_FOLDER,
    timestamp: String(timestamp),
  };

  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(`${toSign}${apiSecret}`)
    .digest("hex");

  return {
    cloudName,
    apiKey,
    timestamp,
    folder: CLOUDINARY_FOLDER,
    allowedFormats: CLOUDINARY_ALLOWED_FORMATS,
    signature,
  };
}

// Delete one image with the signed Upload API (image/destroy).
export async function deleteCloudinaryImage(
  publicId: string,
): Promise<{ deleted: boolean; warning?: string }> {
  // Only allow deleting images inside our product folder.
  if (!publicId.startsWith(`${CLOUDINARY_FOLDER}/`)) {
    return { deleted: false, warning: "الصورة لا تنتمي إلى مجلد المنتجات." };
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = String(Math.floor(Date.now() / 1000));

  // Sign the same parameters we send below.
  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp,
    api_key: apiKey,
    signature,
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Message only; never credentials or secrets.
    console.error(
      `[cloudinary/delete] status=${response.status} message=${data?.error?.message ?? "unknown"}`,
    );
    return { deleted: false, warning: "تعذر حذف الصورة من Cloudinary." };
  }

  // "not found" means the image is already gone, which is fine for us.
  return { deleted: true };
}
