// Participant matching logic
import type { ParticipantWithEmail, MatchResult, RoundId } from '../types';
import { normalizeEmail } from '../utils';

/**
 * Match participants from conflict list with current meeting participants
 */
export function matchParticipants(
  conflictEmails: Set<string>, // already normalized
  participants: ParticipantWithEmail[]
): MatchResult {
  const matched: ParticipantWithEmail[] = [];
  const foundEmails = new Set<string>();
  const noEmail: ParticipantWithEmail[] = [];

  for (const participant of participants) {
    if (!participant.email) {
      // Participant doesn't have email - needs fallback selection
      noEmail.push(participant);
      continue;
    }

    const normalizedEmail = normalizeEmail(participant.email);
    
    if (conflictEmails.has(normalizedEmail)) {
      matched.push(participant);
      foundEmails.add(normalizedEmail);
    }
  }

  // Find emails from conflict list that weren't found in meeting
  const notFound: string[] = [];
  for (const email of conflictEmails) {
    if (!foundEmails.has(email)) {
      notFound.push(email);
    }
  }

  return {
    matched,
    notFound,
    noEmail,
  };
}

/**
 * Filter participants by display name (for fallback mode)
 */
export function filterByDisplayName(
  participants: ParticipantWithEmail[],
  searchTerm: string
): ParticipantWithEmail[] {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  return participants.filter(p =>
    p.displayName.toLowerCase().includes(normalizedSearch)
  );
}

/**
 * Get conflict emails for a specific round
 */
export function getConflictEmailsForRound(
  roundId: RoundId,
  parsedRounds: Map<RoundId, Set<string>>
): Set<string> {
  return parsedRounds.get(roundId) || new Set();
}
