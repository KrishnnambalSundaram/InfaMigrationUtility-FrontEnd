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
  javaContent: string;
  csharpContent: string;
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
    csharpFiles: number;
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
// export const fileDownload = async (filename: string): Promise<void> => {
//   const token = await localStorage.getItem('token') || '';

//   try {
//     const response = await apiClient.post(`/download`,
//       { "filename":filename },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`, // remove extra quotes
//         },
//       }
//     );

//     // Convert response to blob and trigger download
//     const blob = new Blob([response.data], { type: 'application/zip' });
//     const downloadUrl = URL.createObjectURL(blob);

//     const a = document.createElement('a');
//     a.href = downloadUrl;
//     a.download = filename.endsWith('.zip') ? filename : `${filename}.zip`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();

//     // Clean up URL object after a short delay
//     setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
//   } catch (error) {
//     console.error('Download failed:', error);
//     alert('Download failed.');
//   }
// };

// export const fileDownload = async (filename: string): Promise<DownloadResponse> =>{
//     const token = await localStorage.getItem('token')
//   try {
//     const response = await apiClient.post<DownloadResponse>('/download', {"filename":filename}, {
//       headers: {
//         Authorization: `Bearer ${token ? token : ''}`,
//       },
//     });

//     return response.data;
//   } catch (error) {
//     console.error(error);
//     return { message: 'Convert failed' };
//   } 
// }