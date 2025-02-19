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
      input: "handjet-font/static/Handjet-Thin.ttf",
      output: "handjet-font.ttf",
    },
    {
      input: "ui/nine-slice-1.aseprite",
      output: "nine/one.png",
      executable: "aseprite",
      args: "-b ${input} --save-as ${output}",
    },
  ],
};

export default config;
