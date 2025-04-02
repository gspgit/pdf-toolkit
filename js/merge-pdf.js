let files = [];

// File Handling
document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.addEventListener('DOMContentLoaded', initDragDrop);

function handleFileSelect(e) {
    const newFiles = Array.from(e.target.files);
    if(validateFiles(newFiles)) {
        files = [...files, ...newFiles];
        updateFileList();
    }
}

function validateFiles(fileList) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const invalidFiles = fileList.filter(file => 
        file.type !== 'application/pdf' || file.size > maxSize
    );

    if(invalidFiles.length > 0) {
        alert('Please select valid PDF files (max 50MB each)');
        return false;
    }
    return true;
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = files.map((file, index) => `
        <div class="file-item">
            <i class="fas fa-file-pdf"></i>
            <span>${file.name}</span>
            <button onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeFile(index) {
    files.splice(index, 1);
    updateFileList();
}

function clearFiles() {
    files = [];
    updateFileList();
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
        if(dt.files.length) handleFileSelect({ target: { files: dt.files } });
    });
}

// PDF Merging (Updated with filename fix)
async function mergeFiles() {
    if(files.length < 2) return alert('Please select at least 2 files');
    
    try {
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        // Get first file's name for merged PDF
        const firstName = files[0].name.replace(/\.pdf$/i, '');
        const mergedName = `${firstName}-merged.pdf`;

        for(const file of files) {
            const pdfBytes = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedBytes = await mergedPdf.save();
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        
        // Use FileSaver.js with generated name
        saveAs(blob, mergedName);
        
        alert('PDFs merged successfully!');
    } catch(err) {
        alert(`Error merging files: ${err.message}`);
    }
}