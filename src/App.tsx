import { SwarmCommentSystem, SwarmCommentSystemProps } from "./components/swarm-comment-system/swarm-comment-system";

import "./App.css";

export function App(props?: SwarmCommentSystemProps) {
  return (
    <>
      <SwarmCommentSystem {...props} />
    </>
  );
}
