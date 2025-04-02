let pdfFile = null;
let pageCount = 0;
let pagesToDelete = [];

// File Handling
document.getElementById('fileInput').addEventListener('change', handleFileUpload);
document.getElementById('pagesToDelete').addEventListener('input', updatePreview);
initDragDrop();

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if(validateFile(file)) {
        pdfFile = file;
        await showFileInfo(file);
        await generatePagePreviews();
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
    document.getElementById('fileInfo').innerHTML = `
        <p><strong>File:</strong> ${file.name}</p>
        <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
    `;
}

async function generatePagePreviews() {
    const pdfData = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    pageCount = pdf.numPages;
    
    document.getElementById('pageCount').textContent = 
        `${pageCount} Pages - Select pages to delete below`;
    
    const previewContainer = document.getElementById('pagePreview');
    previewContainer.innerHTML = '';
    
    for(let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.2 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'page-thumbnail';
        thumbnail.innerHTML = `
            <img src="${canvas.toDataURL()}" alt="Page ${i}">
            <div class="page-number">${i}</div>
        `;
        previewContainer.appendChild(thumbnail);
    }
}

function updatePreview() {
    const input = document.getElementById('pagesToDelete').value;
    pagesToDelete = parsePageRange(input, pageCount);
    
    document.querySelectorAll('.page-thumbnail').forEach((thumb, index) => {
        thumb.classList.toggle('deleting', pagesToDelete.includes(index + 1));
    });
}

function parsePageRange(input, maxPage) {
    return input.split(',')
        .flatMap(part => {
            const trimmed = part.trim();
            if(trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(n => 
                    Math.min(maxPage, Math.max(1, parseInt(n)))
                );
                return Array.from({ length: end - start + 1 }, (_, i) => start + i);
            }
            return [parseInt(trimmed)];
        })
        .filter(n => !isNaN(n) && n > 0 && n <= maxPage)
        .sort((a, b) => a - b);
}

async function deletePages() {
    if(!pdfFile) return alert('Please select a PDF file');
    if(pagesToDelete.length === 0) return alert('Please select pages to delete');
    
    try {
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        
        // Create array of pages to keep
        const pagesToKeep = Array.from({ length: pageCount }, (_, i) => i)
            .filter(i => !pagesToDelete.includes(i + 1));
        
        const newPdf = await PDFLib.PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, pagesToKeep);
        copiedPages.forEach(page => newPdf.addPage(page));
        
        const modifiedBytes = await newPdf.save();
        saveAs(new Blob([modifiedBytes], { type: 'application/pdf' }), 
            `modified-${pdfFile.name}`);
        
        alert('Pages deleted successfully!');
    } catch(err) {
        alert(`Deletion failed: ${err.message}`);
    }
}

function clearAll() {
    pdfFile = null;
    pagesToDelete = [];
    document.getElementById('fileInfo').innerHTML = '';
    document.getElementById('pagesToDelete').value = '';
    document.getElementById('pagePreview').innerHTML = '';
    document.getElementById('pageCount').textContent = '';
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

function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if(bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}