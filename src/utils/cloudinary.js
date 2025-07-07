import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto", // good for images, videos, etc.
        });

        console.log("✅ File uploaded to Cloudinary:", response.secure_url);

        // Optionally delete local file after upload
        fs.unlinkSync(localFilePath);

        return response;
    } catch (error) {
        console.error("❌ Cloudinary upload failed:", error);

        // Cleanup local file if it exists
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return null;
    }
};

export { uploadOnCloudinary };
