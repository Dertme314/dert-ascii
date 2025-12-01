const video = document.getElementById('video');
const videoCanvas = document.getElementById('videoCanvas');
const videoCtx = videoCanvas.getContext('2d');
const asciiCanvas = document.getElementById('asciiCanvas');
const asciiCtx = asciiCanvas.getContext('2d');

document.getElementById('videoFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    video.src = URL.createObjectURL(file);
    video.load();
});

function mapChar(value, chars) {
    const index = Math.floor((value / 255) * (chars.length - 1));
    return chars[index];
}

function applyContrast(value, contrast) {
    return Math.min(255, Math.max(0, ((value - 128) * contrast + 128)));
}

function drawAsciiFrame(width) {
    const chars = document.getElementById('chars').value;
    const contrast = parseFloat(document.getElementById('contrast').value);
    const useColor = document.getElementById('color').checked;

    const height = Math.floor(video.videoHeight / video.videoWidth * width);
    videoCanvas.width = width;
    videoCanvas.height = height;
    asciiCanvas.width = width*6;
    asciiCanvas.height = height*6;
    asciiCtx.fillStyle = "#000";
    asciiCtx.fillRect(0,0,asciiCanvas.width, asciiCanvas.height);
    asciiCtx.font = "6px monospace";

    videoCtx.drawImage(video, 0, 0, width, height);
    const frame = videoCtx.getImageData(0,0,width,height);

    for (let y=0;y<height;y++){
        for (let x=0;x<width;x++){
            const i = (y*width + x)*4;
            let r = applyContrast(frame.data[i], contrast);
            let g = applyContrast(frame.data[i+1], contrast);
            let b = applyContrast(frame.data[i+2], contrast);
            const gray = 0.299*r + 0.587*g + 0.114*b;
            const c = mapChar(gray, chars);
            asciiCtx.fillStyle = useColor ? `rgb(${r},${g},${b})` : "#fff";
            asciiCtx.fillText(c, x*6, y*6);
        }
    }
}

document.getElementById('convertBtn').addEventListener('click', async () => {
    if (!video.src) return alert("Upload a video first");
    const width = parseInt(document.getElementById('asciiWidth').value);
    const fps = 15;
    const frames = [];
    const whammyVideo = new Whammy.Video(fps);

    video.currentTime = 0;
    await video.play();
    video.pause();

    while (video.currentTime < video.duration) {
        drawAsciiFrame(width);
        frames.push(asciiCanvas);
        whammyVideo.add(asciiCanvas);
        video.currentTime += 1/fps;
        await new Promise(r=>setTimeout(r,0));
    }

    const output = whammyVideo.compile();
    const url = URL.createObjectURL(output);
    const a = document.createElement('a');
    a.href = url;
    a.download = "ascii_video.webm";
    a.click();
    URL.revokeObjectURL(url);
    alert("Download complete!");
});
