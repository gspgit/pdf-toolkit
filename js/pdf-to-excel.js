let pdfFile = null;
const { utils, writeFile } = XLSX;

// File Handling
document.getElementById('fileInput').addEventListener('change', handleFileUpload);
initDragDrop();

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if(validateFile(file)) {
        pdfFile = file;
        showFileInfo(file);
        await showPreview();
    }
}

function validateFile(file) {
    const maxSize = 25 * 1024 * 1024;
    const allowedTypes = ['application/pdf'];
    
    if(!allowedTypes.includes(file.type)) {
        alert('Please select a PDF file');
        return false;
    }
    if(file.size > maxSize) {
        alert('File size exceeds 25MB limit');
        return false;
    }
    return true;
}

async function showPreview() {
    // PDF table extraction logic here
    const tables = await extractTablesFromPDF(pdfFile);
    displayTablesPreview(tables);
}

async function convertToExcel() {
    if(!pdfFile) return alert('Please select a PDF file');
    
    try {
        const tables = await extractTablesFromPDF(pdfFile);
        const workbook = utils.book_new();
        
        tables.forEach((table, index) => {
            const worksheet = utils.aoa_to_sheet(table);
            utils.book_append_sheet(workbook, worksheet, `Sheet${index + 1}`);
        });

        writeFile(workbook, `converted-${pdfFile.name.replace(/\.[^/.]+$/, "")}.xlsx`);
    } catch(err) {
        alert(`Conversion failed: ${err.message}`);
    }
}

async function extractTablesFromPDF(file) {
    // Implement actual PDF table extraction logic
    // This is a mock implementation
    return [
        [['Header 1', 'Header 2'], ['Data 1', 'Data 2']]
    ];
}

function displayTablesPreview(tables) {
    const previewDiv = document.getElementById('tablePreview');
    previewDiv.innerHTML = tables.map((table, i) => `
        <div class="table-container">
            <h5>Table ${i + 1}</h5>
            <table>
                ${table.map(row => `
                    <tr>
                        ${row.map(cell => `<td>${cell}</td>`).join('')}
                    </tr>
                `).join('')}
            </table>
        </div>
    `).join('');
}

function clearAll() {
    pdfFile = null;
    document.getElementById('fileInfo').innerHTML = '';
    document.getElementById('tablePreview').innerHTML = '';
}

// Drag & Drop (Same as Excel to PDF with type checks)
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