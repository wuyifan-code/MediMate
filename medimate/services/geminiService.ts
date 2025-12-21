import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getHealthTriage = async (symptoms: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a professional medical triage assistant. 
Based on the user's symptoms, please provide:
1. Recommended hospital department (挂号建议)
2. Preparation advice (建议准备)
3. A warm tip (温馨提示)

Symptoms: ${symptoms}

Please keep the response concise and helpful.`,
    });
    
    return response.text || "Unable to generate triage advice. Please consult a doctor immediately.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Service temporarily unavailable. Please visit a hospital.";
  }
};

export const getMatchReasoning = async (patientNeeds: string, escortProfile: string): Promise<string> => {
   try {
     const response = await ai.models.generateContent({
       model: 'gemini-2.5-flash',
       contents: `Explain why this escort is a good match for the patient in one sentence.
       
       Patient Needs: ${patientNeeds}
       Escort Profile: ${escortProfile}`
     });
     return response.text || "基于地理位置与专业资质智能推荐";
   } catch (error) {
     console.error("Gemini API Error:", error);
     return "基于地理位置与专业资质智能推荐";
   }
}