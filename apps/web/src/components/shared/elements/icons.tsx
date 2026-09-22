import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

function baseProps({ size = "1em", ...rest }: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    focusable: false,
    ...rest,
  };
}

/** Pixel-stepped right arrow (8-bit style), used as the trailing icon on buttons and links. */
export function PixelArrowIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 11v2h12v2h2v-2h2v-2h-2V9h-2v2zm10-4h2v2h-2zm0 0h-2V5h2zm0 10h2v-2h-2zm0 0h-2v2h2z"
      />
    </svg>
  );
}

/** Pixel-stepped checkmark, used in lists, checkboxes and correct-answer markers. */
export function PixelCheckIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 6h2v2h-2zm-2 4V8h2v2zm-2 2v-2h2v2zm-2 2h2v-2h-2zm-2 2h2v-2h-2zm-2 0v2h2v-2zm-2-2h2v2H6zm0 0H4v-2h2z"
      />
    </svg>
  );
}

/** Pixel-stepped cross, used for close/dismiss and wrong-answer markers. */
export function PixelCloseIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 4h2v2H6zm2 2h2v2H8zm2 2h2v2h-2zm2 0h2V6h2V4h2v2h-2v2h-2v2h-2zm2 2h-2v2h2zm0 2h2v2h2v2h-2v-2h-2zm-4 0h2v-2h-2zm0 0v2H8v2H6v-2h2v-2z"
      />
    </svg>
  );
}

/** Pixel spinner: four squares that rotate, for loading buttons. */
export function PixelSpinnerIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)} className={["animate-spin", props.className].filter(Boolean).join(" ")}>
      <path d="M11 3h2v5h-2zM16 11h5v2h-5zM11 16h2v5h-2zM3 11h5v2H3z" />
    </svg>
  );
}

/** Brand mark: a boxed pixel "x" — same square-with-cross idea as the Solvd logotype. */
export function LogoMark(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 3h18v18H3zm2 2v14h14V5zm2 2h2v2H7zm2 2h2v2H9zm2 2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zm0-8h2V7h-2zm-2 2h2V9h-2zm-4 4h2v-2H9zm-2 2h2v-2H7z"
      />
    </svg>
  );
}
