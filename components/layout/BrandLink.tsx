import Image from "next/image";
import Link from "next/link";

// Every clickable RuckOn logo goes to the public Home page. `tone` picks the logo version for the background
// (public/brand/README.md): "dark" is the white-text logo for dark navigation, "light" the black-text logo.
export default function BrandLink({ tone, className }: { tone: "dark" | "light"; className: string }) {
  return (
    <Link href="/" className="inline-flex shrink-0 rounded-lg">
      <Image
        src={tone === "dark" ? "/brand/ruckon-logo-on-dark.png" : "/brand/ruckon-logo.png"}
        alt="RuckOn Fitness home"
        width={1200}
        height={374}
        sizes="200px"
        loading="eager"
        className={className}
      />
    </Link>
  );
}
