import { useState, useEffect, ReactNode } from "react";

interface CollapsibleProps {
  open: boolean;
  children: ReactNode;
  /** Clases extra al div contenedor (p.ej. "px-6 pb-6 space-y-4") */
  className?: string;
  /** Duración de la animación de cierre en ms. Por defecto 200. */
  duration?: number;
}

/**
 * Collapsible — acordeón con animaciones de apertura y cierre.
 *
 * • Apertura  → anim-slideDown (baja desde arriba con fade-in)
 * • Cierre    → anim-collapseUp (sube y desaparece)
 *
 * El componente retrasa el desmontaje hasta que la animación de
 * cierre termina, de modo que el usuario ve la transición completa.
 */
export default function Collapsible({
  open,
  children,
  className = "",
  duration = 200,
}: CollapsibleProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setClosing(false);
      setMounted(true);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, duration);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <div className={`${closing ? "anim-collapseUp" : "anim-slideDown"} ${className}`}>
      {children}
    </div>
  );
}
