// DOM Elements
const DOM = {
  imageUpload: document.getElementById('imageUpload'),
  editCanvas: document.getElementById('editCanvas'),
  video: document.getElementById('video'),
  canvas: document.getElementById('canvas'),
  snapBtn: document.getElementById('snapBtn'),
  captureBtn: document.getElementById('captureBtn'),
  videoContainer: document.getElementById('videoContainer'),
  emptyState: document.getElementById('emptyState'),
  intensitySlider: document.getElementById('intensitySlider'),
  intensityValue: document.getElementById('intensityValue'),
  zoomSlider: document.getElementById('zoomSlider'),
  zoomValue: document.getElementById('zoomValue'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage'),
};

// State Management
const state = {
  img: new Image(),
  originalImg: new Image(),
  currentFilter: 'original',
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  scale: 1,
  intensity: 1,
  cropMode: false,
  mediaStream: null,
  isImageLoaded: false,
};

// Canvas Context
const ctx = DOM.editCanvas.getContext('2d');

// Initialize Application
function initializeApp() {
  DOM.editCanvas.style.display = 'none';
  setupEventListeners();
}

// Setup Event Listeners
function setupEventListeners() {
  DOM.imageUpload.addEventListener('change', handleImageUpload);
  DOM.captureBtn.addEventListener('click', startCamera);
  DOM.snapBtn.addEventListener('click', capturePhoto);
  DOM.intensitySlider.addEventListener('input', updateIntensity);
  DOM.zoomSlider.addEventListener('input', updateZoom);

  document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', handleControlButtonClick);
  });

  DOM.editCanvas.addEventListener('contextmenu', e => e.preventDefault());
}

// Handle Control Button Click
function handleControlButtonClick(event) {
  const btn = event.target;
  const group = btn.closest('.controls-grid');
  if (group && btn.id.startsWith('btn-') && !['flip', 'rotate', 'crop'].some(prefix => btn.id.includes(prefix))) {
    group.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
}

// UI Utilities
function showLoading() {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loadingOverlay';
  overlay.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.remove();
}

function showToast(message, type = 'success') {
  DOM.toastMessage.textContent = message;
  DOM.toast.className = `toast show ${type}`;
  setTimeout(() => DOM.toast.className = DOM.toast.className.replace('show', ''), 3000);
}

// Image Handling
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  showLoading();
  try {
    const dataUrl = await readFileAsDataURL(file);
    loadImage(dataUrl);
    showToast('Image uploaded successfully');
  } catch (error) {
    console.error('Image upload error:', error);
    showToast('Failed to upload image', 'error');
  } finally {
    hideLoading();
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  state.originalImg.src = dataUrl;
  state.img.src = dataUrl;
  state.img.onload = () => {
    resetState();
    setupCanvas();
    state.isImageLoaded = true;
  };
}

// Camera Handling
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Your browser does not support camera access.', 'error');
    return;
  }

  try {
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(track => track.stop());
    }
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    DOM.video.srcObject = state.mediaStream;
    DOM.videoContainer.classList.add('active');
    showToast('Camera activated. Click "Take Photo" when ready.');
  } catch (error) {
    console.error('Camera access error:', error);
    showToast('Could not access camera. Please check permissions.', 'error');
  }
}

function capturePhoto() {
  if (!state.mediaStream) return;

  const context = DOM.canvas.getContext('2d');
  DOM.canvas.width = DOM.video.videoWidth;
  DOM.canvas.height = DOM.video.videoHeight;
  context.drawImage(DOM.video, 0, 0, DOM.canvas.width, DOM.canvas.height);

  const dataUrl = DOM.canvas.toDataURL('image/png');
  loadImage(dataUrl);
  DOM.videoContainer.classList.remove('active');
  state.mediaStream.getTracks().forEach(track => track.stop());
  state.mediaStream = null;
  showToast('Photo captured successfully');
}

// Canvas Management
function setupCanvas() {
  DOM.emptyState.style.display = 'none';
  DOM.editCanvas.style.display = 'block';
  updateCanvasDimensions();
  drawImage();
}

function updateCanvasDimensions() {
  const containerWidth = document.querySelector('.canvas-wrapper').clientWidth - 40;
  const maxWidth = Math.min(containerWidth, window.innerWidth * 0.9, 1200);
  const maxHeight = Math.min(window.innerHeight * 0.6, 800);
  const imgAspectRatio = state.img.width / state.img.height;

  let canvasWidth, canvasHeight;
  if (imgAspectRatio > 1) {
    canvasWidth = Math.min(maxWidth, state.img.width);
    canvasHeight = canvasWidth / imgAspectRatio;
    if (canvasHeight > maxHeight) {
      canvasHeight = maxHeight;
      canvasWidth = canvasHeight * imgAspectRatio;
    }
  } else {
    canvasHeight = Math.min(maxHeight, state.img.height);
    canvasWidth = canvasHeight * imgAspectRatio;
    if (canvasWidth > maxWidth) {
      canvasWidth = maxWidth;
      canvasHeight = canvasWidth / imgAspectRatio;
    }
  }

  DOM.editCanvas.width = Math.max(canvasWidth, 280);
  DOM.editCanvas.height = Math.max(canvasHeight, 200);
}

// Image Rendering
function drawImage() {
  if (!state.isImageLoaded || !state.img.complete) return;

  ctx.clearRect(0, 0, DOM.editCanvas.width, DOM.editCanvas.height);
  ctx.save();

  const centerX = DOM.editCanvas.width / 2;
  const centerY = DOM.editCanvas.height / 2;
  ctx.translate(centerX, centerY);
  ctx.scale(state.scale, state.scale);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(state.flipHorizontal ? -1 : 1, state.flipVertical ? -1 : 1);

  const drawWidth = state.img.width;
  const drawHeight = state.img.height;
  ctx.drawImage(state.img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

  applyFilterEffect();
  applyPostProcessingEffects();
  ctx.restore();
}

function applyFilterEffect() {
  ctx.filter = 'none';
  switch (state.currentFilter) {
    case 'original': break;
    case 'grayscale': ctx.filter = `grayscale(${state.intensity})`; break;
    case 'sepia': ctx.filter = `sepia(${state.intensity})`; break;
    case 'invert': ctx.filter = `invert(${state.intensity * 100}%)`; break;
    case 'blur': ctx.filter = `blur(${state.intensity * 5}px)`; break;
    case 'contrast': ctx.filter = `contrast(${1 + state.intensity})`; break;
    case 'brightness': ctx.filter = `brightness(${1 + state.intensity})`; break;
    case 'darken': ctx.filter = `brightness(${1 - state.intensity * 0.5})`; break;
    case 'saturate': ctx.filter = `saturate(${1 + state.intensity * 2})`; break;
    case 'hue-rotate': ctx.filter = `hue-rotate(${state.intensity * 360}deg)`; break;
    case 'vintage': ctx.filter = `sepia(${state.intensity * 0.5}) contrast(${1 + state.intensity * 0.2}) saturate(0.8)`; break;
    case 'cold': ctx.filter = `saturate(0.8) hue-rotate(${state.intensity * 180}deg)`; break;
    case 'warm': ctx.filter = `sepia(${state.intensity * 0.3}) saturate(${1 + state.intensity * 0.5})`; break;
    case 'dramatic': ctx.filter = `contrast(${1 + state.intensity * 0.5}) saturate(${1 + state.intensity * 0.2})`; break;
    case 'duotone': ctx.filter = `grayscale(1)`; break;
    case 'sharpen': break;
    case 'cinema': ctx.filter = `contrast(${1 + state.intensity * 0.2}) saturate(0.8)`; break;
    case 'night': ctx.filter = `brightness(${0.8 - state.intensity * 0.3}) saturate(0.7) hue-rotate(${state.intensity * 50}deg)`; break;
  }
}

function applyPostProcessingEffects() {
  if (!state.currentFilter || state.currentFilter === 'original' || !state.isImageLoaded) return;

  switch (state.currentFilter) {
    case 'vignette': applyVignetteEffect(); break;
    case 'duotone': applyDuotoneEffect(); break;
    case 'noise': applyNoiseEffect(); break;
    case 'glitch': applyGlitchEffect(); break;
    case 'sharpen': applySharpenEffect(); break;
    case 'cinema': applyCinematicBarsEffect(); break;
  }
}

// Post-Processing Effects
function applyVignetteEffect() {
  const gradient = ctx.createRadialGradient(
    DOM.editCanvas.width / 2, DOM.editCanvas.height / 2, 0,
    DOM.editCanvas.width / 2, DOM.editCanvas.height / 2, DOM.editCanvas.width / 2
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${state.intensity * 0.7})`);
  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillRect(0, 0, DOM.editCanvas.width, DOM.editCanvas.height);
  ctx.globalCompositeOperation = 'source-over';
}

function applyDuotoneEffect() {
  const imageData = ctx.getImageData(0, 0, DOM.editCanvas.width, DOM.editCanvas.height);
  const data = imageData.data;
  const highlights = [0, 102, 255];
  const shadows = [255, 102, 0];

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i];
    const mix = gray / 255;
    data[i] = shadows[0] + (highlights[0] - shadows[0]) * mix * state.intensity;
    data[i + 1] = shadows[1] + (highlights[1] - shadows[1]) * mix * state.intensity;
    data[i + 2] = shadows[2] + (highlights[2] - shadows[2]) * mix * state.intensity;
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyNoiseEffect() {
  const imageData = ctx.getImageData(0, 0, DOM.editCanvas.width, DOM.editCanvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30 * state.intensity;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyGlitchEffect() {
  const numGlitches = Math.floor(10 * state.intensity);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = DOM.editCanvas.width;
  tempCanvas.height = DOM.editCanvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(DOM.editCanvas, 0, 0);

  for (let i = 0; i < numGlitches; i++) {
    const x = Math.random() * DOM.editCanvas.width;
    const y = Math.random() * DOM.editCanvas.height;
    const width = Math.random() * 100 + 20;
    const height = Math.random() * 30 + 10;
    const offsetX = (Math.random() - 0.5) * 30 * state.intensity;
    const channel = Math.floor(Math.random() * 3);

    const glitchData = tempCtx.getImageData(x, y, width, height);
    for (let j = 0; j < glitchData.data.length; j += 4) {
      glitchData.data[j + channel] = Math.min(255, glitchData.data[j + channel] + 50);
    }
    ctx.putImageData(glitchData, x + offsetX, y);
  }

  if (state.intensity > 0.5) {
    const imageData = ctx.getImageData(0, 0, DOM.editCanvas.width, DOM.editCanvas.height);
    const data = imageData.data;
    const tempR = new Uint8ClampedArray(data.length / 4);
    const tempG = new Uint8ClampedArray(data.length / 4);
    const tempB = new Uint8ClampedArray(data.length / 4);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      tempR[j] = data[i];
      tempG[j] = data[i + 1];
      tempB[j] = data[i + 2];
    }

    const shiftX = Math.floor(state.intensity * 5);
    const shiftY = Math.floor(state.intensity * 3);

    for (let y = 0; y < DOM.editCanvas.height; y++) {
      for (let x = 0; x < DOM.editCanvas.width; x++) {
        const i = (y * DOM.editCanvas.width + x) * 4;
        const j = y * DOM.editCanvas.width + x;
        const xR = Math.min(DOM.editCanvas.width - 1, Math.max(0, x + shiftX));
        const yR = y;
        const jR = yR * DOM.editCanvas.width + xR;
        const xG = x;
        const yG = Math.min(DOM.editCanvas.height - 1, Math.max(0, y + shiftY));
        const jG = yG * DOM.editCanvas.width + xG;
        const xB = Math.min(DOM.editCanvas.width - 1, Math.max(0, x - shiftX));
        const yB = y;
        const jB = yB * DOM.editCanvas.width + xB;

        data[i] = tempR[jR];
        data[i + 1] = tempG[jG];
        data[i + 2] = tempB[jB];
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
}

function applySharpenEffect() {
  const strength = 1 + state.intensity * 2;
  const kernel = [
    0, -1, 0,
    -1, 4 * strength + 1, -1,
    0, -1, 0
  ];
  applyConvolutionFilter(kernel);
}

function applyConvolutionFilter(kernel) {
  const imageData = ctx.getImageData(0, 0, DOM.editCanvas.width, DOM.editCanvas.height);
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const tempData = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            const pixelIdx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += tempData[pixelIdx] * kernel[kernelIdx];
          }
        }
        data[idx + c] = Math.min(255, Math.max(0, sum));
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyCinematicBarsEffect() {
  const barHeight = DOM.editCanvas.height * 0.1 * state.intensity;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, DOM.editCanvas.width, barHeight);
  ctx.fillRect(0, DOM.editCanvas.height - barHeight, DOM.editCanvas.width, barHeight);
}

function applyPixelateEffect() {
  if (!state.isImageLoaded) return;

  const size = Math.max(5, Math.floor(5 + state.intensity * 15));
  const imageData = ctx.getImageData(0, 0, DOM.editCanvas.width, DOM.editCanvas.height);
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const blockWidth = Math.min(size, width - x);
      const blockHeight = Math.min(size, height - y);
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

      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);
      a = Math.floor(a / count);

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
  ctx.putImageData(imageData, 0, 0);
}

// Image Manipulation
function applyFilter(filter) {
  if (!state.isImageLoaded) {
    showToast('Please upload or capture an image first', 'error');
    return;
  }
  state.currentFilter = filter;
  drawImage();
}

function rotateImage(angle = 90) {
  if (!state.isImageLoaded) {
    showToast('Please upload or capture an image first', 'error');
    return;
  }
  state.rotation = (state.rotation + angle) % 360;
  drawImage();
}

function flipImage(direction) {
  if (!state.isImageLoaded) {
    showToast('Please upload or capture an image first', 'error');
    return;
  }
  if (direction === 'horizontal') state.flipHorizontal = !state.flipHorizontal;
  else if (direction === 'vertical') state.flipVertical = !state.flipVertical;
  drawImage();
}

function updateIntensity() {
  state.intensity = DOM.intensitySlider.value / 100;
  DOM.intensityValue.textContent = `${DOM.intensitySlider.value}%`;
  if (state.isImageLoaded) drawImage();
}

function updateZoom() {
  state.scale = DOM.zoomSlider.value / 100;
  DOM.zoomValue.textContent = `${DOM.zoomSlider.value}%`;
  if (state.isImageLoaded) drawImage();
}

function resetImage() {
  if (!state.isImageLoaded) {
    showToast('No image to reset', 'error');
    return;
  }
  state.img.src = state.originalImg.src;
  resetState();
  drawImage();
  showToast('Image reset to original');
}

function resetState() {
  state.currentFilter = 'original';
  state.rotation = 0;
  state.flipHorizontal = false;
  state.flipVertical = false;
  state.scale = 1;
  state.intensity = 1;
  state.cropMode = false;
  DOM.intensitySlider.value = 100;
  DOM.intensityValue.textContent = '100%';
  DOM.zoomSlider.value = 100;
  DOM.zoomValue.textContent = '100%';
  document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-original').classList.add('active');
}

function downloadImage() {
  if (!state.isImageLoaded) {
    showToast('Please upload or capture an image first', 'error');
    return;
  }
  try {
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = DOM.editCanvas.toDataURL('image/png');
    link.click();
    showToast('Image downloaded successfully');
  } catch (error) {
    console.error('Download error:', error);
    showToast('Failed to download image', 'error');
  }
}

function cropImage() {
  if (!state.isImageLoaded) {
    showToast('Please upload or capture an image first', 'error');
    return;
  }
  state.cropMode = !state.cropMode;
  showToast('Crop feature will be available in the next update', 'error');
  state.cropMode = false;
}

// Initialize on Load
window.addEventListener('load', initializeApp);
