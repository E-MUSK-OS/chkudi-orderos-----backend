export const generateThumbnailUrl = (videoUrl) => {
  return videoUrl
    .replace("/video/upload/", "/video/upload/so_2/")
    .replace(/\.(mp4|webm|mov|avi)$/i, ".jpg");
};