import JSZip from "jszip";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaChevronDown, FaChevronUp, FaFileLines } from "react-icons/fa6";
import { IoIosRepeat } from "react-icons/io";
import { IoCodeSlash } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import {
  conversionDownload,
  convertUnified,
  fileUpload,
  idmcBatch,
  idmcBatchSummary,
  type IdmcOutputFormat,
  type SingleOutputFile,
  type UnifiedResponse,
  type UnifiedSingleResponse,
} from "../api/fileConvertAPI";
import { connectSocket, disconnectSocket } from "../api/websocket";
import analysing from "../assets/analysing.svg";
import Classes from "../assets/classes.svg";
import CodeLines from "../assets/code.svg";
import done from "../assets/done.svg";
import FinalSuccess from "../assets/final-success.svg";
import Folder from "../assets/folder.svg";
import processing from "../assets/processing.svg";
import SqlFiles from "../assets/sqlfiles.svg";
import Success from "../assets/success.svg";
import Totalfile from "../assets/totalfile.svg";
import Upload from "../assets/upload.webp";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import useBackHandler from "../utils/hooks/useBackHandler";

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
  analysis: {
    totalFiles: number;
    oracleFiles: number;
    solutionName: string;
    linesOfCode: number;
    fileSize: string;
    namespaces: string[];
    classes: number;
    dependencies: string[];
  };
  conversion: ConversionData;
  zipFilename: string;
};

type PageType = "upload" | "progress" | "result" | "success" | "error";

type FileStats = {
  totalFilesinFile: number;
  totalFiles: number;
  totalSize: number;
  totalLines: number;
  files: Array<{ name: string; size: number; lines: number }>;
};

type TabKey = "idmc-sql" | "snowflake" | "idmc-batch" | "batch-human";

type InputMode = "zip" | "single";

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const countLines = (content: string): number => {
  return content.split("\n").length;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState<PageType>("upload");
  const [selectedTab, setSelectedTab] = useState<TabKey>("idmc-sql");
  const [inputMode, setInputMode] = useState<InputMode>("zip");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<any | null>(null);
  const [convertedFile, setConvertedFile] = useState<ApiConvertedFile | null>(
    null
  );
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState<string>("");
  const [filesConvertedCount, setFilesConvertedCount] = useState<number>(0);
  const [totalFilesCount, setTotalFilesCount] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [etaMs, setEtaMs] = useState<number | null>(null);
  const [showZipOverlay, setShowZipOverlay] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const activeJobIdRef = useRef<string | null>(null);
  const finalizedRef = useRef<boolean>(false);

  // Single-input editors
  const [singleSourceCode, setSingleSourceCode] = useState<string>("");
  const [singleFileName, setSingleFileName] = useState<string>("input.sql");
  const [singleResult, setSingleResult] = useState<string>("");
  const [isConvertingSingle, setIsConvertingSingle] = useState<boolean>(false);
  const [singleOutputs, setSingleOutputs] = useState<SingleOutputFile[]>([]);

  // Output format (IDMC only)
  const [outputFormat, setOutputFormat] = useState<IdmcOutputFormat>("json");
  // Output format for batch/human summaries
  const [batchOutputFormat, setBatchOutputFormat] = useState<"md" | "txt">(
    "md"
  );

  // Clear single editors on tab change
  useEffect(() => {
    setSingleSourceCode("");
    setSingleResult("");
    setSingleOutputs([]);
    setSingleFileName(
      selectedTab === "idmc-batch" || selectedTab === "batch-human"
        ? "run.sh"
        : "input.sql"
    );
  }, [selectedTab]);

  const { logout } = useAuth();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  useBackHandler(currentPage, () => {
    if (currentPage === "result") {
      setCurrentPage("upload");
    } else if (currentPage === "success") {
      setCurrentPage("result");
    } else if (currentPage === "error") {
      setCurrentPage("upload");
    } else {
      const confirmExit = window.confirm("Do you want to logout?");
      if (confirmExit) {
        handleLogout();
      }
    }
  });

  // Ensure socket is disconnected on unmount to avoid dangling overlays/connections
  useEffect(() => {
    return () => {
      if (activeJobIdRef.current) {
        disconnectSocket(activeJobIdRef.current);
        activeJobIdRef.current = null;
      } else {
        disconnectSocket();
      }
    };
  }, []);

  const isIdmcTab = selectedTab === "idmc-sql" || selectedTab === "idmc-batch";
  const isSnowflakeTab = selectedTab === "snowflake";
  const isBatchHuman = selectedTab === "batch-human";

  const analyzeZipFile = async (file: File) => {
    try {
      setIsProcessing(true);
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);

      const sqlFiles: Array<{ name: string; size: number; lines: number }> = [];
      let totalFiles = 0;
      let totalSize = 0;
      let totalLines = 0;

      for (const [filename, zipEntry] of Object.entries(contents.files)) {
        totalFiles += 1;
        if (!zipEntry.dir) {
          const isSql =
            filename.endsWith(".sql") || filename.endsWith(".plsql");
          const isShOrBat =
            filename.endsWith(".sh") || filename.endsWith(".bat");
          if (isSql || isShOrBat) {
            const content = await zipEntry.async("string");
            const size = content.length;
            const lines = countLines(content);
            sqlFiles.push({ name: filename, size, lines });
            totalSize += size;
            totalLines += lines;
          }
        }
      }
      setFileStats({
        totalFilesinFile: totalFiles,
        totalFiles: sqlFiles.length,
        totalSize,
        totalLines,
        files: sqlFiles,
      });
    } catch (error) {
      console.error("Error analyzing zip:", error);
      setErrorMessage(
        "Failed to analyze ZIP file. Please ensure it's a valid ZIP file."
      );
      setCurrentPage("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith(".zip")) {
        const response = await fileUpload(file);
        if (response?.success) {
          setUploadedFile(response.file);
          setSelectedFile(file);
          analyzeZipFile(file);
        } else {
          setErrorMessage("Please upload the file again!!");
          setCurrentPage("error");
        }
      } else {
        setErrorMessage(
          "Please upload a ZIP file containing the correct scripts"
        );
        setCurrentPage("error");
      }
    }
  }, []);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith(".zip")) {
        const response = await fileUpload(file);
        if (response?.success) {
          setUploadedFile(response.file);
          setSelectedFile(file);
          analyzeZipFile(file);
        } else {
          setErrorMessage("Please upload the file again!!");
          setCurrentPage("error");
        }
      } else {
        setErrorMessage(
          "Please upload a ZIP file containing the correct scripts"
        );
        setCurrentPage("error");
      }
    }
  };

  // ZIP Convert via Unified API + WebSocket
  const handleZipConvert = async () => {
    if (!selectedFile || !uploadedFile?.path) return;

    try {
      setProgress(1); // show overlay immediately
      setShowZipOverlay(true);
      setErrorMessage("");

      // Connect socket immediately and register listener BEFORE starting the API call
      const socket = connectSocket();
      // Ensure no duplicate handlers from previous runs
      socket.off("progress-update");
      socket.on("progress-update", (data) => {
        console.log("[socket] progress-update raw:", data);
        // Accept broadcasted updates for the overlay irrespective of jobId
        const computedProgress =
          typeof data?.progress === "number"
            ? data.progress
            : typeof (data as any)?.percentage === "number"
            ? (data as any).percentage
            : data?.filesConverted && data?.totalFiles
            ? Math.round(
                (data.filesConverted / Math.max(1, data.totalFiles)) * 100
              )
            : progress;
        console.log("[socket] computed progress:", computedProgress);
        setProgress(Math.max(1, Math.min(100, computedProgress || 1)));
        if (!showZipOverlay) setShowZipOverlay(true);

        // Update overlay details from event
        if (typeof data?.currentStep === "string") {
          setCurrentStepText(data.currentStep);
        }
        if (typeof data?.filesConverted === "number") {
          setFilesConvertedCount(data.filesConverted);
        }
        if (typeof data?.totalFiles === "number") {
          setTotalFilesCount(data.totalFiles);
        }
        if (typeof data?.elapsedTime === "number")
          setElapsedMs(data.elapsedTime);
        if (typeof data?.estimatedTime === "number")
          setEtaMs(data.estimatedTime);

        const completedStatus =
          data?.status === "completed" || data?.status === "success";
        const completedByProgress =
          typeof data?.progress === "number" && data.progress >= 100;
        const hasZip = !!data?.result?.zipFilename;
        if (completedStatus || completedByProgress || hasZip) {
          finalizeSuccess(data);
        } else if (data?.status === "failed") {
          setErrorMessage(data.error || "Conversion failed");
          setShowZipOverlay(false);
          setCurrentPage("error");
          if (activeJobIdRef.current) {
            disconnectSocket(activeJobIdRef.current);
            activeJobIdRef.current = null;
          }
        }
      });

      const target = isSnowflakeTab ? "snowflake" : isIdmcTab ? "idmc" : "idmc";
      const payload: any = {
        inputType: "zip",
        target,
        sourceType: "auto",
        zipFilePath: uploadedFile.path,
      };
      if (target === "idmc") {
        payload.outputFormat = outputFormat;
      }

      // Start unified conversion to get jobId and zipFilename
      const response = (await convertUnified(payload)) as UnifiedResponse;
      console.log("[convertUnified] response:", response);
      if (!("jobId" in response)) {
        throw new Error("Unexpected response for ZIP conversion");
      }
      const jobId = (response as any).jobId as string;
      activeJobIdRef.current = jobId;

      const finalizeSuccess = (data: any) => {
        if (finalizedRef.current) return;
        finalizedRef.current = true;
        const zipName =
          data?.result?.zipFilename || (response as any).zipFilename;
        const rawConverted = data?.result?.conversion?.convertedFiles || [];
        const mappedConverted = rawConverted.map((f: any) => ({
          original:
            f.original ||
            f.source ||
            f.input ||
            f.originalFile ||
            f.name ||
            f.sourceName ||
            f.originalFilename ||
            "",
          converted:
            f.converted ||
            f.target ||
            f.output ||
            f.convertedFile ||
            f.name ||
            f.targetName ||
            f.convertedFilename ||
            "",
          oracleContent:
            f.oracleContent ||
            f.sourceContent ||
            f.inputContent ||
            f.originalContent ||
            f.originalCode ||
            f.sourceCode ||
            f.sqlContent ||
            f.redshiftContent ||
            "",
          snowflakeContent:
            f.snowflakeContent ||
            f.targetContent ||
            f.outputContent ||
            f.convertedContent ||
            f.convertedCode ||
            f.targetCode ||
            f.jsContent ||
            f.sqlContentConverted ||
            f.idmcContent ||
            "",
          targetFolder: f.targetFolder || "",
        }));

        setConvertedFile({
          success: true,
          message: "completed",
          source: target,
          jobId,
          analysis: {
            totalFiles:
              data?.result?.analysis?.totalFiles || fileStats?.totalFiles || 0,
            oracleFiles: 0,
            solutionName: "",
            linesOfCode: data?.result?.analysis?.linesOfCode || 0,
            fileSize: data?.result?.analysis?.fileSize || "",
            namespaces: [],
            classes: 0,
            dependencies: [],
          },
          conversion: {
            totalConverted:
              data?.result?.conversion?.totalConverted ||
              mappedConverted.length,
            totalFiles:
              data?.result?.conversion?.totalFiles ||
              fileStats?.totalFiles ||
              mappedConverted.length,
            successRate: data?.result?.conversion?.successRate || 0,
            convertedFiles: mappedConverted,
          },
          zipFilename: zipName,
        });
        setProgress(100);
        setShowZipOverlay(false);
        setCurrentPage("result");
        disconnectSocket(jobId);
        activeJobIdRef.current = null;
      };

      // already registered handler above

      // Optional system notifications
      socket.on("system-notification", (payload) => {
        try {
          const { type, message } = payload || {};
          console.log("[system-notification]", type, message);
        } catch (_) {}
      });

      // If API already returned a packaged zip without emitting progress, finalize immediately
      if (
        (response as any)?.zipFilename &&
        !(response as any)?.conversion?.pending
      ) {
        console.log(
          "[convertUnified] immediate finalize with zip:",
          (response as any).zipFilename
        );
        finalizeSuccess({
          result: {
            zipFilename: (response as any).zipFilename,
            analysis: (response as any).analysis,
            conversion: (response as any).conversion,
          },
        });
      }
    } catch (error) {
      console.error("Conversion error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Conversion failed"
      );
      setShowZipOverlay(false);
      setCurrentPage("error");
      if (activeJobIdRef.current) {
        disconnectSocket(activeJobIdRef.current);
        activeJobIdRef.current = null;
      }
      finalizedRef.current = false;
    }
  };

  // SINGLE Convert via Unified API (no websocket)
  const handleSingleConvert = async () => {
    try {
      setIsConvertingSingle(true);
      setSingleResult("");
      setSingleOutputs([]);
      setErrorMessage("");

      const target = isSnowflakeTab
        ? "snowflake"
        : isIdmcTab
        ? "idmc"
        : isBatchHuman
        ? "idmc"
        : "idmc";

      if (selectedTab === "idmc-batch") {
        // Single batch script to IDMC summary
        const res = await idmcBatch({
          inputType: "single",
          script: singleSourceCode,
          fileName: singleFileName,
          ...(batchOutputFormat ? { outputFormat: batchOutputFormat } : {}),
        });
        // Try to capture downloadable outputs if provided by API
        if (res?.outputFiles && Array.isArray(res.outputFiles)) {
          setSingleOutputs(res.outputFiles);
        } else if (res?.filePath) {
          setSingleOutputs([
            {
              name: res.fileName || "idmc-summary.json",
              path: res.filePath,
              mime: "application/json",
              kind: "single",
            },
          ]);
        }
        // Show only the output content if available
        if (typeof res?.jsonContent === "string" && res.jsonContent.trim()) {
          setSingleResult(res.jsonContent);
        } else if (
          Array.isArray(res?.idmcSummaries) &&
          res.idmcSummaries.length > 0 &&
          typeof res.idmcSummaries[0]?.idmcSummary === "string"
        ) {
          setSingleResult(res.idmcSummaries[0].idmcSummary);
        } else {
          setSingleResult("");
        }
      } else if (selectedTab === "batch-human") {
        // Human language summary of batch script
        const res = await idmcBatchSummary(
          singleSourceCode,
          singleFileName,
          batchOutputFormat
        );
        // Try to capture downloadable outputs if provided by API
        if (res?.outputFiles && Array.isArray(res.outputFiles)) {
          setSingleOutputs(res.outputFiles);
        } else if (res?.filePath) {
          setSingleOutputs([
            {
              name: res.fileName || "human-summary.txt",
              path: res.filePath,
              mime: "text/plain",
              kind: "single",
            },
          ]);
        }
        // Show only the output content if available
        if (typeof res?.jsonContent === "string" && res.jsonContent.trim()) {
          setSingleResult(res.jsonContent);
        } else if (typeof res?.summary === "string" && res.summary.trim()) {
          setSingleResult(res.summary);
        } else {
          setSingleResult("");
        }
      } else {
        // SQL -> IDMC or Oracle -> Snowflake
        const payload: any = {
          inputType: "single",
          target,
          sourceType: "auto",
          sourceCode: singleSourceCode,
          fileName: singleFileName,
        };
        if (target === "idmc") payload.outputFormat = outputFormat;
        const res = await convertUnified(payload);
        if ("outputFiles" in res) {
          const r = res as UnifiedSingleResponse & {
            originalContent?: string;
            convertedContent?: string;
          };
          setSingleOutputs(r.outputFiles || []);
          // Prefer convertedContent if provided by API; fall back to jsonContent
          if ((r as any).convertedContent) {
            setSingleResult((r as any).convertedContent || "");
          } else if (r.jsonContent) {
            setSingleResult(r.jsonContent);
          } else {
            setSingleResult(
              (r.outputFiles || [])
                .map((f) => `${f.name} (${f.mime})`)
                .join("\n")
            );
          }
        } else {
          setSingleResult(JSON.stringify(res, null, 2));
        }
      }
    } catch (error) {
      console.error("Single conversion failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Conversion failed"
      );
      setCurrentPage("error");
    } finally {
      setIsConvertingSingle(false);
    }
  };

  const handleSingleDownload = async () => {
    try {
      if (singleOutputs && singleOutputs.length > 0) {
        // Download all generated outputs sequentially with a single click
        for (const f of singleOutputs) {
          await conversionDownload({ filePath: f.path });
        }
      } else if (singleResult && singleResult.trim().length > 0) {
        // Fallback: download the displayed result as a file on client side
        const isJsonLike =
          singleResult.trim().startsWith("{") ||
          singleResult.trim().startsWith("[");
        const mime = isJsonLike ? "application/json" : "text/plain";
        const proposedName =
          selectedTab === "idmc-batch"
            ? isJsonLike
              ? "idmc-summary.json"
              : "idmc-summary.txt"
            : selectedTab === "batch-human"
            ? "human-summary.txt"
            : "result.txt";
        const blob = new Blob([singleResult], { type: mime });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = proposedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Single download failed", e);
      setErrorMessage("Failed to download output files");
      setCurrentPage("error");
    }
  };

  const handleDownload = async () => {
    const zipName = convertedFile?.zipFilename;
    if (!zipName) {
      setErrorMessage("No file available for download");
      setCurrentPage("error");
      return;
    }
    try {
      await conversionDownload({ filename: zipName });
    } catch (error) {
      console.error("Download error:", error);
      setErrorMessage("Failed to download files");
      setCurrentPage("error");
    }
  };

  // removed direct download variant; single unified download is enough

  const handleReset = () => {
    setCurrentPage("upload");
    setSelectedFile(null);
    setUploadedFile(null);
    setFileStats(null);
    setProgress(0);
    setErrorMessage("");
    setShowPreview(false);
    setSingleSourceCode("");
    setSingleResult("");
    setShowZipOverlay(false);
    finalizedRef.current = false;
  };

  const tabButton = (key: TabKey, label: string) => (
    <button
      key={key}
      onClick={() => setSelectedTab(key)}
      className={`px-4 py-2 rounded-full text-sm manrope-medium ${
        selectedTab === key
          ? "bg-[#E46356] text-white"
          : "bg-white border border-neutral-300 text-gray-700"
      }`}
    >
      {label}
    </button>
  );

  const renderZipControls = () => (
    <div className="space-y-6">
      <div
        className={`flex flex-col border rounded-xl p-8 sm:p-12 text-center items-center transition-all ${
          dragActive
            ? "border-[#70CBCF]/50 bg-blue-50"
            : "border-[#70CBCF] hover:bg-green-50/40"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <label className="cursor-pointer mt-5">
          <img src={Upload} alt="upload" className="h-22" />
          <input
            type="file"
            accept=".zip"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
        <p className="text-md mt-2 font-semibold text-gray-600">
          Drop your file here or Browse
        </p>
        <p className="text-xs text-gray-500 mt-2 mb-5">Supports ZIP files</p>
      </div>

      {/* Output format selector for IDMC */}

      {selectedFile && fileStats && (
        <div className="bg-gray-50">
          <div className="flex flex-col p-5 shadow-xl rounded-xl sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="mx-4 h-10 rounded-lg flex items-center justify-center">
                <img src={Folder} alt="file" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900">
                  {selectedFile.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {formatBytes(selectedFile.size)}
                </p>
              </div>
            </div>
            <div className="mx-4 h-10 rounded-lg flex items-center justify-center">
              <img src={Success} alt="success" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 ">
            <div className="bg-[linear-gradient(135deg,_rgba(231,230,42,0.2)_0%,_rgba(220,252,231,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
              <div className="flex items-center gap-2 my-3 justify-center">
                <img src={Totalfile} alt="files" />
              </div>
              <p className="text-2xl font-bold text-gray-900 text-center">
                {fileStats.totalFilesinFile}
              </p>
              <p className="text-xs text-gray-500 text-center">Total files</p>
            </div>

            <div className="bg-[linear-gradient(135deg,_rgba(112,203,207,0.2)_0%,_rgba(219,234,254,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
              <div className="flex items-center gap-2 my-3 justify-center">
                <img src={SqlFiles} alt="files" />
              </div>
              <p className="text-2xl font-bold text-gray-900 text-center">
                {fileStats.totalFiles}
              </p>
              <p className="text-xs text-gray-500 text-center">
                Scripts detected
              </p>
            </div>

            <div className="bg-[linear-gradient(135deg,_rgba(185,120,178,0.2)_0%,_rgba(252,231,243,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
              <div className="flex items-center gap-2 my-3 justify-center">
                <img src={CodeLines} alt="files" />
              </div>
              <p className="text-2xl font-bold text-gray-900 text-center">
                {fileStats.totalLines.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 text-center">of code</p>
            </div>

            <div className="bg-[linear-gradient(135deg,_rgba(228,99,86,0.2)_0%,_rgba(255,237,212,0.1)_100%)] p-4 rounded-xl py-6 shadow-lg">
              <div className="flex items-center gap-2 my-3 justify-center">
                <img src={Classes} alt="files" />
              </div>
              <p className="text-2xl font-bold text-gray-900 text-center">
                {formatBytes(fileStats.totalSize)}
              </p>
              <p className="text-xs text-gray-500 text-center">File size</p>
            </div>
          </div>

          {/* File list */}
          <div className="mb-6 rounded-2xl shadow-2xl p-5">
            <h5 className="font-medium text-gray-900 mb-3">
              {fileStats.totalFiles === 0
                ? "No files to convert"
                : "Files to Convert"}
            </h5>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {fileStats.files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <img src={Folder} alt="file" className="h-5 px-2" />
                    <span className="text-sm text-gray-900 truncate">
                      {file.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 ml-4">
                    <span className="whitespace-nowrap">
                      {file.lines} lines
                    </span>
                    <span className="px-2 border-l border-l-neutral-300 whitespace-nowrap">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={
              selectedTab === "idmc-batch"
                ? async () => {
                    if (!uploadedFile?.path) return;
                    try {
                      setIsProcessing(true);
                      const resp = await idmcBatch({
                        inputType: "zip",
                        zipFilePath: uploadedFile.path,
                        // pass md/txt for batch outputs
                        ...(batchOutputFormat
                          ? { outputFormat: batchOutputFormat }
                          : {}),
                      });
                      // If API returns a packaged zip filename, allow download
                      if (resp?.zipFilename) {
                        setConvertedFile({
                          success: true,
                          message: "completed",
                          source: "idmc",
                          jobId: "batch_zip",
                          analysis: {
                            totalFiles: fileStats.totalFiles,
                            oracleFiles: 0,
                            solutionName: "",
                            linesOfCode: fileStats.totalLines,
                            fileSize: formatBytes(fileStats.totalSize),
                            namespaces: [],
                            classes: 0,
                            dependencies: [],
                          },
                          conversion: {
                            totalConverted: fileStats.totalFiles,
                            totalFiles: fileStats.totalFiles,
                            successRate: 100,
                            convertedFiles: [],
                          },
                          zipFilename: resp.zipFilename,
                        });
                        setCurrentPage("result");
                      } else {
                        // If no zip, just mark success
                        setCurrentPage("success");
                      }
                    } catch (e) {
                      setErrorMessage("Batch processing failed");
                      setCurrentPage("error");
                    } finally {
                      setIsProcessing(false);
                    }
                  }
                : handleZipConvert
            }
            className={`w-full py-3 sm:py-4 text-white rounded-lg transition font-semibold text-base shadow-l bg-[#E46356]`}
          >
            Start Conversion
          </button>
        </div>
      )}
    </div>
  );

  const renderSingleEditors = () => (
    <div className="bg-white rounded-2xl shadow p-4 md:p-6">
      {/* Output format for IDMC */}
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
            placeholder={
              isBatchHuman || selectedTab === "idmc-batch"
                ? "Paste your .sh/.bat script here..."
                : isSnowflakeTab
                ? "Paste Oracle SQL/PLSQL here..."
                : "Paste SQL for IDMC summary here (Oracle/Redshift)..."
            }
          />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Output</span>
            <div className="flex items-center gap-2">
              {(singleOutputs.length > 0 ||
                (singleResult && singleResult.trim().length > 0)) && (
                <button
                  onClick={handleSingleDownload}
                  className="px-4 py-2 rounded-md border border-[#E46356] text-[#E46356] text-sm"
                >
                  Download
                </button>
              )}
              <button
                onClick={handleSingleConvert}
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

  return (
    <div className="min-h-screen w-screen bg-gray-50 flex flex-col manrope-regular">
      <Header handleReset={() => handleReset()} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabButton("idmc-sql", "SQL → IDMC Summary (auto)")}
          {tabButton("snowflake", "Oracle SQL → Snowflake")}
          {tabButton("idmc-batch", "Batch Script → IDMC Summary")}
          {tabButton("batch-human", "Batch Script → Human Language")}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span
            className={`text-sm ${
              inputMode === "zip" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            ZIP
          </span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={inputMode === "single"}
              onChange={() =>
                setInputMode(inputMode === "zip" ? "single" : "zip")
              }
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#E46356] peer-checked:after:translate-x-full"></div>
          </label>
          <span
            className={`text-sm ${
              inputMode === "single" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            Single
          </span>

          {/* Top-level output format selection (conditional by tab) */}
          {selectedTab === "idmc-sql" && (
            <div className="flex items-center gap-3 ml-6">
              <label className="text-sm text-gray-700">Output format</label>
              <select
                value={outputFormat}
                onChange={(e) =>
                  setOutputFormat(e.target.value as IdmcOutputFormat)
                }
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="json">JSON</option>
                <option value="docx">DOCX</option>
              </select>
            </div>
          )}
          {(selectedTab === "idmc-batch" || selectedTab === "batch-human") && (
            <div className="flex items-center gap-3 ml-6">
              <label className="text-sm text-gray-700">Output format</label>
              <select
                value={batchOutputFormat}
                onChange={(e) =>
                  setBatchOutputFormat(e.target.value as "md" | "txt")
                }
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="md">Markdown (.md)</option>
                <option value="txt">Text (.txt)</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {currentPage === "upload" && (
          <div className="space-y-6">
            {inputMode === "zip" ? renderZipControls() : renderSingleEditors()}
          </div>
        )}

        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-2xl p-8 sm:p-12 max-w-xl w-full text-center">
              <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 text-[#B978B2] animate-spin" />
              <h3 className="text-md sm:text-3xl font-semibold text-gray-900 mb-3">
                Analyzing dependencies...
              </h3>
              <p className="text-gray-600 mb-8">
                Please wait while we analyze your code...
              </p>
            </div>
          </div>
        )}

        {/* WebSocket progress for ZIP */}
        {inputMode === "zip" && showZipOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8 sm:p-12 w-11/12 max-w-2xl">
              <div className="flex flex-col text-center items-center gap-3">
                <div className="flex justify-center items-center h-16 w-16 rounded-full bg-white shadow-black/20 shadow-xl">
                  <img
                    src={
                      progress < 30
                        ? analysing
                        : progress < 80
                        ? processing
                        : done
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
                          ? `elapsed ${Math.max(
                              0,
                              Math.round(elapsedMs / 1000)
                            )}s`
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
        )}

        {/* Result */}
        {currentPage === "result" && convertedFile && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="flex flex-col sm:flex-row items-center max-w-4xl bg-white justify-center mb-6 gap-4 p-10 shadow-lg rounded-xl">
                <div className="flex flex-col justify-center gap-3">
                  <img src={FinalSuccess} alt="final" className="h-16" />
                  <h3 className="text-2xl text-gray-900 mb-2 text-center manrope-medium">
                    Conversion Complete!
                  </h3>
                  <h1 className="text-center text-md">Your files are ready.</h1>
                </div>
              </div>
              <div className="flex gap-3 min-w-xl ml-[-10px]">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex-1 sm:flex-none px-6 py-3 w-[40%] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  {showPreview ? "Hide" : "Preview"}
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 sm:flex-none px-6 py-3 w-[30%] border border-[#E46356] text-[#E46356] rounded-lg hover:bg-red-50 transition font-medium flex items-center justify-center gap-2"
                >
                  <IoIosRepeat className="w-5 h-5" />
                  Reconvert
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 sm:flex-none px-6 py-3 w-[30%] bg-[#E46356] text-white rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>

              {/* Preview modal for converted files if available */}
              {showPreview && convertedFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
                  <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6">
                    <button
                      onClick={() => setShowPreview(false)}
                      className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
                    >
                      ✕
                    </button>

                    <h3 className="text-2xl manrope-semibold text-gray-900 mb-2 text-center">
                      Preview
                    </h3>
                    <h1 className="w-full text-center text-sm mb-5 manrope-regular">
                      Review a subset of original and converted outputs
                    </h1>
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="bg-neutral-50 rounded-2xl max-h-[66vh]">
                        <div className="flex items-center gap-2 mb-3 p-3 bg-neutral-200 rounded-t-2xl">
                          <IoCodeSlash />
                          <h4 className="font-regular text-gray-900">
                            Original
                          </h4>
                        </div>
                        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 p-5">
                          {convertedFile.conversion.convertedFiles.map(
                            (file, idx) => (
                              <div
                                key={idx}
                                className={`bg-white border-l-[3px] ${
                                  expandedIndex === idx
                                    ? "border-l-[#70CBCF]"
                                    : "border-neutral-300"
                                } rounded-lg p-4 mb-6 transition-all duration-200`}
                              >
                                <button
                                  onClick={() =>
                                    setExpandedIndex(
                                      expandedIndex === idx ? null : idx
                                    )
                                  }
                                  className="w-full flex items-center justify-between text-left"
                                >
                                  <p className="font-mono text-sm font-medium text-gray-800 truncate">
                                    {file.original}
                                  </p>
                                  <span className="text-neutral-500 font-bold text-lg ml-2">
                                    {expandedIndex === idx ? (
                                      <FaChevronUp />
                                    ) : (
                                      <FaChevronDown />
                                    )}
                                  </span>
                                </button>
                                {expandedIndex === idx && (
                                  <div className="mt-3 animate-fadeIn">
                                    <pre className="text-xs bg-white p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                                      <code className="text-gray-800">
                                        {file.oracleContent}
                                      </code>
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div className="bg-neutral-50 rounded-2xl max-h-[66vh]">
                        <div className="flex items-center gap-2 mb-3 p-3 bg-black rounded-t-2xl">
                          <FaFileLines className="text-white" />
                          <h4 className="font-regular text-white">Converted</h4>
                        </div>
                        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 p-5">
                          {convertedFile.conversion.convertedFiles.map(
                            (file, idx) => (
                              <div
                                key={idx}
                                className={`bg-white border-l-[3px] ${
                                  expandedIndex === idx
                                    ? "border-l-green-300"
                                    : "border-l-green-100"
                                } rounded-lg p-4 mb-6 transition-all duration-200`}
                              >
                                <button
                                  onClick={() =>
                                    setExpandedIndex(
                                      expandedIndex === idx ? null : idx
                                    )
                                  }
                                  className="w-full flex items-center justify-between text-left"
                                >
                                  <p className="font-mono text-sm font-medium text-gray-800 truncate">
                                    {file.converted}
                                  </p>
                                  <span className="text-neutral-500 font-bold text-lg ml-2">
                                    {expandedIndex === idx ? (
                                      <FaChevronUp />
                                    ) : (
                                      <FaChevronDown />
                                    )}
                                  </span>
                                </button>
                                {expandedIndex === idx && (
                                  <div className="mt-3 animate-fadeIn">
                                    <pre className="text-xs bg-white p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                                      <code className="text-gray-800">
                                        {file.snowflakeContent}
                                      </code>
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-center mt-4 gap-5">
                      <button
                        onClick={() => setCurrentPage("upload")}
                        className="w-[30%] px-6 py-3 border border-[#E46356] text-[#E46356] rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-lg"
                      >
                        <IoIosRepeat className="w-6 h-6" />
                        Reconvert
                      </button>
                      <button
                        onClick={handleDownload}
                        className="w-[30%] px-6 py-3 bg-[#E46356] text-white rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Download className="w-5 h-5" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Page (used for batch zip if no packaged zip returned) */}
        {currentPage === "success" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                Completed!
              </h3>
              <p className="text-gray-600 mb-8">
                Your request has been processed successfully.
              </p>
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-[#E46356] rounded-2xl text-white transition font-semibold flex items-center justify-center gap-2 mx-auto shadow-lg"
              >
                <RefreshCw className="w-5 h-5" />
                Convert Another
              </button>
            </div>
          </div>
        )}

        {/* Error Page */}
        {currentPage === "error" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                Something Went Wrong
              </h3>
              <p className="text-gray-600 mb-8">{errorMessage}</p>
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-[#E46356] rounded-2xl text-white transition font-semibold flex items-center justify-center gap-2 mx-auto shadow-lg"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
