export interface AsciiConfig {
  width: number; // Number of characters wide
  contrast: number; // 0.5 to 2.0
  inverted: boolean;
  color: boolean;
}

export enum PlayerState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
}
