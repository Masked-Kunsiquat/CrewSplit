/**
 * SYNC MODULE - Type Definitions
 */

export interface SyncAdapter {
  generateShareLink: (tripId: string) => Promise<string>;
  joinTrip: (shareCode: string) => Promise<string>; // Returns tripId
  sync: (tripId: string) => Promise<void>;
  disconnect: (tripId: string) => Promise<void>;
}

export interface SyncConflict {
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: string;
  remoteTimestamp: string;
}

// TODO: SYNC IMPLEMENTOR defines resolution strategy
