/*
ase-parser

MIT License

Copyright (c) 2019 Ronin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

import * as zlib from "zlib";

// Define interfaces for the Aseprite parser
export namespace AsepriteTypes {
  export interface Palette {
    paletteSize: number;
    firstColor: number;
    lastColor: number;
    colors: Array<Color>;
    index?: number;
  }
  export interface Tileset {
    id: number;
    tileCount: number;
    tileWidth: number;
    tileHeight: number;
    name: string;
    externalFile?: {
      id: number;
      tilesetId: number;
    };
    rawTilesetData?: Buffer;
  }
  export interface Color {
    red: number;
    green: number;
    blue: number;
    alpha: number;
    name: string;
  }
  export interface Cel {
    layerIndex: number;
    xpos: number;
    ypos: number;
    opacity: number;
    celType: number;
    zIndex: number;
    link?: number;
    w: number;
    h: number;
    tilemapMetadata?: {
      bitsPerTile: number;
      bitmaskForTileId: number;
      bitmaskForXFlip: number;
      bitmaskForYFlip: number;
      bitmaskFor90CWRotation: number;
    };
    rawCelData: Buffer;
  }
  export interface Tag {
    name: string;
    from: number;
    to: number;
    animDirection: string;
    repeat: number;
    color: string;
  }
  export interface Layer {
    flags: LayerFlags;
    type: number;
    layerChildLevel: number;
    blendMode: number;
    opacity: number;
    name: string;
    tilesetIndex?: number;
  }
  export interface Slice {
    flags: number;
    keys: SliceKey[];
    name: string;
  }
  export interface SliceKey {
    frameNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
    patch?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    pivot?: {
      x: number;
      y: number;
    };
  }
  export interface Frame {
    bytesInFrame: number;
    frameDuration: number;
    numChunks: number;
    cels: Array<Cel>;
  }
  export interface ColorProfile {
    type: string;
    flag: number;
    fGamma: number;
    icc?: Buffer;
  }
  export interface LayerFlags {
    visible: boolean;
    editable: boolean;
    lockMovement: boolean;
    background: boolean;
    preferLinkedCels: boolean;
    collapsedGroup: boolean;
    reference: boolean;
  }
}

/**
 * Aseprite Class to consume an Aseprite file and get information from it
 */
class Aseprite {
  frames: AsepriteTypes.Frame[] = [];
  layers: AsepriteTypes.Layer[] = [];
  slices: AsepriteTypes.Slice[] = [];
  tags: AsepriteTypes.Tag[] = [];
  tilesets: AsepriteTypes.Tileset[] = [];
  palette: AsepriteTypes.Palette;
  colorProfile: AsepriteTypes.ColorProfile;
  name: string;
  paletteIndex: number;
  colorDepth: number;
  pixelRatio: string;
  numColors: number;
  fileSize: number;
  width: number;
  height: number;
  numFrames: number;
  private _offset: number = 0;
  private _buffer: Buffer;

  /**
   * Map of the possible flag values for a Layer
   */
  static LAYER_FLAG_MAP = {
    visible: 0b1,
    editable: 0b10,
    lockMovement: 0b100,
    background: 0b1000,
    preferLinkedCels: 0b10000,
    collapsedGroup: 0b100000,
    reference: 0b1000000,
  };

  constructor(buffer: Buffer, name: string) {
    this._buffer = buffer;
    this.name = name;
  }

  /**
   * Reads the next byte (8-bit unsigned) value in the buffer
   *
   * @returns {number}
   */
  readNextByte(): number {
    const nextByte = this._buffer.readUInt8(this._offset);
    this._offset += 1;
    return nextByte;
  }

  /**
   * Reads a byte (8-bit unsigned) value in the buffer at a specific location
   *
   * @param {number} offset - Offset location in the buffer
   * @returns {number}
   */
  readByte(offset: number): number {
    return this._buffer.readUInt8(offset);
  }

  /**
   * Reads the next word (16-bit unsigned) value in the buffer
   *
   * @returns {number}
   */
  readNextWord(): number {
    const word = this._buffer.readUInt16LE(this._offset);
    this._offset += 2;
    return word;
  }

  /**
   * Reads a word (16-bit unsigned) value at a specific location
   *
   * @param {number} offset - Offset location in the buffer
   * @returns {number}
   */
  readWord(offset: number): number {
    return this._buffer.readUInt16LE(offset);
  }

  /**
   * Reads the next short (16-bit signed) value in the buffer
   *
   * @returns {number}
   */
  readNextShort(): number {
    const short = this._buffer.readInt16LE(this._offset);
    this._offset += 2;
    return short;
  }

  /**
   * Reads a short (16-bit signed) value at a specific location
   *
   * @param {number} offset - Offset location in the buffer
   * @returns {number}
   */
  readShort(offset: number): number {
    return this._buffer.readInt16LE(offset);
  }

  /**
   * Reads the next DWord (32-bit unsigned) value from the buffer
   *
   * @returns {number}
   */
  readNextDWord(): number {
    const dWord = this._buffer.readUInt32LE(this._offset);
    this._offset += 4;
    return dWord;
  }

  /**
   * Reads a DWord (32-bit unsigned) value at a specific location
   *
   * @param {number} offset - Offset location in the buffer
   * @returns {number}
   */
  readDWord(offset: number): number {
    return this._buffer.readUInt32LE(offset);
  }

  /**
   * Reads the next long (32-bit signed) value from the buffer
   *
   * @returns {number}
   */
  readNextLong(): number {
    const long = this._buffer.readInt32LE(this._offset);
    this._offset += 4;
    return long;
  }

  /**
   * Reads a long (32-bit signed) value at a specific location
   *
   * @param {number} offset - Offset location in the buffer
   * @returns {number}
   */
  readLong(offset: number): number {
    return this._buffer.readInt32LE(offset);
  }

  /**
   * Reads the next fixed (32-bit fixed point 16.16) value from the buffer
   *
   * @returns {number}
   */
  readNextFixed(): number {
    const fixed = this._buffer.readFloatLE(this._offset);
    this._offset += 4;
    return fixed;
  }

  /**
   * Reads a fixed (32-bit fixed point 16.16) value at a specific location
   * @param {number} offset - Offset location in the buffer
   * @returns {number}
   */
  readFixed(offset: number): number {
    return this._buffer.readFloatLE(offset);
  }

  /**
   * Reads the next numBytes bytes and creates a string from the buffer
   *
   * @param {number} numBytes - Number of bytes to read
   * @returns {string}
   */
  readNextBytes(numBytes: number): string {
    let strBuff = Buffer.alloc(numBytes);
    for (let i = 0; i < numBytes; i++) {
      strBuff.writeUInt8(this.readNextByte(), i);
    }
    return strBuff.toString();
  }

  /**
   * Copy the next numBytes bytes of the buffer into a new buffer
   *
   * @param {number} numBytes - Number of bytes to read
   * @returns {Buffer}
   */
  readNextRawBytes(numBytes: number): Buffer {
    let buff = Buffer.alloc(numBytes);
    for (let i = 0; i < numBytes; i++) {
      buff.writeUInt8(this.readNextByte(), i);
    }
    return buff;
  }

  /**
   * Create a new buffer with numBytes size, offset by a value, from a buffer
   *
   * @param {number} numBytes - Number of bytes to read
   * @param {Buffer} b - Buffer to read from
   * @param {number} offset - Offset value to start reading from
   * @returns {Buffer}
   */
  readRawBytes(numBytes: number, b: Buffer, offset: number): Buffer {
    let buff = Buffer.alloc(numBytes - offset);
    for (let i = 0; i < numBytes - offset; i++) {
      buff.writeUInt8(b.readUInt8(offset + i), i);
    }
    return buff;
  }

  /**
   * Reads the next word to get the length of the string, then reads the string
   * and returns it
   *
   * @returns {string}
   */
  readNextString(): string {
    const numBytes = this.readNextWord();
    return this.readNextBytes(numBytes);
  }

  /**
   * Skips a number of bytes in the buffer
   *
   * @param {number} numBytes - Number of bytes to skip
   */
  skipBytes(numBytes: number): void {
    this._offset += numBytes;
  }

  /**
   * Translates the listed flags for a layer into true/false values
   * dictating whether or not that flag is "on"(true) or "off"(false)
   *
   * @private
   * @param {number} flagValue Value of the layer flags
   * @returns {object} Map of the flags and if they are true or false
   */
  #translateFlags(flagValue: number): AsepriteTypes.LayerFlags {
    // Create an object to put the flags and their "toggle" (true/false)
    const translatedFlagMap: any = {};
    // Iterate through the flags and their binary value, use bitwise op
    // to see if the flag is present in the "layer flags" and add the
    // flag to the map with the accompanying "toggle"
    for (const flag in Aseprite.LAYER_FLAG_MAP) {
      translatedFlagMap[flag] =
        (flagValue &
          Aseprite.LAYER_FLAG_MAP[
            flag as keyof typeof Aseprite.LAYER_FLAG_MAP
          ]) ==
        Aseprite.LAYER_FLAG_MAP[flag as keyof typeof Aseprite.LAYER_FLAG_MAP];
    }
    return translatedFlagMap as AsepriteTypes.LayerFlags;
  }

  /**
   * Reads the 128-byte header of an Aseprite file and stores the information
   *
   * @returns {number} Number of frames in the file
   */
  readHeader(): number {
    this.fileSize = this.readNextDWord();
    // Consume the next word (16-bit unsigned) value in the buffer
    // to skip the "Magic number" (0xA5E0)
    this.readNextWord();
    this.numFrames = this.readNextWord();
    this.width = this.readNextWord();
    this.height = this.readNextWord();
    this.colorDepth = this.readNextWord();
    /**
     * Skip 14 bytes to account for:
     *  Dword - Layer opacity flag
     *  Word - deprecated speed (ms) between frame
     *  Dword - 0 value
     *  Dword - 0 value
     */
    this.skipBytes(14);
    this.paletteIndex = this.readNextByte();
    // Skip 3 bytes for empty data
    this.skipBytes(3);
    this.numColors = this.readNextWord();
    const pixW = this.readNextByte();
    const pixH = this.readNextByte();
    this.pixelRatio = `${pixW}:${pixH}`;
    /**
     * Skip 92 bytes to account for:
     *  Short - X position of the grid
     *  Short - Y position of the grid
     *  Word - Grid width
     *  Word - Grid height, defaults to 0 if there is no grid
     *  (Defaults to 16x16 if there is no grid size)
     *  Last 84 bytes is set to 0 for future use
     */
    this.skipBytes(92);
    return this.numFrames;
  }

  /**
   * Reads a frame and stores the information
   */
  readFrame(): void {
    const bytesInFrame = this.readNextDWord();
    // skip bytes for the magic number (0xF1FA)
    this.skipBytes(2);
    // Skip old chunk data as it's not used
    this.readNextWord(); // Skip oldChunk
    const frameDuration = this.readNextWord();
    // Skip 2 bytes that are reserved for future use
    this.skipBytes(2);
    const newChunk = this.readNextDWord();
    let cels: AsepriteTypes.Cel[] = [];
    for (let i = 0; i < newChunk; i++) {
      let chunkData = this.readChunk();
      switch (chunkData.type) {
        case 0x0004:
        case 0x0011:
        case 0x2016:
        case 0x2017:
        case 0x2020:
          this.skipBytes(chunkData.chunkSize - 6);
          break;
        case 0x2022:
          this.readSliceChunk();
          break;
        case 0x2004:
          this.readLayerChunk();
          break;
        case 0x2005:
          let celData = this.readCelChunk(chunkData.chunkSize);
          if (celData) cels.push(celData);
          break;
        case 0x2007:
          this.readColorProfileChunk();
          break;
        case 0x2018:
          this.readFrameTagsChunk();
          break;
        case 0x2019:
          this.palette = this.readPaletteChunk();
          break;
        case 0x2023:
          this.tilesets.push(this.readTilesetChunk());
          break;
        default: // ignore unknown chunk types
          this.skipBytes(chunkData.chunkSize - 6);
      }
    }
    this.frames.push({
      bytesInFrame,
      frameDuration,
      numChunks: newChunk,
      cels,
    });
  }

  /**
   * Reads the Color Profile Chunk and stores the information
   * Color Profile Chunk is type 0x2007
   */
  readColorProfileChunk(): void {
    const types = ["None", "sRGB", "ICC"];
    const typeInd = this.readNextWord();
    const type = types[typeInd];
    const flag = this.readNextWord();
    const fGamma = this.readNextFixed();
    this.skipBytes(8);
    let icc: Buffer | undefined;
    if (typeInd === 2) {
      //ICC profile data
      const dataLength = this.readNextDWord();
      icc = this.readNextRawBytes(dataLength);
    }
    this.colorProfile = {
      type,
      flag,
      fGamma,
      icc,
    };
  }

  /**
   * Reads the Tags Chunk and stores the information
   * Tags Cunk is type 0x2018
   */
  readFrameTagsChunk(): void {
    const loops = ["Forward", "Reverse", "Ping-pong", "Ping-pong Reverse"];
    const numTags = this.readNextWord();
    this.skipBytes(8);
    for (let i = 0; i < numTags; i++) {
      const from = this.readNextWord();
      const to = this.readNextWord();
      const animDirection = loops[this.readNextByte()];
      const repeat = this.readNextWord();
      this.skipBytes(6);
      const color = this.readNextRawBytes(3).toString("hex");
      this.skipBytes(1);
      const name = this.readNextString();

      this.tags.push({
        from,
        to,
        animDirection,
        repeat,
        color,
        name,
      });
    }
  }

  /**
   * Reads the Palette Chunk and stores the information
   * Palette Chunk is type 0x2019
   *
   * @returns {AsepriteTypes.Palette}
   */
  readPaletteChunk(): AsepriteTypes.Palette {
    const paletteSize = this.readNextDWord();
    const firstColor = this.readNextDWord();
    const secondColor = this.readNextDWord();
    this.skipBytes(8);
    let colors: AsepriteTypes.Color[] = [];
    for (let i = 0; i < paletteSize; i++) {
      let flag = this.readNextWord();
      let red = this.readNextByte();
      let green = this.readNextByte();
      let blue = this.readNextByte();
      let alpha = this.readNextByte();
      let name;
      if (flag === 1) {
        name = this.readNextString();
      }
      colors.push({
        red,
        green,
        blue,
        alpha,
        name: name !== undefined ? name : "none",
      });
    }
    let palette: AsepriteTypes.Palette = {
      paletteSize,
      firstColor,
      lastColor: secondColor,
      colors,
    };

    if (this.colorDepth === 8) {
      palette.index = this.paletteIndex;
    }

    return palette;
  }

  /**
   * Reads the Tileset Chunk and stores the information
   * Tileset Chunk is type 0x2023
   */
  readTilesetChunk(): AsepriteTypes.Tileset {
    const id = this.readNextDWord();
    const flags = this.readNextDWord();
    const tileCount = this.readNextDWord();
    const tileWidth = this.readNextWord();
    const tileHeight = this.readNextWord();
    this.skipBytes(16);
    const name = this.readNextString();
    const tileset: AsepriteTypes.Tileset = {
      id,
      tileCount,
      tileWidth,
      tileHeight,
      name,
    };
    if ((flags & 1) !== 0) {
      tileset.externalFile = {
        id: this.readNextDWord(),
        tilesetId: this.readNextDWord(),
      };
    }
    if ((flags & 2) !== 0) {
      const dataLength = this.readNextDWord();
      const buff = this.readNextRawBytes(dataLength);
      tileset.rawTilesetData = zlib.inflateSync(buff);
    }
    return tileset;
  }

  /**
   * Reads the Slice Chunk and stores the information
   * Slice Chunk is type 0x2022
   */
  readSliceChunk(): void {
    const numSliceKeys = this.readNextDWord();
    const flags = this.readNextDWord();
    this.skipBytes(4);
    const name = this.readNextString();
    const keys: AsepriteTypes.SliceKey[] = [];
    for (let i = 0; i < numSliceKeys; i++) {
      const frameNumber = this.readNextDWord();
      const x = this.readNextLong();
      const y = this.readNextLong();
      const width = this.readNextDWord();
      const height = this.readNextDWord();
      const key: AsepriteTypes.SliceKey = { frameNumber, x, y, width, height };
      if ((flags & 1) !== 0) {
        key.patch = this.readSlicePatchChunk();
      }
      if ((flags & 2) !== 0) {
        key.pivot = this.readSlicePivotChunk();
      }
      keys.push(key);
    }
    this.slices.push({ flags, name, keys });
  }

  /**
   * Reads the Patch portion of a Slice Chunk
   *
   * @returns {Object} patch - Patch information that was in the chunk
   */
  readSlicePatchChunk(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const x = this.readNextLong();
    const y = this.readNextLong();
    const width = this.readNextDWord();
    const height = this.readNextDWord();
    return { x, y, width, height };
  }

  /**
   * Reads the Pivot portion of a Slice Chunk
   *
   * @returns {Object} pivot - Pivot information that was in the chunk
   */
  readSlicePivotChunk(): { x: number; y: number } {
    const x = this.readNextLong();
    const y = this.readNextLong();
    return { x, y };
  }

  /**
   * Reads the Layer Chunk and stores the information
   * Layer Chunk is type 0x2004
   */
  readLayerChunk(): void {
    const flags = this.readNextWord();
    const type = this.readNextWord();
    const layerChildLevel = this.readNextWord();
    this.skipBytes(4);
    const blendMode = this.readNextWord();
    const opacity = this.readNextByte();
    this.skipBytes(3);
    const name = this.readNextString();

    const layer: AsepriteTypes.Layer = {
      flags: this.#translateFlags(flags),
      type,
      layerChildLevel,
      blendMode,
      opacity,
      name,
    };

    if (layer.type == 2) {
      layer.tilesetIndex = this.readNextDWord();
    }
    this.layers.push(layer);
  }

  /**
   * Reads a Cel Chunk in its entirety and returns the information
   * Cel Chunk is type 0x2005
   *
   * @param {number} chunkSize - Size of the Cel Chunk to read
   * @returns {AsepriteTypes.Cel | undefined} Cel information
   */
  readCelChunk(chunkSize: number): AsepriteTypes.Cel | undefined {
    const layerIndex = this.readNextWord();
    const x = this.readNextShort();
    const y = this.readNextShort();
    const opacity = this.readNextByte();
    const celType = this.readNextWord();
    const zIndex = this.readNextShort();
    this.skipBytes(5);
    if (celType === 1) {
      return {
        layerIndex,
        xpos: x,
        ypos: y,
        opacity,
        celType,
        zIndex,
        w: 0,
        h: 0,
        rawCelData: Buffer.alloc(0),
        link: this.readNextWord(),
      };
    }
    const w = this.readNextWord();
    const h = this.readNextWord();
    const chunkBase = {
      layerIndex,
      xpos: x,
      ypos: y,
      opacity,
      celType,
      zIndex,
      w,
      h,
    };
    if (celType === 0 || celType === 2) {
      const buff = this.readNextRawBytes(chunkSize - 26); // take the first 20 bytes off for the data above and chunk info
      return {
        ...chunkBase,
        rawCelData: celType === 2 ? zlib.inflateSync(buff) : buff,
      };
    }
    if (celType === 3) {
      return { ...chunkBase, ...this.readTilemapCelChunk(chunkSize) };
    }
  }

  /**
   * Reads a Tilemap Cel Chunk
   *
   * @param chunkSize - Size of the chunk to read
   * @returns Object containing tilemap metadata and cel data
   */
  readTilemapCelChunk(chunkSize: number): {
    tilemapMetadata: any;
    rawCelData: Buffer;
  } {
    const bitsPerTile = this.readNextWord();
    const bitmaskForTileId = this.readNextDWord();
    const bitmaskForXFlip = this.readNextDWord();
    const bitmaskForYFlip = this.readNextDWord();
    const bitmaskFor90CWRotation = this.readNextDWord();
    this.skipBytes(10);
    const buff = this.readNextRawBytes(chunkSize - 54);
    const rawCelData = zlib.inflateSync(buff);
    const tilemapMetadata = {
      bitsPerTile,
      bitmaskForTileId,
      bitmaskForXFlip,
      bitmaskForYFlip,
      bitmaskFor90CWRotation,
    };
    return { tilemapMetadata, rawCelData };
  }

  /**
   * Reads the next Chunk Info block to get how large and what type the next Chunk is
   *
   * @returns {Object} chunkInfo
   */
  readChunk(): { chunkSize: number; type: number } {
    const cSize = this.readNextDWord();
    const type = this.readNextWord();
    return { chunkSize: cSize, type: type };
  }

  /**
   * Processes the Aseprite file and stores the information
   */
  parse(): void {
    const numFrames = this.readHeader();
    for (let i = 0; i < numFrames; i++) {
      this.readFrame();
    }
    for (let i = 0; i < numFrames; i++) {
      for (let j = 0; j < this.frames[i].cels.length; j++) {
        const cel = this.frames[i].cels[j];
        if (cel.celType === 1 && cel.link !== undefined) {
          for (let k = 0; k < this.frames[cel.link].cels.length; k++) {
            const srcCel = this.frames[cel.link].cels[k];
            if (srcCel.layerIndex === cel.layerIndex) {
              cel.w = srcCel.w;
              cel.h = srcCel.h;
              cel.rawCelData = srcCel.rawCelData;
            }
            if (cel.rawCelData) {
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Converts an amount of Bytes to a human readable format
   *
   * @param {number} bytes - Bytes to format
   * @param {number} decimals - Number of decimals to format the number to
   * @returns {string} - Amount of Bytes formatted in a more human readable format
   */
  formatBytes(bytes: number, decimals: number): string {
    if (bytes === 0) {
      return "0 Byte";
    }
    const k = 1024;
    const dm = decimals + 1 || 3;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  /**
   * Returns the data in JSON format
   *
   * @returns {object} JSON representation of the data
   */
  toJSON(): object {
    return {
      fileSize: this.fileSize,
      numFrames: this.numFrames,
      frames: this.frames.map((frame) => {
        return {
          size: frame.bytesInFrame,
          duration: frame.frameDuration,
          chunks: frame.numChunks,
          cels: frame.cels.map((cel) => {
            return {
              layerIndex: cel.layerIndex,
              xpos: cel.xpos,
              ypos: cel.ypos,
              opacity: cel.opacity,
              celType: cel.celType,
              w: cel.w,
              h: cel.h,
              rawCelData: "buffer",
            };
          }),
        };
      }),
      palette: this.palette,
      tilesets: this.tilesets,
      width: this.width,
      height: this.height,
      colorDepth: this.colorDepth,
      numColors: this.numColors,
      pixelRatio: this.pixelRatio,
      layers: this.layers,
      slices: this.slices,
    };
  }
}

export default Aseprite;
