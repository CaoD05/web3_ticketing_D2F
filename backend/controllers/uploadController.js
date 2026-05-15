const supabase = require("../config/supabaseClient");
const path = require("path");

const BUCKET = process.env.SUPABASE_BUCKET || "event-images";

/**
 * uploadImage — Upload ảnh lên Supabase Storage
 *
 * POST /api/upload
 * Content-Type: multipart/form-data
 * Field: image (file)
 *
 * Trả về URL công khai của ảnh sau khi upload thành công.
 */
async function uploadImage(req, res) {
  try {
    // Kiểm tra Supabase client đã được khởi tạo chưa
    if (!supabase) {
      return res.status(503).json({
        ok: false,
        message: "Supabase chưa được cấu hình. Vui lòng thiết lập SUPABASE_URL và SUPABASE_SERVICE_KEY.",
      });
    }

    // Kiểm tra file có được gửi không
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "Không tìm thấy file. Vui lòng gửi file ảnh với field name 'image'.",
      });
    }

    const file = req.file;
    const ext = path.extname(file.originalname) || ".jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = `uploads/${fileName}`;

    // Upload lên Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[uploadController] ❌ Supabase upload error:", error);
      return res.status(500).json({
        ok: false,
        message: "Upload thất bại",
        error: error.message,
      });
    }

    // Lấy URL công khai
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;

    console.log(`[uploadController] ✅ Upload thành công: ${publicUrl}`);

    return res.status(201).json({
      ok: true,
      message: "Upload thành công",
      data: {
        url: publicUrl,
        fileName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
    });
  } catch (error) {
    console.error("[uploadController] ❌ Lỗi upload:", error);
    return res.status(500).json({
      ok: false,
      message: "Lỗi server khi upload ảnh",
      error: error.message,
    });
  }
}

module.exports = { uploadImage };
