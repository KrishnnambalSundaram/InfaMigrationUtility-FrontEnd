import React from "react";

type SingleOutputFile = {
  name: string;
  path: string;
  mime: string;
  kind: "single";
};

type Props = {
  singleSourceCode: string;
  setSingleSourceCode: (v: string) => void;
  singleResult: string;
  singleOutputs: SingleOutputFile[];
  onDownload: () => void;
  placeholder: string;
};

const SingleEditorsPanel: React.FC<Props> = ({
  singleSourceCode,
  setSingleSourceCode,
  singleResult,
  singleOutputs,
  onDownload,
  placeholder,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        <div className="flex-1 flex flex-col">
          <label className="text-sm text-gray-700 manrope-medium font-semibold mb-2">
            Input
          </label>
          <textarea
            value={singleSourceCode}
            onChange={(e) => setSingleSourceCode(e.target.value)}
            className="border-2 border-gray-200 rounded-lg p-4 font-mono text-sm min-h-[320px] h-full focus:border-[#70CBCF] focus:ring-2 focus:ring-[#70CBCF]/20 transition-all duration-200 outline-none bg-white resize-none"
            placeholder={placeholder}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 manrope-medium font-semibold">
              Output
            </span>
            {(singleOutputs.length > 0 ||
              (singleResult && singleResult.trim().length > 0)) && (
              <button
                onClick={onDownload}
                className="px-5 py-2 rounded-lg border-2 border-[#E46356] text-[#E46356] text-sm hover:bg-[#E46356] hover:text-white transition-all duration-200 font-medium manrope-medium shadow-sm hover:shadow-md"
              >
                Download
              </button>
            )}
          </div>
          <textarea
            value={singleResult}
            readOnly
            className="border-2 border-gray-200 rounded-lg p-4 font-mono text-sm min-h-[320px] h-full bg-gradient-to-br from-gray-50 to-neutral-50 resize-none"
            placeholder="Converted output will appear here..."
          />
        </div>
      </div>
    </div>
  );
};

export default SingleEditorsPanel;
