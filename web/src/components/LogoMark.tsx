export default function LogoMark({
  className = "h-15 w-auto",
}: {
  className?: string;
}) {
  return (
    <img
      src="/logo4.png"
      alt=""
      className={`${className} shrink-0 object-contain`}
    />
  );
}