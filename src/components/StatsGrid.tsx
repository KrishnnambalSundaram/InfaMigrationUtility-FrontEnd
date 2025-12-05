import React from "react";
import Classes from "../assets/classes.svg";
import CodeLines from "../assets/code.svg";
import SqlFiles from "../assets/sqlfiles.svg";
import Totalfile from "../assets/totalfile.svg";
import { formatBytes } from "../utils/format";

type FileItem = { name: string; size: number; lines: number };

export type FileStatsProps = {
  totalFilesinFile: number;
  totalFiles: number;
  totalSize: number;
  totalLines: number;
  files: FileItem[];
};

const StatsGrid: React.FC<{ stats: FileStatsProps }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-yellow-50 via-emerald-50/50 to-white p-5 rounded-xl py-6 shadow-md hover:shadow-lg transition-all duration-200 border border-yellow-100/50 hover:scale-105">
        <div className="flex items-center gap-2 my-3 justify-center">
          <img src={Totalfile} alt="files" className="h-8" />
        </div>
        <p className="text-3xl font-bold text-gray-900 text-center manrope-bold">
          {stats.totalFilesinFile}
        </p>
        <p className="text-xs text-gray-600 text-center mt-1 manrope-medium">Total files</p>
      </div>

      <div className="bg-gradient-to-br from-cyan-50 via-blue-50/50 to-white p-5 rounded-xl py-6 shadow-md hover:shadow-lg transition-all duration-200 border border-cyan-100/50 hover:scale-105">
        <div className="flex items-center gap-2 my-3 justify-center">
          <img src={SqlFiles} alt="files" className="h-8" />
        </div>
        <p className="text-3xl font-bold text-gray-900 text-center manrope-bold">
          {stats.totalFiles}
        </p>
        <p className="text-xs text-gray-600 text-center mt-1 manrope-medium">Scripts detected</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 via-pink-50/50 to-white p-5 rounded-xl py-6 shadow-md hover:shadow-lg transition-all duration-200 border border-purple-100/50 hover:scale-105">
        <div className="flex items-center gap-2 my-3 justify-center">
          <img src={CodeLines} alt="files" className="h-8" />
        </div>
        <p className="text-3xl font-bold text-gray-900 text-center manrope-bold">
          {stats.totalLines.toLocaleString()}
        </p>
        <p className="text-xs text-gray-600 text-center mt-1 manrope-medium">of code</p>
      </div>

      <div className="bg-gradient-to-br from-orange-50 via-red-50/50 to-white p-5 rounded-xl py-6 shadow-md hover:shadow-lg transition-all duration-200 border border-orange-100/50 hover:scale-105">
        <div className="flex items-center gap-2 my-3 justify-center">
          <img src={Classes} alt="files" className="h-8" />
        </div>
        <p className="text-3xl font-bold text-gray-900 text-center manrope-bold">
          {formatBytes(stats.totalSize)}
        </p>
        <p className="text-xs text-gray-600 text-center mt-1 manrope-medium">File size</p>
      </div>
    </div>
  );
};

export default StatsGrid;


