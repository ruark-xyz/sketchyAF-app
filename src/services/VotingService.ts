// Voting Service - Vote management and results calculation
// Handles vote casting, retrieval, and game results calculation

import { supabase } from '../utils/supabase';
import { 
  Vote, 
  VoteWithDetails, 
  CastVoteRequest, 
  GameResults,
  ServiceResponse
} from '../types/game';

export class VotingService {
  /**
   * Cast a vote for a submission
   */
  static async castVote(request: CastVoteRequest): Promise<ServiceResponse<Vote>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Validate request
      if (!request.game_id || !request.submission_id) {
        return { success: false, error: 'Game ID and submission ID are required', code: 'VALIDATION_ERROR' };
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

      // Check if game is in voting phase
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status')
        .eq('id', request.game_id)
        .single();

      if (gameError || !game) {
        return { success: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      if (game.status !== 'voting') {
        return { success: false, error: 'Game is not in voting phase', code: 'INVALID_STATUS' };
      }

      // Check if user has already voted
      const { data: existingVote, error: voteError } = await supabase
        .from('votes')
        .select('id')
        .eq('game_id', request.game_id)
        .eq('voter_id', user.id)
        .single();

      if (existingVote) {
        return { success: false, error: 'Already voted in this game', code: 'ALREADY_VOTED' };
      }

      // Check if submission exists and belongs to the game
      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .select('id, user_id')
        .eq('id', request.submission_id)
        .eq('game_id', request.game_id)
        .single();

      if (submissionError || !submission) {
        return { success: false, error: 'Submission not found in this game', code: 'INVALID_SUBMISSION' };
      }

      // Prevent voting for own submission
      if (submission.user_id === user.id) {
        return { success: false, error: 'Cannot vote for your own submission', code: 'INVALID_SUBMISSION' };
      }

      // Cast vote
      const voteData = {
        game_id: request.game_id,
        voter_id: user.id,
        submission_id: request.submission_id,
      };

      const { data, error } = await supabase
        .from('votes')
        .insert(voteData)
        .select()
        .single();

      if (error) {
        console.error('Error casting vote:', error);
        return { success: false, error: 'Failed to cast vote', code: 'DATABASE_ERROR' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error casting vote:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get all votes for a game
   */
  static async getGameVotes(gameId: string): Promise<ServiceResponse<VoteWithDetails[]>> {
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

      // Check if game is in results or completed phase
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        return { success: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      if (!['results', 'completed'].includes(game.status)) {
        return { success: false, error: 'Vote details are only available after voting is complete', code: 'INVALID_STATUS' };
      }

      // Get votes with user details
      const { data, error } = await supabase
        .from('votes')
        .select(`
          *,
          voters:voter_id(username),
          submissions:submission_id(user_id, users:user_id(username))
        `)
        .eq('game_id', gameId);

      if (error) {
        console.error('Error fetching game votes:', error);
        return { success: false, error: 'Failed to fetch votes', code: 'DATABASE_ERROR' };
      }

      // Transform data to include user details
      const votesWithDetails: VoteWithDetails[] = (data || []).map(vote => ({
        ...vote,
        voter_username: vote.voters.username,
        submission_user_id: vote.submissions.user_id,
        submission_username: vote.submissions.users.username,
      }));

      return { success: true, data: votesWithDetails };
    } catch (error) {
      console.error('Unexpected error fetching votes:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get user's vote for a game
   */
  static async getUserVote(gameId: string): Promise<ServiceResponse<Vote | null>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('game_id', gameId)
        .eq('voter_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching user vote:', error);
        return { success: false, error: 'Failed to fetch vote', code: 'DATABASE_ERROR' };
      }

      return { success: true, data: data || null };
    } catch (error) {
      console.error('Unexpected error fetching user vote:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Calculate and get game results
   */
  static async getGameResults(gameId: string): Promise<ServiceResponse<GameResults>> {
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

      // Check if game is in results or completed phase
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status, winner_id')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        return { success: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      if (!['results', 'completed'].includes(game.status)) {
        return { success: false, error: 'Results are only available after voting is complete', code: 'INVALID_STATUS' };
      }

      // Call the database function to calculate results if needed
      if (!game.winner_id) {
        await supabase.rpc('calculate_game_results', { game_uuid: gameId });
      }

      // Get results data
      const { data: resultData, error: resultError } = await supabase.rpc('calculate_game_results', {
        game_uuid: gameId
      });

      if (resultError) {
        console.error('Error calculating game results:', resultError);
        return { success: false, error: 'Failed to calculate game results', code: 'DATABASE_ERROR' };
      }

      // Get total votes
      const { count: totalVotes, error: voteError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId);

      if (voteError) {
        console.error('Error counting votes:', voteError);
        return { success: false, error: 'Failed to count votes', code: 'DATABASE_ERROR' };
      }

      // Get participant count
      const { count: participantCount, error: countError } = await supabase
        .from('game_participants')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId)
        .is('left_at', null);

      if (countError) {
        console.error('Error counting participants:', countError);
        return { success: false, error: 'Failed to count participants', code: 'DATABASE_ERROR' };
      }

      // Get submission count
      const { count: submissionCount, error: subCountError } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId);

      if (subCountError) {
        console.error('Error counting submissions:', subCountError);
        return { success: false, error: 'Failed to count submissions', code: 'DATABASE_ERROR' };
      }

      // Find winner
      const winner = resultData.find(result => result.placement === 1);
      if (!winner) {
        return { success: false, error: 'No winner found', code: 'DATABASE_ERROR' };
      }

      // Format results
      const gameResults: GameResults = {
        game_id: gameId,
        submissions: resultData.map(result => ({
          submission_id: result.submission_id,
          user_id: result.user_id,
          username: result.username,
          vote_count: result.vote_count,
          placement: result.placement
        })),
        winner: {
          user_id: winner.user_id,
          username: winner.username,
          submission_id: winner.submission_id
        },
        total_votes: totalVotes || 0,
        participation_rate: participantCount ? (submissionCount / participantCount) * 100 : 0
      };

      return { success: true, data: gameResults };
    } catch (error) {
      console.error('Unexpected error getting game results:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }
}