/*
Conversion config example

{
  input: "ui/poi-tiles-icons.aseprite",
  output: "poi-tiles-icons.png",
  executable: "aseprite",
  args: "-b ${input} --scale 2 --sheet ${output}",
}
*/

const config = {
  conversions: [
    {
      input: "jersey15-font/Jersey15-Regular.ttf",
      output: "jersey15.ttf",
    },
    {
      input: "ui/bg-dark-1.aseprite",
      output: "bg.png",
      executable: "aseprite",
      args: "-b ${input} --sheet ${output}",
    },
    {
      input: "ui/emboss-button.aseprite",
      output: "emboss-button-{layer}.png",
      executable: "aseprite",
      args: "-b ${input} --split-layers --save-as ${output}",
    },
    {
      input: "ui/nine-slice-1.aseprite",
      output: "nine/one-{layer}.png",
      executable: "aseprite",
      args: "-b ${input} --split-layers --save-as ${output}",
      metadata: {
        type: "spritesheet",
        frameConfig: {
          frameWidth: 32,
          frameHeight: 32,
        },
      },
    },
  ],
};

export default config;
