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
  accept?: string;
  helpText?: string;
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
  accept = ".zip,.sql,.txt,.bin,.md,.pls,.pkg,.prc,.fnc,.rs,.redshift",
  helpText,
}) => {
  return (
    <div className="space-y-6">
      <div
        className={`flex flex-col border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center items-center transition-all duration-300 ${
          dragActive
            ? "border-[#70CBCF] bg-gradient-to-br from-blue-50/80 to-cyan-50/60 shadow-xl scale-[1.02]"
            : "border-[#70CBCF]/60 bg-white hover:bg-gradient-to-br hover:from-green-50/40 hover:to-emerald-50/30 hover:border-[#70CBCF] hover:shadow-lg"
        }`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <label className="cursor-pointer mt-5 transform transition-transform duration-200 hover:scale-110">
          <img src={Upload} alt="upload" className="h-22" />
          <input
            type="file"
            accept={accept}
            onChange={onFileInput}
            className="hidden"
          />
        </label>
        <p className="text-lg mt-4 font-semibold text-gray-700 manrope-medium">
          Drop your file here or Browse
        </p>
        <p className="text-xs text-gray-500 mt-2 mb-5 max-w-md">
          {helpText ||
            "Supports ZIP files, SQL files (.sql, .pls, .pkg, .prc, .fnc, .rs, .redshift), Text files (.txt, .md), and Binary files (.bin)"}
        </p>
      </div>

      {selectedFile && fileStats && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 animate-fadeIn">
          <div className="flex flex-col p-5 bg-gradient-to-r from-gray-50 to-white shadow-md rounded-xl sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="mx-2 h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center shadow-sm">
                <img src={Folder} alt="file" className="h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 manrope-medium">
                  {selectedFile.name}
                </h4>
                <p className="text-sm text-gray-600 manrope-regular">
                  {formatBytes(selectedFile.size)}
                </p>
              </div>
            </div>
            <div className="mx-2 h-12 w-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-sm">
              <img src={Success} alt="success" className="h-6" />
            </div>
          </div>

          <StatsGrid stats={fileStats} />
          <FilesList files={fileStats.files} />

          <button
            onClick={onStart}
            className={`w-full py-4 text-white rounded-xl transition-all duration-200 font-semibold text-base shadow-lg bg-gradient-to-r from-[#E46356] to-[#B978B2] hover:from-[#D8554A] hover:to-[#A869A0] hover:shadow-xl hover:shadow-[#E46356]/40 transform hover:scale-[1.02] manrope-medium`}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default ZipUploadPanel;
