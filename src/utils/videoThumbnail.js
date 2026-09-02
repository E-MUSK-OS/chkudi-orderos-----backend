import ffmpeg from "fluent-ffmpeg";
import path from "path";

export const generateVideoThumbnail = (videoPath, thumbnailPath) => {
  return new Promise((resolve) => {
    ffmpeg(videoPath)
      .on("end", () => resolve(thumbnailPath))
      .on("error", (err) => {
        console.warn("Failed to generate thumbnail (is ffmpeg installed?):", err.message);
        resolve(null); // Resolve gracefully so video upload doesn't fail
      })
      .screenshots({
        timestamps: ["00:00:01.000"],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: "320x240"
      });
  });
};
