import { useEffect, useState } from "react";
import {
  chefPlanningTablet,
  chefPlating,
  chefStirFry,
  chefTasting,
  chefWashing,
} from "../assets/meal-plan-generation";
import type { GenerationStage } from "../lib/mealPlanStream";

// One pose per stage the server genuinely performs. Nothing rotates on a
// timer: every change of image corresponds to an event that arrived.
const STAGE_POSES: Record<GenerationStage, string> = {
  analysing_profile: chefPlanningTablet,
  checking_pantry: chefWashing,
  building_meals: chefStirFry,
  reviewing: chefTasting,
  finalising: chefPlating,
};

const ALL_POSES = Object.values(STAGE_POSES);

// Fetched once, before the first stage arrives, so a stage change never waits
// on a download and never shows a gap. The browser cache makes the <img> that
// follows instant.
let preloaded = false;
function preload() {
  if (preloaded || typeof Image === "undefined") return;
  preloaded = true;
  for (const src of ALL_POSES) {
    const image = new Image();
    image.src = src;
  }
}

interface Props {
  stage: GenerationStage;
  // Held on the plating pose for a beat at the end, before the results
  // replace this card.
  finished?: boolean;
}

export function ChefStage({ stage, finished = false }: Props) {
  const pose = finished ? chefPlating : STAGE_POSES[stage];

  // Two layers rather than one with a changing src: crossfading needs the old
  // frame to stay on screen while the new one comes up, and swapping src
  // would blank it for a frame.
  const [layers, setLayers] = useState<{ front: string; back: string | null }>({
    front: pose,
    back: null,
  });

  useEffect(() => {
    preload();
  }, []);

  useEffect(() => {
    setLayers((current) =>
      current.front === pose ? current : { front: pose, back: current.front }
    );
  }, [pose]);

  return (
    // Fixed aspect ratio on the container, so the card never resizes between
    // poses even if one illustration is cropped differently from the next.
    <div className="chef-stage" aria-hidden>
      {layers.back ? (
        <img alt="" className="chef-stage__img chef-stage__img--out" src={layers.back} />
      ) : null}
      <img alt="" className="chef-stage__img chef-stage__img--in" key={pose} src={pose} />
    </div>
  );
}
