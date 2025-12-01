const video = document.getElementById('video');
const videoCanvas = document.getElementById('videoCanvas');
const videoCtx = videoCanvas.getContext('2d', { willReadFrequently: true }); // Optimized for read operations
const asciiCanvas = document.getElementById('asciiCanvas');
const asciiCtx = asciiCanvas.getContext('2d');

// UI Elements
const convertBtn = document.getElementById('convertBtn');
const btnText = document.getElementById('buttonText');
const spinner = document.getElementById('spinner');
const statusMsg = document.getElementById('statusMessage');
const downloadLink = document.getElementById('downloadLink');
const downloadHref = document.getElementById('downloadHref');

// 1. Enable Button when file is selected and metadata loads
document.getElementById('videoFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset UI
    downloadLink.classList.add('d-none');
    convertBtn.disabled = true;
    statusMsg.innerText = "Loading video metadata...";

    video.src = URL.createObjectURL(file);
    video.load();
});

video.addEventListener('loadeddata', () => {
    convertBtn.disabled = false;
    statusMsg.innerText = `Video loaded. Duration: ${video.duration.toFixed(1)}s`;
});

// Helper: Map brightness to character
function mapChar(value, chars) {
    const index = Math.floor((value / 255) * (chars.length - 1));
    return chars[index];
}

// Helper: Contrast adjustment
function applyContrast(value, contrast) {
    return Math.min(255, Math.max(0, ((value - 128) * contrast + 128)));
}

// 2. Draw Frame Function
function drawAsciiFrame(width) {
    const chars = document.getElementById('chars').value;
    const contrast = parseFloat(document.getElementById('contrast').value);
    const useColor = document.getElementById('color').checked;

    // Calculate aspect ratio
    const ratio = video.videoHeight / video.videoWidth;
    const height = Math.floor(width * ratio);

    // Resize Canvases
    videoCanvas.width = width;
    videoCanvas.height = height;

    // Determine font size (approximate)
    const fontSize = 10;
    const charWidth = fontSize * 0.6; // Monospace usually ~0.6 of height
    
    // Set output canvas size based on char size
    asciiCanvas.width = width * charWidth;
    asciiCanvas.height = height * fontSize;

    // Fill Background
    asciiCtx.fillStyle = "#000";
    asciiCtx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height);

    // Text Settings
    asciiCtx.font = `${fontSize}px monospace`;
    asciiCtx.textBaseline = 'top'; // CRITICAL: Aligns text to top-left of grid

    // Draw video frame to small canvas
    videoCtx.drawImage(video, 0, 0, width, height);
    const frame = videoCtx.getImageData(0, 0, width, height);
    const data = frame.data;

    // Iterate pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;

            let r = applyContrast(data[i], contrast);
            let g = applyContrast(data[i + 1], contrast);
            let b = applyContrast(data[i + 2], contrast);

            // Simple grayscale calculation
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const c = mapChar(gray, chars);

            asciiCtx.fillStyle = useColor ? `rgb(${r},${g},${b})` : "#fff";
            asciiCtx.fillText(c, x * charWidth, y * fontSize);
        }
    }
}

// 3. Helper to wait for video seek
const seekTo = (time) => new Promise((resolve) => {
    const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
});

// 4. Main Convert Logic
convertBtn.addEventListener('click', async () => {
    if (!video.src) return;

    // UI Updates: Lock button, show spinner
    convertBtn.disabled = true;
    spinner.classList.remove('visually-hidden');
    btnText.innerText = "Processing...";
    downloadLink.classList.add('d-none');

    const width = parseInt(document.getElementById('asciiWidth').value);
    const fps = 15; // Lower FPS processes faster
    const interval = 1 / fps;
    const duration = video.duration;
    
    const whammyVideo = new Whammy.Video(fps); 
    
    let currentTime = 0;

    try {
        while (currentTime < duration) {
            // Wait for video to actually seek to the point
            await seekTo(currentTime);
            
            // Draw
            drawAsciiFrame(width);
            
            // Add frame to WebM
            whammyVideo.add(asciiCanvas);

            // Update Progress UI
            const percent = Math.round((currentTime / duration) * 100);
            statusMsg.innerText = `Processing: ${percent}%`;

            // Increment time
            currentTime += interval;

            // Allow UI to breathe (prevent browser freeze)
            await new Promise(r => setTimeout(r, 0));
        }

        // Compilation
        statusMsg.innerText = "Compiling video file...";
        const output = whammyVideo.compile();
        const url = URL.createObjectURL(output);

        // Update Download Link
        downloadHref.href = url;
        downloadLink.classList.remove('d-none');
        statusMsg.innerText = "Done!";

    } catch (err) {
        console.error(err);
        statusMsg.innerText = "Error during conversion.";
    } finally {
        // Reset UI
        convertBtn.disabled = false;
        spinner.classList.add('visually-hidden');
        btnText.innerText = "Convert & Download";
    }
});
