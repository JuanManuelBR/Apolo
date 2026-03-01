import { useState } from "react";

/**
 * Hook para leer y escribir en localStorage de forma reactiva.
 * Reemplaza los accesos directos a localStorage.getItem/setItem/removeItem
 * dispersos por el proyecto.
 *
 * @example
 * const [usuario, setUsuario, removeUsuario] = useLocalStorage<LocalUser | null>('usuario', null);
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // silencioso en producción
    }
  };

  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      localStorage.removeItem(key);
    } catch {
      // silencioso en producción
    }
  };

  return [storedValue, setValue, removeValue];
}
