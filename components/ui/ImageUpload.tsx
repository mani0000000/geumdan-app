"use client";
import { useRef, useState } from "react";
import { ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "admin-images";

interface ImageUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder?: string;
  className?: string;
}

export default function ImageUpload({ value, onChange, folder = "misc", className = "" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const allowed = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"];
      if (!allowed.includes(ext)) throw new Error("지원하지 않는 파일 형식입니다");

      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (upErr) throw new Error(upErr.message);

      const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="업로드된 이미지"
            className="h-32 w-auto max-w-full rounded-xl object-cover border border-gray-200"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-[#f04452] text-white rounded-full flex items-center justify-center shadow hover:bg-[#d93748]"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#3182F6] hover:bg-blue-50 transition-colors"
        >
          {uploading ? (
            <Loader2 size={22} className="text-[#3182F6] animate-spin" />
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <ImageIcon size={18} className="text-gray-400" />
              </div>
              <p className="text-[12px] text-gray-400">클릭 또는 드래그하여 업로드</p>
              <p className="text-[11px] text-gray-300">JPG, PNG, WEBP, GIF (최대 10MB)</p>
            </>
          )}
        </div>
      )}

      {value && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-[12px] text-[#3182F6] hover:underline"
        >
          <Upload size={12} /> 이미지 교체
        </button>
      )}

      {uploading && value && (
        <p className="flex items-center gap-1.5 text-[12px] text-[#3182F6]">
          <Loader2 size={12} className="animate-spin" /> 업로드 중...
        </p>
      )}

      {error && <p className="text-[12px] text-[#f04452]">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
