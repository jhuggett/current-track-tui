import { BunShell } from "@jhuggett/terminal";
import { SubscribableEvent } from "@jhuggett/terminal/subscribable-event";
import { exec } from "child_process";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const execute = async (
  command: string
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) throw error;
      resolve({
        stdout,
        stderr,
      });
    });
  });
};

export class Player {
  constructor(public shell: BunShell) {}

  async poll(update: () => void) {
    // while (true) {
    //   await sleep(500);
    //   await this.getPlayerState();
    //   update();
    // }
  }

  async start() {
    await execute(`osascript -e 'tell application "Music" to play'`);
    await this.getPlayerState();
  }

  async stop() {
    await execute(`osascript -e 'tell application "Music" to pause'`);
    await this.getPlayerState();
  }

  async next() {
    await execute(`osascript -e 'tell application "Music" to next track'`);
    await this.getCurrentTrackInformation();
    await this.getProgress();
  }

  async previous() {
    await execute(`osascript -e 'tell application "Music" to back track'`);
    await this.getCurrentTrackInformation();
    await this.getProgress();
  }

  currentTrackDuration?: number;
  async getCurrentTrackDuration() {
    const result = await execute(
      `osascript -e 'tell application "Music" to get duration of current track'`
    );

    this.currentTrackDuration = parseFloat(result.stdout.trim());
  }

  currentTrackName?: string;
  async getCurrentTrackName() {
    const result = await execute(
      `osascript -e 'tell application "Music" to get name of current track'`
    );

    this.currentTrackName = result.stdout.trim();
  }

  async getCurrentTrackInformation() {
    await this.getCurrentTrackDuration();
    await this.getCurrentTrackName();
  }

  onProgressChange: SubscribableEvent<number> = new SubscribableEvent();
  currentTrackProgress?: number;
  async getProgress() {
    const result = await execute(
      `osascript -e 'tell application "Music" to get player position'`
    );

    const state = result.stdout.trim();

    this.currentTrackProgress = parseFloat(state);

    this.onProgressChange.emit(this.currentTrackProgress);
  }

  async followProgress() {
    if (!this.currentTrackProgress) {
      await this.getCurrentTrackInformation();
    }
    while (this.currentState === "playing") {
      const lastProgress = this.currentTrackProgress;
      await this.getProgress();
      const isNewTrack =
        (lastProgress &&
          this.currentTrackProgress &&
          lastProgress > this.currentTrackProgress) ||
        (lastProgress && !this.currentTrackProgress);

      if (isNewTrack) {
        await this.getCurrentTrackInformation();
      }

      await sleep(1000);
    }
  }

  currentState: "playing" | "paused" = "paused";
  async getPlayerState(): Promise<"playing" | "paused"> {
    const result = await execute(
      `osascript -e 'tell application "Music" to get player state'`
    );

    const state = result.stdout.trim();

    this.currentState = state as "playing" | "paused";

    if (this.currentState === "playing") {
      this.followProgress();
    }

    return this.currentState;
  }
}
