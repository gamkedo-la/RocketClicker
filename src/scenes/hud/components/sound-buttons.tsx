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
      onPointerdown={() => {
        if (gameState.state.get().music_volume.get() === 1) {
          gameState.state.get().music_volume.set(0);
          musicButtonImage.setFrame("music-button#2");
        } else {
          gameState.state.get().music_volume.set(1);
          musicButtonImage.setFrame("music-button#0");
        }
      }}
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
      onPointerdown={() => {
        if (gameState.state.get().sound_volume.get() === 1) {
          gameState.state.get().sound_volume.set(0);
          soundButtonImage.setFrame("sound-button#2");
        } else {
          gameState.state.get().sound_volume.set(1);
          soundButtonImage.setFrame("sound-button#0");
        }
      }}
    />
  );

  const soundButton = (
    <Flex containerElement={soundButtonContainer}>{soundButtonImage}</Flex>
  );

  const motionButtonImage = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="motion-button#2"
      width={25}
      height={25}
    />
  );

  const motionButtonContainer: Phaser.GameObjects.Container = (
    <container
      interactive
      onPointerdown={() => {
        if (gameState.state.get().motion_enabled.get() === 1) {
          gameState.state.get().motion_enabled.set(0);
          motionButtonImage.setFrame("motion-button#0");
        } else {
          gameState.state.get().motion_enabled.set(1);
          motionButtonImage.setFrame("motion-button#2");
        }
      }}
    />
  );

  const motionButton = (
    <Flex containerElement={motionButtonContainer}>{motionButtonImage}</Flex>
  );

  return (
    <Flex padding={[0, 10, 0, 0]} margin={5}>
      {musicButton}
      {soundButton}
      {motionButton}
    </Flex>
  );
};
