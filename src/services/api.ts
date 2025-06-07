/**
 * API service layer for handling data operations
 * This abstracts data fetching logic and makes it easy to switch between mock and real APIs
 */

import { LeaderboardEntry, TopDrawing, BoosterPack, User } from '../types';

// Mock data imports
import { 
  leaderboardData, 
  topDrawingsData, 
  boosterPacks,
  publicProfileData,
  userGameStats,
  userSubmissions,
  userAchievements
} from '../data/mockData';

// API Configuration
const API_CONFIG = {
  baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  useMockData: process.env.VITE_USE_MOCK_DATA !== 'false', // Default to true for development
};

// Generic API response wrapper
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Simulated API delay for realistic testing
const simulateDelay = (ms: number = 500): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export class ApiService {
  // Leaderboard operations
  static async getLeaderboard(): Promise<ApiResponse<LeaderboardEntry[]>> {
    if (API_CONFIG.useMockData) {
      await simulateDelay();
      return {
        data: leaderboardData,
        success: true,
      };
    }
    
    // TODO: Implement real API call
    throw new Error('Real API not implemented yet');
  }

  // Top drawings operations
  static async getTopDrawings(): Promise<ApiResponse<TopDrawing[]>> {
    if (API_CONFIG.useMockData) {
      await simulateDelay();
      return {
        data: topDrawingsData,
        success: true,
      };
    }
    
    // TODO: Implement real API call
    throw new Error('Real API not implemented yet');
  }

  static async getDrawingById(id: number): Promise<ApiResponse<TopDrawing | null>> {
    if (API_CONFIG.useMockData) {
      await simulateDelay();
      const drawing = topDrawingsData.find(d => d.id === id);
      return {
        data: drawing || null,
        success: true,
      };
    }
    
    // TODO: Implement real API call
    throw new Error('Real API not implemented yet');
  }

  // Booster pack operations
  static async getBoosterPacks(): Promise<ApiResponse<BoosterPack[]>> {
    if (API_CONFIG.useMockData) {
      await simulateDelay();
      return {
        data: boosterPacks,
        success: true,
      };
    }
    
    // TODO: Implement real API call
    throw new Error('Real API not implemented yet');
  }

  static async getBoosterPackById(id: string): Promise<ApiResponse<BoosterPack | null>> {
    if (API_CONFIG.useMockData) {
      await simulateDelay();
      const pack = boosterPacks.find(p => p.id === id);
      return {
        data: pack || null,
        success: true,
      };
    }
    
    // TODO: Implement real API call
    throw new Error('Real API not implemented yet');
  }

  // User operations
  static async getUserProfile(username: string): Promise<ApiResponse<any>> {
    if (API_CONFIG.useMockData) {
      await simulateDelay();
      
      // For mock data, return the same profile for any username
      return {
        data: {
          profile: publicProfileData,
          stats: userGameStats,
          submissions: userSubmissions,
          achievements: userAchievements,
        },
        success: true,
      };
    }
    
    // TODO: Implement real API call
    throw new Error('Real API not implemented yet');
  }

  // Email signup operations
  static async submitEmailSignup(email: string): Promise<ApiResponse<{ message: string }>> {
    if (API_CONFIG.useMockData) {
      await simulateDelay();
      
      // Store in localStorage for mock
      const existingEmails = JSON.parse(localStorage.getItem('signupEmails') || '[]');
      const updatedEmails = [...existingEmails, { 
        email, 
        timestamp: new Date().toISOString() 
      }];
      localStorage.setItem('signupEmails', JSON.stringify(updatedEmails));
      
      return {
        data: { message: 'Email signup successful' },
        success: true,
      };
    }
    
    // TODO: Implement real API call
    throw new Error('Real API not implemented yet');
  }
}