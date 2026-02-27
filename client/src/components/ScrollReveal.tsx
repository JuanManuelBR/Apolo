import { useEffect, useRef, ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Retraso antes de iniciar la animación en ms. Útil para escalonar tarjetas. */
  delay?: number;
  /** Porcentaje del elemento visible para disparar la animación (0–1). */
  threshold?: number;
}

/**
 * ScrollReveal — anima elementos cuando entran al viewport al hacer scroll.
 *
 * Usa IntersectionObserver para detectar cuando el elemento es visible
 * y lo hace aparecer con un suave fade + slide-up.
 * Una vez animado se desconecta el observer (la animación ocurre solo una vez).
 *
 * Uso:
 *   <ScrollReveal delay={index * 60}>
 *     <TarjetaDeExamen ... />
 *   </ScrollReveal>
 */
export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  threshold = 0.08,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Estado inicial: invisible y ligeramente desplazado
    el.style.opacity = "0";
    el.style.transform = "translateY(14px)";
    el.style.transition = [
      `opacity 0.38s ease-out ${delay}ms`,
      `transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    ].join(", ");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect(); // solo una vez
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
