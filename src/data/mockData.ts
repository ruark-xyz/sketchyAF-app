/**
 * This file contains mock data for development purposes.
 * In a production environment, this would be replaced with API calls.
 */

import { FeatureCard, Testimonial, BoosterPack, LeaderboardEntry, TopDrawing, SubscriptionBenefit, BoosterPackBadge, PaymentMethod, BillingTransaction, UserPublicProfile, UserGameStats, UserAchievement, UserSubmission, BoosterPackUsage, FavoriteStencil, PartnerInfo, RoadmapCategory, RoadmapItem } from '../types';
import { countries } from './mockCountries';

// Features for the homepage
export const gameFeatures: FeatureCard[] = [
  {
    title: "Quick & Chaotic Gameplay",
    description: "Jump into 60-second rounds of frantic drawing and fun. No artistic skills required – in fact, the worse you are, the funnier it gets!",
    icon: "Zap",
    color: "#FF3366"
  },
  {
    title: "Mobile Meme Magic",
    description: "Perfect for quick doodling while on the move—or during your bathroom breaks! Sketch hilarious scenes like 'A raccoon questioning life choices' or 'Your boss as a potato.' Our AI endlessly creates absurd scenarios tailored for mobile fun.",
    icon: "Smartphone",
    color: "#33CCFF"
  },
  {
    title: "Leaderboard Battles",
    description: "Compete in lobbies where only the funniest survive. Rise through the global ranks to become the ultimate Sketch Lord.",
    icon: "Trophy",
    color: "#FFCC00",
    isComingSoon: true
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
    title: "Trending Prompts",
    description: "Our SketchyAF AI brings new prompts every week. Did a celebrity blow up at a convience store? Did a politician sext a reporter? Our trend engine will find it and generate new prompts for your amusement",
    icon: "Calendar",
    color: "#A855F7",
    isSubscriberPerk: true
  }
];

// Testimonials for the homepage
export const testimonials: Testimonial[] = [
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
    text: "The leaderboard is addictive. I've stayed up way too late trying to become the Sketch Lord."
  }
];

// Partner information for partner-curated packs
const partners: Record<string, PartnerInfo> = {
  memebase: {
    name: "MemeBase",
    logo: "https://images.pexels.com/photos/7516363/pexels-photo-7516363.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    description: "The internet's premier meme curator since 2010, MemeBase has collaborated with SketchyAF to bring you the freshest and dankest memes of all time.",
    website: "https://memebase.example.com"
  },
  pixelstudios: {
    name: "Pixel Studios",
    logo: "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    description: "Indie game developers known for their pixel art masterpieces, Pixel Studios has curated a special pack of game-inspired drawing templates and stencils.",
    website: "https://pixelstudios.example.com"
  },
  cinehub: {
    name: "CineHub",
    logo: "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", 
    description: "CineHub, the streaming service for movie buffs, brings you a collection of iconic movie scenes and characters to use in your SketchyAF creations.",
    website: "https://cinehub.example.com"
  }
};

// Booster packs for the premium page
export const boosterPacks: BoosterPack[] = [
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
    image: "https://images.pexels.com/photos/3761509/pexels-photo-3761509.jpeg?auto=compress&cs=tinysrgb&w=600",
    badges: [
      { text: "New", type: "new" },
      { text: "Partner", type: "partner" }
    ],
    isPartnerCurated: true,
    partnerInfo: partners.memebase
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
    image: "https://images.pexels.com/photos/2007647/pexels-photo-2007647.jpeg?auto=compress&cs=tinysrgb&w=600",
    badges: [
      { text: "Promotion", type: "promotion" }
    ]
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
    image: "https://images.pexels.com/photos/1449775/pexels-photo-1449775.jpeg?auto=compress&cs=tinysrgb&w=600",
    badges: [
      { text: "Limited Time", type: "limited-time" }
    ]
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
    image: "https://images.pexels.com/photos/3265460/pexels-photo-3265460.jpeg?auto=compress&cs=tinysrgb&w=600",
    badges: [
      { text: "Subscriber Perk", type: "subscriber-perk" }
    ]
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
    image: "https://images.pexels.com/photos/5487102/pexels-photo-5487102.jpeg?auto=compress&cs=tinysrgb&w=600",
    badges: [
      { text: "Partner", type: "partner" }
    ],
    isPartnerCurated: true,
    partnerInfo: partners.cinehub
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
    image: "https://images.pexels.com/photos/159393/gamepad-video-game-controller-game-controller-controller-159393.jpeg?auto=compress&cs=tinysrgb&w=600",
    badges: [
      { text: "Partner", type: "partner" }
    ],
    isPartnerCurated: true,
    partnerInfo: partners.pixelstudios
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
    image: "https://images.pexels.com/photos/3761553/pexels-photo-3761553.jpeg?auto=compress&cs=tinysrgb&w=600"
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
    image: "https://images.pexels.com/photos/5717642/pexels-photo-5717642.jpeg?auto=compress&cs=tinysrgb&w=600",
    badges: [
      { text: "Subscriber Perk", type: "subscriber-perk" }
    ]
  }
];

// Leaderboard data for the leaderboard page
export const leaderboardData: LeaderboardEntry[] = [
  { id: 1, rank: 1, username: "SketchLord", score: 9876, country: countries[0] }, // US
  { id: 2, rank: 2, username: "ArtisticTroll", score: 9542, country: countries[1] }, // UK
  { id: 3, rank: 3, username: "DrawMaster64", score: 9127, country: countries[2] }, // Canada
  { id: 4, rank: 4, username: "PencilPusher", score: 8965, country: countries[3] }, // Australia
  { id: 5, rank: 5, username: "DoodleQueen", score: 8732, country: countries[4] }, // Germany
  { id: 6, rank: 6, username: "ScribbleMaster", score: 8567, country: countries[5] }, // France
  { id: 7, rank: 7, username: "InkSlinger", score: 8421, country: countries[6] }, // Japan
  { id: 8, rank: 8, username: "CanvasCrazy", score: 8198, country: countries[8] }, // India
  { id: 9, rank: 9, username: "BrushBoss", score: 7954, country: countries[9] }, // Brazil
  { id: 10, rank: 10, username: "SketchKing", score: 7823, country: countries[0] }, // US
  { id: 11, rank: 11, username: "DrawingDiva", score: 7645, country: countries[10] }, // Mexico
  { id: 12, rank: 12, username: "ArtAttack", score: 7532, country: countries[11] }, // Italy
  { id: 13, rank: 13, username: "PicassoJr", score: 7321, country: countries[12] }, // Spain
  { id: 14, rank: 14, username: "DoodleDemon", score: 7198, country: countries[13] }, // South Korea
  { id: 15, rank: 15, username: "SketchVandal", score: 7054, country: countries[1] }  // UK
];

// Subscription benefits for the premium page
export const subscriptionBenefits: SubscriptionBenefit[] = [
  { text: "Exclusive access to Premium booster packs", isHighlighted: true },
  { text: "Ad-free experience across all game modes" },
  { text: "Double XP progression" },
  { text: "Custom profile badges and flairs" },
  { text: "Priority matchmaking" },
  { text: "Early access to new features and game modes" },
  { text: "Ability to create private lobbies (soon™)" },
  { text: "Moar things (future)" }
];

// Top drawings data for the art gallery page
export const topDrawingsData: TopDrawing[] = [
  {
    id: 1,
    drawingUrl: "https://images.pexels.com/photos/1092364/pexels-photo-1092364.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    score: 9856,
    username: "SketchLord",
    prompt: "A raccoon having an existential crisis",
    date: "2025-04-22",
    isWinner: true,
    isPremium: false,
    boosterPacksUsed: ["meme-lords", "premium-chaos"],
    layersUsed: 6,
    comments: 12
  },
  {
    id: 2,
    drawingUrl: "https://images.pexels.com/photos/1887946/pexels-photo-1887946.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    score: 9721,
    username: "ArtisticTroll",
    prompt: "Your boss as a potato",
    date: "2025-04-21",
    isWinner: false,
    isPremium: true,
    boosterPacksUsed: ["premium-nsfw"],
    layersUsed: 4,
    comments: 8
  },
  {
    id: 3,
    drawingUrl: "https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    score: 9502,
    username: "DrawMaster64",
    prompt: "A cat wearing a business suit",
    date: "2025-04-20",
    isWinner: true,
    isPremium: false,
    boosterPacksUsed: ["emoji-explosion"],
    layersUsed: 8,
    comments: 15
  },
  {
    id: 4,
    drawingUrl: "https://images.pexels.com/photos/1633525/pexels-photo-1633525.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    score: 9347,
    username: "PencilPusher",
    prompt: "Aliens visiting a fast-food restaurant",
    date: "2025-04-19",
    isWinner: false,
    isPremium: false,
    boosterPacksUsed: ["movie-madness"],
    layersUsed: 5,
    comments: 7
  },
  {
    id: 5,
    drawingUrl: "https://images.pexels.com/photos/2832432/pexels-photo-2832432.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    score: 9125,
    username: "DoodleQueen",
    prompt: "A dinosaur riding a skateboard",
    date: "2025-04-18",
    isWinner: true,
    isPremium: true,
    boosterPacksUsed: ["premium-chaos", "game-legends"],
    layersUsed: 9,
    comments: 21
  },
  {
    id: 6,
    drawingUrl: "https://images.pexels.com/photos/1500610/pexels-photo-1500610.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    score: 8945,
    username: "ScribbleMaster",
    prompt: "A penguin on vacation in Hawaii",
    date: "2025-04-17",
    isWinner: false,
    isPremium: false,
    boosterPacksUsed: ["emoji-explosion"],
    layersUsed: 3,
    comments: 5
  },
  {
    id: 7, 
    drawingUrl: "https://images.pexels.com/photos/1089027/pexels-photo-1089027.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    score: 8810,
    username: "InkSlinger",
    prompt: "The internet if it were a person",
    date: "2025-04-16",
    isWinner: false,
    isPremium: true,
    boosterPacksUsed: ["internet-classics", "meme-lords"],
    layersUsed: 7,
    comments: 11
  },
  {
    id: 8,
    drawingUrl: "https://images.pexels.com/photos/1266302/pexels-photo-1266302.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    score: 8654,
    username: "CanvasCrazy",
    prompt: "A superhero whose power is minor inconvenience",
    date: "2025-04-15",
    isWinner: true,
    isPremium: false,
    boosterPacksUsed: ["movie-madness"],
    layersUsed: 4,
    comments: 9
  }
];

// Payment method data for the profile page
export const userPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm_1',
    type: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
    isDefault: true
  },
  {
    id: 'pm_2',
    type: 'mastercard',
    last4: '8888',
    expMonth: 3,
    expYear: 2026,
    isDefault: false
  }
];

// Billing history data for the profile page
export const userBillingHistory: BillingTransaction[] = [
  {
    id: 'txn_1',
    date: '2025-05-01',
    description: 'Monthly Premium Subscription',
    amount: 4.99,
    paymentMethod: 'Visa •••• 4242',
    invoiceUrl: '#'
  },
  {
    id: 'txn_2',
    date: '2025-04-15',
    description: 'Booster Pack: Movie Madness',
    amount: 4.99,
    paymentMethod: 'Visa •••• 4242',
    invoiceUrl: '#'
  },
  {
    id: 'txn_3',
    date: '2025-04-01',
    description: 'Monthly Premium Subscription',
    amount: 4.99,
    paymentMethod: 'Visa •••• 4242',
    invoiceUrl: '#'
  },
  {
    id: 'txn_4',
    date: '2025-03-23',
    description: 'Booster Pack: Internet Classics',
    amount: 2.99,
    paymentMethod: 'Mastercard •••• 8888',
    invoiceUrl: '#'
  },
  {
    id: 'txn_5',
    date: '2025-03-01',
    description: 'Monthly Premium Subscription',
    amount: 4.99,
    paymentMethod: 'Visa •••• 4242',
    invoiceUrl: '#'
  }
];

// Public Profile Data
export const publicProfileData: UserPublicProfile = {
  username: "SketchLord",
  displayName: "The Sketch Lord",
  avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  bio: "Making terrible drawings since 2025. I specialize in drawing cats that look like potatoes.",
  joinedDate: "2025-01-15",
  isPremium: true,
  followers: 1248,
  following: 356,
  commentsAllowed: true,
  country: countries[0] // US
};

// User Game Stats
export const userGameStats: UserGameStats = {
  gamesPlayed: 432,
  gamesWon: 87,
  topThreePlacements: 156,
  averageVotesPerSubmission: 42.7,
  longestWinStreak: 8,
  totalPrompts: 512,
  favoritePromptCategories: ["Animals", "Food", "Movies"]
};

// User Achievements
export const userAchievements: UserAchievement[] = [
  {
    id: "first-win",
    name: "First Win",
    description: "Win your first game",
    icon: "🏆",
    earned: true,
    date: "2025-01-20"
  },
  {
    id: "win-streak-5",
    name: "Hot Streak",
    description: "Win 5 games in a row",
    icon: "🔥",
    earned: true,
    date: "2025-02-14"
  },
  {
    id: "win-streak-10",
    name: "Unstoppable",
    description: "Win 10 games in a row",
    icon: "⚡",
    earned: false,
    progress: 8,
    maxProgress: 10
  },
  {
    id: "games-played-100",
    name: "Century",
    description: "Play 100 games",
    icon: "💯",
    earned: true,
    date: "2025-03-02"
  },
  {
    id: "games-played-500",
    name: "Dedicated Artist",
    description: "Play 500 games",
    icon: "🎨",
    earned: false,
    progress: 432,
    maxProgress: 500
  },
  {
    id: "community-favorite",
    name: "Community Favorite",
    description: "Get 100+ votes on a single drawing",
    icon: "❤️",
    earned: true,
    date: "2025-03-12"
  },
  {
    id: "premium-subscriber",
    name: "Premium AF",
    description: "Subscribe to Premium",
    icon: "⭐",
    earned: true,
    date: "2025-02-01"
  },
  {
    id: "all-packs",
    name: "Collector",
    description: "Own all booster packs",
    icon: "📦",
    earned: false,
    progress: 5,
    maxProgress: 8
  }
];

// User Submissions
export const userSubmissions: UserSubmission[] = [
  {
    id: 1,
    drawingUrl: "https://images.pexels.com/photos/1092364/pexels-photo-1092364.jpeg?auto=compress&cs=tinysrgb&w=600",
    prompt: "A raccoon having an existential crisis",
    votes: 312,
    date: "2025-04-22",
    isWinner: true
  },
  {
    id: 2,
    drawingUrl: "https://images.pexels.com/photos/1266302/pexels-photo-1266302.jpeg?auto=compress&cs=tinysrgb&w=600",
    prompt: "A superhero whose power is minor inconvenience",
    votes: 287,
    date: "2025-04-15",
    isWinner: true
  },
  {
    id: 3,
    drawingUrl: "https://images.pexels.com/photos/1887946/pexels-photo-1887946.jpeg?auto=compress&cs=tinysrgb&w=600",
    prompt: "Your boss as a potato",
    votes: 198,
    date: "2025-04-10",
    isWinner: false
  },
  {
    id: 4,
    drawingUrl: "https://images.pexels.com/photos/1500610/pexels-photo-1500610.jpeg?auto=compress&cs=tinysrgb&w=600",
    prompt: "A penguin on vacation in Hawaii",
    votes: 156,
    date: "2025-04-08",
    isWinner: false
  },
  {
    id: 5,
    drawingUrl: "https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=600",
    prompt: "A cat wearing a business suit",
    votes: 143,
    date: "2025-04-05",
    isWinner: false
  },
  {
    id: 6,
    drawingUrl: "https://images.pexels.com/photos/1633525/pexels-photo-1633525.jpeg?auto=compress&cs=tinysrgb&w=600",
    prompt: "Aliens visiting a fast-food restaurant",
    votes: 128,
    date: "2025-04-02",
    isWinner: false
  }
];

// Booster Pack Usage
export const boosterPackUsage: BoosterPackUsage[] = [
  {
    packId: "meme-lords",
    packName: "Meme Lords",
    packImage: "https://images.pexels.com/photos/3761509/pexels-photo-3761509.jpeg?auto=compress&cs=tinysrgb&w=600",
    usageCount: 87,
    isFavorite: true
  },
  {
    packId: "premium-chaos",
    packName: "Premium Chaos",
    packImage: "https://images.pexels.com/photos/3265460/pexels-photo-3265460.jpeg?auto=compress&cs=tinysrgb&w=600",
    usageCount: 65,
    isFavorite: true
  },
  {
    packId: "emoji-explosion",
    packName: "Emoji Explosion",
    packImage: "https://images.pexels.com/photos/3761553/pexels-photo-3761553.jpeg?auto=compress&cs=tinysrgb&w=600",
    usageCount: 43,
    isFavorite: false
  }
];

// Favorite Stencils
export const favoriteStencils: FavoriteStencil[] = [
  {
    id: "drake",
    name: "Drake Hotline Bling",
    packId: "meme-lords",
    packName: "Meme Lords",
    usageCount: 28
  },
  {
    id: "chaos-unicorn",
    name: "Chaos Unicorn",
    packId: "premium-chaos",
    packName: "Premium Chaos",
    usageCount: 23
  },
  {
    id: "cat",
    name: "Woman Yelling at Cat",
    packId: "meme-lords",
    packName: "Meme Lords",
    usageCount: 17
  },
  {
    id: "rainbow",
    name: "Exploding Rainbow",
    packId: "premium-chaos",
    packName: "Premium Chaos",
    usageCount: 15
  }
];

// Roadmap Categories
export const roadmapCategories: RoadmapCategory[] = [
  {
    id: "gameplay",
    name: "Gameplay",
    color: "#FF3366" // Primary color
  },
  {
    id: "social",
    name: "Social Features",
    color: "#33CCFF" // Secondary color
  },
  {
    id: "premium",
    name: "Premium Content",
    color: "#FFCC00" // Accent color
  },
  {
    id: "technical",
    name: "Technical Improvements",
    color: "#22C55E" // Success green
  },
  {
    id: "mobile",
    name: "Mobile App",
    color: "#8A4FFF" // Purple
  }
];

// Roadmap Items
export const roadmapItems: RoadmapItem[] = [
  {
    id: "team-battles",
    title: "Team Battle Mode",
    description: "Compete in teams of 3-5 players against other teams. Each player gets to draw part of the prompt in turns, creating a collaborative masterpiece.",
    image: "https://images.pexels.com/photos/8929237/pexels-photo-8929237.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "gameplay",
    targetQuarter: "Q3",
    targetYear: 2025,
    status: "planned",
    likes: 156,
    likedByUsers: []
  },
  {
    id: "daily-challenges",
    title: "Daily Challenges",
    description: "A new challenge every day with special themes, unique constraints, and bonus rewards for participants and winners.",
    image: "https://images.pexels.com/photos/7291995/pexels-photo-7291995.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "gameplay",
    targetQuarter: "Q2",
    targetYear: 2025,
    status: "in-progress",
    likes: 249,
    likedByUsers: []
  },
  {
    id: "social-groups",
    title: "Social Groups & Clans",
    description: "Create or join groups with friends and compete in group leaderboards. Organize private drawing sessions and share exclusive content.",
    image: "https://images.pexels.com/photos/6146931/pexels-photo-6146931.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "social",
    targetQuarter: "Q3",
    targetYear: 2025,
    status: "planned",
    likes: 187,
    likedByUsers: []
  },
  {
    id: "live-events",
    title: "Live Drawing Events",
    description: "Scheduled live events with hundreds of participants competing simultaneously. Special themes and celebrity guest judges.",
    image: "https://images.pexels.com/photos/8038906/pexels-photo-8038906.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "premium",
    targetQuarter: "Q4",
    targetYear: 2025,
    status: "planned",
    likes: 201,
    likedByUsers: []
  },
  {
    id: "animation-tools",
    title: "Basic Animation Tools",
    description: "Create simple animated drawings with frame-by-frame controls. Add movement to your sketches and export as GIFs.",
    image: "https://images.pexels.com/photos/4931342/pexels-photo-4931342.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "premium",
    targetQuarter: "Q1",
    targetYear: 2026,
    status: "planned",
    likes: 312,
    likedByUsers: []
  },
  {
    id: "offline-mode",
    title: "Offline Drawing Mode",
    description: "Create drawings without an internet connection. Sync and share when you're back online.",
    image: "https://images.pexels.com/photos/5473955/pexels-photo-5473955.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "technical",
    targetQuarter: "Q2",
    targetYear: 2025,
    status: "in-progress",
    likes: 97,
    likedByUsers: []
  },
  {
    id: "ar-drawing",
    title: "AR Drawing Mode",
    description: "Draw in augmented reality! Point your camera at the world and add your sketches to real-life scenes.",
    image: "https://images.pexels.com/photos/8546873/pexels-photo-8546873.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "mobile",
    targetQuarter: "Q1",
    targetYear: 2026,
    status: "planned",
    likes: 276,
    likedByUsers: []
  },
  {
    id: "custom-brushes",
    title: "Custom Brush Creator",
    description: "Design and save your own custom brushes with unique textures, patterns, and behaviors.",
    image: "https://images.pexels.com/photos/6693661/pexels-photo-6693661.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "premium",
    targetQuarter: "Q3",
    targetYear: 2025,
    status: "planned",
    likes: 184,
    likedByUsers: []
  },
  {
    id: "localization",
    title: "Expanded Language Support",
    description: "Adding support for 10+ new languages including Japanese, Korean, Portuguese, and more.",
    image: "https://images.pexels.com/photos/5412270/pexels-photo-5412270.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "technical",
    targetQuarter: "Q4",
    targetYear: 2025,
    status: "planned",
    likes: 63,
    likedByUsers: []
  },
  {
    id: "apple-watch",
    title: "Apple Watch App",
    description: "Draw directly on your Apple Watch! Perfect for quick sketches and viewing notifications.",
    image: "https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "mobile",
    targetQuarter: "Q2",
    targetYear: 2026,
    status: "planned",
    likes: 148,
    likedByUsers: []
  },
  {
    id: "nft-marketplace",
    title: "NFT Marketplace",
    description: "Turn your best drawings into NFTs and sell them directly within the app. Includes certificate of authenticity.",
    image: "https://images.pexels.com/photos/8370752/pexels-photo-8370752.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "premium",
    targetQuarter: "Q2",
    targetYear: 2026,
    status: "planned",
    likes: 89,
    likedByUsers: []
  },
  {
    id: "streaming-integration",
    title: "Twitch & YouTube Integration",
    description: "Stream your drawing sessions directly to Twitch or YouTube. Viewers can vote and comment in real-time.",
    image: "https://images.pexels.com/photos/9072216/pexels-photo-9072216.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "social",
    targetQuarter: "Q4",
    targetYear: 2025,
    status: "planned",
    likes: 215,
    likedByUsers: []
  }
];