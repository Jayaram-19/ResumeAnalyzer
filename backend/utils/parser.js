const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts raw text from PDF or DOCX file buffers.
 * @param {Buffer} buffer - File buffer
 * @param {string} fileName - File name to infer format
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} - Extracted text
 */
const parseResume = async (buffer, fileName, mimeType) => {
  const ext = fileName.split('.').pop().toLowerCase();
  
  try {
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      try {
        const data = await parser.getText();
        return data.text;
      } finally {
        await parser.destroy();
      }
    } else if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (ext === 'txt' || mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
    }
  } catch (error) {
    console.error('Error parsing resume file:', error);
    throw new Error(`Failed to parse file: ${error.message}`);
  }
};

module.exports = { parseResume };
