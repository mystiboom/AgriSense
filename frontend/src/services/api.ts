import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface StressSummary {
  region_id: number;
  region_name: string;
  region_level: string;
  avg_ndvi: number | null;
  avg_evi: number | null;
  latest_observation: string | null;
  latest_stress: number | null;
  latest_stress_level: string | null;
  avg_rainfall: number | null;
  avg_temperature: number | null;
  avg_humidity: number | null;
  avg_soil_moisture: number | null;
  avg_soil_ph: number | null;
}




export interface CropObservation {
    observation_id: number;
    region_id: number;
    region_name: string;
    crop_type: string;
    observed_at: string;
    ndvi: number;
    evi: number;
    stress_score: number;
    stress_level: string;
    data_source: string;
  }

  export const getCropObservations = async (
    regionId?: number
  ): Promise<CropObservation[]> => {
    const response = await api.get<CropObservation[]>(
      "/crop-observations",
      {
        params: {
          limit: 500,
          ...(regionId ? { region_id: regionId } : {}),
        },
      }
    );

    return response.data;
  };

export const getStressSummary = async (): Promise<StressSummary[]> => {
  const response = await api.get<StressSummary[]>("/stress-summary");
  return response.data;
};


export interface Region {
    region_id: number;
    region_name: string;
    region_level: string;
    parent_region_id: number | null;
    parent_region?: string | null;
  }

  export interface WeatherRecord {
    weather_id: number;
    region_id: number;
    region_name: string;
    recorded_at: string;
    rainfall_mm: number | null;
    temperature_c: number | null;
    humidity_pct: number | null;
    wind_speed: number | null;
    data_source: string | null;
  }

  export interface SoilRecord {
    soil_id: number;
    region_id: number;
    region_name: string;
    recorded_at: string;
    soil_moisture_pct: number | null;
    soil_ph: number | null;
    nitrogen: number | null;
    phosphorus: number | null;
    potassium: number | null;
    data_source: string | null;
  }

  export const getRegions = async (
    level?: string
  ): Promise<Region[]> => {
    const response = await api.get<Region[]>("/regions", {
      params: level ? { level } : {},
    });
    return response.data;
  };

  export const getWeather = async (
    regionId?: number
  ): Promise<WeatherRecord[]> => {
    const response = await api.get<WeatherRecord[]>("/weather", {
      params: { limit: 500, ...(regionId ? { region_id: regionId } : {}) },
    });
    return response.data;
  };

  export const getSoil = async (
    regionId?: number
  ): Promise<SoilRecord[]> => {
    const response = await api.get<SoilRecord[]>("/soil", {
      params: { limit: 500, ...(regionId ? { region_id: regionId } : {}) },
    });
    return response.data;
  };


export interface ChatSource {
    document_id: number;
    title: string;
    category: string | null;
    source: string | null;
    similarity: number;
  }

  export interface ChatResponse {
    status: string;
    conversation_id: string;
    question: string;
    answer: string;
    sources: ChatSource[];
    live_data: unknown;
  }

  export interface ChatRequest {
    question: string;
    region_id: number | null;
    top_k: number;
    conversation_id?: string;
  }

  export const sendChatMessage = async (
    request: ChatRequest
  ): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>(
      "/chat",
      request
    );

    return response.data;
  };


export interface SavedConversation {
    id: string;
    title: string;
    region_id: number | null;
    created_at: string;
    updated_at: string;
  }

  export interface ConversationMessagesResponse {
    conversation_id: string;
    region_id: number | null;
    messages: {
      id: string;
      role: "user" | "assistant";
      content: string;
      sources: ChatSource[];
    }[];
  }

  export const getConversations = async (): Promise<SavedConversation[]> => {
    const response = await api.get<SavedConversation[]>("/conversations");
    return response.data;
  };

  export const getConversationMessages = async (
    conversationId: string
  ): Promise<ConversationMessagesResponse> => {
    const response = await api.get<ConversationMessagesResponse>(
      `/conversations/${conversationId}/messages`
    );
    return response.data;
  };

  export const deleteSavedConversation = async (
    conversationId: string
  ): Promise<void> => {
    await api.delete(`/conversations/${conversationId}`);
  };



export default api;
