const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');

class ExportUtils {
  // Export to PDF
  static async exportToPDF(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add title
        doc.fontSize(20).text(options.title || 'Report', { align: 'center' });
        doc.moveDown();

        // Add date
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        // Add content
        if (options.overview) {
          doc.fontSize(14).text('Overview', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
          Object.entries(options.overview).forEach(([key, value]) => {
            doc.text(`${key}: ${value}`);
          });
          doc.moveDown();
        }

        // Add table data
        if (data && Array.isArray(data)) {
          doc.fontSize(14).text('Details', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
          
          data.forEach((item, index) => {
            doc.text(`${index + 1}. ${JSON.stringify(item, null, 2)}`);
            doc.moveDown(0.5);
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Export to Excel
  static async exportToExcel(data, options = {}) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(options.sheetName || 'Report');

      // Add title
      worksheet.mergeCells('A1:E1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = options.title || 'Report';
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };

      // Add date
      worksheet.mergeCells('A2:E2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `Generated: ${new Date().toLocaleString()}`;
      dateCell.font = { size: 10 };
      dateCell.alignment = { horizontal: 'right' };

      // Add headers
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF40b8a6' }
        };

        // Add data
        data.forEach(item => {
          worksheet.addRow(Object.values(item));
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength + 2;
        });
      }

      return await workbook.xlsx.writeBuffer();
    } catch (error) {
      throw error;
    }
  }

  // Export to CSV
  static async exportToCSV(data, options = {}) {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }

      const headers = Object.keys(data[0]).map(key => ({
        id: key,
        title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
      }));

      const tempPath = path.join(__dirname, '../temp', `export_${Date.now()}.csv`);
      
      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const csvWriter = createObjectCsvWriter({
        path: tempPath,
        header: headers
      });

      await csvWriter.writeRecords(data);
      
      const buffer = fs.readFileSync(tempPath);
      fs.unlinkSync(tempPath); // Clean up temp file
      
      return buffer;
    } catch (error) {
      throw error;
    }
  }

  // Format data for export
  static formatTasksForExport(tasks) {
    return tasks.map(task => ({
      Title: task.title,
      Status: task.status,
      Priority: task.priority,
      'Assigned To': task.assignedTo?.name || 'Unassigned',
      'Created At': new Date(task.createdAt).toLocaleDateString(),
      Deadline: task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A',
      'Estimated Hours': task.estimatedHours || 'N/A'
    }));
  }

  // Format analytics for export
  static formatAnalyticsForExport(analytics) {
    return {
      overview: analytics.overview,
      trends: analytics.trends,
      teamPerformance: analytics.teamPerformance,
      userProductivity: analytics.userProductivity
    };
  }
}

module.exports = ExportUtils;
