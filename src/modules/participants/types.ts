/**
 * PARTICIPANTS MODULE - Type Definitions
 */

export interface Participant {
  id: string;
  tripId: string;
  name: string;
  avatarColor?: string; // Hex color for UI
  createdAt: string;
}

export interface CreateParticipantInput {
  tripId: string;
  name: string;
  avatarColor?: string;
}

export interface UpdateParticipantInput {
  name?: string;
  avatarColor?: string;
}
