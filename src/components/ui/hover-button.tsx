import * as React from "react"

export interface HoverSlatButtonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  initialText: string
  hoverText: string
  /** Extra classes for each individual slat. */
  cellClassName?: string
  /** Background/text classes for the resting slat face. */
  baseClassName?: string
  /** Background/text classes for the face that slides in on hover. */
  hoverClassName?: string
}

/**
 * Slat button: each letter sits in its own tile. On hover a second word slides
 * in, alternating from top and bottom, so the label clicks over like a split
 * flap display. Both labels must be the same length.
 */
const HoverSlatButton = React.forwardRef<HTMLDivElement, HoverSlatButtonProps>(
  (
    {
      initialText,
      hoverText,
      className,
      cellClassName,
      baseClassName,
      hoverClassName,
      ...props
    },
    ref,
  ) => {
    if (initialText.length !== hoverText.length) {
      console.error("Initial and hover text must have the same length.")
      return null
    }

    return (
      <div
        ref={ref}
        className={`group flex cursor-pointer ${className ?? ""}`}
        {...props}
      >
        {initialText.split("").map((char, index) => (
          <div
            key={index}
            className={`relative flex h-9 w-[26px] items-center justify-center overflow-hidden border-r border-black/10 text-[11px] font-bold uppercase leading-none last:border-r-0 sm:h-10 sm:w-8 sm:text-xs lg:h-11 lg:w-9 lg:text-sm ${
              baseClassName ?? "bg-[#f4f1ea] text-stone-900"
            } ${cellClassName ?? ""}`}
          >
            <div
              className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 motion-reduce:transition-none ${
                index % 2 === 0 ? "translate-y-full" : "-translate-y-full"
              } group-hover:translate-y-0 ${
                hoverClassName ?? "bg-white text-stone-900"
              }`}
            >
              {hoverText[index]}
            </div>
            {char}
          </div>
        ))}
      </div>
    )
  },
)

HoverSlatButton.displayName = "HoverSlatButton"

export default HoverSlatButton
