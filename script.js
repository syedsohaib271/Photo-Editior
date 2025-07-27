// DOM Elements
const imageUpload = document.getElementById('imageUpload');
const editCanvas = document.getElementById('editCanvas');
const ctx = editCanvas.getContext('2d');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const snapBtn = document.getElementById('snapBtn');
const captureBtn = document.getElementById('captureBtn');
const videoContainer = document.getElementById('videoContainer');
const emptyState = document.getElementById('emptyState');
const intensitySlider = document.getElementById('intensitySlider');
const intensityValue = document.getElementById('intensityValue');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Image properties and state
let img = new Image();
let originalImg = new Image();
let currentFilter = 'original';
let rotation = 0;
let flipHorizontal = false;
let flipVertical = false;
let scale = 1;
let intensity = 1;
let cropMode = false;
let mediaStream = null;
let isImageLoaded = false;

// Initialize app
function init() {
    // Hide canvas initially
    editCanvas.style.display = 'none';
    
    // Event listeners
    imageUpload.addEventListener('change', handleImageUpload);
    captureBtn.addEventListener('click', startCamera);
    snapBtn.addEventListener('click', capturePhoto);
    intensitySlider.addEventListener('input', updateIntensity);
    zoomSlider.addEventListener('input', updateZoom);
    
    // Add event listener to all control buttons to handle active state
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons in the same group
            const group = this.closest('.controls-grid');
            if (group && this.id.startsWith('btn-')) {
                // Only remove active from filter buttons
                if (this.id.startsWith('btn-') && !this.id.startsWith('btn-flip-') && 
                    !this.id.startsWith('btn-rotate') && !this.id.startsWith('btn-crop')) {
                    group.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
                    // Add active class to clicked button
                    this.classList.add('active');
                }
            }
        });
    });
    
    // Prevent context menu on canvas for better user experience
    editCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Show loading animation
function showLoading() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.id = 'loadingOverlay';
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    
    loadingOverlay.appendChild(spinner);
    document.body.appendChild(loadingOverlay);
}

// Hide loading animation
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Create loading animation
        showLoading();
        
        const reader = new FileReader();
        reader.onload = () => {
            // Store original image for reset functionality
            originalImg.src = reader.result;
            img.src = reader.result;
            img.onload = () => {
                // Reset state
                resetState();
                
                // Set up canvas
                setupCanvas();
                
                // Hide loading animation
                hideLoading();
                
                // Show success toast
                showToast('Image uploaded successfully');
                
                // Set image loaded flag
                isImageLoaded = true;
            };
        };
        reader.readAsDataURL(file);
    }
}

// Start camera for photo capture
function startCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Stop any existing streams
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        
        // Request camera access
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                mediaStream = stream;
                video.srcObject = stream;
                videoContainer.classList.add('active');
                showToast('Camera activated. Click "Take Photo" when ready.');
            })
            .catch(err => {
                console.error('Camera access error:', err);
                showToast('Could not access camera. Please check permissions.', 'error');
            });
    } else {
        showToast('Your browser does not support camera access.', 'error');
    }
}

// Capture photo from camera
function capturePhoto() {
    if (mediaStream) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const dataURL = canvas.toDataURL('image/png');
        
        // Load into image objects
        originalImg.src = dataURL;
        img.src = dataURL;
        
        img.onload = () => {
            // Reset state
            resetState();
            
            // Set up canvas
            setupCanvas();
            
            // Hide video container
            videoContainer.classList.remove('active');
            
            // Stop camera stream
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
            
            // Show success toast
            showToast('Photo captured successfully');
            
            // Set image loaded flag
            isImageLoaded = true;
        };
    }
}

// Reset all state variables
function resetState() {
    currentFilter = 'original';
    rotation = 0;
    flipHorizontal = false;
    flipVertical = false;
    scale = 1;
    intensity = 1;
    cropMode = false;
    
    // Reset sliders
    intensitySlider.value = 100;
    intensityValue.textContent = '100%';
    zoomSlider.value = 100;
    zoomValue.textContent = '100%';
    
    // Reset active buttons
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-original').classList.add('active');
}

// Set up canvas with image
function setupCanvas() {
    // Hide empty state and show canvas
    emptyState.style.display = 'none';
    editCanvas.style.display = 'block';
    
    // Set canvas dimensions based on image
    updateCanvasDimensions();
    
    // Draw the image
    drawImage();
}

// Update canvas dimensions with better responsive handling
function updateCanvasDimensions() {
    // Get container dimensions
    const containerWidth = document.querySelector('.canvas-wrapper').clientWidth - 40; // Account for padding
    
    // Set max dimensions based on viewport
    const maxWidth = Math.min(containerWidth, window.innerWidth * 0.9, 1200);
    const maxHeight = Math.min(window.innerHeight * 0.6, 800);
    
    // Calculate aspect ratio
    const imgAspectRatio = img.width / img.height;
    let canvasWidth, canvasHeight;
    
    // Calculate dimensions while maintaining aspect ratio
    if (imgAspectRatio > 1) {
        // Landscape orientation
        canvasWidth = Math.min(maxWidth, img.width);
        canvasHeight = canvasWidth / imgAspectRatio;
        
        // Check if height exceeds max
        if (canvasHeight > maxHeight) {
            canvasHeight = maxHeight;
            canvasWidth = canvasHeight * imgAspectRatio;
        }
    } else {
        // Portrait orientation
        canvasHeight = Math.min(maxHeight, img.height);
        canvasWidth = canvasHeight * imgAspectRatio;
        
        // Check if width exceeds max
        if (canvasWidth > maxWidth) {
            canvasWidth = maxWidth;
            canvasHeight = canvasWidth / imgAspectRatio;
        }
    }
    
    // Set minimum dimensions
    canvasWidth = Math.max(canvasWidth, 280);
    canvasHeight = Math.max(canvasHeight, 200);
    
    // Set canvas dimensions
    editCanvas.width = canvasWidth;
    editCanvas.height = canvasHeight;
}

// Draw image on canvas with current transformations and filters
function drawImage() {
    if (!isImageLoaded && !img.complete) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, editCanvas.width, editCanvas.height);
    
    // Save context state
    ctx.save();
    
    // Apply scale (zoom)
    const centerX = editCanvas.width / 2;
    const centerY = editCanvas.height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    
    // Apply rotation
    const rad = rotation * Math.PI / 180;
    ctx.rotate(rad);
    
    // Apply flip
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    
    // Calculate image drawing position
    const drawWidth = img.width;
    const drawHeight = img.height;
    const drawX = -drawWidth / 2;
    const drawY = -drawHeight / 2;
    
    // Apply filter effects
    applyFilterEffect(currentFilter);
    
    // Draw the image
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    
    // Restore context state
    ctx.restore();
    
    // Apply post-processing effects
    applyPostProcessingEffects();
}

// Apply filter effects based on filter type
function applyFilterEffect(filterType) {
    // Reset filter
    ctx.filter = 'none';
    
    // Apply filter based on type and intensity
    switch (filterType) {
        case 'original':
            // No filter
            break;
        case 'grayscale':
            ctx.filter = `grayscale(${intensity})`;
            break;
        case 'sepia':
            ctx.filter = `sepia(${intensity})`;
            break;
        case 'invert':
            ctx.filter = `invert(${intensity * 100}%)`;
            break;
        case 'blur':
            ctx.filter = `blur(${intensity * 5}px)`;
            break;
        case 'contrast':
            ctx.filter = `contrast(${1 + intensity})`;
            break;
        case 'brightness':
            ctx.filter = `brightness(${1 + intensity})`;
            break;
        case 'darken':
            ctx.filter = `brightness(${1 - intensity * 0.5})`;
            break;
        case 'saturate':
            ctx.filter = `saturate(${1 + intensity * 2})`;
            break;
        case 'hue-rotate':
            ctx.filter = `hue-rotate(${intensity * 360}deg)`;
            break;
        case 'vintage':
            ctx.filter = `sepia(${intensity * 0.5}) contrast(${1 + intensity * 0.2}) saturate(${0.8})`;
            break;
        case 'cold':
            ctx.filter = `saturate(${0.8}) hue-rotate(${intensity * 180}deg)`;
            break;
        case 'warm':
            ctx.filter = `sepia(${intensity * 0.3}) saturate(${1 + intensity * 0.5})`;
            break;
        case 'dramatic':
            ctx.filter = `contrast(${1 + intensity * 0.5}) saturate(${1 + intensity * 0.2})`;
            break;
        case 'duotone':
            // Duotone is handled in post-processing
            ctx.filter = `grayscale(1)`;
            break;
        case 'sharpen':
            // Sharpening effect is handled in post-processing
            break;
        case 'cinema':
            ctx.filter = `contrast(${1 + intensity * 0.2}) saturate(${0.8})`;
            break;
        case 'glitch':
            // Glitch effect is handled in post-processing
            break;
        case 'night':
            ctx.filter = `brightness(${0.8 - intensity * 0.3}) saturate(${0.7}) hue-rotate(${intensity * 50}deg)`;
            break;
        default:
            break;
    }
}

// Apply post-processing effects on top of filters
function applyPostProcessingEffects() {
    if (!currentFilter || currentFilter === 'original' || !isImageLoaded) return;
    
    switch (currentFilter) {
        case 'vignette':
            applyVignetteEffect();
            break;
        case 'duotone':
            applyDuotoneEffect();
            break;
        case 'noise':
            applyNoiseEffect();
            break;
        case 'glitch':
            applyGlitchEffect();
            break;
        case 'sharpen':
            applySharpenEffect();
            break;
        case 'cinema':
            applyCinematicBarsEffect();
            break;
    }
}

// Apply vignette effect
function applyVignetteEffect() {
    const gradient = ctx.createRadialGradient(
        editCanvas.width / 2, editCanvas.height / 2, 0,
        editCanvas.width / 2, editCanvas.height / 2, editCanvas.width / 2
    );
    
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity * 0.7})`);
    
    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, editCanvas.width, editCanvas.height);
    ctx.globalCompositeOperation = 'source-over';
}

// Apply duotone effect (two-color gradient mapping)
function applyDuotoneEffect() {
    // Get image data
    const imageData = ctx.getImageData(0, 0, editCanvas.width, editCanvas.height);
    const data = imageData.data;
    
    // Define duotone colors (RGB)
    const highlights = [0, 102, 255]; // Blue
    const shadows = [255, 102, 0];   // Orange
    
    // Apply duotone effect
    for (let i = 0; i < data.length; i += 4) {
        // Get grayscale value (already applied in filter)
        const gray = data[i]; // All RGB channels should be the same in grayscale
        
        // Mix between shadow and highlight colors based on gray value
        const mix = gray / 255;
        
        // Apply duotone colors with intensity
        data[i] = shadows[0] + (highlights[0] - shadows[0]) * mix * intensity;       // R
        data[i + 1] = shadows[1] + (highlights[1] - shadows[1]) * mix * intensity;   // G
        data[i + 2] = shadows[2] + (highlights[2] - shadows[2]) * mix * intensity;   // B
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
}

// Apply noise effect
function applyNoiseEffect() {
    // Get image data
    const imageData = ctx.getImageData(0, 0, editCanvas.width, editCanvas.height);
    const data = imageData.data;
    
    // Apply noise effect
    for (let i = 0; i < data.length; i += 4) {
        // Generate random noise amount
        const noise = (Math.random() - 0.5) * 30 * intensity;
        
        // Apply noise to RGB channels
        data[i] = Math.min(255, Math.max(0, data[i] + noise));         // R
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // G
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise)); // B
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
}

// Apply glitch effect
function applyGlitchEffect() {
    // Number of glitch rectangles
    const numGlitches = Math.floor(10 * intensity);
    
    // Create temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = editCanvas.width;
    tempCanvas.height = editCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(editCanvas, 0, 0);
    
    // Apply random glitches
    for (let i = 0; i < numGlitches; i++) {
        // Random position and size
        const x = Math.random() * editCanvas.width;
        const y = Math.random() * editCanvas.height;
        const width = Math.random() * 100 + 20;
        const height = Math.random() * 30 + 10;
        
        // Random offset
        const offsetX = (Math.random() - 0.5) * 30 * intensity;
        
        // Random channel (R, G, or B)
        const channel = Math.floor(Math.random() * 3);
        
        // Get image data for the glitch rectangle
        const glitchData = tempCtx.getImageData(x, y, width, height);
        
        // Offset the channel
        for (let j = 0; j < glitchData.data.length; j += 4) {
            glitchData.data[j + channel] = Math.min(255, glitchData.data[j + channel] + 50);
        }
        
        // Draw the glitched rectangle in a shifted position
        ctx.putImageData(glitchData, x + offsetX, y);
    }
    
    // RGB shift
    if (intensity > 0.5) {
        // Get entire image data
        const imageData = ctx.getImageData(0, 0, editCanvas.width, editCanvas.height);
        const data = imageData.data;
        
        // Create temporary data arrays for RGB channels
        const tempR = new Uint8ClampedArray(data.length / 4);
        const tempG = new Uint8ClampedArray(data.length / 4);
        const tempB = new Uint8ClampedArray(data.length / 4);
        
        // Extract RGB channels
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            tempR[j] = data[i];
            tempG[j] = data[i + 1];
            tempB[j] = data[i + 2];
        }
        
        // Shift and reapply RGB channels with offsets
        const shiftX = Math.floor(intensity * 5);
        const shiftY = Math.floor(intensity * 3);
        
        for (let y = 0; y < editCanvas.height; y++) {
            for (let x = 0; x < editCanvas.width; x++) {
                const i = (y * editCanvas.width + x) * 4;
                const j = y * editCanvas.width + x;
                
                // Apply shift with boundary check
                const xR = Math.min(editCanvas.width - 1, Math.max(0, x + shiftX));
                const yR = y;
                const jR = yR * editCanvas.width + xR;
                
                const xG = x;
                const yG = Math.min(editCanvas.height - 1, Math.max(0, y + shiftY));
                const jG = yG * editCanvas.width + xG;
                
                const xB = Math.min(editCanvas.width - 1, Math.max(0, x - shiftX));
                const yB = y;
                const jB = yB * editCanvas.width + xB;
                
                // Set RGB values with shifts
                data[i] = tempR[jR];
                data[i + 1] = tempG[jG];
                data[i + 2] = tempB[jB];
            }
        }
        
        // Put the modified image data back
        ctx.putImageData(imageData, 0, 0);
    }
}

// Apply sharpen effect using convolution
function applySharpenEffect() {
    // Prepare a sharpen kernel
    // Center value determines the strength of the effect
    const strength = 1 + intensity * 2;
    const kernel = [
        0, -1, 0,
        -1, 4 * strength + 1, -1,
        0, -1, 0
    ];
    
    applyConvolutionFilter(kernel);
}

// Apply convolution filter to the canvas
function applyConvolutionFilter(kernel) {
    // Get image data
    const imageData = ctx.getImageData(0, 0, editCanvas.width, editCanvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Create temporary array to store the result
    const tempData = new Uint8ClampedArray(data);
    
    // Apply convolution
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            // Calculate pixel index
            const idx = (y * width + x) * 4;
            
            // For each RGB channel
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                
                // Apply kernel
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        const pixelIdx = ((y + ky) * width + (x + kx)) * 4 + c;
                        sum += tempData[pixelIdx] * kernel[kernelIdx];
                    }
                }
                
                // Clamp the result
                data[idx + c] = Math.min(255, Math.max(0, sum));
            }
        }
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
}

// Apply cinematic bars effect
function applyCinematicBarsEffect() {
    const barHeight = editCanvas.height * 0.1 * intensity;
    
    // Draw black bars on top and bottom
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, editCanvas.width, barHeight);
    ctx.fillRect(0, editCanvas.height - barHeight, editCanvas.width, barHeight);
}

// Apply pixelate effect
function applyPixelateEffect() {
    if (!isImageLoaded) return;
    
    // Minimum size is 5, max is 20, scaled by intensity
    const size = Math.max(5, Math.floor(5 + intensity * 15));
    
    // Get current image data
    const imageData = ctx.getImageData(0, 0, editCanvas.width, editCanvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Loop through each pixel block
    for (let y = 0; y < height; y += size) {
        for (let x = 0; x < width; x += size) {
            // Calculate the block size (handle edge cases)
            const blockWidth = Math.min(size, width - x);
            const blockHeight = Math.min(size, height - y);
            
            // Calculate average color of the block
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            
            for (let by = 0; by < blockHeight; by++) {
                for (let bx = 0; bx < blockWidth; bx++) {
                    const idx = ((y + by) * width + (x + bx)) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    a += data[idx + 3];
                    count++;
                }
            }
            
            // Calculate average
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            a = Math.floor(a / count);
            
            // Apply average color to all pixels in the block
            for (let by = 0; by < blockHeight; by++) {
                for (let bx = 0; bx < blockWidth; bx++) {
                    const idx = ((y + by) * width + (x + bx)) * 4;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = a;
                }
            }
        }
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
}

// Apply filter to the image
function applyFilter(filter) {
    if (!isImageLoaded) {
        showToast('Please upload or capture an image first', 'error');
        return;
    }
    
    // Set current filter
    currentFilter = filter;
    
    // Draw the image with the filter
    drawImage();
}

// Rotate image by specified angle
function rotateImage(angle = 90) {
    if (!isImageLoaded) {
        showToast('Please upload or capture an image first', 'error');
        return;
    }
    
    // Update rotation
    rotation = (rotation + angle) % 360;
    
    // Redraw image
    drawImage();
}

// Flip image
function flipImage(direction) {
    if (!isImageLoaded) {
        showToast('Please upload or capture an image first', 'error');
        return;
    }
    
    // Update flip state
    if (direction === 'horizontal') {
        flipHorizontal = !flipHorizontal;
    } else if (direction === 'vertical') {
        flipVertical = !flipVertical;
    }
    
    // Redraw image
    drawImage();
}

// Update intensity
function updateIntensity() {
    intensity = intensitySlider.value / 100;
    intensityValue.textContent = `${intensitySlider.value}%`;
    
    // Redraw image with new intensity
    if (isImageLoaded) {
        drawImage();
    }
}

// Update zoom
function updateZoom() {
    scale = zoomSlider.value / 100;
    zoomValue.textContent = `${zoomSlider.value}%`;
    
    // Redraw image with new scale
    if (isImageLoaded) {
        drawImage();
    }
}

// Reset image to original
function resetImage() {
    if (!isImageLoaded) {
        showToast('No image to reset', 'error');
        return;
    }
    
    // Reset the image from original
    img.src = originalImg.src;
    
    // Reset all state variables
    resetState();
    
    // Draw the image
    drawImage();
    
    // Show toast
    showToast('Image reset to original');
}

// Download image
function downloadImage() {
    if (!isImageLoaded) {
        showToast('Please upload or capture an image first', 'error');
        return;
    }
    
    try {
        // Create a download link
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = editCanvas.toDataURL('image/png');
        
        // Trigger the download
        link.click();
        
        // Show success message
        showToast('Image downloaded successfully');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Failed to download image', 'error');
    }
}

// Handle crop functionality
function cropImage() {
    if (!isImageLoaded) {
        showToast('Please upload or capture an image first', 'error');
        return;
    }
    
    // Toggle crop mode
    cropMode = !cropMode;
    
    if (cropMode) {
        // Set up crop tool - simplified for this example
        showToast('Crop feature will be available in the next update', 'error');
        cropMode = false;
    }
}

// Call init on page load
window.addEventListener('load', init);