let currentPDF = null;
let rotationAngle = 90;
let pageRange = [];

// File Handling
document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.addEventListener('DOMContentLoaded', initDragDrop);
document.querySelectorAll('.angle-btn').forEach(btn => {
    btn.addEventListener('click', setRotationAngle);
});

async function handleFileSelect(e) {
    const file = e.target.files[0];
    if(validateFile(file)) {
        currentPDF = file;
        showFileInfo(file);
    }
}

function validateFile(file) {
    const maxSize = 50 * 1024 * 1024;
    if(file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return false;
    }
    if(file.size > maxSize) {
        alert('File size exceeds 50MB limit');
        return false;
    }
    return true;
}

async function showFileInfo(file) {
    const pdfDoc = await PDFLib.PDFDocument.load(await file.arrayBuffer());
    const pageCount = pdfDoc.getPages().length;
    
    document.getElementById('fileInfo').innerHTML = `
        <p><strong>File Name:</strong> ${file.name}</p>
        <p><strong>Pages:</strong> ${pageCount}</p>
        <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
    `;
}

function setRotationAngle(e) {
    rotationAngle = parseInt(e.currentTarget.dataset.degrees);
    document.querySelectorAll('.angle-btn').forEach(btn => {
        btn.style.backgroundColor = '#f8f9fa';
        btn.style.color = '#2c3e50';
    });
    e.currentTarget.style.backgroundColor = '#3498db';
    e.currentTarget.style.color = 'white';
}

// Rotation Logic
async function rotatePDF() {
    if(!currentPDF) return alert('Please select a PDF file');
    
    try {
        const pdfBytes = await currentPDF.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const totalPages = pages.length;
        
        const rangeInput = document.getElementById('pageRange').value;
        const pagesToRotate = rangeInput ? parsePageRange(rangeInput, totalPages) : 
            Array.from({ length: totalPages }, (_, i) => i);

        pagesToRotate.forEach(pageIndex => {
            if(pageIndex >= 0 && pageIndex < totalPages) {
                const currentRotation = pages[pageIndex].getRotation().angle;
                pages[pageIndex].setRotation(
                    PDFLib.degrees(currentRotation + rotationAngle)
                );
            }
        });

        const rotatedBytes = await pdfDoc.save();
        saveAs(new Blob([rotatedBytes], { type: 'application/pdf' }), 
            `rotated-${currentPDF.name}`);
        
        alert('PDF rotated successfully!');
    } catch(err) {
        alert(`Rotation failed: ${err.message}`);
    }
}

function parsePageRange(input, maxPages) {
    return input.split(',')
        .flatMap(part => {
            const trimmed = part.trim();
            if(trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(n => 
                    Math.min(maxPages, Math.max(1, parseInt(n))) - 1;
                return Array.from({ length: end - start + 1 }, (_, i) => start + i);
            }
            return [parseInt(trimmed) - 1];
        })
        .filter(n => !isNaN(n) && n >= 0 && n < maxPages);
}

function clearFile() {
    currentPDF = null;
    document.getElementById('fileInfo').innerHTML = '';
    document.getElementById('pageRange').value = '';
    document.querySelectorAll('.angle-btn').forEach(btn => {
        btn.style.backgroundColor = '#f8f9fa';
        btn.style.color = '#2c3e50';
    });
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

function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if(bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}