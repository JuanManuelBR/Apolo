import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type AnimVariant = "slideUp" | "fadeIn" | "scaleIn" | "slideDown";

interface AnimatedPageProps {
  children: ReactNode;
  variant?: AnimVariant;
  className?: string;
}

const variantClass: Record<AnimVariant, string> = {
  slideUp:   "anim-slideUp",
  fadeIn:    "anim-fadeIn",
  scaleIn:   "anim-scaleIn",
  slideDown: "anim-slideDown",
};

/**
 * AnimatedPage — animación de entrada para páginas y rutas.
 *
 * La clase se elimina cuando termina la animación para que el div no
 * genere un stacking context extra (transform: translateY(0) lo crearía
 * y rompería los position:fixed de modales internos).
 */
export default function AnimatedPage({
  children,
  variant = "slideUp",
  className = "",
}: AnimatedPageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Asegurar estado inicial limpio
    el.classList.remove(...Object.values(variantClass));
    void el.offsetWidth; // reflow

    el.classList.add(variantClass[variant]);

    // Al terminar la animación quitar la clase: el div queda sin transform
    // y no rompe el posicionamiento fixed de hijos internos
    const onEnd = () => el.classList.remove(variantClass[variant]);
    el.addEventListener("animationend", onEnd, { once: true });

    return () => el.removeEventListener("animationend", onEnd);
  }, [variant]);

  return (
    <div ref={ref} className={className || undefined}>
      {children}
    </div>
  );
}
