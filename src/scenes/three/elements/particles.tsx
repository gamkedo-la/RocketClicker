import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

import { COLORS_NAMES } from "@game/consts";
import { signal } from "@game/core/signals/signals";
import { MAX_COMET_SPIN } from "@game/state/consts";
import { ThreeCometScene } from "../three-comet-scene";

// Constants to mimic rocket exhaust generation
const NUM_TOTAL_LINES = 30; // Rocket has 100 lines
const POINTS_PER_LINE = 25; // Rocket lines have 150 points
const NUM_MATERIALS = 10; // Rocket creates 10 materials
const BASE_COMET_RADIUS_FOR_EMISSION = 0; // Your current setting
const LINE_SEGMENT_LENGTH_SCALE = 0.048; // To keep segments small, mimicking rocket's model scale effect

// Predefined colors, similar to rocket's palette size
//const EFFECT_COLORS = [0xff00ff, 0x00ffff, 0xffff00, 0x00ff00, 0xffaa00];
const EFFECT_COLORS = [
  COLORS_NAMES["pleasing-pink"],
  COLORS_NAMES["vicious-violet"],
  COLORS_NAMES["vaporwave-blue"],
  COLORS_NAMES["peaches-of-immortality"],
  COLORS_NAMES["fever-dream"],
];

export class Particles {
  private linesContainer: THREE.Object3D;
  private lineMaterials: LineMaterial[] = [];

  constructor(private scene: ThreeCometScene) {
    this.linesContainer = new THREE.Object3D();

    // Create LineMaterials
    for (let i = 0; i < NUM_MATERIALS; i++) {
      this.lineMaterials.push(
        new LineMaterial({
          color:
            EFFECT_COLORS[Math.floor(Math.random() * EFFECT_COLORS.length)],
          linewidth: Math.random() * 2 + 0.5, // 0.5px to 2.5px
          dashed: true,
          dashSize: 0.01,
          gapSize: 0.1,
          transparent: true,
          // resolution: new THREE.Vector2(window.innerWidth, window.innerHeight) // Set if needed for screen-space units
        })
      );
    }

    // Generate lines and add them to linesContainer
    for (let i = 0; i < NUM_TOTAL_LINES; i++) {
      const material =
        this.lineMaterials[
          Math.floor(Math.random() * this.lineMaterials.length)
        ];
      const geometry = new LineGeometry();

      const startPoint = new THREE.Vector3(
        0.42 + Math.random() * 0.05,
        0,
        -0.55 + Math.random() * 0.5 - 0.25
      );

      const points: number[] = [];
      points.push(startPoint.x, startPoint.y, startPoint.z); // Add the first point

      const currentPoint = startPoint.clone();
      const segmentDirection = new THREE.Vector3(); // This will be the evolving direction vector

      // Initialize direction for the first segment of THIS line
      segmentDirection.x = Math.random() * 0.1;
      segmentDirection.y = 1; // User's preference from previous change
      segmentDirection.z = 0 + Math.random() * 0.4 - 0.2;
      //Math.random() - 0.5;
      segmentDirection.normalize();

      // Create a fixed rotation axis for this line to make it curve consistently
      // This axis is perpendicular to the initial direction's XZ projection
      const curveRotationAxis = new THREE.Vector3(0, 0, 1).normalize();
      if (curveRotationAxis.lengthSq() === 0) {
        //curveRotationAxis.set(1, 0, 0); // Fallback if initial XZ components are zero
      }
      const ANGLE_PER_SEGMENT = 0.12; // Radians for gentle curve per segment (150 * 0.03 = ~250 deg total curve)

      for (let j = 1; j < POINTS_PER_LINE; j++) {
        // Loop starts from 1 because point 0 is startPoint
        // For segments after the first, rotate the *current* segmentDirection vector
        segmentDirection.applyAxisAngle(curveRotationAxis, ANGLE_PER_SEGMENT);
        // segmentDirection is modified in place. Normalizing it here would make segments more uniform in length
        // but might slightly alter the curve. For small angles, length change is minimal.
        // segmentDirection.normalize(); // Optional, if desired

        currentPoint.add(
          segmentDirection.clone().multiplyScalar(LINE_SEGMENT_LENGTH_SCALE)
        );
        points.push(currentPoint.x, currentPoint.y, currentPoint.z);
      }
      geometry.setPositions(points);

      const line = new Line2(geometry, material);
      line.computeLineDistances();
      this.linesContainer.add(line);
    }

    // TODO: move to comet scene
    setTimeout(() => {
      if (this.linesContainer) {
        this.scene.comet.add(this.linesContainer);
      }
    }, 800);

    this.direction = Math.random() * 2 - 1;

    this.scene.gameState.getCometSpin().subscribe((spin) => {
      this.direction = spin / MAX_COMET_SPIN;
    });
  }

  direction: number = 0;

  update(time: number, _delta: number) {
    if (!this.lineMaterials || this.lineMaterials.length === 0) return;

    // Animate dash offset for each material, similar to rocket exhaust
    this.lineMaterials.forEach((material, index) => {
      // Rocket: mat.dashOffset = -time * 0.09 - index * 0.3;
      // Adjust factors for potentially different time scale if needed.
      // Using 'time' from update(time, delta) directly.
      //material.dashOffset = -time * 0.0005 - index * 0.03;
      material.dashOffset +=
        0.015 * this.direction + index * 0.001 * this.direction;
      material.dashSize = 0.01 * Math.abs(this.direction);
      material.opacity = 1 - Math.max(0.4, Math.abs(this.direction));
    });
  }
}
