/**
 * Game Prompts for SketchyAF
 * 
 * This file contains all the drawing prompts used in the game.
 * Prompts are automatically selected randomly when creating new games.
 * 
 * Generated from: SketchyAF_100_Social_Trend_Prompts.csv
 * Generated on: 2025-06-30T17:15:04.663Z
 * Total unique prompts: 24
 */

export const GAME_PROMPTS: string[] = [
  "Delulu CEO arguing with a pigeon boardroom.",
  "Haunted vending machine that dispenses bad advice.",
  "Depressed broccoli giving a weather forecast.",
  "Witch taking selfies in a pumpkin patch rave.",
  "Cottagecore witch riding a pastel vacuum.",
  "Kangaroo in court debating with a flamingo judge.",
  "Toaster on strike against breakfast.",
  "Thread war between two emotionally unstable AI bots.",
  "Yoga influencer levitating on a pizza.",
  "Lawyer raccoon mid-trial eating a hotdog.",
  "Smart fridge leading a protest against midnight snacks.",
  "Goblincore picnic with cursed sandwiches.",
  "Billionaire arguing with pigeons on a rocket.",
  "Clowncore barista spilling existential tea.",
  "'girl dinner' fit for royalty (1 olive, 3 chips, string cheese).",
  "Two versions of yourself: one sane, one shaving a cat.",
  "Cottagecore cat running a pop-up bakery.",
  "Moon colony powered entirely by cheese.",
  "Person being canceled by their smart toaster.",
  "‘me vs me’ battle between a sock and a toothbrush.",
  "Someone going full delulu in a board meeting.",
  "Moon colony governed by cats in lab coats.",
  "Pastel wizard trapped in an air fryer.",
  "An air fryer cult sacrificing a donut."
];

/**
 * Get a random prompt from the available prompts
 */
export function getRandomPrompt(): string {
  return GAME_PROMPTS[Math.floor(Math.random() * GAME_PROMPTS.length)];
}

/**
 * Get multiple random prompts (without duplicates)
 */
export function getRandomPrompts(count: number): string[] {
  const shuffled = [...GAME_PROMPTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, GAME_PROMPTS.length));
}
