import React from "react";
import Folder from "../assets/folder.svg";
import { formatBytes } from "../utils/format";

type FileItem = { name: string; size: number; lines: number };

const FilesList: React.FC<{ files: FileItem[] }> = ({ files }) => {
  return (
    <div className="mb-6 rounded-2xl bg-white shadow-lg border border-gray-100 p-6">
      <h5 className="font-semibold text-gray-900 mb-4 manrope-medium text-lg">
        {files.length === 0 ? "No files to convert" : "Files to Convert"}
      </h5>
      <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
        {files.map((file, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-blue-50/50 hover:to-cyan-50/30 p-3 rounded-lg transition-all duration-200 border border-gray-100 hover:border-blue-200 hover:shadow-md group"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center group-hover:from-blue-200 group-hover:to-cyan-200 transition-all duration-200">
                <img src={Folder} alt="file" className="h-4" />
              </div>
              <span className="text-sm text-gray-900 truncate manrope-regular font-medium">{file.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600 ml-4">
              <span className="whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md manrope-medium">{file.lines} lines</span>
              <span className="px-3 py-1 border-l border-l-neutral-300 whitespace-nowrap bg-gray-50 rounded-md manrope-medium">
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


