import { PanelExtensionContext } from "@foxglove/studio";
import { StrictMode } from "react";
import ReactDOM from "react-dom";

import Go2rtcPlayer from "./Go2rtcPlayer";

export function initPanel(context: PanelExtensionContext): () => void {
  const reactDomAny = ReactDOM as any;
  if (typeof reactDomAny.createRoot === "function") {
    const root = reactDomAny.createRoot(context.panelElement);
    root.render(
      <StrictMode>
        <Go2rtcPlayer context={context} />
      </StrictMode>,
    );
    return () => {
      root.unmount();
    };
  }

  ReactDOM.render(
    <StrictMode>
      <Go2rtcPlayer context={context} />
    </StrictMode>,
    context.panelElement,
  );

  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}

