import fs from "fs";
import path from "path";
import { getScanByIdService } from "../services/vms.service.js";
import { generateVideoThumbnail } from "../utils/videoThumbnail.js";
import { updateScan } from "../repositories/vms.repository.js";

const SVG_THUMBNAIL_PLACEHOLDER = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240" fill="none">
    <rect width="320" height="240" fill="#0f172a"/>
    <rect x="1" y="1" width="318" height="238" rx="8" stroke="#334155" stroke-width="2"/>
    <circle cx="160" cy="105" r="28" fill="#1e293b" stroke="#475569" stroke-width="2"/>
    <polygon points="153,92 173,105 153,118" fill="#94a3b8"/>
    <text x="160" y="165" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" text-anchor="middle" letter-spacing="0.5">VMS RECORDING</text>
  </svg>`
);

const sendThumbnailPlaceholder = (res) => {
  res.writeHead(200, {
    "Content-Type": "image/svg+xml",
    "Content-Length": SVG_THUMBNAIL_PLACEHOLDER.length,
    "Cache-Control": "public, max-age=300",
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  res.end(SVG_THUMBNAIL_PLACEHOLDER);
};

export const streamMedia = async (req, res, next, isVideo) => {
  let targetPath = null;
  try {
    const scan = await getScanByIdService(req.params.id);
    if (!scan) return res.status(404).send("Not found");

    // ==========================================
    // THUMBNAIL STREAMING (isVideo === false)
    // ==========================================
    if (!isVideo) {
      let thumbPath = scan.thumbnailPath;

      // 1. Try existing thumbnailPath if file exists on disk
      if (thumbPath) {
        let exists = false;
        try {
          exists = fs.existsSync(thumbPath);
        } catch (e) {
          exists = false;
        }

        if (exists) {
          const stat = fs.statSync(thumbPath);
          res.writeHead(200, {
            "Content-Length": stat.size,
            "Content-Type": "image/jpeg",
            "Access-Control-Allow-Origin": "*",
            "Cross-Origin-Resource-Policy": "cross-origin",
          });
          return fs.createReadStream(thumbPath).pipe(res);
        }
      }

      // 2. If thumbnail file is missing, but video file exists: generate it on-the-fly
      if (scan.filePath) {
        let videoExists = false;
        try {
          videoExists = fs.existsSync(scan.filePath);
        } catch (e) {
          videoExists = false;
        }

        if (videoExists) {
          const videoDir = path.dirname(scan.filePath);
          let expectedThumbPath;
          if (path.basename(videoDir) === "video") {
            const parentDir = path.dirname(videoDir);
            expectedThumbPath = path.join(parentDir, "thumbnail", path.basename(scan.filePath).replace(/\.[^/.]+$/, ".jpg"));
          } else {
            expectedThumbPath = scan.filePath.replace(/\.[^/.]+$/, ".jpg");
          }
          await fs.promises.mkdir(path.dirname(expectedThumbPath), { recursive: true });
          try {
            const genPath = await generateVideoThumbnail(scan.filePath, expectedThumbPath);
            if (genPath && fs.existsSync(genPath)) {
              await updateScan(scan.id, { thumbnailPath: genPath });
              const stat = fs.statSync(genPath);
              res.writeHead(200, {
                "Content-Length": stat.size,
                "Content-Type": "image/jpeg",
                "Access-Control-Allow-Origin": "*",
                "Cross-Origin-Resource-Policy": "cross-origin",
              });
              return fs.createReadStream(genPath).pipe(res);
            }
          } catch (genErr) {
            console.warn("Failed on-demand thumbnail generation:", genErr.message);
          }
        }
      }

      // 3. Historical Cloudinary thumbnail fallback
      if (scan.thumbnailUrl && scan.thumbnailUrl.startsWith("http")) {
        return res.redirect(scan.thumbnailUrl);
      }

      // 4. Default: Return SVG placeholder so the UI displays an elegant thumbnail instead of broken alt text
      return sendThumbnailPlaceholder(res);
    }

    // ==========================================
    // VIDEO STREAMING (isVideo === true)
    // ==========================================
    targetPath = scan.filePath;
    const legacyUrl = scan.videoUrl;

    if (!targetPath) {
      if (legacyUrl && legacyUrl.startsWith("http")) {
        return res.redirect(legacyUrl); // Fallback for historical scans on Cloudinary
      }
      return res.status(404).send("Media not found");
    }

    const nasRoot = process.env.NAS_ROOT_PATH;
    const resolvedPath = targetPath;
    if (nasRoot) {
      const normalizedNasRoot = path.resolve(nasRoot).toLowerCase();
      const normalizedTarget = path.resolve(resolvedPath).toLowerCase();
      if (!normalizedTarget.startsWith(normalizedNasRoot)) {
        return res.status(403).send("Forbidden");
      }
    }

    let exists = false;
    try {
      exists = fs.existsSync(resolvedPath);
    } catch (e) {
      exists = false;
    }

    if (!exists) {
      if (legacyUrl && legacyUrl.startsWith("http")) {
        return res.redirect(legacyUrl);
      }
      return res.status(404).json({
        success: false,
        message: "Video file not found or storage is inaccessible",
        path: resolvedPath,
      });
    }

    let stat;
    try {
      stat = fs.statSync(resolvedPath);
    } catch (e) {
      return res.status(404).json({
        success: false,
        message: "Cannot read media file statistics",
        details: e.message,
        path: resolvedPath,
      });
    }

    const fileSize = stat.size;
    const range = req.headers.range;
    const isDownload = req.query.download === "true";

    // Detect format (WebM vs MP4)
    let contentType = "video/mp4";
    try {
      const buf = Buffer.alloc(12);
      const fd = fs.openSync(resolvedPath, "r");
      fs.readSync(fd, buf, 0, 12, 0);
      fs.closeSync(fd);
      if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
        contentType = "video/webm";
      } else if (scan.fileName && scan.fileName.toLowerCase().endsWith(".webm")) {
        contentType = "video/webm";
      }
    } catch (e) {
      if (scan.fileName && scan.fileName.toLowerCase().endsWith(".webm")) {
        contentType = "video/webm";
      }
    }

    // Format: TrackingID_YYYY-MM-DD_HH-mm-ss
    const d = new Date(scan.createdAt);
    const pad = (n) => n.toString().padStart(2, "0");
    const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const formattedTime = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;

    const ext = contentType === "video/webm" ? ".webm" : ".mp4";
    const filename = `${scan.trackingId}_${formattedDate}_${formattedTime}${ext}`;

    if (range && !isDownload) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(resolvedPath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
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

