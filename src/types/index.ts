export interface NavItem {
  label: string;
  path: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  icon: string;
  color: string;
  isComingSoon?: boolean;
  isSubscriberPerk?: boolean;
}

export interface Testimonial {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  text: string;
}

export interface BoosterPackBadge {
  text: string;
  type: 'subscriber-perk' | 'new' | 'promotion' | 'limited-time' | 'partner';
}

export interface PartnerInfo {
  name: string;
  logo: string;
  description: string;
  website?: string;
}

export interface BoosterPack {
  id: string;
  name: string;
  description: string;
  price: string;
  type: 'free' | 'paid' | 'premium';
  items: string[];
  image: string;
  badges?: BoosterPackBadge[];
  isPartnerCurated?: boolean;
  partnerInfo?: PartnerInfo;
}

export interface LeaderboardEntry {
  id: number;
  rank: number;
  username: string;
  score: number;
  country?: Country; // Added country field
}

export interface TopDrawing {
  id: number;
  drawingUrl: string;
  score: number;
  username: string;
  prompt: string;
  date: string;
  isWinner?: boolean;
  isPremium?: boolean;
  boosterPacksUsed?: string[];
  layersUsed?: number;
  comments?: number;
}

export interface SubscriptionBenefit {
  text: string;
  isHighlighted?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'amex' | 'discover';
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface BillingTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  paymentMethod: string;
  invoiceUrl: string;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface UserPublicProfile {
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  joinedDate: string;
  isPremium: boolean;
  followers: number;
  following: number;
  commentsAllowed?: boolean;
  country?: Country; // Added country field
}

export interface UserGameStats {
  gamesPlayed: number;
  gamesWon: number;
  topThreePlacements: number;
  averageVotesPerSubmission: number;
  longestWinStreak: number;
  totalPrompts?: number;
  favoritePromptCategories?: string[];
}

export interface UserAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress?: number;
  maxProgress?: number;
  date?: string;
}

export interface UserSubmission {
  id: number;
  drawingUrl: string;
  prompt: string;
  votes: number;
  date: string;
  isWinner: boolean;
}

export interface BoosterPackUsage {
  packId: string;
  packName: string;
  packImage: string;
  usageCount: number;
  isFavorite: boolean;
}

export interface FavoriteStencil {
  id: string;
  name: string;
  packId: string;
  packName: string;
  usageCount: number;
}

// Roadmap types
export interface RoadmapCategory {
  id: string;
  name: string;
  color: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  targetQuarter: string;
  targetYear: number;
  status: 'planned' | 'in-progress' | 'completed' | 'delayed';
  likes: number;
  likedByUsers: string[]; // Array of user IDs who liked this item
}

// Waitlist types
export interface WaitlistEntry {
  id: string;
  email: string;
  signed_up_at: string;
}

export interface WaitlistSubmissionResponse {
  success: boolean;
  error?: string;
  isDuplicate?: boolean;
}