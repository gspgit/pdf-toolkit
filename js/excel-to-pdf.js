let excelFile = null;
const { jsPDF } = window.jspdf;

// File Handling
document.getElementById('fileInput').addEventListener('change', handleFileUpload);
initDragDrop();

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if(validateFile(file)) {
        excelFile = file;
        showFileInfo(file);
        await showPreview();
    }
}

function validateFile(file) {
    const maxSize = 20 * 1024 * 1024;
    const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if(!allowedTypes.includes(file.type)) {
        alert('Please select an Excel file (XLS/XLSX)');
        return false;
    }
    if(file.size > maxSize) {
        alert('File size exceeds 20MB limit');
        return false;
    }
    return true;
}

async function showPreview() {
    const data = await excelFile.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const html = XLSX.utils.sheet_to_html(firstSheet);
    document.getElementById('tablePreview').innerHTML = html;
}

async function convertToPDF() {
    if(!excelFile) return alert('Please select an Excel file');
    
    try {
        const pdf = new jsPDF({
            orientation: document.getElementById('pageOrientation').value,
            unit: 'mm',
            format: 'a4'
        });

        const conversionMode = document.getElementById('conversionMode').value;
        const data = await excelFile.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        for(const sheetName of workbook.SheetNames) {
            if(sheetName !== workbook.SheetNames[0]) pdf.addPage();
            const sheet = workbook.Sheets[sheetName];
            
            if(conversionMode === 'table') {
                await convertTable(pdf, sheet, sheetName);
            } else {
                await convertImage(pdf, sheet, sheetName);
            }
        }

        pdf.save(`converted-${excelFile.name.replace(/\.[^/.]+$/, "")}.pdf`);
    } catch(err) {
        alert(`Conversion failed: ${err.message}`);
    }
}

async function convertTable(pdf, sheet, sheetName) {
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const columns = data[0].map(col => ({ header: col, dataKey: col }));
    const rows = data.slice(1);

    pdf.autoTable({
        head: [data[0]],
        body: rows,
        margin: { top: 20 },
        didDrawPage: () => pdf.text(sheetName, 10, 10)
    });
}

async function convertImage(pdf, sheet, sheetName) {
    const html = XLSX.utils.sheet_to_html(sheet);
    const canvas = await html2canvas(document.createElement('div').innerHTML = html);
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
    
    let imgWidth = pageWidth - 20;
    let imgHeight = imgWidth / ratio;
    
    if(imgHeight > pageHeight - 30) {
        imgHeight = pageHeight - 30;
        imgWidth = imgHeight * ratio;
    }

    pdf.addImage(imgData, 'JPEG', 10, 20, imgWidth, imgHeight);
    pdf.text(sheetName, 10, 10);
}

function clearAll() {
    excelFile = null;
    document.getElementById('fileInfo').innerHTML = '';
    document.getElementById('tablePreview').innerHTML = '';
}

// Drag & Drop
function initDragDrop() {
    const dropZone = document.getElementById('dropZone');
    
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const dt = e.dataTransfer;
        if(dt.files.length) handleFileUpload({ target: { files: dt.files } });
    });
}

function showFileInfo(file) {
    document.getElementById('fileInfo').innerHTML = `
        <p><strong>File:</strong> ${file.name}</p>
        <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
    `;
}

function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if(bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}