import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import { execFile } from "child_process";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

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

export const getVideoDuration = (videoPath) => {
  return new Promise((resolve) => {
    if (!ffmpegPath) return resolve(null);
    execFile(ffmpegPath, ["-i", videoPath], (err, stdout, stderr) => {
      const match = (stderr || "").match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/);
      if (match) {
        const sec = (+match[1]) * 3600 + (+match[2]) * 60 + parseFloat(match[3]);
        resolve(Math.round(sec));
      } else {
        resolve(null);
      }
    });
  });
};
