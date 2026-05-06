import Image from "next/image";
import { isVideoMedia } from "@/lib/blog/media";

type Props = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

export default function BlogCoverMedia({
  src,
  alt,
  className = "aspect-[16/9] w-full object-cover",
  width = 720,
  height = 420,
  priority = false,
}: Props) {
  if (isVideoMedia(src)) {
    return (
      <video
        src={src}
        className={className}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label={alt}
      />
    );
  }

  if (src.startsWith("data:")) {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
