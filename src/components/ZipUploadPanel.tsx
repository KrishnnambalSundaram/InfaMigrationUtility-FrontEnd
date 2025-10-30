import React from "react";
import Folder from "../assets/folder.svg";
import Success from "../assets/success.svg";
import Upload from "../assets/upload.webp";
import { formatBytes } from "../utils/format";
import FilesList from "./FilesList";
import type { FileStatsProps } from "./StatsGrid";
import StatsGrid from "./StatsGrid";

type Props = {
  dragActive: boolean;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFile: File | null;
  fileStats: FileStatsProps | null;
  onStart: () => void;
  actionLabel?: string;
};

const ZipUploadPanel: React.FC<Props> = ({
  dragActive,
  onDrag,
  onDrop,
  onFileInput,
  selectedFile,
  fileStats,
  onStart,
  actionLabel = "Start Conversion",
}) => {
  return (
    <div className="space-y-6">
      <div
        className={`flex flex-col border rounded-xl p-8 sm:p-12 text-center items-center transition-all ${
          dragActive
            ? "border-[#70CBCF]/50 bg-blue-50"
            : "border-[#70CBCF] hover:bg-green-50/40"
        }`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <label className="cursor-pointer mt-5">
          <img src={Upload} alt="upload" className="h-22" />
          <input
            type="file"
            accept=".zip"
            onChange={onFileInput}
            className="hidden"
          />
        </label>
        <p className="text-md mt-2 font-semibold text-gray-600">
          Drop your file here or Browse
        </p>
        <p className="text-xs text-gray-500 mt-2 mb-5">Supports ZIP files</p>
      </div>

      {selectedFile && fileStats && (
        <div className="bg-gray-50">
          <div className="flex flex-col p-5 shadow-xl rounded-xl sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="mx-4 h-10 rounded-lg flex items-center justify-center">
                <img src={Folder} alt="file" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900">
                  {selectedFile.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {formatBytes(selectedFile.size)}
                </p>
              </div>
            </div>
            <div className="mx-4 h-10 rounded-lg flex items-center justify-center">
              <img src={Success} alt="success" />
            </div>
          </div>

          <StatsGrid stats={fileStats} />
          <FilesList files={fileStats.files} />

          <button
            onClick={onStart}
            className={`w-full py-3 sm:py-4 text-white rounded-lg transition font-semibold text-base shadow-l bg-[#E46356]`}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default ZipUploadPanel;
