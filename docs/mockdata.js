/**
 * This file contains mock data for development purposes.
 * In a production environment, this would be replaced with API calls.
 */

// Mock leaderboard data
export const leaderboardData = [
  { id: 1, rank: 1, username: "SketchLord", score: 9876 },
  { id: 2, rank: 2, username: "ArtisticTroll", score: 9542 },
  { id: 3, rank: 3, username: "DrawMaster64", score: 9127 },
  { id: 4, rank: 4, username: "PencilPusher", score: 8965 },
  { id: 5, rank: 5, username: "DoodleQueen", score: 8732 },
  { id: 6, rank: 6, username: "ScribbleMaster", score: 8567 },
  { id: 7, rank: 7, username: "InkSlinger", score: 8421 },
  { id: 8, rank: 8, username: "CanvasCrazy", score: 8198 },
  { id: 9, rank: 9, username: "BrushBoss", score: 7954 },
  { id: 10, rank: 10, username: "SketchKing", score: 7823 },
  { id: 11, rank: 11, username: "DrawingDiva", score: 7645 },
  { id: 12, rank: 12, username: "ArtAttack", score: 7532 },
  { id: 13, rank: 13, username: "PicassoJr", score: 7321 },
  { id: 14, rank: 14, username: "DoodleDemon", score: 7198 },
  { id: 15, rank: 15, username: "SketchVandal", score: 7054 },
];

// Mock booster pack data
export const boosterPacks = [
  {
    id: "meme-lords",
    name: "Meme Lords",
    description: "All the internet's favorite meme templates",
    price: "Free",
    type: "free",
    items: [
      "Distracted Boyfriend",
      "Woman Yelling at Cat",
      "Drake Hotline Bling",
      "Two Buttons",
      "Change My Mind"
    ],
    image: "https://via.placeholder.com/300x200?text=Meme+Lords"
  },
  {
    id: "internet-classics",
    name: "Internet Classics",
    description: "Throwback to the golden age of internet culture",
    price: "$2.99",
    type: "paid",
    items: [
      "Nyan Cat",
      "Keyboard Cat",
      "Rage Comics",
      "Troll Face",
      "Bad Luck Brian"
    ],
    image: "https://via.placeholder.com/300x200?text=Internet+Classics"
  },
  {
    id: "viral-sensations",
    name: "Viral Sensations",
    description: "The most viral moments in recent history",
    price: "$3.99",
    type: "paid",
    items: [
      "Ice Bucket Challenge",
      "Harlem Shake",
      "Gangnam Style",
      "Tide Pod Challenge",
      "Bottle Flip"
    ],
    image: "https://via.placeholder.com/300x200?text=Viral+Sensations"
  },
  {
    id: "premium-chaos",
    name: "Premium Chaos",
    description: "Exclusive to Premium subscribers. Pure chaos unleashed.",
    price: "Premium",
    type: "premium",
    items: [
      "Chaos Unicorn",
      "Exploding Rainbow",
      "Surreal Distortion",
      "Glitch Effect",
      "Abstract Nightmare"
    ],
    image: "https://via.placeholder.com/300x200?text=Premium+Chaos"
  },
  {
    id: "movie-madness",
    name: "Movie Madness",
    description: "Iconic movie scenes and characters",
    price: "$4.99",
    type: "paid",
    items: [
      "Star Wars",
      "Marvel Heroes",
      "Princess Bride",
      "The Matrix",
      "Jurassic Park"
    ],
    image: "https://via.placeholder.com/300x200?text=Movie+Madness"
  },
  {
    id: "game-legends",
    name: "Game Legends",
    description: "Tributes to legendary video games",
    price: "$3.99",
    type: "paid",
    items: [
      "Mario Bros",
      "Pokemon",
      "Minecraft",
      "Fortnite",
      "Among Us"
    ],
    image: "https://via.placeholder.com/300x200?text=Game+Legends"
  },
  {
    id: "emoji-explosion",
    name: "Emoji Explosion",
    description: "Every emoji you could ever want",
    price: "Free",
    type: "free",
    items: [
      "Smiley Collection",
      "Food Emojis",
      "Animal Emojis",
      "Activity Emojis",
      "Travel Emojis"
    ],
    image: "https://via.placeholder.com/300x200?text=Emoji+Explosion"
  },
  {
    id: "premium-nsfw",
    name: "Premium NSFW",
    description: "Adults only. Premium subscribers exclusive.",
    price: "Premium",
    type: "premium",
    items: [
      "Mature Content 1",
      "Mature Content 2",
      "Mature Content 3",
      "Mature Content 4",
      "Mature Content 5"
    ],
    image: "https://via.placeholder.com/300x200?text=Premium+NSFW"
  }
];

// Mock feature data
export const gameFeatures = [
  {
    title: "Quick & Chaotic Gameplay",
    description: "Jump into 60-second rounds of frantic drawing and fun. No artistic skills required – in fact, the worse you are, the funnier it gets!",
    icon: "Zap",
    color: "#FF3366"
  },
  {
    title: "Meme-Worthy Prompts",
    description: "Draw ridiculous scenarios like 'A raccoon having an existential crisis' or 'Your boss as a potato.' Our AI generates thousands of absurd prompts.",
    icon: "MessageSquare",
    color: "#33CCFF"
  },
  {
    title: "Battle Royale Mode",
    description: "Compete in 100-player lobbies where only the funniest survive. Rise through the ranks to become the ultimate Sketch Lord.",
    icon: "Trophy",
    color: "#FFCC00"
  },
  {
    title: "Booster Packs",
    description: "Unlock themed drawing tools, stamps, and special effects. From 'Internet Meme Lords' to 'Premium NSFW' packs (18+ only).",
    icon: "Package",
    color: "#22C55E"
  },
  {
    title: "Social Sharing",
    description: "Export your masterpieces directly to social media. Tag your friends to challenge them or just publicly shame their artistic abilities.",
    icon: "Share2",
    color: "#3B82F6"
  },
  {
    title: "Daily Challenges",
    description: "New themed challenges every day with exclusive rewards. Monday might be 'Celebrity Disasters,' while Friday brings 'Draw It With Your Eyes Closed.'",
    icon: "Calendar",
    color: "#A855F7"
  }
];

// Mock testimonial data
export const testimonials = [
  {
    id: 1,
    name: "Jessica K.",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    rating: 5,
    text: "I've never laughed so hard at my own terrible drawings. My friends and I play this every time we hang out now!"
  },
  {
    id: 2,
    name: "Marcus T.",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    rating: 5,
    text: "The premium packs are totally worth it. The NSFW ones had our game night in tears from laughing so hard."
  },
  {
    id: 3,
    name: "Aisha M.",
    avatar: "https://randomuser.me/api/portraits/women/63.jpg",
    rating: 4,
    text: "Perfect time-killer during my commute. The 60-second rounds are just the right length."
  },
  {
    id: 4,
    name: "Devon J.",
    avatar: "https://randomuser.me/api/portraits/men/15.jpg",
    rating: 5,
    text: "I'm terrible at drawing but somehow I'm ranked in the top 100. This game rewards creative chaos and I'm here for it!"
  },
  {
    id: 5,
    name: "Sophia L.",
    avatar: "https://randomuser.me/api/portraits/women/8.jpg",
    rating: 4,
    text: "The Battle Royale mode is addictive. I've stayed up way too late trying to become the Sketch Lord."
  }
];

// Mock subscription benefits
export const subscriptionBenefits = [
  "Exclusive access to Premium booster packs",
  "Ad-free experience across all game modes",
  "Double XP progression",
  "Custom profile badges and flairs",
  "Priority matchmaking",
  "Early access to new features and game modes",
  "Monthly bonus credits",
  "Ability to create private lobbies",
  "Exclusive premium color palettes and brushes",
  "Access to premium community Discord channels"
];