import React from "react";
import { Download } from "lucide-react";
import { IoIosRepeat } from "react-icons/io";
import { FaChevronDown, FaChevronUp, FaFileLines } from "react-icons/fa6";
import { IoCodeSlash } from "react-icons/io5";

type ConvertedFileItem = {
  original: string;
  converted: string;
  snowflakeContent: string;
  oracleContent: string;
  targetFolder: string;
};

type ConversionData = {
  totalConverted: number;
  totalFiles: number;
  successRate: number;
  convertedFiles: ConvertedFileItem[];
};

type ApiConvertedFile = {
  success: boolean;
  message: string;
  source: string;
  jobId: string;
  analysis: any;
  conversion: ConversionData;
  zipFilename: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  convertedFile: ApiConvertedFile;
  expandedIndex: number | null;
  setExpandedIndex: (v: number | null) => void;
  onReconvert: () => void;
  onDownload: () => void;
};

const ResultPreviewModal: React.FC<Props> = ({
  open,
  onClose,
  convertedFile,
  expandedIndex,
  setExpandedIndex,
  onReconvert,
  onDownload,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold">✕</button>
        <h3 className="text-2xl manrope-semibold text-gray-900 mb-2 text-center">Preview</h3>
        <h1 className="w-full text-center text-sm mb-5 manrope-regular">Review a subset of original and converted outputs</h1>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-neutral-50 rounded-2xl max-h-[66vh]">
            <div className="flex items-center gap-2 mb-3 p-3 bg-neutral-200 rounded-t-2xl">
              <IoCodeSlash />
              <h4 className="font-regular text-gray-900">Original</h4>
            </div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 p-5">
              {convertedFile.conversion.convertedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className={`bg-white border-l-[3px] ${expandedIndex === idx ? "border-l-[#70CBCF]" : "border-neutral-300"} rounded-lg p-4 mb-6 transition-all duration-200`}
                >
                  <button onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)} className="w-full flex items-center justify-between text-left">
                    <p className="font-mono text-sm font-medium text-gray-800 truncate">{file.original}</p>
                    <span className="text-neutral-500 font-bold text-lg ml-2">{expandedIndex === idx ? <FaChevronUp /> : <FaChevronDown />}</span>
                  </button>
                  {expandedIndex === idx && (
                    <div className="mt-3 animate-fadeIn">
                      <pre className="text-xs bg-white p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                        <code className="text-gray-800">{file.oracleContent}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-neutral-50 rounded-2xl max-h-[66vh]">
            <div className="flex items-center gap-2 mb-3 p-3 bg-black rounded-t-2xl">
              <FaFileLines className="text-white" />
              <h4 className="font-regular text-white">Converted</h4>
            </div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 p-5">
              {convertedFile.conversion.convertedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className={`bg-white border-l-[3px] ${expandedIndex === idx ? "border-l-green-300" : "border-l-green-100"} rounded-lg p-4 mb-6 transition-all duration-200`}
                >
                  <button onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)} className="w-full flex items-center justify-between text-left">
                    <p className="font-mono text-sm font-medium text-gray-800 truncate">{file.converted}</p>
                    <span className="text-neutral-500 font-bold text-lg ml-2">{expandedIndex === idx ? <FaChevronUp /> : <FaChevronDown />}</span>
                  </button>
                  {expandedIndex === idx && (
                    <div className="mt-3 animate-fadeIn">
                      <pre className="text-xs bg-white p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                        <code className="text-gray-800">{file.snowflakeContent}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-row items-center justify-center mt-4 gap-5">
          <button onClick={onReconvert} className="w-[30%] px-6 py-3 border border-[#E46356] text-[#E46356] rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-lg">
            <IoIosRepeat className="w-6 h-6" />
            Reconvert
          </button>
          <button onClick={onDownload} className="w-[30%] px-6 py-3 bg-[#E46356] text-white rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-lg">
            <Download className="w-5 h-5" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultPreviewModal;


