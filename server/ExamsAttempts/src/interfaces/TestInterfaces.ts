export interface TestQuestion {
  id: number;
  puntaje: number;
  calificacionParcial: boolean;
  options: Array<{
    id: number;
    texto: string;
    esCorrecta: boolean;
  }>;
}


export interface StudentAnswer {
  pregunta_id: number;
  respuesta: string;
}

export interface OpenQuestion {
  id: number;
  puntaje: number;
  calificacionParcial: boolean;
  textoRespuesta?: string | null;
  keywords?: Array<{
    id: number;
    texto: string;
  }>;
}


export interface FillBlanksQuestion {
  id: number;
  puntaje: number;
  calificacionParcial: boolean;
  textoCorrecto: string;
  respuestas: Array<{
    id: number;
    posicion: number;
    textoCorrecto: string;
  }>;
}

export interface MatchQuestion {
  id: number;
  puntaje: number;
  calificacionParcial: boolean;
  pares: Array<{
    id: number;
    itemA: {
      id: number;
      text: string;
    };
    itemB: {
      id: number;
      text: string;
    };
  }>;
}

export interface GradingResult {
  pregunta_id: number;
  puntajeObtenido: number;
  puntajeMaximo: number;
}