import fs from "fs";
import path from "path";
import { getScanByIdService } from "../services/vms.service.js";

export const streamMedia = async (req, res, next, isVideo) => {
  try {
    const scan = await getScanByIdService(req.params.id);
    if (!scan) return res.status(404).send("Not found");

    const targetPath = isVideo ? scan.filePath : scan.thumbnailPath;
    const legacyUrl = isVideo ? scan.videoUrl : scan.thumbnailUrl;

    if (!targetPath) {
      if (legacyUrl && legacyUrl.startsWith('http')) {
        return res.redirect(legacyUrl); // Fallback for historical scans on Cloudinary
      }
      return res.status(404).send("Media not found");
    }

    const nasRoot = process.env.NAS_ROOT_PATH;
    const resolvedPath = targetPath;
    if (!resolvedPath.toLowerCase().startsWith(nasRoot.toLowerCase())) return res.status(403).send("Forbidden");

    const stat = fs.statSync(resolvedPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const isDownload = req.query.download === 'true';
    
    // Format: TrackingID_YYYY-MM-DD_HH-mm-ss
    const d = new Date(scan.createdAt);
    const pad = (n) => n.toString().padStart(2, "0");
    const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const formattedTime = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    
    const ext = isVideo ? ".mp4" : ".jpg";
    const filename = `${scan.trackingId}_${formattedDate}_${formattedTime}${ext}`;
    if (range && isVideo && !isDownload) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(resolvedPath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": isVideo ? "video/mp4" : "image/jpeg",
      };
      if (isDownload) {
        head["Content-Disposition"] = `attachment; filename="${filename}"`;
      }
      res.writeHead(200, head);
      fs.createReadStream(resolvedPath).pipe(res);
    }
  } catch (err) {
    console.error("STREAM MEDIA ERROR:", err);
    res.status(500).json({ error: "Stream error", details: err.message, path: targetPath });
  }
};

export const streamRecording = (req, res, next) => streamMedia(req, res, next, true);
export const streamThumbnail = (req, res, next) => streamMedia(req, res, next, false);
