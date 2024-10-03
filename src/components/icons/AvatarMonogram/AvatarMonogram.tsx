import React from "react";
// import "./AvatarMonogram.scss";

interface AvatarMonogramProps {
  letters: string;
  color?: string;
  backgroundColor?: string;
}

const AvatarMonogram: React.FC<AvatarMonogramProps> = ({ letters }) => {
  return (
    <div
      className="avatar-monogram"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        backgroundColor: "#f0f0f0",
        color: "#4A2875",
        fontSize: "12px",
        fontWeight: "bold",
        // fontWeight: "600",
        letterSpacing: "0.25%",
        lineHeight: "16px",
      }}
    >
      {letters}
    </div>
  );
};

export default AvatarMonogram;
