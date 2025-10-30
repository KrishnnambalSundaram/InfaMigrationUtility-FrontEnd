import { Loader2 } from "lucide-react";
import React from "react";

type SingleOutputFile = {
  name: string;
  path: string;
  mime: string;
  kind: "single";
};

type Props = {
  singleFileName: string;
  setSingleFileName: (v: string) => void;
  singleSourceCode: string;
  setSingleSourceCode: (v: string) => void;
  singleResult: string;
  isConvertingSingle: boolean;
  singleOutputs: SingleOutputFile[];
  onConvert: () => void;
  onDownload: () => void;
  placeholder: string;
};

const SingleEditorsPanel: React.FC<Props> = ({
  singleFileName,
  setSingleFileName,
  singleSourceCode,
  setSingleSourceCode,
  singleResult,
  isConvertingSingle,
  singleOutputs,
  onConvert,
  onDownload,
  placeholder,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow p-4 md:p-6">
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 flex flex-col">
          <input
            value={singleFileName}
            onChange={(e) => setSingleFileName(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm mb-2"
            placeholder="file name (e.g. query.sql | run.sh)"
          />
          <textarea
            value={singleSourceCode}
            onChange={(e) => setSingleSourceCode(e.target.value)}
            className="border rounded-md p-3 font-mono text-sm min-h-[320px] h-full"
            placeholder={placeholder}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Output</span>
            <div className="flex items-center gap-2">
              {(singleOutputs.length > 0 ||
                (singleResult && singleResult.trim().length > 0)) && (
                <button
                  onClick={onDownload}
                  className="px-4 py-2 rounded-md border border-[#E46356] text-[#E46356] text-sm"
                >
                  Download
                </button>
              )}
              <button
                onClick={onConvert}
                disabled={isConvertingSingle || !singleSourceCode}
                className={`px-4 py-2 rounded-md text-white text-sm ${
                  isConvertingSingle || !singleSourceCode
                    ? "bg-[#E46356]/60"
                    : "bg-[#E46356]"
                }`}
              >
                {isConvertingSingle ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Converting
                  </span>
                ) : (
                  "Convert"
                )}
              </button>
            </div>
          </div>
          <textarea
            value={singleResult}
            readOnly
            className="border rounded-md p-3 font-mono text-sm min-h-[320px] h-full bg-neutral-50"
            placeholder="Converted output will appear here..."
          />
        </div>
      </div>
    </div>
  );
};

export default SingleEditorsPanel;
