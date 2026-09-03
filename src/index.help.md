# go2rtc WebRTC Video Panel

Ultra low-latency video streaming player designed for robotic teleoperation and GCS camera monitoring.

## Features
- **Low Latency**: Real-time low latency via WebRTC Direct UDP.
- **High-Res Snapshot**: Captures full uncompressed 4K/1080p frames directly from the decoder.
- **Video Recording**: Start/stop live video recording directly to disk without adding stream delay.
- **Diagnostics**: Real-time logging of connection states, packet stats, and decoder events.

## Configuration
- **Server URL**: URL to the go2rtc server (default: `http://127.0.0.1:1984`).
- **Stream Name**: Choose from auto-discovered streams or enter stream name.
- **Transport Mode**: `WebRTC Direct UDP` (lowest delay) or `WebRTC + MSE Fallback`.
- **Realtime Catch-Up**: Actively synchronizes video buffer to eliminate drift.
