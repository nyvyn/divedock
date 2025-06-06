/* Icono de micrófono silenciado */
export function MicOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 5a3 3 0 016 0v6a3 3 0 01-.27 1.24l1.55 1.55A4.96 4.96 0 0018 11V5a5 5 0 00-10 0v1.17l2 2V5z" />
      <path d="M5.27 3.2a1 1 0 00-1.54 1.28l2.05 2.05A4.97 4.97 0 005 11a7 7 0 0012 4.9l1.83 1.83a1 1 0 001.41-1.42l-15-15zM12 19a7 7 0 01-7-7 1 1 0 112 0 5 5 0 005 5 4.98 4.98 0 003.24-1.18l1.46 1.46A6.97 6.97 0 0112 19z" />
    </svg>
  );
}
