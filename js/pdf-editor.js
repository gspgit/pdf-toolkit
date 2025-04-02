let currentPDF = null;
let currentPage = 1;
let scale = 1.2;
let activeTool = null;
let annotations = [];
const { PDFDocument, rgb } = PDFLib;

// PDF.js Configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Initialize Editor
document.addEventListener('DOMContentLoaded', () => {
    // Tool Selection
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeTool = btn.dataset.tool;
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCanvasInteractivity();
        });
    });

    // File Handling
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
    initDragDrop();
});

async function loadPDF(file) {
    const pdfData = await file.arrayBuffer();
    currentPDF = await PDFDocument.load(pdfData);
    renderPDF();
}

async function renderPDF() {
    const pdfBytes = await currentPDF.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    
    const page = await pdf.getPage(currentPage);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.getElementById('pdfCanvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    setupAnnotationLayer(canvas);
}

function setupAnnotationLayer(canvas) {
    canvas.addEventListener('mousedown', startAnnotation);
    canvas.addEventListener('mousemove', drawAnnotation);
    canvas.addEventListener('mouseup', endAnnotation);
}

// Annotation Handling
let isDrawing = false;
let startPos = { x: 0, y: 0 };

function startAnnotation(e) {
    if (!activeTool) return;
    
    isDrawing = true;
    const rect = e.target.getBoundingClientRect();
    startPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function drawAnnotation(e) {
    if (!isDrawing) return;
    
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');
    const rect = e.target.getBoundingClientRect();
    const currentPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };

    ctx.beginPath();
    ctx.strokeStyle = document.getElementById('colorPicker').value;
    
    switch(activeTool) {
        case 'text':
            createTextAnnotation(currentPos);
            break;
        case 'draw':
            drawFreeform(ctx, currentPos);
            break;
        case 'shape':
            drawShape(ctx, currentPos);
            break;
    }
}

function endAnnotation() {
    isDrawing = false;
    saveAnnotationState();
}

function createTextAnnotation(pos) {
    const text = prompt('Enter text:');
    if (text) {
        const annotation = {
            type: 'text',
            content: text,
            x: pos.x,
            y: pos.y,
            color: document.getElementById('colorPicker').value,
            fontSize: document.getElementById('fontSize').value,
            fontFamily: document.getElementById('fontFamily').value
        };
        annotations.push(annotation);
        drawTextOnCanvas(annotation);
    }
}

async function saveEditedPDF() {
    const pdfDoc = await PDFDocument.create();
    
    for (let i = 0; i < currentPDF.getPageCount(); i++) {
        const [page] = await pdfDoc.copyPages(currentPDF, [i]);
        const { width, height } = page.getSize();
        
        // Add annotations
        annotations.filter(a => a.page === i+1).forEach(annotation => {
            switch(annotation.type) {
                case 'text':
                    page.drawText(annotation.content, {
                        x: annotation.x,
                        y: height - annotation.y,
                        size: parseInt(annotation.fontSize),
                        font: await pdfDoc.embedFont(annotation.fontFamily),
                        color: rgb(...hexToRgb(annotation.color))
                    });
                    break;
                // Add other annotation types
            }
        });
        
        pdfDoc.addPage(page);
    }

    const pdfBytes = await pdfDoc.save();
    downloadPDF(pdfBytes, 'edited-document.pdf');
}

// Helper Functions
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
}

function downloadPDF(pdfBytes, fileName) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}

// Page Manipulation
async function rotatePage(degrees) {
    const page = currentPDF.getPage(currentPage - 1);
    page.setRotation(page.getRotation().angle + degrees);
    renderPDF();
}

async function deletePage() {
    currentPDF.removePage(currentPage - 1);
    if (currentPage > currentPDF.getPageCount()) currentPage--;
    renderPDF();
}

async function addPage() {
    currentPDF.addPage([612, 792]); // Letter size
    renderPDF();
}

// Image Handling
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const img = await createImageBitmap(file);
    const page = currentPDF.getPage(currentPage - 1);
    const { width, height } = page.getSize();
    
    const image = await currentPDF.embedPng(await file.arrayBuffer());
    page.drawImage(image, {
        x: 50,
        y: height - 150,
        width: 100,
        height: 100
    });
    
    renderPDF();
}

// Drag & Drop (Same as previous tools)
function initDragDrop() { /* ... */ }
function showFileInfo(file) { /* ... */ }
function formatFileSize(bytes) { /* ... */ }