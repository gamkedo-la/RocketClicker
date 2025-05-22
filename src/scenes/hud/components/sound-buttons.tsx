import { RESOURCES } from "@game/assets";
import { AbstractScene } from "../..";
import { Flex } from "../../../core/ui/Flex";

export const SoundButtons = ({ scene }: { scene: AbstractScene }) => {
  const gameState = scene.gameState;

  const musicButtonImage = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="music-button#0"
      width={25}
      height={25}
    />
  );

  const musicButtonContainer: Phaser.GameObjects.Container = (
    <container
      interactive
      onPointerout={() => {
        if (gameState.state.get().music_volume.get() === 1) {
          musicButtonImage.setFrame("music-button#0");
        } else {
          musicButtonImage.setFrame("music-button#2");
        }
      }}
      onPointerdown={() => {
        if (gameState.state.get().music_volume.get() === 1) {
          gameState.state.get().music_volume.set(0);
          musicButtonImage.setFrame("music-button#2");
        } else {
          gameState.state.get().music_volume.set(1);
          musicButtonImage.setFrame("music-button#0");
        }
      }}
      onPointerup={() => {}}
    />
  );

  const musicButton = (
    <Flex containerElement={musicButtonContainer}>{musicButtonImage}</Flex>
  );

  const soundButtonImage = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="sound-button#0"
      width={25}
      height={25}
    />
  );

  const soundButtonContainer: Phaser.GameObjects.Container = (
    <container
      interactive
      onPointerout={() => {
        if (gameState.state.get().sound_volume.get() === 1) {
          soundButtonImage.setFrame("sound-button#0");
        } else {
          soundButtonImage.setFrame("sound-button#2");
        }
      }}
      onPointerdown={() => {
        if (gameState.state.get().sound_volume.get() === 1) {
          gameState.state.get().sound_volume.set(0);
          soundButtonImage.setFrame("sound-button#2");
        } else {
          gameState.state.get().sound_volume.set(1);
          soundButtonImage.setFrame("sound-button#0");
        }
      }}
      onPointerup={() => {}}
    />
  );

  const soundButton = (
    <Flex containerElement={soundButtonContainer}>{soundButtonImage}</Flex>
  );

  return (
    <Flex padding={[0, 10, 0, 0]} margin={5}>
      {musicButton}
      {soundButton}
    </Flex>
  );
};
