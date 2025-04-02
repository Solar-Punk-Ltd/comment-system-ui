import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App
      privatekey={"1".repeat(64)}
      identifier={"0".repeat(64)}
      stamp={"6f8ed73bc84374da6e04136a903c3d106c151eb768c1480db3bb558998bac556"}
      approvedFeedAddress={"278412ed9f86710933e0eeaf1a3c86ec21fbfd2d"}
    />
  </React.StrictMode>,
);
