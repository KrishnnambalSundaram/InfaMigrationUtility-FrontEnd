import React from "react";
import { Download } from "lucide-react";
import { IoIosRepeat } from "react-icons/io";

type Props = {
  showPreview: boolean;
  onTogglePreview: () => void;
  onReconvert: () => void;
  onDownload: () => void;
};

const ResultActionBar: React.FC<Props> = ({ showPreview, onTogglePreview, onReconvert, onDownload }) => {
  return (
    <div className="flex gap-3 min-w-xl ml-[-10px]">
      <button
        onClick={onTogglePreview}
        className="flex-1 sm:flex-none px-6 py-3 w-[40%] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium flex items-center justify-center gap-2"
      >
        {showPreview ? "Hide" : "Preview"}
      </button>
      <button
        onClick={onReconvert}
        className="flex-1 sm:flex-none px-6 py-3 w-[30%] border border-[#E46356] text-[#E46356] rounded-lg hover:bg-red-50 transition font-medium flex items-center justify-center gap-2"
      >
        <IoIosRepeat className="w-5 h-5" />
        Reconvert
      </button>
      <button
        onClick={onDownload}
        className="flex-1 sm:flex-none px-6 py-3 w-[30%] bg-[#E46356] text-white rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-lg"
      >
        <Download className="w-5 h-5" />
        Download
      </button>
    </div>
  );
};

export default ResultActionBar;


