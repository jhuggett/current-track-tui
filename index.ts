import { BunShell, gray, green, white } from "@jhuggett/terminal";
import { within } from "@jhuggett/terminal/bounds/bounds";
import { Player } from "./player";

const shell = new BunShell();
shell.showCursor(false);
shell.clear();

const player = new Player(shell);

await player.getPlayerState();
await player.getCurrentTrackInformation();
await player.getProgress();

const root = shell.rootElement;

shell.onWindowResize(() => {
  shell.invalidateCachedSize();
  shell.clear();
  root.recalculateBounds();
  shell.render();
});

let stopProgram = false;

try {
  const container = root.createChildElement(
    () => within(root, { paddingLeft: 2, paddingTop: 1 }),
    {}
  );

  container.renderer = ({ cursor }) => {
    cursor.write(`${player.currentTrackName}`, {
      foregroundColor: player.currentState === "playing" ? green() : gray(),
    });
    cursor.newLine();
    cursor.write(
      `${player.currentTrackAlbumName} - ${player.currentTrackArtistName}`,
      {
        foregroundColor:
          player.currentState === "playing" ? green(0.7) : gray(),
      }
    );

    cursor.newLine();
    if (player.currentTrackDuration && player.currentTrackProgress) {
      cursor.write(
        `${
          player.currentTrackProgress && Math.floor(player.currentTrackProgress)
        }s/${
          player.currentTrackDuration && Math.floor(player.currentTrackDuration)
        }s`,
        {
          foregroundColor:
            player.currentState === "playing" ? white(0.75) : gray(),
        }
      );
    }
  };

  player.onProgressChange.subscribe(() => {
    container.render();
    shell.render();
  });

  container.focus();

  container.on("Space", () => {
    if (player.currentState === "paused") {
      player.start().then(() => {
        container.render();
        shell.render();
      });
    } else {
      player.stop().then(() => {
        container.render();
        shell.render();
      });
    }
  });

  container.on("Arrow Right", () => {
    player.next();
  });

  container.on("Arrow Left", () => {
    player.previous();
  });

  container.on("q", () => {
    stopProgram = true;
  });

  container.on("Escape", () => {
    stopProgram = true;
  });

  while (!stopProgram) {
    container.render();
    shell.render();
    await shell.userInteraction();
  }
} catch (error) {
  console.error(error);
}

shell.disableMouseTracking();
shell.showCursor(true);

process.exit();
