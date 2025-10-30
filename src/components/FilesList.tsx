import React from "react";
import Folder from "../assets/folder.svg";
import { formatBytes } from "../utils/format";

type FileItem = { name: string; size: number; lines: number };

const FilesList: React.FC<{ files: FileItem[] }> = ({ files }) => {
  return (
    <div className="mb-6 rounded-2xl shadow-2xl p-5">
      <h5 className="font-medium text-gray-900 mb-3">
        {files.length === 0 ? "No files to convert" : "Files to Convert"}
      </h5>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {files.map((file, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={Folder} alt="file" className="h-5 px-2" />
              <span className="text-sm text-gray-900 truncate">{file.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600 ml-4">
              <span className="whitespace-nowrap">{file.lines} lines</span>
              <span className="px-2 border-l border-l-neutral-300 whitespace-nowrap">
                {formatBytes(file.size)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilesList;


