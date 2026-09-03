import { ExtensionContext } from "@foxglove/studio";

import { initPanel } from "./initPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "RTSP WebRTC Extension",
    initPanel,
  });
  // Backward compatibility aliases for existing layouts
  extensionContext.registerPanel({
    name: "RTSP WebRTC Streamer",
    initPanel,
  });
  extensionContext.registerPanel({
    name: "go2rtc WebRTC Video",
    initPanel,
  });
}
