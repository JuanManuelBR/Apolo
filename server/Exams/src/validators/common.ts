import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";

export class CommonValidator {
  // Función recursiva para obtener todos los errores, incluidos los anidados
  private flattenValidationErrors(errors: ValidationError[]): string[] {
    return errors.flatMap((err) => {
      const constraints = err.constraints ? Object.values(err.constraints) : [];
      const children =
        err.children && err.children.length > 0
          ? this.flattenValidationErrors(err.children)
          : [];
      return [...constraints, ...children];
    });
  }

  // Valida un DTO genérico
  async validateDto<T extends object>(
    dtoClass: new (...args: any[]) => T,
    rawData: any
  ): Promise<T> {
    // Convierte JSON plano en instancia del DTO
    const dto = plainToInstance(dtoClass, rawData, {
      enableImplicitConversion: true, // ayuda a convertir strings a números o fechas automáticamente
    });

    // Validación con class-validator
    const errors = await validate(dto, {
      whitelist: true, // elimina propiedades que no están en el DTO
      forbidNonWhitelisted: true, // lanza error si hay propiedades extra
      skipMissingProperties: false, // no permite campos faltantes
      validationError: { target: false, value: false }, // limpia output de errores
    });

    // Si hay errores, lanza excepción con todos los errores anidados
    if (errors.length > 0) {
      const messages = this.flattenValidationErrors(errors).join(", ");
      throw new Error(`Errores de validación: ${messages}`);
    }

    return dto;
  }
}
