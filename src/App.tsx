import React, { useState, useCallback } from 'react';
import { Upload, FileCode, Loader2, Download, CheckCircle, AlertCircle, RefreshCw, File, Eye, Code, FileText, HardDrive, Hash } from 'lucide-react';
import JSZip from 'jszip';
import InflectoLogo from './assets/inflecto-logo.svg'

type FileInfo = {
  name: string;
  size: number;
  content: string;
  lines: number;
};

type ConversionResult = {
  originalFiles: FileInfo[];
  convertedFiles: FileInfo[];
};

type PageType = 'upload' | 'progress' | 'result' | 'success' | 'error';

type FileStats = {
  totalFiles: number;
  totalSize: number;
  totalLines: number;
  files: Array<{ name: string; size: number; lines: number }>;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const countLines = (content: string): number => {
  return content.split('\n').length;
};

const App: React.FC = () => {
  // Configuration Flag - Set this to true when APIs are available
  const isApiAvailable = false; // Change to true to use real APIs
  const API_BASE_URL = 'http://localhost:5000/api'; // Configure your API URL here

  const [currentPage, setCurrentPage] = useState<PageType>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const analyzeZipFile = async (file: File) => {
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      const csFiles: Array<{ name: string; size: number; lines: number }> = [];
      let totalSize = 0;
      let totalLines = 0;

      for (const [filename, zipEntry] of Object.entries(contents.files)) {
        if (!zipEntry.dir && filename.endsWith('.cs')) {
          const content = await zipEntry.async('string');
          const size = content.length;
          const lines = countLines(content);
          csFiles.push({ name: filename, size, lines });
          totalSize += size;
          totalLines += lines;
        }
      }

      setFileStats({
        totalFiles: csFiles.length,
        totalSize,
        totalLines,
        files: csFiles
      });
    } catch (error) {
      console.error('Error analyzing zip:', error);
      setErrorMessage('Failed to analyze ZIP file. Please ensure it\'s a valid ZIP file.');
      setCurrentPage('error');
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
        analyzeZipFile(file);
      } else {
        setErrorMessage('Please upload a ZIP file containing .NET code');
        setCurrentPage('error');
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
        analyzeZipFile(file);
      } else {
        setErrorMessage('Please upload a ZIP file containing .NET code');
        setCurrentPage('error');
      }
    }
  };

  const simulateConversion = async () => {
    return new Promise<void>((resolve) => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 8 + 2;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          resolve();
        }
        setProgress(Math.min(currentProgress, 100));
      }, 200);
    });
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setCurrentPage('progress');
    setProgress(0);

    if (isApiAvailable) {
      // API Mode: Call real backend APIs
      const progressInterval = simulateProgress();

      try {
        // STEP 1: Upload the file
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);

        const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        const uploadData = await uploadResponse.json();
        const fileId = uploadData.fileId || uploadData.id;

        // STEP 2: Start conversion
        const convertResponse = await fetch(`${API_BASE_URL}/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        });

        if (!convertResponse.ok) {
          throw new Error('Conversion failed');
        }

        // STEP 3: Download converted zip
        const downloadResponse = await fetch(`${API_BASE_URL}/download/${fileId}`);
        
        if (!downloadResponse.ok) {
          throw new Error('Download failed');
        }

        const convertedZipBlob = await downloadResponse.blob();
        
        clearInterval(progressInterval);
        setProgress(100);

        // STEP 4: Parse both original and converted files
        await parseZipFiles(selectedFile, convertedZipBlob);

        setTimeout(() => {
          setCurrentPage('result');
        }, 500);

      } catch (error) {
        clearInterval(progressInterval);
        console.error('Conversion error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Conversion failed');
        setCurrentPage('error');
      }
    } else {
      // Static Mode: Simulate conversion without APIs
      await simulateConversion();

      try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(selectedFile);
        
        const originalFiles: FileInfo[] = [];
        const convertedFiles: FileInfo[] = [];

        for (const [filename, zipEntry] of Object.entries(contents.files)) {
          if (!zipEntry.dir && filename.endsWith('.cs')) {
            const content = await zipEntry.async('string');
            const lines = countLines(content);
            
            originalFiles.push({
              name: filename,
              size: content.length,
              content,
              lines
            });

            // Simulate Java conversion (just rename .cs to .java and add some mock changes)
            const javaFilename = filename.replace('.cs', '.java');
            const javaContent = content
              .replace(/namespace /g, 'package ')
              .replace(/using /g, 'import ')
              .replace(/class /g, 'public class ');
            
            convertedFiles.push({
              name: javaFilename,
              size: javaContent.length,
              content: javaContent,
              lines: countLines(javaContent)
            });
          }
        }

        setConversionResult({ originalFiles, convertedFiles });
        setCurrentPage('result');
      } catch (error) {
        console.error('Conversion error:', error);
        setErrorMessage('Failed to process files');
        setCurrentPage('error');
      }
    }
  };

  const simulateProgress = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
      }
      setProgress(Math.min(currentProgress, 100));
    }, 500);
    return interval;
  };

  const parseZipFiles = async (originalZip: File, convertedZipBlob: Blob) => {
    try {
      const zip = new JSZip();
      
      // Parse original files
      const originalContents = await zip.loadAsync(originalZip);
      const originalFiles: FileInfo[] = [];

      for (const [filename, zipEntry] of Object.entries(originalContents.files)) {
        if (!zipEntry.dir && filename.endsWith('.cs')) {
          const content = await zipEntry.async('string');
          const lines = countLines(content);
          originalFiles.push({
            name: filename,
            size: content.length,
            content,
            lines
          });
        }
      }

      // Parse converted files
      const convertedContents = await zip.loadAsync(convertedZipBlob);
      const convertedFiles: FileInfo[] = [];

      for (const [filename, zipEntry] of Object.entries(convertedContents.files)) {
        if (!zipEntry.dir && filename.endsWith('.java')) {
          const content = await zipEntry.async('string');
          const lines = countLines(content);
          convertedFiles.push({
            name: filename,
            size: content.length,
            content,
            lines
          });
        }
      }

      setConversionResult({ originalFiles, convertedFiles });
    } catch (error) {
      console.error('Error parsing zips:', error);
      setErrorMessage('Failed to parse converted files');
      setCurrentPage('error');
    }
  };

  const handleDownload = async () => {
    if (!conversionResult) return;

    try {
      const zip = new JSZip();
      
      conversionResult.convertedFiles.forEach(file => {
        zip.file(file.name, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted-java-files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setCurrentPage('success');
    } catch (error) {
      console.error('Download error:', error);
      setErrorMessage('Failed to download files');
      setCurrentPage('error');
    }
  };

  const handleReset = () => {
    setCurrentPage('upload');
    setSelectedFile(null);
    setFileStats(null);
    setProgress(0);
    setConversionResult(null);
    setErrorMessage('');
    setShowPreview(false);
  };

  return (
    <div className="min-h-screen w-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-28">
            <div className="flex items-center gap-3">
              <img src={InflectoLogo} alt="inflectoLogo"/>
            </div>
            {/* <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900"></p>
                <p className="text-xs text-gray-500"></p>
              </div>
            </div> */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Upload Page */}
        {currentPage === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div
                className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-blue-600" />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  Upload Your .NET Project
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop your ZIP file here
                </p>
                <p className="text-xs text-gray-500 mb-6">or</p>
                <label className="cursor-pointer">
                  <span className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                    Browse Files
                  </span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-4">Supports ZIP files</p>
              </div>
            </div>

            {selectedFile && fileStats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileCode className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">{selectedFile.name}</h4>
                      <p className="text-sm text-gray-600">{formatBytes(selectedFile.size)}</p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-medium text-gray-600">Files</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{fileStats.totalFiles}</p>
                    <p className="text-xs text-gray-500">.cs files</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <HardDrive className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-medium text-gray-600">Size</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatBytes(fileStats.totalSize)}</p>
                    <p className="text-xs text-gray-500">total</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-4 h-4 text-purple-600" />
                      <p className="text-xs font-medium text-gray-600">Lines</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{fileStats.totalLines.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">of code</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Code className="w-4 h-4 text-orange-600" />
                      <p className="text-xs font-medium text-gray-600">Average</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(fileStats.totalLines / fileStats.totalFiles)}
                    </p>
                    <p className="text-xs text-gray-500">lines/file</p>
                  </div>
                </div>

                {/* File List */}
                <div className="mb-6">
                  <h5 className="font-medium text-gray-900 mb-3">Files to Convert</h5>
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                    {fileStats.files.map((file, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-900 truncate">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 ml-4">
                          <span className="whitespace-nowrap">{file.lines} lines</span>
                          <span className="whitespace-nowrap">{formatBytes(file.size)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleConvert}
                  className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-semibold text-base shadow-lg shadow-blue-200"
                >
                  Start Conversion
                </button>
              </div>
            )}
          </div>
        )}

        {/* Progress Page */}
        {currentPage === 'progress' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center max-w-md mx-auto">
              <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 text-blue-600 animate-spin" />
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                Converting Your Code
              </h3>
              <p className="text-gray-600 mb-8">
                Analyzing and converting {fileStats?.totalFiles} files with {fileStats?.totalLines.toLocaleString()} lines of code
              </p>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm font-medium text-gray-700">{Math.round(progress)}% Complete</p>
            </div>
          </div>
        )}

        {/* Result Page */}
        {currentPage === 'result' && conversionResult && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Conversion Complete!</h3>
                  <p className="text-gray-600">
                    Successfully converted {conversionResult.originalFiles.length} files
                  </p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    {showPreview ? 'Hide' : 'Preview'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-medium flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </div>
              </div>

              {/* Preview Section */}
              {showPreview && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <h4 className="font-semibold text-gray-900">
                        C# Files ({conversionResult.originalFiles.length})
                      </h4>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {conversionResult.originalFiles.map((file, idx) => (
                        <div key={idx} className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-mono text-sm font-medium text-blue-900 truncate">
                              {file.name}
                            </p>
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              {file.lines} lines
                            </span>
                          </div>
                          <pre className="text-xs bg-white border border-blue-200 p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                            <code className="text-gray-800">{file.content.substring(0, 500)}...</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <h4 className="font-semibold text-gray-900">
                        Java Files ({conversionResult.convertedFiles.length})
                      </h4>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {conversionResult.convertedFiles.map((file, idx) => (
                        <div key={idx} className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-mono text-sm font-medium text-orange-900 truncate">
                              {file.name}
                            </p>
                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                              {file.lines} lines
                            </span>
                          </div>
                          <pre className="text-xs bg-white border border-orange-200 p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                            <code className="text-gray-800">{file.content.substring(0, 500)}...</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Page */}
        {currentPage === 'success' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                Download Complete!
              </h3>
              <p className="text-gray-600 mb-8">
                Your converted Java files have been downloaded successfully
              </p>
              
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-semibold flex items-center justify-center gap-2 mx-auto shadow-lg shadow-blue-200"
              >
                <RefreshCw className="w-5 h-5" />
                Convert Another Project
              </button>
            </div>
          </div>
        )}

        {/* Error Page */}
        {currentPage === 'error' && (
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
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-semibold flex items-center justify-center gap-2 mx-auto shadow-lg shadow-blue-200"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-600">
            © 2024 CodeConverter. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;