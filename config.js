export const CONFIG = {
  // Arena
  arena: {
    length: 120,
    width: 80,
    wallHeight: 18,
    ceiling: 40, // soft-limit
    goalWidth: 26,
    goalHeight: 12,
    goalDepth: 10,
    floorFriction: 0.9,
    wallRestitution: 0.35,
  },

  // Physics stepping
  physics: {
    fixedTimeStep: 1 / 120,
    maxSubSteps: 3,
    gravity: -22,
  },

  // Car tuning (arcade-ish)
  car: {
    mass: 180,
    radius: 1.35,     // collision proxy
    height: 1.0,
    grip: 22,         // lateral damping strength
    engineForce: 68,  // forward accel
    reverseForce: 45,
    maxSpeed: 38,
    turnRate: 2.2,    // yaw rate
    airTurnRate: 1.2, // limited air control
    jumpImpulse: 7.8,
    boostForce: 92,
    maxBoost: 100,
    boostDrainPerSec: 28,
    boostRegenPerSec: 8, // when grounded and not boosting
    groundSnap: 0.25,    // helps keep car stable on ground
  },

  // Ball tuning
  ball: {
    radius: 2.15,
    mass: 30,
    restitution: 0.82,
    linearDamping: 0.12,
    angularDamping: 0.18,
    maxSpeed: 55,
  },

  // Match
  match: {
    durationSec: 3 * 60,
    kickoffCountdownSec: 2.0,
  },

  // Simple bot
  bot: {
    enabled: true,
    skill: 0.55,         // 0..1
    reaction: 0.18,      // seconds
    boostChance: 0.35,
  },
};
