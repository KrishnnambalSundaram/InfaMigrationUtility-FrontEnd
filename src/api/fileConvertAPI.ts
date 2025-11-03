import apiClient from "./apiClient";

interface UploadResponse {
  message?: string;
  data?: any;
  file?:any;
  success?: any;
}
interface ConvertedFileItem {
  original: string;
  converted: string;
  snowflakeContent: string;
  oracleContent: string;
  targetFolder: string;
}

interface ConversionData {
  totalConverted: number;
  totalFiles: number;
  successRate: number;
  convertedFiles: ConvertedFileItem[];
}
interface FilePathResponse {
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
}


export const fileUpload = async (zipFile: File): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('zipFile', zipFile);

    const response = await apiClient.post<UploadResponse>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  } catch (error) {
    console.error(error);
    return { message: 'Upload failed' };
  }
};

export const fileConvert = async (zipFilePath: string): Promise<FilePathResponse> =>{
    const token = localStorage.getItem('token');
    
    console.log('fileConvert called with:', { zipFilePath, token: token ? 'present' : 'missing' });
    
    if (!zipFilePath) {
      throw new Error('Zip file path is required');
    }
    
    if (!token) {
      throw new Error('Authentication token is missing');
    }
    
  try {
    const response = await apiClient.post<FilePathResponse>('/convert', {"zipFilePath":zipFilePath}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('fileConvert response:', response.data);
    return response.data;
  } catch (error) {
    console.error('fileConvert error:', error);
    
    if (error instanceof Error) {
      throw new Error(`Convert failed: ${error.message}`);
    } else {
      throw new Error('Convert failed: Unknown error');
    }
  } 
}

export const fileDownload = async (zipFilename : string): Promise<void> => {
  const token = localStorage.getItem('token') || '';

  try {
    const response = await apiClient.post(
      '/download',
      { filename: zipFilename },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        responseType: 'blob',
      }
    );

    // Create blob from response
    const blob = new Blob([response.data], { type: 'application/zip' });
    const downloadUrl = window.URL.createObjectURL(blob);

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    console.log('Download successful');
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download file');
  }
};

// Unified Conversion API helpers
export type UnifiedTarget = 'snowflake' | 'idmc';
export type UnifiedInputType = 'zip' | 'single';
export type UnifiedSourceType = 'oracle' | 'redshift' | 'auto';
export type IdmcOutputFormat = 'json' | 'docx';

export interface UnifiedZipRequest {
  inputType: 'zip';
  target: UnifiedTarget;
  sourceType?: UnifiedSourceType;
  zipFilePath: string; // absolute path from upload response
  outputFormat?: IdmcOutputFormat; // IDMC only
}

export interface UnifiedSingleRequest {
  inputType: 'single';
  target: UnifiedTarget;
  sourceType?: UnifiedSourceType;
  sourceCode: string;
  fileName: string;
  outputFormat?: IdmcOutputFormat; // IDMC only
}

export interface UnifiedZipResponse {
  success: boolean;
  target: UnifiedTarget;
  jobId: string;
  zipFilename?: string;
  zipFilePath?: string;
  jsonContent?: string | null;
  conversion?: any;
}

export interface SingleOutputFile {
  name: string;
  path: string; // absolute file path on server
  mime: string;
  kind: 'single';
}

export interface UnifiedSingleResponse {
  success: boolean;
  conversionType: string;
  fileName: string;
  jsonContent?: string | null;
  outputFiles: SingleOutputFile[];
}

export type UnifiedResponse = UnifiedZipResponse | UnifiedSingleResponse;

export const convertUnified = async (payload: UnifiedZipRequest | UnifiedSingleRequest): Promise<UnifiedResponse> => {
  const token = localStorage.getItem('token') || '';
  try {
    const response = await apiClient.post<UnifiedResponse>(
      '/conversion/convert-unified',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('convertUnified failed:', error);
    throw new Error('Unified conversion failed');
  }
};

export interface ProgressResponse {
  success: boolean;
  job: {
    jobId: string;
    steps: Array<{ name: string; progress: number }>;
    status: 'pending' | 'created' | 'initializing' | 'extracting' | 'scanning' | 'converting' | 'packaging' | 'completed' | 'failed';
    result?: any;
    error?: string;
  };
}

export const getConversionProgress = async (jobId: string): Promise<ProgressResponse> => {
  const token = localStorage.getItem('token') || '';
  try {
    const response = await apiClient.get<ProgressResponse>(`/conversion/progress/${encodeURIComponent(jobId)}` , {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error('getConversionProgress failed:', error);
    throw new Error('Failed to fetch progress');
  }
};

export const conversionDownload = async (filenameOrPath: { filename?: string; filePath?: string }): Promise<void> => {
  const token = localStorage.getItem('token') || '';
  try {
    const response = await apiClient.post(
      '/conversion/download',
      filenameOrPath,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        responseType: 'blob',
      }
    );

    const contentDisposition = (response as any).headers?.['content-disposition'] || '';
    const suggestedNameMatch = /filename\*=UTF-8''([^;\n]+)/.exec(contentDisposition) || /filename="?([^";\n]+)"?/.exec(contentDisposition);
    const suggestedName = suggestedNameMatch?.[1] ? decodeURIComponent(suggestedNameMatch[1]) : undefined;

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = suggestedName || (filenameOrPath.filename || (filenameOrPath.filePath ? filenameOrPath.filePath.split('/').pop() || 'download' : 'download'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('conversionDownload failed:', error);
    throw new Error('Failed to download file');
  }
};

// IDMC Batch Script API helpers
export type BatchOutputFormat = 'doc' | 'txt';

export interface IdmcBatchZipRequest {
  inputType: 'zip';
  zipPath?: string; // For zipPath (preferred)
  zipFilePath?: string; // Also support zipFilePath for backward compatibility
  outputFormat?: BatchOutputFormat; // Optional, default: "doc"
}

export interface IdmcBatchSingleRequest {
  inputType: 'single';
  // For single file: either script OR filePath
  script?: string; // Direct script code
  filePath?: string; // OR file path on server
  name?: string; // Optional filename (for single file when filePath is used)
  outputFormat?: BatchOutputFormat; // Optional, default: "doc"
}

export type IdmcBatchRequest = IdmcBatchZipRequest | IdmcBatchSingleRequest;

export interface IdmcSummaryResponse {
  success: boolean;
  message?: string;
  fileName?: string;
  scriptType?: string;
  originalContent?: string;
  extractionResult?: {
    totalStatements: number;
    statements: Array<{
      statement: string;
      type: string;
      lineNumber: number;
    }>;
  };
  idmcSummaries?: Array<{
    statement: string | null;
    type: string;
    lineNumber: number | null;
    idmcSummary: string;
    fileName: string;
  }>;
  jobId?: string;
  jsonContent?: string;
  outputFiles: SingleOutputFile[];
  filePath?: string; // Optional file path for backward compatibility
  // For ZIP processing
  source?: string;
  processing?: {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    successRate: number;
    results: any[];
  };
  zipFilename?: string;
  zipFilePath?: string;
}

export interface HumanLanguageResponse {
  success: boolean;
  message?: string;
  fileName?: string;
  originalContent?: string;
  humanReadableSummary?: string;
  summary?: string;
  jsonContent?: string;
  outputFiles: SingleOutputFile[];
  filePath?: string; // Optional file path for backward compatibility
  // For ZIP processing
  source?: string;
  jobId?: string;
  processing?: {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    successRate: number;
    results: any[];
  };
  zipFilename?: string;
  zipFilePath?: string;
}

// Batch Script to IDMC Summary API
export const idmcBatch = async (payload: IdmcBatchRequest): Promise<IdmcSummaryResponse> => {
  const token = localStorage.getItem('token') || '';
  // Normalize zipPath vs zipFilePath for backward compatibility
  const normalizedPayload: any = { ...payload };
  if (payload.inputType === 'zip') {
    if (normalizedPayload.zipFilePath && !normalizedPayload.zipPath) {
      normalizedPayload.zipPath = normalizedPayload.zipFilePath;
      delete normalizedPayload.zipFilePath;
    }
  }
  
  const response = await apiClient.post<IdmcSummaryResponse>('/idmc/batch-idmc-summary', normalizedPayload, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });
  return response.data;
};

// Batch Script to Human Language API
export const idmcBatchSummary = async (
  payload: IdmcBatchRequest
): Promise<HumanLanguageResponse> => {
  const token = localStorage.getItem('token') || '';
  // Normalize zipPath vs zipFilePath for backward compatibility
  const normalizedPayload: any = { ...payload };
  if (payload.inputType === 'zip') {
    if (normalizedPayload.zipFilePath && !normalizedPayload.zipPath) {
      normalizedPayload.zipPath = normalizedPayload.zipFilePath;
      delete normalizedPayload.zipFilePath;
    }
  }
  
  const response = await apiClient.post<HumanLanguageResponse>('/idmc/batch-human-language', normalizedPayload, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });
  return response.data;
};