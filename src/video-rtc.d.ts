export class VideoRTC extends HTMLElement {
  mode: string;
  media: string;
  background: boolean;
  visibilityThreshold: number;
  visibilityCheck: boolean;
  wsURL: string;
  wsState: number;
  pcState: number;
  pc: RTCPeerConnection | null;
  video: HTMLVideoElement;
  onlog?: (msg: string) => void;
  set src(value: string);
  play(): void;
}
