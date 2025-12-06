import { AppDataSource } from "@src/data-source/AppDataSource";
import { Exam } from "@src/models/Exam";
import axios from "axios";
const USER_MS_URL = process.env.USER_MS_URL;

export class examenValidator {
  private examRepo = AppDataSource.getRepository(Exam);

  static async verificarProfesor(id_profesor: number, cookies?: string) {
    try {
      const response = await axios.get(
        `${USER_MS_URL}/api/users/${id_profesor}`,
        {
          headers: { Cookie: cookies || "" },
          timeout: 5000, // Timeout de 5 segundos
        }
      );

      const profesor = response.data;
      if (!profesor || !profesor.id) {
        throw new Error("No se encontró el profesor con el id proporcionado");
      }

      return profesor;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error("No se encontró el profesor con el id proporcionado");
      }
      if (error.code === "ECONNABORTED") {
        throw new Error("Timeout al verificar el profesor");
      }
      throw new Error(`Error al verificar profesor: ${error.message}`);
    }
  }

  static async verificarExamenDuplicado(nombre: string, id_profesor: number) {
    const examRepo = AppDataSource.getRepository(Exam);

    const examen_existente = await examRepo.findOne({
      where: { nombre, id_profesor },
    });

    if (examen_existente) {
      throw new Error("No puedes tener 2 exámenes con el mismo nombre");
    }
  }
}
