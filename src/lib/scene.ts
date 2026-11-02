import type { TripRequest } from "./schema";

export type Scene = "coast" | "desert" | "hills" | "city";

// First match wins.
const PLACES: [Scene, RegExp][] = [
  ["hills", /\b(manali|shimla|leh|ladakh|spiti|kasol|darjeeling|gangtok|sikkim|munnar|ooty|kodaikanal|coorg|mussoorie|nainital|rishikesh|kashmir|srinagar|gulmarg|bhutan|nepal|kathmandu|pokhara|himalaya|alps|switzerland|zermatt|interlaken|dolomites|patagonia|banff|tbilisi|cappadocia)\b/],
  ["desert", /\b(rajasthan|pushkar|jaisalmer|jodhpur|bikaner|udaipur|jaipur|kutch|dubai|abu dhabi|oman|muscat|jordan|petra|wadi rum|egypt|cairo|luxor|marrakech|morocco|sahara|arizona|sedona|las vegas)\b/],
  ["coast", /\b(goa|gokarna|varkala|kovalam|kerala|alleppey|pondicherry|puducherry|andaman|havelock|lakshadweep|maldives|bali|lombok|phuket|krabi|koh |langkawi|boracay|palawan|sri lanka|mauritius|seychelles|zanzibar|santorini|mykonos|amalfi|algarve|hawaii|cancun|beach|island)\b/],
];

/** Picks the hero backdrop: the destination's landscape if we know it, else a hint from interests, else a city. */
export function sceneFor(req: Pick<TripRequest, "dest" | "interests">): Scene {
  const dest = req.dest.toLowerCase();
  for (const [scene, re] of PLACES) if (re.test(dest)) return scene;
  if (req.interests.includes("Beaches")) return "coast";
  if (req.interests.includes("Nature") || req.interests.includes("Adventure")) return "hills";
  return "city";
}
