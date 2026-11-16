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
      }, []);

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

const Relay = make("Relay", relay);

export default Relay;
