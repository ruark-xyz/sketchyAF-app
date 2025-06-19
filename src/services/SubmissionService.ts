// Submission Service - Drawing submission management
// Handles creation, retrieval, and management of drawing submissions

import { supabase } from '../utils/supabase';
import { 
  Submission, 
  SubmissionWithUser, 
  SubmitDrawingRequest,
  ServiceResponse,
  GAME_CONSTANTS
} from '../types/game';

export class SubmissionService {
  /**
   * Submit a drawing for a game
   */
  static async submitDrawing(request: SubmitDrawingRequest): Promise<ServiceResponse<Submission>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Validate request
      const validation = this.validateSubmissionRequest(request);
      if (!validation.success) {
        return validation;
      }

      // Check if user is a participant in the game
      const { data: participant, error: participantError } = await supabase
        .from('game_participants')
        .select('id')
        .eq('game_id', request.game_id)
        .eq('user_id', user.id)
        .is('left_at', null)
        .single();

      if (participantError || !participant) {
        return { success: false, error: 'Not a participant in this game', code: 'NOT_PARTICIPANT' };
      }

      // Check if game is in drawing phase
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status')
        .eq('id', request.game_id)
        .single();

      if (gameError || !game) {
        return { success: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      if (game.status !== 'drawing') {
        return { success: false, error: 'Game is not in drawing phase', code: 'INVALID_STATUS' };
      }

      const submissionData = {
        game_id: request.game_id,
        user_id: user.id,
        drawing_data: request.drawing_data,
        drawing_url: request.drawing_url,
        drawing_thumbnail_url: request.drawing_thumbnail_url,
        canvas_width: request.canvas_width,
        canvas_height: request.canvas_height,
        element_count: request.element_count,
        drawing_time_seconds: request.drawing_time_seconds,
      };

      // Use upsert to allow updating submissions during drawing phase
      const { data, error } = await supabase
        .from('submissions')
        .upsert(submissionData, { 
          onConflict: 'game_id,user_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting drawing:', error);
        return { success: false, error: 'Failed to submit drawing', code: 'DATABASE_ERROR' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error submitting drawing:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get all submissions for a game
   */
  static async getGameSubmissions(gameId: string): Promise<ServiceResponse<SubmissionWithUser[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Verify user is a participant in the game
      const { data: participant, error: participantError } = await supabase
        .from('game_participants')
        .select('id')
        .eq('game_id', gameId)
        .eq('user_id', user.id)
        .is('left_at', null)
        .single();

      if (participantError || !participant) {
        return { success: false, error: 'Not a participant in this game', code: 'NOT_PARTICIPANT' };
      }

      // Get submissions with user details
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          users!inner(username, avatar_url)
        `)
        .eq('game_id', gameId)
        .order('submitted_at');

      if (error) {
        console.error('Error fetching game submissions:', error);
        return { success: false, error: 'Failed to fetch submissions', code: 'DATABASE_ERROR' };
      }

      // Transform data to include user details
      const submissionsWithUser: SubmissionWithUser[] = (data || []).map(submission => ({
        ...submission,
        username: submission.users.username,
        avatar_url: submission.users.avatar_url,
      }));

      return { success: true, data: submissionsWithUser };
    } catch (error) {
      console.error('Unexpected error fetching submissions:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get user's submission for a specific game
   */
  static async getUserSubmission(gameId: string): Promise<ServiceResponse<Submission | null>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching user submission:', error);
        return { success: false, error: 'Failed to fetch submission', code: 'DATABASE_ERROR' };
      }

      return { success: true, data: data || null };
    } catch (error) {
      console.error('Unexpected error fetching user submission:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Delete a submission (only during drawing phase)
   */
  static async deleteSubmission(gameId: string): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Check if game is still in drawing phase
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        return { success: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      if (game.status !== 'drawing') {
        return { success: false, error: 'Cannot delete submission after drawing phase', code: 'INVALID_STATUS' };
      }

      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('game_id', gameId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting submission:', error);
        return { success: false, error: 'Failed to delete submission', code: 'DATABASE_ERROR' };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error deleting submission:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get submission statistics for a game
   */
  static async getSubmissionStats(gameId: string): Promise<ServiceResponse<{
    total_submissions: number;
    total_participants: number;
    participation_rate: number;
    average_elements: number;
    average_drawing_time: number;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Get submission stats
      const { data: submissionStats, error: submissionError } = await supabase
        .from('submissions')
        .select('element_count, drawing_time_seconds')
        .eq('game_id', gameId);

      if (submissionError) {
        console.error('Error fetching submission stats:', submissionError);
        return { success: false, error: 'Failed to fetch submission statistics', code: 'DATABASE_ERROR' };
      }

      // Get participant count
      const { count: participantCount, error: participantError } = await supabase
        .from('game_participants')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId)
        .is('left_at', null);

      if (participantError) {
        console.error('Error fetching participant count:', participantError);
        return { success: false, error: 'Failed to fetch participant count', code: 'DATABASE_ERROR' };
      }

      // Calculate statistics
      const totalSubmissions = submissionStats?.length || 0;
      const totalParticipants = participantCount || 0;
      const participationRate = totalParticipants > 0 ? (totalSubmissions / totalParticipants) * 100 : 0;
      
      let averageElements = 0;
      let averageDrawingTime = 0;
      
      if (totalSubmissions > 0) {
        const totalElements = submissionStats.reduce((sum, stat) => sum + (stat.element_count || 0), 0);
        const totalDrawingTime = submissionStats.reduce((sum, stat) => sum + (stat.drawing_time_seconds || 0), 0);
        
        averageElements = totalElements / totalSubmissions;
        averageDrawingTime = totalDrawingTime / totalSubmissions;
      }

      return { 
        success: true, 
        data: {
          total_submissions: totalSubmissions,
          total_participants: totalParticipants,
          participation_rate: participationRate,
          average_elements: averageElements,
          average_drawing_time: averageDrawingTime
        }
      };
    } catch (error) {
      console.error('Unexpected error fetching submission stats:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Validate submission request
   */
  private static validateSubmissionRequest(request: SubmitDrawingRequest): ServiceResponse<void> {
    if (!request.game_id) {
      return { success: false, error: 'Game ID is required', code: 'VALIDATION_ERROR' };
    }

    if (!request.drawing_data) {
      return { success: false, error: 'Drawing data is required', code: 'VALIDATION_ERROR' };
    }

    // Check if drawing data is valid JSON
    try {
      if (typeof request.drawing_data === 'string') {
        JSON.parse(request.drawing_data);
      }
    } catch (error) {
      return { success: false, error: 'Invalid drawing data format', code: 'VALIDATION_ERROR' };
    }

    return { success: true };
  }
}