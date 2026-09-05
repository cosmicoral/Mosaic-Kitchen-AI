import { useEffect, useRef, useState } from "react";
import {
  ALL_POSES,
  chefPlating,
  poseSet,
  type GenerationVariant,
} from "../assets/meal-plan-generation";
import type { GenerationStage } from "../lib/mealPlanStream";

// Fetched once, before the first stage arrives, so a pose change never waits
// on a download and never shows a gap. All eight, because a user can run
// either flow in a session and the second one should not stutter.
let preloaded = false;
function preload() {
  if (preloaded || typeof Image === "undefined") return;
  preloaded = true;
  for (const src of ALL_POSES) {
    const image = new Image();
    image.src = src;
  }
}

// Slow enough to read as cooking rather than flickering.
const LOOP_MS = 3200;

interface Props {
  stage: GenerationStage;
  variant?: GenerationVariant;
  finished?: boolean;
}

export function ChefStage({ stage, variant = "weekly", finished = false }: Props) {
  const poses = poseSet(variant);

  useEffect(() => {
    preload();
  }, []);

  // Only the long stage loops. Everywhere else the pose is pinned to the
  // stage, so the picture changing means an event arrived.
  const [loopIndex, setLoopIndex] = useState(0);
  const isLooping = !finished && stage === "building_meals";

  useEffect(() => {
    if (!isLooping) {
      setLoopIndex(0);
      return;
    }
    // Honours the OS setting: with reduced motion on, the pose is held still.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(
      () => setLoopIndex((current) => (current + 1) % poses.cookingLoop.length),
      LOOP_MS
    );
    return () => clearInterval(timer);
  }, [isLooping, poses.cookingLoop.length]);

  const pose = finished
    ? chefPlating
    : isLooping
      ? (poses.cookingLoop[loopIndex] ?? poses.stages.building_meals)
      : poses.stages[stage];

  // Two layers rather than one with a changing src: crossfading needs the old
  // frame on screen while the new one comes up, and swapping src would blank
  // it for a frame.
  const [layers, setLayers] = useState<{ front: string; back: string | null }>({
    front: pose,
    back: null,
  });
  const previous = useRef(pose);

  useEffect(() => {
    if (previous.current === pose) return;
    setLayers({ front: pose, back: previous.current });
    previous.current = pose;
  }, [pose]);

  return (
    // Fixed aspect ratio, so the card never resizes between poses even if one
    // illustration is cropped differently from the next.
    <div className="chef-stage" aria-hidden>
      {layers.back ? (
        <img
          alt=""
          className="chef-stage__img chef-stage__img--out"
          key={`out-${layers.back}`}
          src={layers.back}
        />
      ) : null}
      <img alt="" className="chef-stage__img chef-stage__img--in" key={pose} src={pose} />
    </div>
  );
}
