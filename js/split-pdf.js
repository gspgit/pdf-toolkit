let currentPDF = null;
let pageCount = 0;

// File Handling
document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.addEventListener('DOMContentLoaded', initDragDrop);

async function handleFileSelect(e) {
    const file = e.target.files[0];
    if(validateFile(file)) {
        currentPDF = file;
        await showFileInfo(file);
    }
}

function validateFile(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
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
    const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer());
    pageCount = pdf.getPageCount();
    
    document.getElementById('fileInfo').innerHTML = `
        <p><strong>File Name:</strong> ${file.name}</p>
        <p><strong>Pages:</strong> ${pageCount}</p>
        <p><strong>Size:</strong> ${(file.size/1024/1024).toFixed(2)} MB</p>
    `;
    
    document.getElementById('splitPage').max = pageCount - 1;
    document.getElementById('splitPage').placeholder = `1-${pageCount - 1}`;
}

function clearFile() {
    currentPDF = null;
    document.getElementById('fileInfo').innerHTML = '';
    document.getElementById('splitPage').value = '';
}

// Drag & Drop (Similar to Merge)
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

// PDF Splitting
async function splitPDF() {
    if(!currentPDF) return alert('Please select a PDF file');
    const splitPage = parseInt(document.getElementById('splitPage').value);

    if(!splitPage || splitPage < 1 || splitPage >= pageCount) {
        return alert(`Please enter a valid page number between 1 and ${pageCount - 1}`);
    }

    try {
        const pdfBytes = await currentPDF.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        
        // Create first part
        const firstPart = await PDFLib.PDFDocument.create();
        const firstPages = await firstPart.copyPages(pdfDoc, 
            Array.from({ length: splitPage }, (_, i) => i));
        firstPages.forEach(page => firstPart.addPage(page));
        
        // Create second part
        const secondPart = await PDFLib.PDFDocument.create();
        const secondPages = await secondPart.copyPages(pdfDoc, 
            Array.from({ length: pageCount - splitPage }, (_, i) => splitPage + i));
        secondPages.forEach(page => secondPart.addPage(page));

        // Save and download
        const firstBlob = new Blob([await firstPart.save()], { type: 'application/pdf' });
        const secondBlob = new Blob([await secondPart.save()], { type: 'application/pdf' });
        
        saveAs(firstBlob, `split-part1-${Date.now()}.pdf`);
        saveAs(secondBlob, `split-part2-${Date.now()}.pdf`);
        
        alert('PDF split successfully!');
    } catch(err) {
        alert(`Error splitting PDF: ${err.message}`);
    }
}