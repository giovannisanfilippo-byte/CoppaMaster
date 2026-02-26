import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export interface ClubData {
  name: string;
  logo_url?: string;
  colors?: string;
  user_id: string;
}

export interface PlayerData {
  team_id: string;
  name: string;
  number: number;
  player_external_id: string;
  user_id: string;
}

/**
 * Uploads a club logo to Supabase Storage.
 */
export async function uploadClubLogo(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `logos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('club-logos')
    .upload(filePath, file);

  if (uploadError) {
    if (uploadError.message === 'Bucket not found') {
      throw new Error('Il bucket "club-logos" non esiste su Supabase. Crealo nella sezione Storage della dashboard.');
    }
    console.error('Error uploading logo:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('club-logos')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Saves a club and its players to the database.
 */
export async function saveClub(club: ClubData, players: PlayerData[]) {
  // 1. Insert the club
  const { data: clubData, error: clubError } = await supabase
    .from('clubs')
    .insert([club])
    .select()
    .single();

  if (clubError) {
    console.error('Error saving club:', clubError);
    throw clubError;
  }

  // 2. Insert the players linked to the new club ID
  if (players.length > 0) {
    const playersWithTeamId = players.map(p => ({
      ...p,
      team_id: clubData.id,
      user_id: club.user_id
    }));

    const { error: playersError } = await supabase
      .from('players')
      .insert(playersWithTeamId);

    if (playersError) {
      console.error('Error saving players:', playersError);
      throw playersError;
    }
  }

  return clubData;
}

/**
 * Fetches all clubs for the logged-in user.
 */
export async function fetchClubs(userId: string) {
  const { data, error } = await supabase
    .from('clubs')
    .select(`
      *,
      players (*)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching clubs:', error);
    throw error;
  }

  return data;
}

/**
 * Saves a tournament to the database.
 */
export async function saveTournament(tournament: any) {
  const { data, error } = await supabase
    .from('tournaments')
    .insert([tournament])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Saves multiple tournament teams (junction table).
 */
export async function saveTournamentTeams(tournamentId: string, teamIds: string[], userId: string) {
  const records = teamIds.map(teamId => ({
    tournament_id: tournamentId,
    club_id: teamId
  }));
  const { error } = await supabase
    .from('tournament_teams')
    .insert(records);
  if (error) throw error;
}

/**
 * Saves multiple matches to the database.
 */
export async function saveMatches(matches: any[]) {
  const { data, error } = await supabase
    .from('matches')
    .insert(matches)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Updates a match score and status.
 */
export async function updateMatchScoreDB(matchId: string, scoreA: number, scoreB: number, status: string = 'finished') {
  const { error } = await supabase
    .from('matches')
    .update({ score_a: scoreA, score_b: scoreB, status })
    .eq('id', matchId);

  if (error) throw error;
}

/**
 * Saves a match event (goal/assist).
 */
export async function saveMatchEventDB(event: any) {
  const { data, error } = await supabase
    .from('match_events')
    .insert([event])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a match event.
 */
export async function deleteMatchEventDB(eventId: string) {
  const { error } = await supabase
    .from('match_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

/**
 * Fetches all tournaments for a user.
 */
export async function fetchTournaments(userId: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetches all data for a specific tournament.
 */
export async function fetchTournamentData(tournamentId: string) {
  const [teamsRes, matchesRes, eventsRes] = await Promise.all([
    supabase.from('tournament_teams').select('clubs(*, players(*))').eq('tournament_id', tournamentId),
    supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('round', { ascending: true }),
    supabase.from('match_events').select('*').in('match_id', 
      (await supabase.from('matches').select('id').eq('tournament_id', tournamentId)).data?.map(m => m.id) || []
    )
  ]);

  if (teamsRes.error) throw teamsRes.error;
  if (matchesRes.error) throw matchesRes.error;
  if (eventsRes.error) throw eventsRes.error;

  return {
    teams: teamsRes.data.map((tt: any) => tt.clubs),
    matches: matchesRes.data,
    events: eventsRes.data
  };
}

/**
 * Deletes a tournament and all related data (cascade should handle most, but explicit for safety if needed).
 */
export async function deleteTournamentDB(id: string) {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Saves a single team to the database.
 */
export async function saveTeamDB(team: any) {
  const { data, error } = await supabase
    .from('clubs')
    .insert([team])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a team.
 */
export async function deleteTeamDB(id: string) {
  const { error } = await supabase
    .from('clubs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Checks if a player with the given player_external_id already exists and returns the club name.
 */
export async function checkPlayerExistence(playerExternalId: string) {
  const { data, error } = await supabase
    .from('players')
    .select(`
      id,
      clubs (name)
    `)
    .eq('player_external_id', playerExternalId)
    .maybeSingle();

  if (error) {
    console.error('Error checking player existence:', error);
    throw error;
  }

  if (data) {
    return (data.clubs as any)?.name || 'un altro club';
  }

  return null;
}

/**
 * Saves a single player.
 */
export async function savePlayerDB(player: any) {
  const { data, error } = await supabase
    .from('players')
    .insert([player])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a player.
 */
export async function updatePlayerDB(id: string, updates: any) {
  const { error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

/**
 * Deletes a player.
 */
export async function deletePlayerDB(id: string) {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
