# Five minutes

A meteor base-building game

## Requirements

[Node.js](https://nodejs.org) will be required to start and run the project.

If you are interested in editing/building the assets, you will need `Aseprite`, `Tiled` or `Blockbench`.

## Available Commands

| Command          | Description                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `npm install`    | Install project dependencies                                              |
| `npm run dev`    | Launch a development web server                                           |
| `npm run build`  | Create a production build in the `dist` folder                            |
| `npm run assets` | Compiles all the assets, read more on the "Handling Assets" section below |

## Writing Code

After cloning the repo, run `npm install` from your project directory. Then, you can start the local development server by running `npm run dev`.

The local development server runs on `http://localhost:8080`.

Once the server is running you can edit any of the files in the `src` folder. Vite will automatically recompile your code and then reload the browser.

## Handling Assets

There are two folders for storing assets, you can add files to either of them, according to your need:

- `/assets`: Contains all assets files that need to be exported into a format that we use in the game, or companion files like licenses or notes. Files in this folder are not loaded into the game, you need to configure the `/assets/asset-conversion.config.ts` file to handle copying or exporting to the `/public/assets` folder.
- `/public/assets`: Contains all assets used in the game. Files in this folder will be loaded during the game execution and will be included into the code for use. If you add an asset here, you don't need to make any extra changes, the files required to load the file will be generated automatically.

The assets in these two folders are all handled automatically for loading and use in code.

From the `/assets`, the command `npm run assets` will run all the exports described on `/assets/asset-conversion.config.ts`. You will need the software used for the exports in order to export all the assets. If a given entry on the `asset-conversion.config.ts` mentions no executable, it means the asset is simply being copied to the destination (this is useful to keep the license file together with the asset but not increase the size of the `/public/asset` folder).

From the `/public/assets`, the usual game running command `npm run dev` will compile the `public/assetPack.json` and `src/assets.ts` automatically. The asset pack file will be used to load these assets when running the game, and the `assets.ts` is used to have a stable reference for the resources from the code.

Both `public/assetPack.json` and `src/assets.ts` should not be edited manually, as they will lose their changes once the automatic asset handling will be run.

# Credits

This repository was initially created using the Vite template provided by [Phaser](https://phaser.io).
