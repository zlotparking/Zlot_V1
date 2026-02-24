"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type SafeImageProps = ImageProps & {
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1695692929156-69dc2e6444c4?auto=format&fit=crop&w=1400&q=80";

export default function SafeImage({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  onError,
  ...rest
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <Image
      {...rest}
      src={failed ? fallbackSrc : src}
      alt={alt}
      onError={(event) => {
        if (!failed) {
          setFailed(true);
        }
        onError?.(event);
      }}
    />
  );
}
