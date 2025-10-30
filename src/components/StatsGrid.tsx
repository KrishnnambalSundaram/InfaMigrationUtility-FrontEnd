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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 ">
      <div className="bg-[linear-gradient(135deg,_rgba(231,230,42,0.2)_0%,_rgba(220,252,231,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
        <div className="flex items-center gap-2 my-3 justify-center">
          <img src={Totalfile} alt="files" />
        </div>
        <p className="text-2xl font-bold text-gray-900 text-center">
          {stats.totalFilesinFile}
        </p>
        <p className="text-xs text-gray-500 text-center">Total files</p>
      </div>

      <div className="bg-[linear-gradient(135deg,_rgba(112,203,207,0.2)_0%,_rgba(219,234,254,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
        <div className="flex items-center gap-2 my-3 justify-center">
          <img src={SqlFiles} alt="files" />
        </div>
        <p className="text-2xl font-bold text-gray-900 text-center">
          {stats.totalFiles}
        </p>
        <p className="text-xs text-gray-500 text-center">Scripts detected</p>
      </div>

      <div className="bg-[linear-gradient(135deg,_rgba(185,120,178,0.2)_0%,_rgba(252,231,243,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
        <div className="flex items-center gap-2 my-3 justify-center">
          <img src={CodeLines} alt="files" />
        </div>
        <p className="text-2xl font-bold text-gray-900 text-center">
          {stats.totalLines.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 text-center">of code</p>
      </div>

      <div className="bg-[linear-gradient(135deg,_rgba(228,99,86,0.2)_0%,_rgba(255,237,212,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
        <div className="flex items-center gap-2 my-3 justify-center">
          <img src={Classes} alt="files" />
        </div>
        <p className="text-2xl font-bold text-gray-900 text-center">
          {formatBytes(stats.totalSize)}
        </p>
        <p className="text-xs text-gray-500 text-center">File size</p>
      </div>
    </div>
  );
};

export default StatsGrid;


