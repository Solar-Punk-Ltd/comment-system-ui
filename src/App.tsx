import { SwarmCommentSystem, SwarmCommentSystemProps } from "./components/swarm-comment-system/swarm-comment-system";

import "./App.css";

export function App(props?: SwarmCommentSystemProps) {
  if (!props?.privatekey) {
    throw new Error("The 'privatekey' property is required.");
  }

  return (
    <>
      <SwarmCommentSystem {...props} />
    </>
  );
}
