
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Fixed: Correct SDK initialization and model naming based on coding guidelines
export const createCoachChat = (): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Eres el entrenador principal del programa 'Wild Blood'. 
      Tu tono es motivador, directo y experto en fuerza y acondicionamiento físico (CrossFit, Powerlifting, Bodybuilding).
      Responde siempre en Español.
      Ayuda a los usuarios a escalar ejercicios, entender la técnica y motivarse durante el dolor.
      Si preguntan sobre el cronómetro, explícales cómo usar los modos AMRAP, EMOM, TABATA.`,
    },
  });
};

export const sendMessageToCoach = async (chat: Chat, message: string): Promise<string> => {
  try {
    // Fixed: Properly extracting text from the response object
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text || "Lo siento, hubo un error al procesar tu mensaje.";
  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    return "Error de conexión con el entrenador IA.";
  }
};
