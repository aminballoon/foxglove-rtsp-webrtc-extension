import {
  PanelExtensionContext,
  SettingsTreeAction,
  SettingsTreeNode,
  SettingsTreeNodes,
} from "@foxglove/studio";
import { set } from "lodash";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { VideoRTC } from "./video-rtc";

type Config = {
  rtspUrl: string;
  serverUrl: string;
  autoLowLatencyFlags: boolean;
  mode: "webrtc" | "webrtc,mse" | "mse";
  objectFit: "contain" | "cover" | "fill";
  muted: boolean;
  autoplay: boolean;
  showOverlay: boolean;
  showLogs: boolean;
  showSnapshotButton: boolean;
  snapshotFormat: "jpeg" | "png";
  snapshotQuality: number;
  showRecordButton: boolean;
  recordBitrate: number;
  lowLatencyCatchup: boolean;
};

function sanitizeUrl(url: string): string {
  if (!url) return "";
  // Replaces credentials in URL: rtsp://username:password@ip -> rtsp://username:***@ip
  return url.replace(/:\/\/([^:/@]+):([^@]+)@/g, "://$1:***@");
}

const DEFAULT_CONFIG: Config = {
  rtspUrl: "",
  serverUrl: "http://127.0.0.1:1984",
  autoLowLatencyFlags: true,
  mode: "webrtc",
  objectFit: "contain",
  muted: true,
  autoplay: true,
  showOverlay: true,
  showLogs: true,
  showSnapshotButton: true,
  snapshotFormat: "jpeg",
  snapshotQuality: 0.98,
  showRecordButton: true,
  recordBitrate: 8000000,
  lowLatencyCatchup: true,
};

function buildSettingsTree(config: Config): SettingsTreeNodes {
  const camera: SettingsTreeNode = {
    label: "RTSP Camera Connection",
    fields: {
      rtspUrl: {
        label: "RTSP Stream URL",
        input: "string",
        value: config.rtspUrl,
        placeholder: "rtsp://username:password@10.10.1.111:554/live/ch0",
        help: "Paste your camera RTSP URL here. The extension auto-registers it with go2rtc and applies low-latency tuning.",
      },
      objectFit: {
        label: "Video Fit",
        input: "select",
        value: config.objectFit,
        options: [
          { label: "Contain (Keep aspect ratio)", value: "contain" },
          { label: "Cover (Fill entire panel)", value: "cover" },
          { label: "Fill (Stretch)", value: "fill" },
        ],
      },
      showOverlay: {
        label: "Show Status Overlay",
        input: "boolean",
        value: config.showOverlay,
      },
      showLogs: {
        label: "Show Diagnostics & Logs",
        input: "boolean",
        value: config.showLogs,
      },
    },
  };

  const snapshot: SettingsTreeNode = {
    label: "Snapshot (Photo Capture)",
    fields: {
      showSnapshotButton: {
        label: "Show Snapshot Button",
        input: "boolean",
        value: config.showSnapshotButton ?? true,
      },
      snapshotFormat: {
        label: "Image Format",
        input: "select",
        value: config.snapshotFormat ?? "jpeg",
        options: [
          { label: "JPEG (High Quality 98%)", value: "jpeg" },
          { label: "PNG (Lossless)", value: "png" },
        ],
      },
      snapshotQuality: {
        label: "JPEG Quality",
        input: "select",
        value: config.snapshotQuality ?? 0.98,
        options: [
          { label: "100% Maximum Quality (0.98)", value: 0.98 },
          { label: "90% High Quality (0.90)", value: 0.90 },
          { label: "80% Compact Size (0.80)", value: 0.80 },
        ],
      },
    },
  };

  const recording: SettingsTreeNode = {
    label: "Video Recording",
    fields: {
      showRecordButton: {
        label: "Show Record Button",
        input: "boolean",
        value: config.showRecordButton ?? true,
      },
      recordBitrate: {
        label: "Video Bitrate / Quality",
        input: "select",
        value: config.recordBitrate ?? 8000000,
        options: [
          { label: "Ultra High Quality / 4K (15 Mbps)", value: 15000000 },
          { label: "High Quality (8 Mbps)", value: 8000000 },
          { label: "Standard Quality (4 Mbps)", value: 4000000 },
          { label: "Compact Size (2 Mbps)", value: 2000000 },
        ],
      },
    },
  };

  const advanced: SettingsTreeNode = {
    label: "Advanced Settings (Optional)",
    fields: {
      serverUrl: {
        label: "go2rtc Gateway URL",
        input: "string",
        value: config.serverUrl,
        placeholder: "http://127.0.0.1:1984",
        help: "Backend go2rtc streaming server address (default: http://127.0.0.1:1984)",
      },
      autoLowLatencyFlags: {
        label: "Auto Low-Latency Tuning (#media=video#backlog=0)",
        input: "boolean",
        value: config.autoLowLatencyFlags ?? true,
      },
      lowLatencyCatchup: {
        label: "Realtime Catch-Up (Anti-Lag Loop)",
        input: "boolean",
        value: config.lowLatencyCatchup ?? true,
      },
      mode: {
        label: "Transport Mode",
        input: "select",
        value: config.mode,
        options: [
          { label: "WebRTC Direct UDP (Lowest Latency)", value: "webrtc" },
          { label: "WebRTC + MSE Auto Fallback", value: "webrtc,mse" },
          { label: "MSE (Low-Latency)", value: "mse" },
        ],
      },
    },
  };

  return { camera, snapshot, recording, advanced };
}

type Props = {
  context: PanelExtensionContext;
};

// Ensure custom element is registered once in browser environment
if (typeof customElements !== "undefined" && !customElements.get("video-rtc")) {
  customElements.define("video-rtc", VideoRTC);
}

export default function Go2rtcPlayer({ context }: Props): JSX.Element {
  const { saveState } = context;

  const [config, setConfig] = useState<Config>(() => {
    const partialConfig = (context.initialState || {}) as Record<string, any>;
    return {
      rtspUrl: partialConfig.rtspUrl ?? DEFAULT_CONFIG.rtspUrl,
      serverUrl: partialConfig.serverUrl ?? DEFAULT_CONFIG.serverUrl,
      autoLowLatencyFlags: partialConfig.autoLowLatencyFlags ?? DEFAULT_CONFIG.autoLowLatencyFlags,
      mode: partialConfig.mode ?? DEFAULT_CONFIG.mode,
      objectFit: partialConfig.objectFit ?? DEFAULT_CONFIG.objectFit,
      muted: partialConfig.muted ?? DEFAULT_CONFIG.muted,
      autoplay: partialConfig.autoplay ?? DEFAULT_CONFIG.autoplay,
      showOverlay: partialConfig.showOverlay ?? DEFAULT_CONFIG.showOverlay,
      showLogs: partialConfig.showLogs ?? DEFAULT_CONFIG.showLogs,
      showSnapshotButton: partialConfig.showSnapshotButton ?? DEFAULT_CONFIG.showSnapshotButton,
      snapshotFormat: partialConfig.snapshotFormat ?? DEFAULT_CONFIG.snapshotFormat,
      snapshotQuality: partialConfig.snapshotQuality ?? DEFAULT_CONFIG.snapshotQuality,
      showRecordButton: partialConfig.showRecordButton ?? DEFAULT_CONFIG.showRecordButton,
      recordBitrate: partialConfig.recordBitrate ?? DEFAULT_CONFIG.recordBitrate,
      lowLatencyCatchup: partialConfig.lowLatencyCatchup ?? DEFAULT_CONFIG.lowLatencyCatchup,
    };
  });

  const [status, setStatus] = useState<string>("Initializing...");
  const [logs, setLogs] = useState<string[]>([]);
  const [serverDiag, setServerDiag] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const [flash, setFlash] = useState<boolean>(false);
  const [lagMs, setLagMs] = useState<number>(0);
  const [activeStreamId, setActiveStreamId] = useState<string>("camera");
  const [isMixedContent, setIsMixedContent] = useState<boolean>(false);

  // Track dynamically registered stream name and host for backend cleanup
  const registeredStreamRef = useRef<{ name: string; host: string } | null>(null);

  // Video recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [renderDone, setRenderDone] = useState<() => void>(() => () => {});
  const [colorScheme, setColorScheme] = useState<"dark" | "light">("dark");
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VideoRTC | null>(null);

  // Check for Mixed Content issues (HTTPS web app connecting to insecure HTTP/WS go2rtc)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      const host = config.serverUrl.trim().toLowerCase();
      if (host.startsWith("http://") || host.startsWith("ws://")) {
        setIsMixedContent(true);
        return;
      }
    }
    setIsMixedContent(false);
  }, [config.serverUrl]);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-35), `[${time}] ${msg}`]);
  }, []);

  // Snapshot capture handler (Full Native Stream Resolution e.g. 4K / 1080p)
  const takeSnapshot = useCallback(() => {
    const player = playerRef.current;
    const video = player?.video;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      addLog("⚠️ Video not ready in player, requesting frame snapshot from go2rtc server...");
      const host = config.serverUrl.trim().replace(/\/+$/, "") || "http://127.0.0.1:1984";
      const stream = activeStreamId;
      const frameUrl = `${host}/api/frame.jpeg?src=${encodeURIComponent(stream)}`;
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = frameUrl;
      a.download = `snapshot_${stream}_${ts}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setToast(`📸 Snapshot downloaded from server`);
      setTimeout(() => setToast(null), 3000);
      addLog(`[Snapshot] Downloaded frame from go2rtc server API`);
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      addLog("Snapshot failed: Canvas 2D context unavailable");
      return;
    }

    // Trigger visual shutter flash
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    ctx.drawImage(video, 0, 0, width, height);

    const isPng = config.snapshotFormat === "png";
    const mimeType = isPng ? "image/png" : "image/jpeg";
    const quality = isPng ? 1.0 : (config.snapshotQuality ?? 0.98);
    const ext = isPng ? "png" : "jpg";

    canvas.toBlob((blob) => {
      if (!blob) {
        addLog("Snapshot failed: Canvas toBlob returned null");
        return;
      }
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const filename = `snapshot_${activeStreamId}_${timestamp}.${ext}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const sizeMb = (blob.size / 1024 / 1024).toFixed(2);
      const toastText = `📸 Snapshot Saved: ${width}x${height} ${ext.toUpperCase()} (${sizeMb} MB)`;
      setToast(toastText);
      setTimeout(() => setToast(null), 3500);
      addLog(`[Snapshot] Saved ${width}x${height} ${ext.toUpperCase()} (${sizeMb} MB) -> ${filename}`);
    }, mimeType, quality);
  }, [config.serverUrl, activeStreamId, config.snapshotFormat, config.snapshotQuality, addLog]);

  // Start Video Recording
  const startRecording = useCallback(() => {
    const player = playerRef.current;
    const video = player?.video;
    if (!video) {
      addLog("⚠️ Cannot record: Video element not ready");
      return;
    }

    let stream: MediaStream | null = null;
    if (video.srcObject instanceof MediaStream) {
      stream = video.srcObject;
    } else if ("captureStream" in video && typeof (video as any).captureStream === "function") {
      stream = (video as any).captureStream();
    }

    if (!stream || stream.getVideoTracks().length === 0) {
      addLog("⚠️ Cannot record: No active MediaStream track found");
      return;
    }

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=h264,opus",
      "video/webm;codecs=h264",
      "video/webm",
      "video/mp4",
    ];
    let selectedMime = "";
    for (const m of mimeTypes) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    try {
      const options: MediaRecorderOptions = {
        videoBitsPerSecond: config.recordBitrate ?? 8000000,
      };
      if (selectedMime) {
        options.mimeType = selectedMime;
      }

      const recorder = new MediaRecorder(stream, options);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = recordedChunksRef.current;
        if (chunks.length === 0) {
          addLog("⚠️ Recording finished with 0 chunks");
          return;
        }

        const isMp4 = selectedMime.includes("mp4");
        const ext = isMp4 ? "mp4" : "webm";
        const blob = new Blob(chunks, { type: selectedMime || "video/webm" });
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const filename = `recording_${activeStreamId}_${timestamp}.${ext}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const sizeMb = (blob.size / 1024 / 1024).toFixed(2);
        const msg = `🎬 Video Saved: ${filename} (${sizeMb} MB)`;
        setToast(msg);
        setTimeout(() => setToast(null), 4000);
        addLog(`[Recorder] Saved ${filename} (${sizeMb} MB) to Downloads`);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);

      setToast("🔴 Recording Started");
      setTimeout(() => setToast(null), 2500);
      addLog(`[Recorder] Started video recording on "${activeStreamId}" (${selectedMime || "default codec"})`);
    } catch (err) {
      addLog(`[Recorder] Recording error: ${String(err)}`);
    }
  }, [config.recordBitrate, activeStreamId, addLog]);

  // Stop Video Recording
  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const settingsActionHandler = useCallback((action: SettingsTreeAction) => {
    if (action.action !== "update") return;

    setConfig((prev) => {
      const updated = { ...prev };
      set(updated, action.payload.path.slice(1), action.payload.value);
      return updated;
    });
  }, []);

  useLayoutEffect(() => {
    context.watch("colorScheme");
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      if (renderState.colorScheme) {
        setColorScheme(renderState.colorScheme);
      }
    };
  }, [context]);

  // Fetch available streams and stream health from go2rtc server
  useEffect(() => {
    const host = (config.serverUrl.trim().replace(/\/+$/, "")) || "http://127.0.0.1:1984";

    let mounted = true;
    const fetchInfo = () => {
      const currentTarget = activeStreamId;
      fetch(`${host}/api/streams?src=${encodeURIComponent(currentTarget)}`)
        .then((res) => res.json())
        .then((data: any) => {
          if (!mounted || !data) return;
          const producers = data.producers || [];
          if (producers.length === 0) {
            setServerDiag(`Connecting source: ${sanitizeUrl(currentTarget)}...`);
          } else {
            const p = producers[0];
            const url = sanitizeUrl(p.url || "");
            const recv = p.bytes_recv ? ` (${(p.bytes_recv / 1024 / 1024).toFixed(1)}MB recv)` : "";
            const media = p.medias ? p.medias.join(",") : "unknown";
            setServerDiag(`RTSP: ${url} | Media: ${media}${recv}`);
          }
        })
        .catch(() => {});
    };

    fetchInfo();
    const timer = setInterval(fetchInfo, 3000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [config.serverUrl, activeStreamId]);

  useEffect(() => {
    const tree = buildSettingsTree(config);
    context.updatePanelSettingsEditor({
      actionHandler: settingsActionHandler,
      nodes: tree,
    });
    saveState(config);
  }, [config, context, saveState, settingsActionHandler]);

  useLayoutEffect(() => {
    renderDone();
  }, [renderDone]);

  // Dynamic RTSP URL registration & WebRTC connection loop
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous player
    if (playerRef.current) {
      if (playerRef.current.parentNode) {
        playerRef.current.parentNode.removeChild(playerRef.current);
      }
      playerRef.current = null;
    }

    const host = (config.serverUrl.trim().replace(/\/+$/, "")) || "http://127.0.0.1:1984";
    const rawUrl = config.rtspUrl.trim();

    if (!rawUrl) {
      setStatus("No RTSP URL Specified");
      addLog("Please enter RTSP Stream URL in panel settings");
      return;
    }

    let cancelRegistration = false;

    const setupPlayer = async () => {
      let targetStreamName = "";

      // If user typed a direct RTSP URL
      if (rawUrl.startsWith("rtsp://") || rawUrl.startsWith("rtsps://") || rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
        let optimizedUrl = rawUrl;
        if (config.autoLowLatencyFlags !== false) {
          const hasMedia = optimizedUrl.includes("#media=");
          const hasBackchannel = optimizedUrl.includes("#backchannel=");
          const hasTransport = optimizedUrl.includes("#transport=");
          const hasBacklog = optimizedUrl.includes("#backlog=");

          const flags: string[] = [];
          if (!hasMedia) flags.push("media=video");
          if (!hasBackchannel) flags.push("backchannel=0");
          if (!hasTransport) flags.push("transport=tcp");
          if (!hasBacklog) flags.push("backlog=0");

          if (flags.length > 0) {
            optimizedUrl += (optimizedUrl.includes("#") ? "#" : "#") + flags.join("#");
          }
        }

        // Clean identifier based on IP
        let alias = "live_camera";
        try {
          const match = rawUrl.match(/@([^:/]+)(?::(\d+))?/);
          if (match && match[1]) {
            alias = `cam_${match[1].replace(/\./g, "_")}`;
          }
        } catch {
          alias = "live_camera";
        }

        // Deregister old stream from backend if alias changed
        if (registeredStreamRef.current && registeredStreamRef.current.name !== alias) {
          const old = registeredStreamRef.current;
          fetch(`${old.host}/api/streams?src=${encodeURIComponent(old.name)}`, {
            method: "DELETE",
          }).catch(() => {});
        }

        targetStreamName = alias;
        setActiveStreamId(alias);
        registeredStreamRef.current = { name: alias, host };
        addLog(`Connecting RTSP URL: ${sanitizeUrl(rawUrl).substring(0, 45)}...`);

        // Register to go2rtc API via PUT /api/streams?name={NAME}&src={URL}
        try {
          const regUrl = `${host}/api/streams?name=${encodeURIComponent(alias)}&src=${encodeURIComponent(optimizedUrl)}`;
          const res = await fetch(regUrl, { method: "PUT" });
          if (cancelRegistration) return;
          if (res.ok) {
            addLog(`[Backend] Dynamic stream "${alias}" registered`);
          } else {
            addLog(`[Backend] Dynamic register status: ${res.status}`);
          }
        } catch (err) {
          addLog(`[Backend] Dynamic register error: ${String(err)}`);
        }
      } else {
        // Plain stream name (e.g. camera_111)
        targetStreamName = rawUrl;
        setActiveStreamId(rawUrl);
      }

      if (!targetStreamName) return;

      addLog(`Streaming "${targetStreamName}" via WebRTC Direct UDP...`);
      setStatus(`Connecting to ${targetStreamName}...`);

      let wsHost = host;
      if (wsHost.startsWith("http://")) {
        wsHost = "ws://" + wsHost.substring(7);
      } else if (wsHost.startsWith("https://")) {
        wsHost = "wss://" + wsHost.substring(8);
      }

      const wsUrl = `${wsHost}/api/ws?src=${encodeURIComponent(targetStreamName)}`;
      const player = document.createElement("video-rtc") as VideoRTC;
      player.mode = config.mode || "webrtc";
      player.media = "video";
      player.background = true;
      player.style.width = "100%";
      player.style.height = "100%";
      player.style.display = "block";
      player.onlog = (m: string) => addLog(m);

      if (containerRef.current) {
        containerRef.current.appendChild(player);
        playerRef.current = player;
        player.src = wsUrl;
      }

      const vid = player.video;
      if (vid) {
        vid.addEventListener("play", () => addLog("Video play event fired"));
        vid.addEventListener("pause", () => addLog("Video pause event fired"));
        vid.addEventListener("waiting", () => addLog("Video waiting/buffering for data..."));
        vid.addEventListener("playing", () => addLog("Video playing actively!"));
        vid.addEventListener("error", () => {
          const err = vid.error;
          addLog(`HTMLVideoElement error: code=${err?.code} (${err?.message})`);
        });
      }
    };

    setupPlayer();

    let lastState = "";
    // High-frequency Real-time Ultra Low-Latency Watchdog (every 100ms)
    const interval = setInterval(() => {
      if (!playerRef.current || !playerRef.current.video) return;
      const v = playerRef.current.video;
      v.style.objectFit = config.objectFit;
      v.muted = config.muted;

      // 1. WebRTC Jitter Buffer Target Minimization (0ms)
      if (playerRef.current.pc) {
        try {
          playerRef.current.pc.getReceivers().forEach((receiver: any) => {
            if ("jitterBufferTarget" in receiver && receiver.jitterBufferTarget !== 0) {
              receiver.jitterBufferTarget = 0;
            }
            if ("playoutDelayHint" in receiver && receiver.playoutDelayHint !== 0) {
              receiver.playoutDelayHint = 0;
            }
          });
        } catch {
          // ignore
        }
      }

      // 2. Active Low-Latency Buffer Synchronization & Catch-Up
      if (config.lowLatencyCatchup !== false && v.buffered && v.buffered.length > 0) {
        const liveEdge = v.buffered.end(v.buffered.length - 1);
        const currentLag = liveEdge - v.currentTime;
        const lagInMs = Math.max(0, Math.round(currentLag * 1000));
        setLagMs(lagInMs);

        if (currentLag > 0.06) {
          // If buffered lag exceeds 60ms, seek immediately to live edge
          v.currentTime = liveEdge;
        } else if (currentLag > 0.025) {
          // If lag is between 25ms and 60ms, accelerate playback smoothly to catch up
          v.playbackRate = 1.15;
        } else {
          v.playbackRate = 1.0;
        }
      }

      if (config.autoplay && v.paused) {
        v.play().catch((e) => {
          addLog(`Autoplay warning: ${String(e)}`);
        });
      }

      let currentStatus = "";
      if (v.readyState >= 2 && !v.paused) {
        const msText = lagMs > 0 ? ` • ~${lagMs}ms` : " • Real-Time";
        currentStatus = `Live (${v.videoWidth}x${v.videoHeight}${msText})`;
      } else if (playerRef.current.pcState === 1) {
        currentStatus = "WebRTC Connected (Waiting for keyframe...)";
      } else if (playerRef.current.wsState === 1) {
        currentStatus = "WebSocket Open (Negotiating WebRTC SDP...)";
      } else if (playerRef.current.wsState === 0) {
        currentStatus = "Connecting WebSocket to go2rtc...";
      } else {
        currentStatus = "Disconnected / Retrying...";
      }

      if (currentStatus !== lastState) {
        lastState = currentStatus;
        setStatus(currentStatus);
      }
    }, 100);

    return () => {
      cancelRegistration = true;
      clearInterval(interval);
      if (playerRef.current) {
        if (playerRef.current.parentNode) {
          playerRef.current.parentNode.removeChild(playerRef.current);
        }
        playerRef.current = null;
      }
      // Deregister dynamic stream from go2rtc backend to avoid leaking camera connections
      if (registeredStreamRef.current) {
        const { name: oldName, host: oldHost } = registeredStreamRef.current;
        registeredStreamRef.current = null;
        fetch(`${oldHost}/api/streams?src=${encodeURIComponent(oldName)}`, {
          method: "DELETE",
        }).catch(() => {});
      }
    };
  }, [
    config.serverUrl,
    config.rtspUrl,
    config.autoLowLatencyFlags,
    config.mode,
    config.objectFit,
    config.muted,
    config.autoplay,
    config.lowLatencyCatchup,
    lagMs,
    addLog,
  ]);

  // Clean up recording on component unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const displayName = activeStreamId
    ? activeStreamId.startsWith("rtsp://") || activeStreamId.startsWith("rtsps://")
      ? sanitizeUrl(activeStreamId)
      : activeStreamId
    : "RTSP Camera";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: colorScheme === "dark" ? "#111215" : "#f5f5f7",
        overflow: "hidden",
      }}
    >
      {/* Video element mount point */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />

      {/* Mixed Content Warning Alert (Browser HTTPS accessing HTTP/WS backend) */}
      {isMixedContent && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 110,
            padding: "8px 16px",
            borderRadius: 8,
            backgroundColor: "rgba(185, 28, 28, 0.96)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            maxWidth: "92%",
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          <span>
            ⚠️ <strong>Mixed Content Detected:</strong> HTTPS browser cannot connect to insecure{" "}
            <code>{config.serverUrl}</code>. Use Foxglove Desktop App or enable HTTPS/WSS in go2rtc.
          </span>
        </div>
      )}

      {/* Empty State when no RTSP Stream URL is configured */}
      {!config.rtspUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
            color: colorScheme === "dark" ? "#94a3b8" : "#64748b",
            gap: 12,
            pointerEvents: "none",
            zIndex: 50,
          }}
        >
          <svg
            width="46"
            height="46"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: colorScheme === "dark" ? "#f1f5f9" : "#1e293b",
            }}
          >
            No RTSP Stream Configured
          </div>
          <div style={{ fontSize: 13, maxWidth: 380, lineHeight: 1.5 }}>
            Open the panel settings (⚙️ icon on the right) and enter your RTSP Camera URL (e.g.{" "}
            <code>rtsp://...</code>) to start ultra-low latency WebRTC streaming.
          </div>
        </div>
      )}

      {/* Shutter Flash Animation */}
      {flash && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#ffffff",
            opacity: 0.8,
            pointerEvents: "none",
            zIndex: 90,
            transition: "opacity 0.2s ease-out",
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "absolute",
            top: 56,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 18px",
            borderRadius: 22,
            backgroundColor: isRecording ? "rgba(220, 38, 38, 0.96)" : "rgba(16, 185, 129, 0.96)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 700,
            zIndex: 100,
            boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {toast}
        </div>
      )}

      {/* Top Left Status Badge & Active Recording Pill */}
      {config.showOverlay && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxWidth: "60%",
            zIndex: 70,
            pointerEvents: "none",
          }}
        >
          {/* Active Recording Pill */}
          {isRecording && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                borderRadius: 20,
                backgroundColor: "rgba(220, 38, 38, 0.92)",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 700,
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.8)",
                width: "fit-content",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 0 6px #ffffff",
                }}
              />
              <span>REC {formatDuration(recordDuration)}</span>
            </div>
          )}

          {/* Status Badge */}
          <div
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              backgroundColor: "rgba(18, 20, 24, 0.88)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              fontSize: 12,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: status.startsWith("Live")
                    ? "#00e676"
                    : status.includes("Error") || status.includes("Disconnected")
                    ? "#f44336"
                    : "#ffb300",
                  boxShadow: status.startsWith("Live") ? "0 0 6px #00e676" : "none",
                }}
              />
              <span style={{ fontWeight: 600 }}>{displayName}</span>
              <span style={{ opacity: 0.6 }}>|</span>
              <span style={{ opacity: 0.9 }}>{status}</span>
            </div>
            {serverDiag && (
              <div style={{ fontSize: 10, opacity: 0.75, wordBreak: "break-all" }}>
                {serverDiag}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Right Action Toolbar (Snapshot & Record Buttons) */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 80,
          display: "flex",
          alignItems: "center",
          gap: 8,
          pointerEvents: "auto",
        }}
      >
        {/* Record Video Button */}
        {config.showRecordButton !== false && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRecording();
            }}
            title={isRecording ? "Stop Video Recording" : "Start Video Recording"}
            style={{
              backgroundColor: isRecording ? "#dc2626" : "rgba(15, 23, 42, 0.88)",
              color: "#ffffff",
              border: isRecording ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.25)",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 7,
              boxShadow: isRecording ? "0 0 14px rgba(239, 68, 68, 0.6)" : "0 4px 14px rgba(0,0,0,0.4)",
              transition: "all 0.15s ease",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isRecording ? "#b91c1c" : "rgba(30, 41, 59, 0.95)";
              e.currentTarget.style.transform = "scale(1.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isRecording ? "#dc2626" : "rgba(15, 23, 42, 0.88)";
              e.currentTarget.style.transform = "scale(1.0)";
            }}
          >
            {isRecording ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    backgroundColor: "#ffffff",
                    borderRadius: 2,
                  }}
                />
                <span>Stop Rec ({formatDuration(recordDuration)})</span>
              </>
            ) : (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    backgroundColor: "#ef4444",
                    borderRadius: "50%",
                    boxShadow: "0 0 4px #ef4444",
                  }}
                />
                <span>Record Video</span>
              </>
            )}
          </button>
        )}

        {/* Snapshot Photo Button */}
        {config.showSnapshotButton !== false && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              takeSnapshot();
            }}
            title="Take High-Resolution Snapshot (Full Native 4K/1080p Stream)"
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.35)",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 7,
              boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
              transition: "all 0.15s ease",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#1d4ed8";
              e.currentTarget.style.transform = "scale(1.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#2563eb";
              e.currentTarget.style.transform = "scale(1.0)";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span>Capture Photo</span>
          </button>
        )}
      </div>

      {/* Diagnostics Logs Box */}
      {config.showLogs && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            right: 8,
            maxHeight: 130,
            backgroundColor: "rgba(10, 11, 14, 0.88)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 6,
            padding: "6px 10px",
            color: "#94a3b8",
            fontSize: 11,
            fontFamily: "monospace",
            overflowY: "auto",
            zIndex: 60,
          }}
        >
          <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
            <span>Live Stream Diagnostics & Logs</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>Toggle in Panel Settings</span>
          </div>
          {logs.length === 0 ? (
            <div>No events recorded yet...</div>
          ) : (
            logs.map((line, idx) => (
              <div
                key={idx}
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.3,
                  color: line.includes("error") || line.includes("Error") || line.includes("failed")
                    ? "#f87171"
                    : line.includes("Live") || line.includes("playing") || line.includes("Snapshot") || line.includes("Recorder") || line.includes("registered")
                    ? "#4ade80"
                    : line.includes("warning") || line.includes("Waiting") || line.includes("REC")
                    ? "#fbbf24"
                    : "#cbd5e1",
                }}
              >
                {line}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
