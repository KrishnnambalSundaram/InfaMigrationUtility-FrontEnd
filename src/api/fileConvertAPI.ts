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

// IDMC Batch helpers
export interface IdmcBatchZipRequest {
  inputType: 'zip';
  zipFilePath: string;
  scriptType?: 'oracle' | 'redshift';
}

export interface IdmcBatchSingleRequest {
  inputType: 'single';
  script: string;
  fileName: string;
  scriptType?: 'oracle' | 'redshift';
}

export const idmcBatch = async (payload: IdmcBatchZipRequest | IdmcBatchSingleRequest): Promise<any> => {
  const token = localStorage.getItem('token') || '';
  const response = await apiClient.post('/idmc/batch', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });
  return response.data;
};

export const idmcBatchSummary = async (script: string, fileName: string, outputFormat?: 'md' | 'txt'): Promise<any> => {
  const token = localStorage.getItem('token') || '';
  const response = await apiClient.post('/idmc/batch-summary', { script, fileName, ...(outputFormat ? { outputFormat } : {}) }, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });
  return response.data;
};