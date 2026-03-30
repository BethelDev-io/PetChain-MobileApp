import axios from 'axios';
import apiClient from '../../backend/services/apiClient';
import {
  API_ENDPOINTS,
  type ApiResponse,
  type CreatePetRequest,
  type CreatePetResponse,
  type GetPetResponse,
  type UpdatePetRequest,
} from '../../backend/types/api';
import { parseQRCodeData } from './qrCodeService';

export class PetServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PetServiceError';
  }
}

const QR_DEEP_LINK_PREFIX = 'petchain://pet/';

function unwrapApiData<T>(payload: ApiResponse<T> | T): T {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    (payload as { success: boolean }).success === true &&
    'data' in payload
  ) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}

function toPetServiceError(error: unknown): PetServiceError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseBody = error.response?.data as
      | { message?: string; error?: { message?: string; code?: string }; code?: string }
      | undefined;

    const message =
      responseBody?.error?.message ||
      responseBody?.message ||
      error.message ||
      'Pet API request failed';

    const code =
      responseBody?.error?.code ||
      responseBody?.code ||
      (status ? `HTTP_${status}` : 'NETWORK_ERROR');

    return new PetServiceError(message, code, status, error.response?.data);
  }

  if (error instanceof PetServiceError) {
    return error;
  }

  if (error instanceof Error) {
    return new PetServiceError(error.message, 'UNKNOWN_ERROR');
  }

  return new PetServiceError('Unexpected pet service error', 'UNKNOWN_ERROR');
}

function replacePathParam(template: string, key: string, value: string): string {
  return template.replace(`:${key}`, encodeURIComponent(value));
}

function extractPetIdFromQrScan(scanData: string): string | null {
  const trimmed = scanData.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(QR_DEEP_LINK_PREFIX)) {
    const rawId = trimmed.slice(QR_DEEP_LINK_PREFIX.length).trim();
    return rawId ? decodeURIComponent(rawId) : null;
  }

  try {
    return parseQRCodeData(trimmed).petId;
  } catch {
    return null;
  }
}

export async function getAllPets(): Promise<GetPetResponse[]> {
  try {
    const response = await apiClient.get<ApiResponse<GetPetResponse[]> | GetPetResponse[]>(
      API_ENDPOINTS.PETS_LIST,
    );
    return unwrapApiData(response.data);
  } catch (error) {
    throw toPetServiceError(error);
  }
}

export async function getPetById(petId: string): Promise<GetPetResponse> {
  const normalizedPetId = petId.trim();
  if (!normalizedPetId) {
    throw new PetServiceError('Pet ID is required', 'INVALID_PET_ID');
  }

  try {
    const endpoint = replacePathParam(API_ENDPOINTS.PETS_GET, 'id', normalizedPetId);
    const response = await apiClient.get<ApiResponse<GetPetResponse> | GetPetResponse>(endpoint);
    return unwrapApiData(response.data);
  } catch (error) {
    throw toPetServiceError(error);
  }
}

export async function getPetByQRCode(qrCode: string): Promise<GetPetResponse> {
  const scannedValue = qrCode.trim();
  if (!scannedValue) {
    throw new PetServiceError('QR code is required', 'INVALID_QR_CODE');
  }

  try {
    const response = await apiClient.get<ApiResponse<GetPetResponse> | GetPetResponse>(
      `${API_ENDPOINTS.PETS_LIST}/qr/${encodeURIComponent(scannedValue)}`,
    );
    return unwrapApiData(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const petId = extractPetIdFromQrScan(scannedValue);
      if (petId) {
        return getPetById(petId);
      }
    }

    throw toPetServiceError(error);
  }
}

export async function createPet(data: CreatePetRequest): Promise<CreatePetResponse> {
  try {
    const response = await apiClient.post<ApiResponse<CreatePetResponse> | CreatePetResponse>(
      API_ENDPOINTS.PETS_CREATE,
      data,
    );
    return unwrapApiData(response.data);
  } catch (error) {
    throw toPetServiceError(error);
  }
}

export async function updatePet(
  petId: string,
  data: UpdatePetRequest,
): Promise<GetPetResponse> {
  const normalizedPetId = petId.trim();
  if (!normalizedPetId) {
    throw new PetServiceError('Pet ID is required', 'INVALID_PET_ID');
  }

  try {
    const endpoint = replacePathParam(API_ENDPOINTS.PETS_UPDATE, 'id', normalizedPetId);
    const response = await apiClient.put<ApiResponse<GetPetResponse> | GetPetResponse>(
      endpoint,
      data,
    );
    return unwrapApiData(response.data);
  } catch (error) {
    throw toPetServiceError(error);
  }
}

export async function deletePet(petId: string): Promise<void> {
  const normalizedPetId = petId.trim();
  if (!normalizedPetId) {
    throw new PetServiceError('Pet ID is required', 'INVALID_PET_ID');
  }

  try {
    const endpoint = replacePathParam(API_ENDPOINTS.PETS_DELETE, 'id', normalizedPetId);
    await apiClient.delete<ApiResponse<null> | null>(endpoint);
  } catch (error) {
    throw toPetServiceError(error);
  }
}

const petService = {
  getAllPets,
  getPetById,
  getPetByQRCode,
  createPet,
  updatePet,
  deletePet,
};

export default petService;
