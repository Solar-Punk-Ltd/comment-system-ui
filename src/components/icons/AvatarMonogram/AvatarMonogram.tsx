import React from "react";
import "./AvatarMonogram.scss";

interface AvatarMonogramProps {
  letters: string;
  color?: string;
  backgroundColor?: string;
}

const AvatarMonogram: React.FC<AvatarMonogramProps> = ({
  letters,
  color,
  backgroundColor,
}) => {
  return (
    <div className="avatar-monogram" style={{ color, backgroundColor }}>
      {letters}
    </div>
  );
};

export default AvatarMonogram;
