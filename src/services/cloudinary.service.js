import { Readable } from "stream";

import cloudinary from "../config/cloudinary.js";

export const uploadVideoToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "vms",

        resource_type: "video",
      },
      (error, result) => {
        if (error) {
          reject(error);

          return;
        }

        resolve(result);
      },
    );

    Readable.from(buffer).pipe(stream);
  });