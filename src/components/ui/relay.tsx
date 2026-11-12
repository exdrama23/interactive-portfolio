"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import {
  relay,
  type Figure,
  type HairlineOptions,
} from "@/components/ui/relay-utils/hairline-index";

/**
 * @lucasmarkes/hairline/react — Relay as a component.
 *
 * Renders one empty `<div>` and mounts the figure on it in a layout effect,
 * so on the server the box is there and the drawing is not. It mounts once:
 * a changed option reaches the running figure as `update`, and `onRead` is
 * called through a ref, so an inline function never remounts.
 */

/** The figure's options, plus every `<div>` attribute except `children`. */
export type HairlineProps = HairlineOptions &
  Omit<ComponentPropsWithoutRef<"div">, "children" | keyof HairlineOptions>;
type HairlineComponent = ForwardRefExoticComponent<
  HairlineProps & RefAttributes<HTMLDivElement>
>;

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function make(
  name: string,
  mount: (el: HTMLElement, options?: HairlineOptions) => Figure,
): HairlineComponent {
  const Component = forwardRef<HTMLDivElement, HairlineProps>(
    function Hairline(props, ref) {
      const { intensity, theme, label, onRead, play, style, ...attrs } = props;
      /* aria-label stays on the div and is the figure's label too, so the two never disagree about the name */
      const named = label ?? props["aria-label"];

      const el = useRef<HTMLDivElement | null>(null);
      const figure = useRef<Figure | null>(null);
      const read = useRef(onRead);
      const set = useCallback(
        (node: HTMLDivElement | null) => {
          el.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        },
        [ref],
      );

      useIsoLayoutEffect(() => {
        read.current = onRead;
      });

      useIsoLayoutEffect(() => {
        const f = mount(el.current!, {
          intensity,
          theme,
          label: named,
          play,
          onRead: (text) => read.current?.(text),
        });
        figure.current = f;
        return () => {
          f.destroy();
          figure.current = null;
        };
        // mounts once; options reach the figure through the effect below
      }, []);

      /* every key is sent, so a prop that was removed goes back to its default */
      useIsoLayoutEffect(() => {
        figure.current?.update({ intensity, theme, label: named, play });
      }, [intensity, theme, named, play]);

      return (
        <div {...attrs} ref={set} style={{ aspectRatio: "5 / 4", ...style }} />
      );
    },
  );
  Component.displayName = name;
  return Component;
}

/** A hub and four branches of tiles: the path to the leaf under the pointer lights hop by hop, each tile rising in turn. `intensity` makes each hop wait longer. */
const Relay = make("Relay", relay);

export default Relay;
