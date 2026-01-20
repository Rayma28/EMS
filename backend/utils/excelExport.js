const ExcelJS = require('exceljs');

const generateExcel = async (data, sheetName) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  if (data.length > 0) {
    const headers = Object.keys(data[0].dataValues);
    sheet.addRow(headers);
    data.forEach(item => sheet.addRow(Object.values(item.dataValues)));
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = { generateExcel };