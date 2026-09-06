import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Self-hosted through npm, not the Google Fonts CDN. The CDN sends every
// visitor's IP address to Google on page load, which German courts have held
// to breach the GDPR — not a risk worth taking for a product built around UK
// household data. These are bundled by Vite and served from our own origin.
//
// Only the weight axis of each family: the full Bricolage file carries optical
// size and width axes as well and is 128 KB against 40 KB for this one, and
// nothing in the design varies those.
//
// No Chinese webfont, deliberately. The smallest usable Simplified Chinese
// face is several megabytes; PingFang SC and Microsoft YaHei are already on
// every device that matters and are excellent. Each @font-face below carries a
// unicode-range, so Chinese falls through to them and the browser never
// downloads a byte it cannot use.
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@fontsource-variable/plus-jakarta-sans/wght.css";

import "./styles/tokens.css";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
