import React from "react";

import "./Loading.scss";

const Loading: React.FC = () => {
  return (
    <span className="loading">
      <div className="loading-square"></div>
      <div className="loading-square"></div>
      <div className="loading-square"></div>
    </span>
  );
};

export default Loading;
