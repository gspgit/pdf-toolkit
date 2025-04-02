let currentPDF = null;
let previewImage = null;

// File Handling
document.getElementById('fileInput').addEventListener('change', handleFileUpload);
initDragDrop();

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if(validateFile(file)) {
        currentPDF = file;
        showFileInfo(file);
        await generatePreview();
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

async function generatePreview() {
    const pdfData = await currentPDF.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: context, viewport }).promise;
    previewImage = canvas.toDataURL('image/jpeg', 0.8);
    
    document.getElementById('pagePreview').innerHTML = `
        <img src="${previewImage}" alt="First page preview">
    `;
}

async function convertToPPT() {
    if(!currentPDF) return alert('Please select a PDF file');
    
    try {
        const pdfData = await currentPDF.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const pptx = new PptxGenJS();
        
        const orientation = document.getElementById('slideOrientation').value;
        pptx.layout = orientation === 'landscape' ? 'LAYOUT_WIDE' : 'LAYOUT_STD';
        
        const quality = document.getElementById('imageQuality').value;
        const dpi = { high: 3, medium: 2, low: 1 }[quality];
        
        for(let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: dpi });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({ canvasContext: context, viewport }).promise;
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            
            const slide = pptx.addSlide();
            slide.addImage({
                data: imgData,
                x: 0.5,
                y: 0.5,
                w: orientation === 'landscape' ? 13.33 : 10,
                h: orientation === 'landscape' ? 7.5 : 7.8
            });
        }
        
        pptx.writeFile({ fileName: `converted-${currentPDF.name.replace('.pdf', '')}.pptx` });
    } catch(err) {
        alert(`Conversion failed: ${err.message}`);
    }
}

function clearAll() {
    currentPDF = null;
    previewImage = null;
    document.getElementById('fileInfo').innerHTML = '';
    document.getElementById('pagePreview').innerHTML = '';
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