import Image from "next/image";
import { isVideoMedia } from "@/lib/blog/media";

const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAnIGhlaWdodD0nMTAnIHZpZXdCb3g9JzAgMCAxMCAxMCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48ZmlsdGVyIGlkPSdiJz48ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPScxLjUnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAnIGhlaWdodD0nMTAnIGZpbGw9JyNlN2U1ZGUnLz48cmVjdCB3aWR0aD0nMTAnIGhlaWdodD0nNScgZmlsbD0nI2Y2ZjRlZScgZmlsdGVyPSd1cmwoI2IpJy8+PC9zdmc+";

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
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      className={className}
    />
  );
}
