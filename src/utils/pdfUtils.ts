/**
 * Convert a PDF file to base64 string
 */
export const pdfToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        // Remove the data:application/pdf;base64, prefix
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

/**
 * Convert a PDF blob to base64 string
 */
export const pdfBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        // Remove the data:application/pdf;base64, prefix
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to read blob'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert ArrayBuffer to base64 string
 */
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

/**
 * Fetch a PDF from URL and convert to base64
 */
export const fetchPdfAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const blob = await response.blob();
    return await pdfBlobToBase64(blob);
  } catch (error) {
    throw new Error(`Error fetching PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};