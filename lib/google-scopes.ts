export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const GOOGLE_DRIVE_METADATA_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";

export const GOOGLE_WORKSPACE_SCOPES = [
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_DRIVE_METADATA_SCOPE
].join(" ");
