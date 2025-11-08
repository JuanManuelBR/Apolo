export enum tipo_usuario {
  ESTUDIANTE = "Estudiante",
  PROFESOR = "Profesor",
}

export interface add_user_dto {
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  tipo: tipo_usuario;
  email: string;
  contrasena: string;
}
