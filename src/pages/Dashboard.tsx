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
  idmcSummaryToJson,
  type BatchOutputFormat,
  type IdmcOutputFormat,
  type IdmcSummaryOutputFormat,
  type SingleOutputFile,
  type UnifiedResponse,
  type UnifiedSingleResponse,
} from "../api/fileConvertAPI";
import { connectSocket, disconnectSocket } from "../api/websocket";
import analysing from "../assets/analysing.svg";
import done from "../assets/done.svg";
import FinalSuccess from "../assets/final-success.svg";
import processing from "../assets/processing.svg";
import Header from "../components/Header";
import SingleEditorsPanel from "../components/SingleEditorsPanel";
import ZipUploadPanel from "../components/ZipUploadPanel";
import { useAuth } from "../context/AuthContext";
import { countLines, formatBytes } from "../utils/format";
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

type TabKey =
  | "idmc-sql"
  | "snowflake"
  | "idmc-batch"
  | "batch-human"
  | "idmc-to-json";

type InputMode = "zip" | "single";

// moved to utils/format

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
  const [singleResult, setSingleResult] = useState<string>("");
  const [isConvertingSingle, setIsConvertingSingle] = useState<boolean>(false);
  const [singleOutputs, setSingleOutputs] = useState<SingleOutputFile[]>([]);

  // Output format (IDMC only)
  const [outputFormat, setOutputFormat] = useState<IdmcOutputFormat>("json");
  // Output format for batch/human summaries
  const [batchOutputFormat, setBatchOutputFormat] =
    useState<BatchOutputFormat>("doc");
  // Output format for IDMC Summary to JSON
  const [idmcToJsonOutputFormat, setIdmcToJsonOutputFormat] =
    useState<IdmcSummaryOutputFormat>("bin");
  // Custom file name for conversions
  const [customFileName, setCustomFileName] = useState<string>("");

  // Reset UI to upload page when tab changes
  useEffect(() => {
    // Reset to upload page
    setCurrentPage("upload");

    // Clear file upload state
    setSelectedFile(null);
    setUploadedFile(null);
    setFileStats(null);
    setConvertedFile(null);

    // Clear progress and overlay state
    setProgress(0);
    setCurrentStepText("");
    setFilesConvertedCount(0);
    setTotalFilesCount(0);
    setElapsedMs(null);
    setEtaMs(null);
    setShowZipOverlay(false);
    setIsProcessing(false);

    // Clear error and preview state
    setErrorMessage("");
    setShowPreview(false);
    setExpandedIndex(null);
    finalizedRef.current = false;

    // Disconnect any active WebSocket connections
    if (activeJobIdRef.current) {
      disconnectSocket(activeJobIdRef.current);
      activeJobIdRef.current = null;
    } else {
      disconnectSocket();
    }

    // Clear single editors
    setSingleSourceCode("");
    setSingleResult("");
    setSingleOutputs([]);
    setIsConvertingSingle(false);
    // Clear custom file name
    setCustomFileName("");
  }, [selectedTab]);

  // Reset UI to default state when input mode changes
  useEffect(() => {
    // Reset to upload page
    setCurrentPage("upload");

    // Clear file upload state
    setSelectedFile(null);
    setUploadedFile(null);
    setFileStats(null);
    setConvertedFile(null);

    // Clear progress and overlay state
    setProgress(0);
    setCurrentStepText("");
    setFilesConvertedCount(0);
    setTotalFilesCount(0);
    setElapsedMs(null);
    setEtaMs(null);
    setShowZipOverlay(false);
    setIsProcessing(false);

    // Clear error and preview state
    setErrorMessage("");
    setShowPreview(false);
    setExpandedIndex(null);
    finalizedRef.current = false;

    // Disconnect any active WebSocket connections
    if (activeJobIdRef.current) {
      disconnectSocket(activeJobIdRef.current);
      activeJobIdRef.current = null;
    } else {
      disconnectSocket();
    }

    // Clear single editors
    setSingleSourceCode("");
    setSingleResult("");
    setSingleOutputs([]);
    setIsConvertingSingle(false);
    // Clear custom file name
    setCustomFileName("");
  }, [inputMode]);

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
  const isIdmcToJsonTab = selectedTab === "idmc-to-json";

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
            filename.endsWith(".sql") ||
            filename.endsWith(".plsql") ||
            filename.endsWith(".pls") ||
            filename.endsWith(".pkg") ||
            filename.endsWith(".prc") ||
            filename.endsWith(".fnc");
          const isShOrBat =
            filename.endsWith(".sh") ||
            filename.endsWith(".bat") ||
            filename.endsWith(".ksh") ||
            filename.endsWith(".bash") ||
            filename.endsWith(".zsh") ||
            filename.endsWith(".cmd") ||
            filename.endsWith(".ps1");
          const isIdmcSummary =
            filename.endsWith(".md") ||
            filename.endsWith(".txt") ||
            filename.endsWith(".bin") ||
            filename.endsWith(".doc") ||
            filename.endsWith(".docx") ||
            filename.endsWith(".json") ||
            filename.toLowerCase().includes("idmc") ||
            filename.toLowerCase().includes("summary");

          // Filter files based on conversion type
          let shouldInclude = false;
          if (isIdmcToJsonTab && isIdmcSummary) {
            shouldInclude = true;
          } else if (
            (selectedTab === "idmc-batch" || selectedTab === "batch-human") &&
            isShOrBat
          ) {
            shouldInclude = true;
          } else if ((isIdmcTab || isSnowflakeTab) && isSql) {
            shouldInclude = true;
          }

          if (shouldInclude) {
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

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        const file = files[0];

        // Validate file type based on conversion type
        const fileName = file.name.toLowerCase();
        const isZip = fileName.endsWith(".zip");
        let isValidFile = isZip;

        if (!isZip) {
          if (isIdmcToJsonTab) {
            isValidFile =
              fileName.endsWith(".txt") ||
              fileName.endsWith(".bin") ||
              fileName.endsWith(".md") ||
              fileName.endsWith(".doc") ||
              fileName.endsWith(".docx") ||
              fileName.endsWith(".json");
          } else if (
            selectedTab === "idmc-batch" ||
            selectedTab === "batch-human"
          ) {
            isValidFile =
              fileName.endsWith(".sh") ||
              fileName.endsWith(".bat") ||
              fileName.endsWith(".ksh") ||
              fileName.endsWith(".bash") ||
              fileName.endsWith(".zsh") ||
              fileName.endsWith(".cmd") ||
              fileName.endsWith(".ps1");
          } else if (isIdmcTab || isSnowflakeTab) {
            isValidFile =
              fileName.endsWith(".sql") ||
              fileName.endsWith(".plsql") ||
              fileName.endsWith(".pls") ||
              fileName.endsWith(".pkg") ||
              fileName.endsWith(".prc") ||
              fileName.endsWith(".fnc");
          }
        }

        if (!isValidFile) {
          setErrorMessage(
            isIdmcToJsonTab
              ? "Please upload a ZIP file or a valid IDMC Summary file (.txt, .bin, .md, .doc, .docx, .json)"
              : selectedTab === "idmc-batch" || selectedTab === "batch-human"
              ? "Please upload a ZIP file or a valid batch script (.sh, .bat, .ksh, .bash, .zsh, .cmd, .ps1)"
              : "Please upload a ZIP file or a valid SQL file (.sql, .plsql, etc.)"
          );
          setCurrentPage("error");
          return;
        }

        // Support both ZIP files and single files
        const response = await fileUpload(file);
        if (response?.success) {
          setUploadedFile(response.file);
          setSelectedFile(file);
          // Only analyze ZIP files
          if (file.name.endsWith(".zip")) {
            analyzeZipFile(file);
          } else {
            // For single files, create minimal file stats
            const fileContent = await file.text();
            setFileStats({
              totalFilesinFile: 1,
              totalFiles: 1,
              totalSize: file.size,
              totalLines: countLines(fileContent),
              files: [
                {
                  name: file.name,
                  size: file.size,
                  lines: countLines(fileContent),
                },
              ],
            });
          }
        } else {
          setErrorMessage("Please upload the file again!!");
          setCurrentPage("error");
        }
      }
    },
    [selectedTab, isIdmcTab, isSnowflakeTab, isIdmcToJsonTab]
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];

      // Validate file type based on conversion type
      const fileName = file.name.toLowerCase();
      const isZip = fileName.endsWith(".zip");
      let isValidFile = isZip;

      if (!isZip) {
        if (isIdmcToJsonTab) {
          isValidFile =
            fileName.endsWith(".txt") ||
            fileName.endsWith(".bin") ||
            fileName.endsWith(".md") ||
            fileName.endsWith(".doc") ||
            fileName.endsWith(".docx") ||
            fileName.endsWith(".json");
        } else if (
          selectedTab === "idmc-batch" ||
          selectedTab === "batch-human"
        ) {
          isValidFile =
            fileName.endsWith(".sh") ||
            fileName.endsWith(".bat") ||
            fileName.endsWith(".ksh") ||
            fileName.endsWith(".bash") ||
            fileName.endsWith(".zsh") ||
            fileName.endsWith(".cmd") ||
            fileName.endsWith(".ps1");
        } else if (isIdmcTab || isSnowflakeTab) {
          isValidFile =
            fileName.endsWith(".sql") ||
            fileName.endsWith(".plsql") ||
            fileName.endsWith(".pls") ||
            fileName.endsWith(".pkg") ||
            fileName.endsWith(".prc") ||
            fileName.endsWith(".fnc");
        }
      }

      if (!isValidFile) {
        setErrorMessage(
          isIdmcToJsonTab
            ? "Please upload a ZIP file or a valid IDMC Summary file (.txt, .bin, .md, .doc, .docx, .json)"
            : selectedTab === "idmc-batch" || selectedTab === "batch-human"
            ? "Please upload a ZIP file or a valid batch script (.sh, .bat, .ksh, .bash, .zsh, .cmd, .ps1)"
            : "Please upload a ZIP file or a valid SQL file (.sql, .plsql, etc.)"
        );
        setCurrentPage("error");
        return;
      }

      // Support both ZIP files and single files
      const response = await fileUpload(file);
      if (response?.success) {
        setUploadedFile(response.file);
        setSelectedFile(file);
        // Only analyze ZIP files
        if (file.name.endsWith(".zip")) {
          analyzeZipFile(file);
        } else {
          // For single files, create minimal file stats
          const fileContent = await file.text();
          setFileStats({
            totalFilesinFile: 1,
            totalFiles: 1,
            totalSize: file.size,
            totalLines: countLines(fileContent),
            files: [
              {
                name: file.name,
                size: file.size,
                lines: countLines(fileContent),
              },
            ],
          });
        }
      } else {
        setErrorMessage("Please upload the file again!!");
        setCurrentPage("error");
      }
    }
  };

  // ZIP Convert via Unified API + WebSocket
  const handleZipConvert = async () => {
    if (!selectedFile || !uploadedFile?.path) return;

    try {
      finalizedRef.current = false; // Reset finalized flag
      setProgress(1); // show overlay immediately
      setShowZipOverlay(true);
      setErrorMessage("");

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
      if (customFileName && customFileName.trim()) {
        payload.customFileName = customFileName.trim();
      }

      // Start unified conversion to get jobId and zipFilename
      const response = (await convertUnified(payload)) as UnifiedResponse;
      console.log("[convertUnified] response:", response);

      // Check if this is a single-file response (when single file uploaded instead of ZIP)
      const isSingleFileResponse =
        "outputFiles" in response && !("zipFilename" in response);

      let jobId: string | undefined = undefined;
      if ("jobId" in response) {
        jobId = (response as any).jobId as string;
        activeJobIdRef.current = jobId;
      } else if (isSingleFileResponse) {
        // Single file response might not have jobId, but could still be async
        jobId = (response as any).jobId;
        if (jobId) {
          activeJobIdRef.current = jobId;
        }
      } else {
        throw new Error("Unexpected response for ZIP conversion");
      }

      // Define finalizeSuccess BEFORE using it in socket handler
      const finalizeSuccess = (data: any) => {
        if (finalizedRef.current) return;
        finalizedRef.current = true;

        // Handle single-file response structure
        if (isSingleFileResponse || (data?.outputFiles && !data?.zipFilename)) {
          // Single file response - convert to result page format
          const singleResponse = data?.result || data || response;
          const outputFiles = singleResponse?.outputFiles || [];

          // Get original content from response if available
          const originalContent = singleResponse?.originalContent || "";

          // Create a converted file structure for single file
          const mappedConverted = outputFiles.map((f: any) => ({
            original:
              singleResponse?.fileName ||
              uploadedFile?.name ||
              selectedFile?.name ||
              "input.sql",
            converted: f.name || "output.json",
            oracleContent: originalContent,
            snowflakeContent:
              singleResponse?.jsonContent ||
              singleResponse?.convertedContent ||
              "",
            targetFolder: f.path || "", // Store file path for downloads
          }));

          // Determine if this is a ZIP file or single file for download
          const firstOutputFile = outputFiles[0];
          const isZipFile = firstOutputFile?.name?.endsWith(".zip") || false;
          const downloadIdentifier = isZipFile
            ? firstOutputFile?.name || "output.zip"
            : firstOutputFile?.path || firstOutputFile?.name || "output.zip";

          setConvertedFile({
            success: true,
            message: "completed",
            source: target,
            jobId: jobId || "single_file",
            analysis: {
              totalFiles: 1,
              oracleFiles: 0,
              solutionName: "",
              linesOfCode: fileStats?.totalLines || 0,
              fileSize: formatBytes(
                fileStats?.totalSize || uploadedFile?.size || 0
              ),
              namespaces: [],
              classes: 0,
              dependencies: [],
            },
            conversion: {
              totalConverted: 1,
              totalFiles: 1,
              successRate: 100,
              convertedFiles: mappedConverted,
            },
            zipFilename: downloadIdentifier, // Store path for single files, filename for ZIPs
          });
        } else {
          // ZIP response structure - use standardized API response structure
          const responseData = data?.result || data || response;
          const zipName =
            responseData?.zipFilename || (response as any).zipFilename;

          // Get results array directly from standardized response
          const rawResults =
            responseData?.results ||
            data?.result?.results ||
            (response as any)?.results ||
            [];

          // Map standardized results array to convertedFiles format
          const mappedConverted = rawResults.map((f: any) => ({
            original: f.fileName || f.original || f.name || "",
            converted: f.fileName
              ? isSnowflakeTab
                ? `${f.fileName.replace(/\.(sql|plsql)$/i, "")}.sql`
                : `${f.fileName.replace(/\.(sql|plsql)$/i, "")}.${
                    outputFormat === "docx" ? "docx" : "json"
                  }`
              : f.converted || f.name || "",
            oracleContent: f.originalContent || "",
            snowflakeContent: f.convertedContent || "",
            targetFolder: f.targetFolder || "",
          }));

          setConvertedFile({
            success: true,
            message: "completed",
            source: target,
            jobId: jobId || "zip_conversion",
            analysis: {
              totalFiles:
                data?.result?.analysis?.totalFiles ||
                fileStats?.totalFiles ||
                0,
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
                responseData?.processing?.processedFiles ||
                mappedConverted.length,
              totalFiles:
                responseData?.processing?.totalFiles ||
                fileStats?.totalFiles ||
                mappedConverted.length,
              successRate: responseData?.processing?.successRate || 0,
              convertedFiles: mappedConverted,
            },
            zipFilename: zipName,
          });
        }

        setProgress(100);
        setShowZipOverlay(false);
        setCurrentPage("result");
        if (jobId) {
          disconnectSocket(jobId);
        }
        activeJobIdRef.current = null;
      };

      // Connect socket immediately and register listener AFTER defining finalizeSuccess
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
        const hasZip = !!data?.result?.zipFilename || !!data?.zipFilename;
        const hasResults = !!data?.result?.results || !!data?.results;
        const hasSingleFileResult =
          !!data?.result?.outputFiles ||
          !!data?.outputFiles ||
          !!data?.result?.jsonContent ||
          !!data?.jsonContent;

        if (
          completedStatus ||
          completedByProgress ||
          (hasZip && hasResults) ||
          hasSingleFileResult
        ) {
          // Small delay to ensure progress shows 100% before closing
          setTimeout(() => {
            finalizeSuccess(data);
          }, 300);
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

      // already registered handler above

      // Optional system notifications
      socket.on("system-notification", (payload) => {
        try {
          const { type, message } = payload || {};
          console.log("[system-notification]", type, message);
        } catch (_) {}
      });

      // If API already returned a complete response without emitting progress, finalize immediately
      if (isSingleFileResponse) {
        // Single file response - finalize immediately
        console.log(
          "[convertUnified] immediate finalize with single file:",
          (response as UnifiedSingleResponse).fileName
        );
        setProgress(100);
        setTimeout(() => {
          finalizeSuccess(response);
        }, 500);
      } else if (
        (response as any)?.zipFilename &&
        !(response as any)?.conversion?.pending &&
        ((response as any)?.results || (response as any)?.zipFilePath)
      ) {
        // ZIP response - finalize immediately
        console.log(
          "[convertUnified] immediate finalize with zip:",
          (response as any).zipFilename
        );
        setProgress(100);
        setTimeout(() => {
          finalizeSuccess({
            zipFilename: (response as any).zipFilename,
            zipFilePath: (response as any).zipFilePath,
            results: (response as any).results || [],
            processing: (response as any).processing,
          });
        }, 500);
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

  // Batch IDMC ZIP Convert via API + WebSocket
  const handleBatchIdmcConvert = async () => {
    if (!uploadedFile?.path || !fileStats) return;

    try {
      finalizedRef.current = false;
      setProgress(1);
      setShowZipOverlay(true);
      setErrorMessage("");
      setCurrentStepText("");
      setFilesConvertedCount(0);
      setTotalFilesCount(0);
      setElapsedMs(null);
      setEtaMs(null);

      const socket = connectSocket();
      socket.off("progress-update");

      let jobId: string | undefined = undefined;
      let apiResponse: any = null;

      // Set up WebSocket progress listener BEFORE API call
      socket.on("progress-update", (data) => {
        if (finalizedRef.current) return;

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
        setProgress(Math.max(1, Math.min(100, computedProgress || 1)));
        if (!showZipOverlay) setShowZipOverlay(true);

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
        const hasZip =
          !!data?.result?.zipFilename ||
          !!data?.zipFilename ||
          !!apiResponse?.zipFilename;
        const hasResults =
          !!data?.result?.results || !!data?.results || !!apiResponse?.results;
        const hasSingleFileResult =
          !!data?.result?.outputFiles ||
          !!data?.outputFiles ||
          !!data?.result?.fileName ||
          !!data?.fileName ||
          !!apiResponse?.outputFiles ||
          !!apiResponse?.fileName;

        if (
          completedStatus ||
          completedByProgress ||
          (hasZip && hasResults) ||
          hasSingleFileResult
        ) {
          // Finalize with WebSocket data or API response
          // WebSocket may wrap result in data.result with structure: { zipFilename, results, processing }
          // Or pass it directly in data
          // Priority: WebSocket result (data.result) > WebSocket data > API response
          let finalData: any = null;

          if (
            data?.result &&
            (data.result.results ||
              data.result.zipFilename ||
              data.result.outputFiles ||
              data.result.fileName)
          ) {
            // WebSocket wrapped the response in data.result
            finalData = data.result;
          } else if (
            data?.results ||
            data?.zipFilename ||
            data?.outputFiles ||
            data?.fileName
          ) {
            // WebSocket passed response directly in data
            finalData = data;
          } else if (apiResponse?.results && apiResponse?.zipFilename) {
            // Use API response as fallback
            finalData = apiResponse;
          } else if (apiResponse?.outputFiles || apiResponse?.fileName) {
            // Single-file response from API
            finalData = apiResponse;
          }

          if (finalData && !finalizedRef.current) {
            // Disconnect socket before finalizing
            socket.off("progress-update");
            socket.off("system-notification");
            if (jobId) {
              disconnectSocket(jobId);
            }
            activeJobIdRef.current = null;

            setTimeout(() => {
              finalizeBatchIdmc(finalData);
            }, 300);
          }
        } else if (data?.status === "failed") {
          setErrorMessage(data.error || "Batch processing failed");
          setShowZipOverlay(false);
          setCurrentPage("error");
          if (activeJobIdRef.current) {
            disconnectSocket(activeJobIdRef.current);
            activeJobIdRef.current = null;
          }
        }
      });

      socket.on("system-notification", (payload) => {
        try {
          const { type, message } = payload || {};
          console.log("[system-notification]", type, message);
        } catch (_) {}
      });

      // Call API endpoint: POST /api/idmc/batch-idmc-summary
      apiResponse = await idmcBatch({
        inputType: "zip",
        zipPath: uploadedFile.path,
        outputFormat: batchOutputFormat,
      });

      // API Response structure:
      // {
      //   success: true,
      //   zipFilename: "...",
      //   zipFilePath: "...",
      //   results: [{ fileName, originalContent, convertedContent, success }],
      //   processing: { totalFiles, processedFiles, failedFiles, successRate }
      // }

      if (!apiResponse?.success) {
        throw new Error(apiResponse?.message || "Batch IDMC conversion failed");
      }

      jobId = apiResponse.jobId;
      if (jobId) {
        activeJobIdRef.current = jobId;
      }

      // Check if this is a single-file response
      const isSingleFileResponse =
        (apiResponse as any)?.outputFiles && !(apiResponse as any)?.zipFilename;

      // If API already returned complete response, finalize immediately and disconnect socket
      if (
        apiResponse?.success &&
        !finalizedRef.current &&
        ((isSingleFileResponse && (apiResponse as any)?.outputFiles) ||
          (apiResponse?.results && apiResponse?.zipFilename))
      ) {
        // Disconnect socket immediately since we have complete response
        socket.off("progress-update");
        socket.off("system-notification");
        if (jobId) {
          disconnectSocket(jobId);
        }
        activeJobIdRef.current = null;

        // Finalize with API response - ensure we pass the complete response object
        finalizeBatchIdmc(apiResponse);
      }
    } catch (error) {
      console.error("Batch IDMC conversion error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Batch processing failed"
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

  // Finalize batch IDMC conversion - called from both API response and WebSocket
  const finalizeBatchIdmc = (response: any) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    // Check if this is a single-file response
    const isSingleFileResponse =
      (response?.outputFiles && !response?.zipFilename) ||
      (response?.fileName && !response?.zipFilename);

    if (isSingleFileResponse) {
      // Handle single-file response structure
      const outputFiles = response?.outputFiles || [];
      const originalContent = response?.originalContent || "";
      const convertedContent = response?.convertedContent || "";
      const fileName =
        response?.fileName ||
        uploadedFile?.name ||
        selectedFile?.name ||
        "input.txt";

      // Create a converted file structure for single file
      const mappedConverted = outputFiles.map((f: any) => ({
        original: fileName,
        converted:
          f.name ||
          `${fileName.replace(/\.(bat|sh|ksh|bash|zsh|cmd|ps1|py)$/i, "")}.${
            batchOutputFormat === "doc" ? "docx" : "txt"
          }`,
        oracleContent: originalContent,
        snowflakeContent: convertedContent,
        targetFolder: f.path || "",
      }));

      // Determine if this is a ZIP file or single file for download
      const firstOutputFile = outputFiles[0];
      const isZipFile = firstOutputFile?.name?.endsWith(".zip") || false;
      const downloadIdentifier = isZipFile
        ? firstOutputFile?.name || "output.zip"
        : firstOutputFile?.path || firstOutputFile?.name || "output.txt";

      setConvertedFile({
        success: true,
        message: response.message || "completed",
        source: response.source || "idmc",
        jobId: response.jobId || "batch_single",
        analysis: {
          totalFiles: 1,
          oracleFiles: 0,
          solutionName: "",
          linesOfCode: fileStats?.totalLines || 0,
          fileSize: formatBytes(
            fileStats?.totalSize || uploadedFile?.size || 0
          ),
          namespaces: [],
          classes: 0,
          dependencies: [],
        },
        conversion: {
          totalConverted: 1,
          totalFiles: 1,
          successRate: 100,
          convertedFiles: mappedConverted,
        },
        zipFilename: downloadIdentifier,
      });
    } else {
      // Handle ZIP response structure
      // Extract data directly from API response
      // API response structure: { success, zipFilename, zipFilePath, results: [{ fileName, originalContent, convertedContent }], processing }
      const zipFilename =
        response.zipFilename ||
        (response.zipFilePath
          ? response.zipFilePath.split("/").pop()
          : undefined);

      // Results array is at top level of response
      const results = response.results || [];
      const processing = response.processing || {
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 0,
        successRate: 0,
      };

      // Map results array to convertedFiles format
      // Each result has: fileName, originalContent, convertedContent
      const mappedConvertedFiles = results
        .filter((result: any) => result && result.fileName)
        .map((result: any) => {
          // Extract content directly from API response - these fields are mandatory per API docs
          const originalContent = String(result.originalContent || "");
          const convertedContent = String(result.convertedContent || "");
          const fileName = String(result.fileName || "");

          return {
            original: fileName,
            converted: `${fileName.replace(
              /\.(bat|sh|ksh|bash|zsh|cmd|ps1|py)$/i,
              ""
            )}.${batchOutputFormat === "doc" ? "docx" : "txt"}`,
            oracleContent: originalContent, // This will be shown in preview as "Original"
            snowflakeContent: convertedContent, // This will be shown in preview as "Converted"
            targetFolder: result.targetFolder || "",
          };
        });

      // Verify we have required data before setting state
      if (!zipFilename) {
        console.error(
          "[finalizeBatchIdmc] Missing zipFilename in response:",
          response
        );
      }
      if (mappedConvertedFiles.length === 0) {
        console.warn(
          "[finalizeBatchIdmc] No converted files mapped from results:",
          results
        );
      }

      // Set converted file state
      setConvertedFile({
        success: true,
        message: response.message || "completed",
        source: response.source || "idmc",
        jobId: response.jobId || "batch_zip",
        analysis: {
          totalFiles: processing.totalFiles || fileStats?.totalFiles || 0,
          oracleFiles: 0,
          solutionName: "",
          linesOfCode: fileStats?.totalLines || 0,
          fileSize: formatBytes(fileStats?.totalSize || 0),
          namespaces: [],
          classes: 0,
          dependencies: [],
        },
        conversion: {
          totalConverted:
            processing.processedFiles ||
            mappedConvertedFiles.length ||
            fileStats?.totalFiles ||
            0,
          totalFiles: processing.totalFiles || fileStats?.totalFiles || 0,
          successRate: processing.successRate || 100,
          convertedFiles: mappedConvertedFiles,
        },
        zipFilename: zipFilename || "batch_output.zip",
      });
    }

    setProgress(100);
    setShowZipOverlay(false);
    setCurrentPage("result");

    // Socket cleanup is already done before calling this function
    // This is just a safety check
    if (activeJobIdRef.current) {
      disconnectSocket(activeJobIdRef.current);
      activeJobIdRef.current = null;
    }
  };

  // Batch Human Language ZIP Convert via API + WebSocket
  const handleBatchHumanConvert = async () => {
    if (!uploadedFile?.path || !fileStats) return;

    try {
      finalizedRef.current = false; // Reset finalized flag
      setProgress(1);
      setShowZipOverlay(true);
      setErrorMessage("");
      setCurrentStepText("");
      setFilesConvertedCount(0);
      setTotalFilesCount(0);
      setElapsedMs(null);
      setEtaMs(null);

      const socket = connectSocket();
      socket.off("progress-update");

      let resp: any = null;
      let jobId: string | undefined = undefined;

      const finalizeBatchHuman = (data?: any) => {
        if (finalizedRef.current) {
          return;
        }
        finalizedRef.current = true;

        // When called with resp directly, data = resp
        // When called from WebSocket, data might have result wrapper
        // Use the data parameter directly if it exists, otherwise use resp closure
        const responseData = data || resp;

        // Check if this is a single-file response
        const isSingleFileResponse =
          (responseData?.outputFiles && !responseData?.zipFilename) ||
          (responseData?.fileName && !responseData?.zipFilename);

        if (isSingleFileResponse) {
          // Handle single-file response structure
          const outputFiles = responseData?.outputFiles || [];
          const originalContent = responseData?.originalContent || "";
          const convertedContent = responseData?.convertedContent || "";
          const fileName =
            responseData?.fileName ||
            uploadedFile?.name ||
            selectedFile?.name ||
            "input.txt";

          // Create a converted file structure for single file
          const mappedConverted = outputFiles.map((f: any) => ({
            original: fileName,
            converted:
              f.name ||
              `${fileName.replace(
                /\.(bat|sh|ksh|bash|zsh|cmd|ps1|py)$/i,
                ""
              )}.${batchOutputFormat === "doc" ? "docx" : "txt"}`,
            oracleContent: originalContent,
            snowflakeContent: convertedContent,
            targetFolder: f.path || "",
          }));

          // Determine if this is a ZIP file or single file for download
          const firstOutputFile = outputFiles[0];
          const isZipFile = firstOutputFile?.name?.endsWith(".zip") || false;
          const downloadIdentifier = isZipFile
            ? firstOutputFile?.name || "output.zip"
            : firstOutputFile?.path || firstOutputFile?.name || "output.txt";

          setConvertedFile({
            success: true,
            message: responseData?.message || "completed",
            source: responseData?.source || "human",
            jobId: jobId || "batch_human_single",
            analysis: {
              totalFiles: 1,
              oracleFiles: 0,
              solutionName: "",
              linesOfCode: fileStats.totalLines,
              fileSize: formatBytes(
                fileStats.totalSize || uploadedFile?.size || 0
              ),
              namespaces: [],
              classes: 0,
              dependencies: [],
            },
            conversion: {
              totalConverted: 1,
              totalFiles: 1,
              successRate: 100,
              convertedFiles: mappedConverted,
            },
            zipFilename: downloadIdentifier,
          });
        } else {
          // Handle ZIP response structure
          // Extract zipFilename - API response has it at top level
          const zipName =
            responseData?.zipFilename ||
            (responseData?.zipFilePath
              ? responseData.zipFilePath.split("/").pop()
              : undefined) ||
            "human_output.zip";

          // Extract results array - API response has results at top level
          // responseData = data || resp, so responseData.results works for both API and WebSocket
          const results = (responseData?.results || // Direct from responseData (works for both cases)
            data?.result?.results || // WebSocket wrapped structure (if data has result wrapper)
            []) as any[]; // Empty if not found

          // Map standardized results array to convertedFiles format
          const mappedConvertedFiles = results
            .filter((result: any) => result != null && result.fileName)
            .map((result: any) => {
              // Use standardized fields from API response
              const originalContent = result.originalContent || "";
              const convertedContent = result.convertedContent || "";
              const fileName = result.fileName;

              return {
                original: fileName,
                converted: `${fileName.replace(
                  /\.(bat|sh|ksh|bash|zsh|cmd|ps1|py)$/i,
                  ""
                )}.${batchOutputFormat === "doc" ? "docx" : "txt"}`,
                oracleContent: originalContent,
                snowflakeContent: convertedContent,
                targetFolder: result.targetFolder || "",
              };
            });

          setConvertedFile({
            success: true,
            message: responseData?.message || "completed",
            source: responseData?.source || "human",
            jobId: jobId || "batch_human_zip",
            analysis: {
              totalFiles:
                responseData?.processing?.totalFiles || fileStats.totalFiles,
              oracleFiles: 0,
              solutionName: "",
              linesOfCode: fileStats.totalLines,
              fileSize: formatBytes(fileStats.totalSize),
              namespaces: [],
              classes: 0,
              dependencies: [],
            },
            conversion: {
              totalConverted:
                responseData?.processing?.processedFiles ||
                mappedConvertedFiles.length ||
                fileStats.totalFiles,
              totalFiles:
                responseData?.processing?.totalFiles || fileStats.totalFiles,
              successRate: responseData?.processing?.successRate || 100,
              convertedFiles: mappedConvertedFiles,
            },
            zipFilename: zipName,
          });
        }

        setProgress(100);
        setShowZipOverlay(false);

        // Remove WebSocket listeners to prevent further updates
        socket.off("progress-update");
        socket.off("system-notification");

        setCurrentPage("result");
        if (jobId) {
          disconnectSocket(jobId);
        }
        activeJobIdRef.current = null;
      };

      socket.on("progress-update", (data) => {
        console.log("[socket] batch-human progress-update:", data);

        // Don't update if already finalized
        if (finalizedRef.current) {
          console.log(
            "[socket] batch-human already finalized, ignoring progress update"
          );
          return;
        }

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
        setProgress(Math.max(1, Math.min(100, computedProgress || 1)));
        if (!showZipOverlay) setShowZipOverlay(true);

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
        const hasZip =
          !!data?.result?.zipFilename ||
          !!data?.zipFilename ||
          !!resp?.zipFilename;
        const hasResults =
          !!data?.result?.results || !!data?.results || !!resp?.results;
        const hasSingleFileResult =
          !!data?.result?.outputFiles ||
          !!data?.outputFiles ||
          !!data?.result?.fileName ||
          !!data?.fileName ||
          !!resp?.outputFiles ||
          !!resp?.fileName;
        if (
          completedStatus ||
          completedByProgress ||
          (hasZip && hasResults) ||
          hasSingleFileResult
        ) {
          setTimeout(() => {
            finalizeBatchHuman(data);
          }, 300);
        } else if (data?.status === "failed") {
          setErrorMessage(data.error || "Batch processing failed");
          setShowZipOverlay(false);
          setCurrentPage("error");
          if (activeJobIdRef.current) {
            disconnectSocket(activeJobIdRef.current);
            activeJobIdRef.current = null;
          }
        }
      });

      resp = await idmcBatchSummary({
        inputType: "zip",
        zipPath: uploadedFile.path,
        outputFormat: batchOutputFormat,
      });

      jobId = resp?.jobId;
      if (jobId) {
        activeJobIdRef.current = jobId;
      }

      socket.on("system-notification", (payload) => {
        try {
          const { type, message } = payload || {};
          console.log("[system-notification]", type, message);
        } catch (_) {}
      });

      // Check if this is a single-file response
      const isSingleFileResponse =
        (resp as any)?.outputFiles && !(resp as any)?.zipFilename;

      // If API already returned a packaged zip without emitting progress, finalize immediately
      if (
        resp?.success &&
        ((isSingleFileResponse && (resp as any)?.outputFiles) ||
          resp?.results ||
          resp?.zipFilename)
      ) {
        finalizeBatchHuman(resp);
      }
    } catch (error) {
      console.error("Batch Human conversion error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Batch processing failed"
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

  // IDMC Summary to JSON ZIP Convert via API + WebSocket
  const handleIdmcToJsonZipConvert = async () => {
    if (!uploadedFile?.path || !fileStats) return;

    try {
      finalizedRef.current = false;
      setProgress(1);
      setShowZipOverlay(true);
      setErrorMessage("");
      setCurrentStepText("");
      setFilesConvertedCount(0);
      setTotalFilesCount(0);
      setElapsedMs(null);
      setEtaMs(null);

      const socket = connectSocket();
      socket.off("progress-update");

      let jobId: string | undefined = undefined;
      let apiResponse: any = null;

      // Set up WebSocket progress listener BEFORE API call
      socket.on("progress-update", (data) => {
        if (finalizedRef.current) return;

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
        setProgress(Math.max(1, Math.min(100, computedProgress || 1)));
        if (!showZipOverlay) setShowZipOverlay(true);

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
        const hasZip =
          !!data?.result?.zipFilename ||
          !!data?.zipFilename ||
          !!apiResponse?.zipFilename;
        const hasResults =
          !!data?.result?.results || !!data?.results || !!apiResponse?.results;
        const hasSingleFileResult =
          !!data?.result?.outputFiles ||
          !!data?.outputFiles ||
          !!data?.result?.fileName ||
          !!data?.fileName ||
          !!data?.result?.convertedContent ||
          !!data?.convertedContent ||
          !!apiResponse?.outputFiles ||
          !!apiResponse?.fileName ||
          !!apiResponse?.convertedContent;

        if (
          completedStatus ||
          completedByProgress ||
          (hasZip && hasResults) ||
          hasSingleFileResult
        ) {
          let finalData: any = null;

          if (
            data?.result &&
            (data.result.results ||
              data.result.zipFilename ||
              data.result.outputFiles ||
              data.result.fileName)
          ) {
            finalData = data.result;
          } else if (
            data?.results ||
            data?.zipFilename ||
            data?.outputFiles ||
            data?.fileName
          ) {
            finalData = data;
          } else if (apiResponse?.results && apiResponse?.zipFilename) {
            finalData = apiResponse;
          } else if (apiResponse?.outputFiles || apiResponse?.fileName) {
            finalData = apiResponse;
          }

          if (finalData && !finalizedRef.current) {
            socket.off("progress-update");
            socket.off("system-notification");
            if (jobId) {
              disconnectSocket(jobId);
            }
            activeJobIdRef.current = null;

            setTimeout(() => {
              finalizeIdmcToJson(finalData);
            }, 300);
          }
        } else if (data?.status === "failed") {
          setErrorMessage(
            data.error || "IDMC Summary to JSON conversion failed"
          );
          setShowZipOverlay(false);
          setCurrentPage("error");
          if (activeJobIdRef.current) {
            disconnectSocket(activeJobIdRef.current);
            activeJobIdRef.current = null;
          }
        }
      });

      socket.on("system-notification", (payload) => {
        try {
          const { type, message } = payload || {};
          console.log("[system-notification]", type, message);
        } catch (_) {}
      });

      // Call API endpoint: POST /api/idmc/summary-to-json
      const idmcToJsonPayload: any = {
        zipFilePath: uploadedFile.path,
      };
      if (customFileName && customFileName.trim()) {
        idmcToJsonPayload.customFileName = customFileName.trim();
      }
      apiResponse = await idmcSummaryToJson(idmcToJsonPayload);

      if (!apiResponse?.success) {
        throw new Error(
          apiResponse?.message || "IDMC Summary to JSON conversion failed"
        );
      }

      // Check if this is a single-file response (when single file uploaded instead of ZIP)
      const isSingleFileResponse =
        (apiResponse as any)?.outputFiles && !(apiResponse as any)?.zipFilename;

      jobId = (apiResponse as any).jobId;
      if (jobId) {
        activeJobIdRef.current = jobId;
      }

      // If API already returned complete response, finalize immediately
      if (
        apiResponse?.success &&
        !finalizedRef.current &&
        ((isSingleFileResponse && (apiResponse as any)?.outputFiles) ||
          ((apiResponse as any)?.results && (apiResponse as any)?.zipFilename))
      ) {
        socket.off("progress-update");
        socket.off("system-notification");
        if (jobId) {
          disconnectSocket(jobId);
        }
        activeJobIdRef.current = null;

        finalizeIdmcToJson(apiResponse);
      }
    } catch (error) {
      console.error("IDMC Summary to JSON conversion error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "IDMC Summary to JSON conversion failed"
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

  // Finalize IDMC Summary to JSON conversion
  const finalizeIdmcToJson = (response: any) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    // Check if this is a single-file response
    const isSingleFileResponse =
      (response?.outputFiles && !response?.zipFilename) ||
      (response?.fileName && !response?.zipFilename);

    if (isSingleFileResponse) {
      // Handle single-file response structure
      const outputFiles = response?.outputFiles || [];
      const originalContent = response?.originalContent || "";
      const convertedContent = response?.convertedContent || "";
      const fileName =
        response?.fileName ||
        uploadedFile?.name ||
        selectedFile?.name ||
        "input.json";

      // Create a converted file structure for single file
      const mappedConverted = outputFiles.map((f: any) => ({
        original: fileName,
        converted: f.name || "output.bin",
        oracleContent: originalContent,
        snowflakeContent: convertedContent,
        targetFolder: f.path || "", // Store file path for downloads
      }));

      // Determine if this is a ZIP file or single file for download
      const firstOutputFile = outputFiles[0];
      const isZipFile = firstOutputFile?.name?.endsWith(".zip") || false;
      const downloadIdentifier = isZipFile
        ? firstOutputFile?.name || "output.zip"
        : firstOutputFile?.path || firstOutputFile?.name || "output.bin";

      setConvertedFile({
        success: true,
        message: response.message || "completed",
        source: response.source || "idmc-to-json",
        jobId: response.jobId || "idmc_to_json_single",
        analysis: {
          totalFiles: 1,
          oracleFiles: 0,
          solutionName: "",
          linesOfCode: fileStats?.totalLines || 0,
          fileSize: formatBytes(
            fileStats?.totalSize || uploadedFile?.size || 0
          ),
          namespaces: [],
          classes: 0,
          dependencies: [],
        },
        conversion: {
          totalConverted: 1,
          totalFiles: 1,
          successRate: 100,
          convertedFiles: mappedConverted,
        },
        zipFilename: downloadIdentifier, // Store path for single files, filename for ZIPs
      });
    } else {
      // Handle ZIP response structure
      const zipFilename =
        response.zipFilename ||
        (response.zipFilePath
          ? response.zipFilePath.split("/").pop()
          : undefined);

      const results = response.results || [];
      const processing = response.processing || {
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 0,
        successRate: 0,
      };

      const mappedConvertedFiles = results
        .filter((result: any) => result && result.fileName)
        .map((result: any) => {
          const originalContent = String(result.originalContent || "");
          const convertedContent = String(result.convertedContent || "");
          const fileName = String(result.fileName || "");

          // Determine output extension based on file name or default to .bin
          // The API can return .bin, .txt, .doc, .json, or combinations depending on outputFormat
          // Extract the actual extension from the fileName if present
          const match = fileName.match(/\.(bin|txt|doc|docx|json)$/i);
          const outputExt = match ? match[0] : ".bin";
          return {
            original: fileName,
            converted: `${fileName.replace(
              /\.(md|txt|json|bin|doc|docx)$/i,
              ""
            )}${outputExt}`,
            oracleContent: originalContent,
            snowflakeContent: convertedContent,
            targetFolder: result.targetFolder || "",
          };
        });

      setConvertedFile({
        success: true,
        message: response.message || "completed",
        source: response.source || "idmc-to-json",
        jobId: response.jobId || "idmc_to_json_zip",
        analysis: {
          totalFiles: processing.totalFiles || fileStats?.totalFiles || 0,
          oracleFiles: 0,
          solutionName: "",
          linesOfCode: fileStats?.totalLines || 0,
          fileSize: formatBytes(fileStats?.totalSize || 0),
          namespaces: [],
          classes: 0,
          dependencies: [],
        },
        conversion: {
          totalConverted:
            processing.processedFiles ||
            mappedConvertedFiles.length ||
            fileStats?.totalFiles ||
            0,
          totalFiles: processing.totalFiles || fileStats?.totalFiles || 0,
          successRate: processing.successRate || 100,
          convertedFiles: mappedConvertedFiles,
        },
        zipFilename: zipFilename || "idmc_mapping.zip",
      });
    }

    setProgress(100);
    setShowZipOverlay(false);
    setCurrentPage("result");

    if (activeJobIdRef.current) {
      disconnectSocket(activeJobIdRef.current);
      activeJobIdRef.current = null;
    }
  };

  // SINGLE Convert via Unified API (with websocket support)
  const handleSingleConvert = async () => {
    try {
      setIsConvertingSingle(true);
      setSingleResult("");
      setSingleOutputs([]);
      setErrorMessage("");
      finalizedRef.current = false;

      const target = isSnowflakeTab
        ? "snowflake"
        : isIdmcTab
        ? "idmc"
        : isBatchHuman
        ? "idmc"
        : "idmc";

      // Helper function to finalize single file conversion
      const finalizeSingleConversion = (res: any, jobId?: string) => {
        if (finalizedRef.current) return;
        finalizedRef.current = true;

        // Handle different response structures
        if (res?.outputFiles && Array.isArray(res.outputFiles)) {
          setSingleOutputs(res.outputFiles);
        } else if (res?.filePath) {
          setSingleOutputs([
            {
              name: res.fileName || "output.json",
              path: res.filePath,
              mime: res.mime || "application/json",
              kind: "single",
            },
          ]);
        }

        // Set result content based on response structure
        if (typeof res?.jsonContent === "string" && res.jsonContent.trim()) {
          setSingleResult(res.jsonContent);
        } else if (
          typeof res?.convertedContent === "string" &&
          res.convertedContent.trim()
        ) {
          setSingleResult(res.convertedContent);
        } else if (
          Array.isArray(res?.idmcSummaries) &&
          res.idmcSummaries.length > 0 &&
          typeof res.idmcSummaries[0]?.idmcSummary === "string"
        ) {
          setSingleResult(res.idmcSummaries[0].idmcSummary);
        } else if (
          typeof res?.humanReadableSummary === "string" &&
          res.humanReadableSummary.trim()
        ) {
          setSingleResult(res.humanReadableSummary);
        } else if (typeof res?.summary === "string" && res.summary.trim()) {
          setSingleResult(res.summary);
        } else if (res?.outputFiles && res.outputFiles.length > 0) {
          setSingleResult(
            res.outputFiles.map((f: any) => `${f.name} (${f.mime})`).join("\n")
          );
        } else {
          setSingleResult("");
        }

        // Cleanup - no overlay for single file conversions
        setIsConvertingSingle(false);
        if (jobId && activeJobIdRef.current) {
          disconnectSocket(jobId);
          activeJobIdRef.current = null;
        }
      };

      let res: any = null;
      let jobId: string | undefined = undefined;

      // Set up WebSocket listener BEFORE making API call (for async conversions)
      const socket = connectSocket();
      socket.off("progress-update");

      socket.on("progress-update", (data) => {
        console.log("[socket] single-file progress-update:", data);

        if (finalizedRef.current) return;

        // Don't show overlay for single file conversions - just track progress internally
        // The button loading state (isConvertingSingle) handles the UI feedback

        // Check if conversion is complete
        const completedStatus =
          data?.status === "completed" || data?.status === "success";
        const completedByProgress =
          typeof data?.progress === "number" && data.progress >= 100;
        const hasResult =
          !!data?.result || !!data?.jsonContent || !!data?.outputFiles;

        if (completedStatus || completedByProgress || hasResult) {
          // Extract result from WebSocket data
          const resultData = data?.result || data;
          setTimeout(() => {
            finalizeSingleConversion(resultData, jobId);
          }, 300);
        } else if (data?.status === "failed") {
          setErrorMessage(data.error || "Conversion failed");
          setCurrentPage("error");
          setIsConvertingSingle(false);
          if (activeJobIdRef.current) {
            disconnectSocket(activeJobIdRef.current);
            activeJobIdRef.current = null;
          }
        }
      });

      socket.on("system-notification", (payload) => {
        try {
          const { type, message } = payload || {};
          console.log("[system-notification]", type, message);
        } catch (_) {}
      });

      // Don't show overlay for single file conversions - button shows loading state

      if (selectedTab === "idmc-batch") {
        // Single batch script to IDMC summary
        const defaultFileName = customFileName.trim() || "run.sh";
        res = await idmcBatch({
          inputType: "single",
          script: singleSourceCode,
          name: defaultFileName,
          outputFormat: batchOutputFormat,
        });
        jobId = res?.jobId;
      } else if (selectedTab === "batch-human") {
        // Human language summary of batch script
        const defaultFileName = customFileName.trim() || "run.sh";
        res = await idmcBatchSummary({
          inputType: "single",
          script: singleSourceCode,
          name: defaultFileName,
          outputFormat: batchOutputFormat,
        });
        jobId = res?.jobId;
      } else if (selectedTab === "idmc-to-json") {
        // IDMC Summary to JSON conversion
        const defaultFileName = customFileName.trim() || "mapping_summary.md";
        const idmcToJsonPayload: any = {
          sourceCode: singleSourceCode,
          fileName: defaultFileName,
          outputFormat: idmcToJsonOutputFormat,
        };
        res = await idmcSummaryToJson(idmcToJsonPayload);
        jobId = (res as any)?.jobId;
      } else {
        // SQL -> IDMC or Oracle -> Snowflake
        const defaultFileName = customFileName.trim() || "input.sql";
        const payload: any = {
          inputType: "single",
          target,
          sourceType: "auto",
          sourceCode: singleSourceCode,
          fileName: defaultFileName,
        };
        if (target === "idmc") payload.outputFormat = outputFormat;
        res = await convertUnified(payload);
        jobId = (res as any)?.jobId;
      }

      // Store jobId for WebSocket cleanup
      if (jobId) {
        activeJobIdRef.current = jobId;
      }

      // If response is already complete (no jobId or immediate result), finalize immediately
      if (
        !jobId ||
        (res?.success &&
          (res?.outputFiles || res?.jsonContent || res?.convertedContent))
      ) {
        // No async processing needed, finalize immediately
        finalizeSingleConversion(res, jobId);
      }
      // Otherwise, WebSocket will handle the completion via progress-update event
    } catch (error) {
      console.error("Single conversion failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Conversion failed"
      );
      setCurrentPage("error");
      setIsConvertingSingle(false);
      if (activeJobIdRef.current) {
        disconnectSocket(activeJobIdRef.current);
        activeJobIdRef.current = null;
      }
      finalizedRef.current = false;
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
            ? batchOutputFormat === "doc"
              ? "idmc-summary.docx"
              : "idmc-summary.txt"
            : selectedTab === "batch-human"
            ? batchOutputFormat === "doc"
              ? "human-summary.docx"
              : "human-summary.txt"
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
      // Check if zipFilename is actually a ZIP file or a single file path
      const isZipFile = zipName.endsWith(".zip");

      if (isZipFile) {
        // Use filename parameter for ZIP files
        await conversionDownload({ filename: zipName });
      } else {
        // For single files, try to get filePath from convertedFiles or use zipFilename as path
        const filePath =
          convertedFile?.conversion?.convertedFiles?.[0]?.targetFolder ||
          zipName;
        if (filePath) {
          await conversionDownload({ filePath: filePath });
        } else {
          // Fallback: try using zipName as filePath if it looks like a path
          await conversionDownload({ filePath: zipName });
        }
      }
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
    setCustomFileName("");
    finalizedRef.current = false;
  };

  const tabButton = (key: TabKey, label: string) => (
    <button
      key={key}
      onClick={() => setSelectedTab(key)}
      className={`px-5 py-2.5 rounded-full text-sm manrope-medium transition-all duration-300 ${
        selectedTab === key
          ? "bg-gradient-to-r from-[#E46356] to-[#B978B2] text-white shadow-lg shadow-[#E46356]/30 transform scale-105"
          : "bg-white border border-neutral-300 text-gray-700 hover:border-[#E46356]/50 hover:bg-gray-50 hover:shadow-md"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20 flex flex-col manrope-regular">
      <Header handleReset={() => handleReset()} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          {tabButton("idmc-sql", "Oracle/Redshift SQL → IDMC Summary")}
          {tabButton("snowflake", "Oracle SQL → Snowflake")}
          {tabButton("idmc-batch", "Batch Script → IDMC Summary")}
          {tabButton("batch-human", "Batch Script → Human Language")}
          {tabButton("idmc-to-json", "IDMC Summary → JSON")}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-3 mb-8 flex-wrap bg-white p-5 rounded-xl shadow-md border border-gray-200">
          <span
            className={`text-sm manrope-medium transition-colors duration-200 ${
              inputMode === "zip" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            Upload
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
            <div className="peer h-6 w-11 rounded-full bg-gray-200 shadow-inner after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#E46356] peer-checked:to-[#B978B2] peer-checked:after:translate-x-full"></div>
          </label>
          <span
            className={`text-sm manrope-medium transition-colors duration-200 ${
              inputMode === "single" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            Single
          </span>

          {/* Top-level output format selection (conditional by tab) */}
          {selectedTab === "idmc-sql" && (
            <div className="flex items-center gap-3 ml-6">
              <label className="text-sm text-gray-700 manrope-medium">
                Output format
              </label>
              <select
                value={outputFormat}
                onChange={(e) =>
                  setOutputFormat(e.target.value as IdmcOutputFormat)
                }
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-[#E46356]/50 focus:border-[#E46356] focus:ring-2 focus:ring-[#E46356]/20 transition-all duration-200 outline-none cursor-pointer"
              >
                <option value="json">JSON</option>
                <option value="docx">DOCX</option>
              </select>
            </div>
          )}
          {(selectedTab === "idmc-batch" || selectedTab === "batch-human") && (
            <div className="flex items-center gap-3 ml-6">
              <label className="text-sm text-gray-700 manrope-medium">
                Output format
              </label>
              <select
                value={batchOutputFormat}
                onChange={(e) =>
                  setBatchOutputFormat(e.target.value as BatchOutputFormat)
                }
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-[#E46356]/50 focus:border-[#E46356] focus:ring-2 focus:ring-[#E46356]/20 transition-all duration-200 outline-none cursor-pointer"
              >
                <option value="doc">DOC (.docx)</option>
                <option value="txt">TXT (.txt)</option>
              </select>
            </div>
          )}
          {selectedTab === "idmc-to-json" && (
            <div className="flex items-center gap-3 ml-6">
              <label className="text-sm text-gray-700 manrope-medium">
                Output format
              </label>
              <select
                value={idmcToJsonOutputFormat}
                onChange={(e) =>
                  setIdmcToJsonOutputFormat(
                    e.target.value as IdmcSummaryOutputFormat
                  )
                }
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-[#E46356]/50 focus:border-[#E46356] focus:ring-2 focus:ring-[#E46356]/20 transition-all duration-200 outline-none cursor-pointer"
              >
                <option value="bin">.bin</option>
                <option value="txt">.txt</option>
                <option value="doc">.doc</option>
              </select>
            </div>
          )}
          {/* Custom file name input */}
          <div className="flex items-center gap-3 ml-6">
            <label className="text-sm text-gray-700 manrope-medium">
              Custom file name
            </label>
            <input
              type="text"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder="Optional"
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-40 bg-white hover:border-[#E46356]/50 focus:border-[#E46356] focus:ring-2 focus:ring-[#E46356]/20 transition-all duration-200 outline-none"
            />
          </div>

          {/* Convert button for single file mode */}
          {inputMode === "single" && (
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={handleSingleConvert}
                disabled={isConvertingSingle || !singleSourceCode.trim()}
                className={`px-6 py-2.5 rounded-lg text-white text-sm transition-all duration-200 font-semibold manrope-medium shadow-md hover:shadow-lg ${
                  isConvertingSingle || !singleSourceCode.trim()
                    ? "bg-gradient-to-r from-[#E46356]/60 to-[#B978B2]/60 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#E46356] to-[#B978B2] hover:from-[#D8554A] hover:to-[#A869A0] transform hover:scale-105"
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
          )}
        </div>

        {/* Content */}
        {currentPage === "upload" && (
          <div className="space-y-6">
            {inputMode === "zip" ? (
              <ZipUploadPanel
                dragActive={dragActive}
                onDrag={handleDrag}
                onDrop={handleDrop}
                onFileInput={handleFileInput}
                selectedFile={selectedFile}
                fileStats={fileStats as any}
                onStart={
                  selectedTab === "idmc-batch"
                    ? handleBatchIdmcConvert
                    : selectedTab === "batch-human"
                    ? handleBatchHumanConvert
                    : selectedTab === "idmc-to-json"
                    ? handleIdmcToJsonZipConvert
                    : handleZipConvert
                }
                accept={
                  isIdmcToJsonTab
                    ? ".zip,.txt,.bin,.md,.doc,.docx,.json"
                    : selectedTab === "idmc-batch" ||
                      selectedTab === "batch-human"
                    ? ".zip,.sh,.bat,.ksh,.bash,.zsh,.cmd,.ps1"
                    : ".zip,.sql,.txt,.bin,.md,.pls,.pkg,.prc,.fnc,.rs,.redshift"
                }
                helpText={
                  isIdmcToJsonTab
                    ? "Supports ZIP files containing IDMC Summary files (.txt, .bin, .md, .doc, .docx, .json)"
                    : selectedTab === "idmc-batch"
                    ? "Supports ZIP files containing batch scripts (.sh, .bat, .ksh, .bash, .zsh, .cmd, .ps1)"
                    : selectedTab === "batch-human"
                    ? "Supports ZIP files containing batch scripts (.sh, .bat, .ksh, .bash, .zsh, .cmd, .ps1)"
                    : undefined
                }
              />
            ) : (
              <SingleEditorsPanel
                singleSourceCode={singleSourceCode}
                setSingleSourceCode={setSingleSourceCode}
                singleResult={singleResult}
                singleOutputs={singleOutputs}
                onDownload={handleSingleDownload}
                placeholder={
                  isBatchHuman || selectedTab === "idmc-batch"
                    ? "Paste your batch script here (.sh, .bat, .ksh, .bash, .zsh, .cmd, .ps1)..."
                    : selectedTab === "idmc-to-json"
                    ? "Paste IDMC mapping summary here (markdown/text format)..."
                    : isSnowflakeTab
                    ? "Paste Oracle SQL/PLSQL here..."
                    : "Paste SQL for IDMC summary here (Oracle/Redshift)..."
                }
              />
            )}
          </div>
        )}

        {/* WebSocket progress overlay - only shows for ZIP conversions, not single file */}
        {inputMode === "zip" && showZipOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-10 sm:p-12 w-11/12 max-w-2xl">
              <div className="flex flex-col text-center items-center gap-4">
                <div className="flex justify-center items-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg mb-2">
                  <img
                    src={
                      progress < 30
                        ? analysing
                        : progress < 80
                        ? processing
                        : done
                    }
                    className="h-10"
                  />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
                  <div
                    className="bg-[linear-gradient(90.04deg,_#E46356_0.1%,_#B978B2_25.01%,_#70CBCF_49.91%,_#E7E62A_99.73%)] h-4 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${Math.max(progress, 1)}%` }}
                  />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 manrope-semibold">
                    {Math.round(Math.max(progress, 1))}% Complete
                    {totalFilesCount > 0 && (
                      <span className="text-gray-600 font-normal">
                        {" "}
                        · {filesConvertedCount}/{totalFilesCount} files
                      </span>
                    )}
                    {(elapsedMs !== null || etaMs !== null) && (
                      <span className="text-gray-600 font-normal">
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
                  <h3 className="manrope-semibold text-base sm:text-lg text-gray-900">
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

        {/* Simple processing overlay - only show when WebSocket overlay is NOT active */}
        {isProcessing && !showZipOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-10 sm:p-12 max-w-xl w-full text-center">
              <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#B978B2] animate-spin" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 manrope-bold">
                Analyzing dependencies...
              </h3>
              <p className="text-gray-600 mb-8 manrope-regular">
                Please wait while we analyze your code...
              </p>
            </div>
          </div>
        )}

        {/* Result */}
        {currentPage === "result" && convertedFile && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="flex flex-col sm:flex-row items-center max-w-4xl bg-gradient-to-br from-white to-gray-50/50 justify-center mb-8 gap-6 p-12 shadow-xl rounded-2xl border border-gray-100">
                <div className="flex flex-col justify-center items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-lg">
                    <img src={FinalSuccess} alt="final" className="h-12" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-3xl font-bold text-gray-900 mb-2 manrope-bold">
                      Conversion Complete!
                    </h3>
                    <p className="text-lg text-gray-600 manrope-regular">
                      Your files are ready for download.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 min-w-xl ml-[-10px]">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex-1 sm:flex-none px-6 py-3 w-[40%] bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 font-medium flex items-center justify-center gap-2 manrope-medium"
                >
                  <Eye className="w-5 h-5" />
                  {showPreview ? "Hide" : "Preview"}
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 sm:flex-none px-6 py-3 w-[30%] border-2 border-[#E46356] text-[#E46356] rounded-xl hover:bg-[#E46356] hover:text-white transition-all duration-200 font-medium flex items-center justify-center gap-2 manrope-medium shadow-sm hover:shadow-md"
                >
                  <IoIosRepeat className="w-5 h-5" />
                  Reconvert
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 sm:flex-none px-6 py-3 w-[30%] bg-gradient-to-r from-[#E46356] to-[#B978B2] text-white rounded-xl hover:from-[#D8554A] hover:to-[#A869A0] transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg shadow-[#E46356]/30 hover:shadow-xl hover:shadow-[#E46356]/40 transform hover:scale-105 manrope-medium"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>

              {/* Inline side-by-side preview removed; content shown in the Preview modal */}

              {/* Preview modal for converted files if available */}
              {showPreview && convertedFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md px-4 animate-fadeIn">
                  <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 manrope-bold">
                          Preview
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 manrope-regular">
                          Review original and converted outputs
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 text-xl font-semibold"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Modal Content */}
                    <div className="overflow-y-auto p-6 flex-1">
                      <div className="grid lg:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          <div className="flex items-center gap-3 mb-0 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200">
                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <IoCodeSlash className="text-blue-600" />
                            </div>
                            <h4 className="font-semibold text-gray-900 manrope-semibold">
                              Original
                            </h4>
                          </div>
                          <div className="space-y-3 max-h-[55vh] overflow-y-auto p-5">
                            {!convertedFile?.conversion?.convertedFiles ||
                            convertedFile.conversion.convertedFiles.length ===
                              0 ? (
                              <div className="text-center text-gray-500 py-8">
                                <p>No original files to display</p>
                              </div>
                            ) : (
                              convertedFile.conversion.convertedFiles.map(
                                (file, idx) => (
                                  <div
                                    key={idx}
                                    className={`bg-white border-l-4 ${
                                      expandedIndex === idx
                                        ? "border-l-[#70CBCF] shadow-md"
                                        : "border-gray-300"
                                    } rounded-lg p-4 mb-4 transition-all duration-200 hover:shadow-sm`}
                                  >
                                    <button
                                      onClick={() =>
                                        setExpandedIndex(
                                          expandedIndex === idx ? null : idx
                                        )
                                      }
                                      className="w-full flex items-center justify-between text-left group"
                                    >
                                      <p className="font-mono text-sm font-semibold text-gray-800 truncate manrope-medium">
                                        {file.original}
                                      </p>
                                      <span className="text-gray-400 group-hover:text-[#70CBCF] transition-colors duration-200 ml-2">
                                        {expandedIndex === idx ? (
                                          <FaChevronUp />
                                        ) : (
                                          <FaChevronDown />
                                        )}
                                      </span>
                                    </button>
                                    {expandedIndex === idx && (
                                      <div className="mt-4 animate-fadeIn border-t border-gray-100 pt-3">
                                        <pre className="text-xs bg-gray-50 border border-gray-200 p-4 rounded-lg overflow-x-auto max-h-40 overflow-y-auto">
                                          <code className="text-gray-800 font-mono">
                                            {file.oracleContent}
                                          </code>
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )
                              )
                            )}
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          <div className="flex items-center gap-3 mb-0 p-4 bg-gradient-to-r from-[#E46356] to-[#B978B2] border-b border-[#E46356]/20">
                            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                              <FaFileLines className="text-white" />
                            </div>
                            <h4 className="font-semibold text-white manrope-semibold">
                              Converted
                            </h4>
                          </div>
                          <div className="space-y-3 max-h-[55vh] overflow-y-auto p-5">
                            {!convertedFile?.conversion?.convertedFiles ||
                            convertedFile.conversion.convertedFiles.length ===
                              0 ? (
                              <div className="text-center text-gray-500 py-8">
                                <p>No converted files to display</p>
                              </div>
                            ) : (
                              convertedFile.conversion.convertedFiles.map(
                                (file, idx) => (
                                  <div
                                    key={idx}
                                    className={`bg-white border-l-4 ${
                                      expandedIndex === idx
                                        ? "border-l-green-500 shadow-md"
                                        : "border-l-green-200"
                                    } rounded-lg p-4 mb-4 transition-all duration-200 hover:shadow-sm`}
                                  >
                                    <button
                                      onClick={() =>
                                        setExpandedIndex(
                                          expandedIndex === idx ? null : idx
                                        )
                                      }
                                      className="w-full flex items-center justify-between text-left group"
                                    >
                                      <p className="font-mono text-sm font-semibold text-gray-800 truncate manrope-medium">
                                        {file.converted}
                                      </p>
                                      <span className="text-gray-400 group-hover:text-green-500 transition-colors duration-200 ml-2">
                                        {expandedIndex === idx ? (
                                          <FaChevronUp />
                                        ) : (
                                          <FaChevronDown />
                                        )}
                                      </span>
                                    </button>
                                    {expandedIndex === idx && (
                                      <div className="mt-4 animate-fadeIn border-t border-gray-100 pt-3">
                                        <pre className="text-xs bg-gray-50 border border-gray-200 p-4 rounded-lg overflow-x-auto max-h-40 overflow-y-auto">
                                          <code className="text-gray-800 font-mono">
                                            {file.snowflakeContent}
                                          </code>
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Modal Footer */}
                    <div className="flex flex-row items-center justify-center gap-4 p-6 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => setCurrentPage("upload")}
                        className="flex-1 px-6 py-3 border-2 border-[#E46356] text-[#E46356] rounded-xl hover:bg-[#E46356] hover:text-white transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md manrope-medium"
                      >
                        <IoIosRepeat className="w-5 h-5" />
                        Reconvert
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-[#E46356] to-[#B978B2] text-white rounded-xl hover:from-[#D8554A] hover:to-[#A869A0] transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl manrope-medium"
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
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 sm:p-16">
            <div className="text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                <CheckCircle className="w-14 h-14 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4 manrope-bold">
                Completed!
              </h3>
              <p className="text-lg text-gray-600 mb-10 manrope-regular">
                Your request has been processed successfully.
              </p>
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-gradient-to-r from-[#E46356] to-[#B978B2] rounded-xl text-white transition-all duration-200 font-semibold flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-xl hover:from-[#D8554A] hover:to-[#A869A0] transform hover:scale-105 manrope-medium"
              >
                <RefreshCw className="w-5 h-5" />
                Convert Another
              </button>
            </div>
          </div>
        )}

        {/* Error Page */}
        {currentPage === "error" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 sm:p-16">
            <div className="text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                <AlertCircle className="w-14 h-14 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4 manrope-bold">
                Something Went Wrong
              </h3>
              <p className="text-lg text-gray-600 mb-10 manrope-regular bg-red-50 border border-red-100 rounded-lg p-4">
                {errorMessage}
              </p>
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-gradient-to-r from-[#E46356] to-[#B978B2] rounded-xl text-white transition-all duration-200 font-semibold flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-xl hover:from-[#D8554A] hover:to-[#A869A0] transform hover:scale-105 manrope-medium"
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
