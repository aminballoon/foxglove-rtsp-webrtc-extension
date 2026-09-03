# Foxglove & Lichtblick RTSP WebRTC Extension (`foxglove-rtsp-webrtc-extension`)

An Ultra Low-Latency WebRTC Video Streaming Panel for **Foxglove Studio** and **Lichtblick Suite**, powered by [go2rtc](https://github.com/AlexxIT/go2rtc).

Designed specifically for real-time robotic teleoperation, remote vehicle control (GCS), and low-latency camera monitoring (~30–50 ms latency).

---

## 🚀 Key Features

- ⚡ **Direct RTSP URL Input (No Manual Server Config Needed)**
  - Simply paste your RTSP camera URL directly into the panel settings.
  - The extension automatically registers the dynamic endpoint with the go2rtc backend and connects via WebRTC in milliseconds.
- 🏎️ **Ultra Low-Latency Streaming (~30–50 ms)**
  - Direct WebRTC UDP transport with zero-delay jitter buffer enforcement (`jitterBufferTarget = 0`, `playoutDelayHint = 0`).
  - Active Real-Time Clock Drift Catch-Up: automatically prevents HTML5 video buffer drift and frame accumulation.
  - Automatic low-latency tuning flags (`#media=video#backchannel=0#transport=tcp#backlog=0`) applied to all RTSP streams.
- 📸 **Native High-Resolution Photo Snapshot**
  - Instantly captures uncompressed frames directly from the GPU decoder at **100% native camera resolution** (e.g. 4K 3840×2160 or 1080p).
  - Shutter flash visual feedback, download toast notification, and customizable format (JPEG 98% / PNG Lossless).
- 🎬 **Start / Stop Video Recording**
  - In-browser live recording (`MediaRecorder`) without adding any delay to the live operator display.
  - Live recording indicator (`🔴 REC 00:15`) with elapsed timer.
  - Configurable recording bitrate (from 2 Mbps up to 15 Mbps 4K Ultra Quality).
- 🔍 **Live Stream Diagnostics & Logs**
  - Real-time logging of WebSocket signaling, ICE candidates, WebRTC PeerConnection states, and decoder errors directly inside the panel.
- 🎨 **Adaptive UI & Themes**
  - Fully supports Light and Dark modes in Foxglove Studio / Lichtblick.

---

## 🏗️ Architecture

```mermaid
graph LR
    Camera["IP Camera / Drone<br/>(RTSP H.264/H.265 4K)"] -->|"RTSP / TCP"| go2rtc["go2rtc Gateway<br/>(:1984 / :8555)"]
    Panel["Foxglove / Lichtblick<br/>foxglove-rtsp-webrtc-extension"] -->|"1. Auto Register RTSP URL<br/>PUT /api/streams?name=...&src=..."| go2rtc
    go2rtc -->|"2. WebRTC Stream<br/>(~30-50ms Low Latency)"| Panel
    Panel -->|"📸 4K Snapshot"| Download1["Downloads (.jpg / .png)"]
    Panel -->|"🎬 Video Record"| Download2["Downloads (.webm / .mp4)"]
```

---

## 📦 Prerequisites

1. **Node.js** (v18 or newer) and **Yarn**:
   ```bash
   sudo apt-get install -y nodejs npm
   npm install -g yarn
   ```
2. **go2rtc** (v1.9.0 or newer):
   - Download the binary from [go2rtc releases](https://github.com/AlexxIT/go2rtc/releases).
3. **Foxglove Studio** or **Lichtblick Suite**:
   - Installed on your workstation or GCS computer.

---

## 🛠️ Building & Packaging the Extension

1. **Clone or navigate to the extension repository:**
   ```bash
   cd foxglove-rtsp-webrtc-extension
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Build the extension:**
   ```bash
   yarn run build
   ```

4. **Package into `.foxe` archive:**
   ```bash
   yarn run package
   ```
   This generates `aminballoon.foxglove-rtsp-webrtc-extension-0.1.0.foxe`.

---

## 📥 Installation

### Method 1: Automatic / GUI Installation (Foxglove Studio / Lichtblick)
- Open Foxglove Studio or Lichtblick.
- Go to **Settings (Preferences) -> Extensions**.
- Drag and drop `aminballoon.foxglove-rtsp-webrtc-extension-0.1.0.foxe` into the window, or click **Install extension...** and select the `.foxe` file.

### Method 2: Manual Installation (Linux / Lichtblick / Headless)
Extract the `.foxe` package directly into the extensions directory:

```bash
# For Lichtblick Suite:
mkdir -p ~/.lichtblick-suite/extensions/aminballoon.foxglove-rtsp-webrtc-extension-0.1.0
unzip -o aminballoon.foxglove-rtsp-webrtc-extension-0.1.0.foxe -d ~/.lichtblick-suite/extensions/aminballoon.foxglove-rtsp-webrtc-extension-0.1.0

# For Foxglove Studio:
mkdir -p ~/.foxglove-studio/extensions/aminballoon.foxglove-rtsp-webrtc-extension-0.1.0
unzip -o aminballoon.foxglove-rtsp-webrtc-extension-0.1.0.foxe -d ~/.foxglove-studio/extensions/aminballoon.foxglove-rtsp-webrtc-extension-0.1.0
```

Restart or press `Ctrl + R` in Foxglove / Lichtblick to reload.

---

## ⚙️ Running go2rtc on Linux (Systemd Service)

Create `~/.config/systemd/user/go2rtc.service`:

```ini
[Unit]
Description=go2rtc WebRTC Streaming Server
After=network.target

[Service]
Type=simple
ExecStart=/home/<USER>/go2rtc -c /home/<USER>/go2rtc.yaml
WorkingDirectory=/home/<USER>
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
```

Enable and start the service:
```bash
systemctl --user daemon-reload
systemctl --user enable --now go2rtc.service
systemctl --user status go2rtc.service
```

---

## 🎮 How to Use in Foxglove / Lichtblick

1. Open Foxglove Studio / Lichtblick.
2. Click **Add Panel** (`+` button) and select **`RTSP WebRTC Extension`** (or `RTSP WebRTC Streamer`).
3. Open the **Panel Settings (⚙️ icon)** on the right sidebar:
   - **RTSP Stream URL:** Paste your camera RTSP URL directly, for example:
     ```text
     rtsp://admin:password@192.168.1.100:554/live/ch0
     ```
   - The panel automatically connects with ~30-50ms ultra-low latency!
   - **Video Fit:** Choose `Contain` (keep aspect ratio), `Cover`, or `Fill`.

### 📸 Taking Snapshots
- Click the blue **`Capture Photo`** button in the top-right corner of the video.
- The snapshot is captured at **native stream resolution** (3840×2160 for 4K) and automatically saved to your `Downloads` folder.

### 🎬 Recording Video
- Click the **`Record Video`** button in the top-right corner.
- The button turns red with a live timer (`⏹ Stop Rec (00:10)`) and a `🔴 REC` pill appears in the top-left corner.
- Click **Stop Rec** to finish and save the `.webm` / `.mp4` video to your `Downloads` folder.

---

## 📄 License

MIT License. Developed for advanced robotics, teleoperation, and GCS control.
