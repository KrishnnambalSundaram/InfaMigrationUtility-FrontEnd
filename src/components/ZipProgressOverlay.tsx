import React from "react";
import analysing from "../assets/analysing.svg";
import done from "../assets/done.svg";
import processing from "../assets/processing.svg";

type Props = {
  visible: boolean;
  progress: number;
  currentStepText: string;
  filesConvertedCount: number;
  totalFilesCount: number;
  elapsedMs: number | null;
  etaMs: number | null;
};

const ZipProgressOverlay: React.FC<Props> = ({
  visible,
  progress,
  currentStepText,
  filesConvertedCount,
  totalFilesCount,
  elapsedMs,
  etaMs,
}) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8 sm:p-12 w-11/12 max-w-2xl">
        <div className="flex flex-col text-center items-center gap-3">
          <div className="flex justify-center items-center h-16 w-16 rounded-full bg-white shadow-black/20 shadow-xl">
            <img
              src={
                progress < 30 ? analysing : progress < 80 ? processing : done
              }
              className="h-8"
            />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3 mt-5 overflow-hidden">
            <div
              className="bg-[linear-gradient(90.04deg,_#E46356_0.1%,_#B978B2_25.01%,_#70CBCF_49.91%,_#E7E62A_99.73%)] h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(progress, 1)}%` }}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-gray-700">
              {Math.round(Math.max(progress, 1))}% Complete
              {totalFilesCount > 0 && (
                <span className="text-gray-500">
                  {" "}
                  · {filesConvertedCount}/{totalFilesCount} files
                </span>
              )}
              {(elapsedMs !== null || etaMs !== null) && (
                <span className="text-gray-500">
                  {" "}
                  ·{" "}
                  {elapsedMs !== null
                    ? `elapsed ${Math.max(0, Math.round(elapsedMs / 1000))}s`
                    : ""}
                  {etaMs !== null
                    ? `${elapsedMs !== null ? " · " : ""}ETA ${Math.max(
                        0,
                        Math.round(etaMs / 1000)
                      )}s`
                    : ""}
                </span>
              )}
            </p>
            <h3 className="manrope-medium text-sm sm:text-md text-gray-900">
              {currentStepText ||
                (progress < 30
                  ? "Initializing..."
                  : progress < 80
                  ? "Processing files..."
                  : "Finalizing...")}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZipProgressOverlay;
