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
      input: "handjet-font/static/Handjet-Medium.ttf",
      output: "handjet-font.ttf",
    },
    {
      input: "ui/bg-dark-1.aseprite",
      output: "bg.png",
      executable: "aseprite",
      args: "-b ${input} --sheet ${output}",
    },
    {
      input: "ui/emboss-1.aseprite",
      output: "emboss.png",
      executable: "aseprite",
      args: "-b ${input} --sheet ${output}",
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
