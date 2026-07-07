import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";

export const uploadVideoToCloudinary = (buffer, trackingId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",

        folder: "vms-recordings",

        public_id: trackingId,

        overwrite: true,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};