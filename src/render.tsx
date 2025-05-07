import React from "react";
import ReactDOM from "react-dom/client";

import { SwarmCommentSystem, SwarmCommentSystemProps } from "./components";

export function renderSwarmComments(id: string, props: SwarmCommentSystemProps): void {
  ReactDOM.createRoot(document.getElementById(id)!).render(
    <React.StrictMode>
      <SwarmCommentSystem {...props} />
    </React.StrictMode>,
  );
}
