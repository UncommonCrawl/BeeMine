import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app.jsx";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
