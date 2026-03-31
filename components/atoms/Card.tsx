import type { ReactNode } from "react";

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export default function Card({
  children,
  className = "",
  padding = "md",
  as: Tag = "div",
}: CardProps) {
  return (
    <Tag
      className={`border border-gray-200 rounded-lg bg-white shadow-sm ${PADDING_CLASSES[padding]} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  children: ReactNode;
  /** Extra Tailwind classes to merge onto the card wrapper. */
  className?: string;
  /** Inner padding preset. Defaults to "md". */
  padding?: CardPadding;
  /** HTML element to render as. Defaults to "div". */
  as?: "div" | "section" | "article" | "aside" | "main";
}
