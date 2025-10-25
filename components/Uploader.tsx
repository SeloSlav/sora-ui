"use client";
import { useRef } from "react";

type RefFile = {
  name: string;
  dataUrl: string;
};

export default function Uploader({
  label,
  onFile,
}: {
  label: string;
  onFile: (file: RefFile | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      onFile(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onFile({ name: file.name, dataUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onChange}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer cursor-pointer transition-all"
        />
      </div>
    </div>
  );
}