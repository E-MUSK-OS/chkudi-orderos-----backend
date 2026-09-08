import ExcelJS from 'exceljs';
import path from 'path';

async function generateDemoExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('SKU Mapping');

  worksheet.columns = [
    { header: 'Short SKU', key: 'shortSku', width: 20 },
    { header: 'Barcode SKU', key: 'barcodeSku', width: 25 },
    { header: 'OrderCook SKU', key: 'ordercookSku', width: 25 },
    { header: 'Brand Name', key: 'brandName', width: 20 },
    { header: 'Asin (Barcode)', key: 'asinBarcode', width: 20 },
    { header: 'Color', key: 'color', width: 15 },
    { header: 'Size', key: 'size', width: 15 },
    { header: 'Full SKU', key: 'fullSku', width: 25 },
    { header: 'Title', key: 'title', width: 40 },
    { header: 'QTY', key: 'qty', width: 10 },
    { header: 'MRP', key: 'mrp', width: 10 },
  ];

  // Make header bold
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'E2E8F0' },
  };

  worksheet.addRow({
    shortSku: 'SH-RED-M',
    barcodeSku: 'SHIRT-RED-MED-001',
    ordercookSku: 'OC-SH-RED-M',
    brandName: 'Roadster',
    asinBarcode: 'B08F9V7B3R',
    color: 'Red',
    size: 'M',
    fullSku: 'SHIRT-RDSTR-RED-M',
    title: 'Roadster Men Red Solid Casual Shirt',
    qty: 50,
    mrp: 999
  });

  worksheet.addRow({
    shortSku: 'SH-BLU-L',
    barcodeSku: 'SHIRT-BLU-LRG-002',
    ordercookSku: 'OC-SH-BLU-L',
    brandName: 'Roadster',
    asinBarcode: 'B08F9V7XYZ',
    color: 'Blue',
    size: 'L',
    fullSku: 'SHIRT-RDSTR-BLU-L',
    title: 'Roadster Men Blue Checked Casual Shirt',
    qty: 30,
    mrp: 1099
  });

  const outputPath = path.join(process.cwd(), 'demo-sku-mapping.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('Demo Excel generated at:', outputPath);
}

generateDemoExcel().catch(console.error);
