export interface FeedPhoto {
  id: string;
  photoUrl: string;
  thumbnailUrl?: string;
  /** "image" | "video" — mirrors LogPhoto.mediaKind; absent = image */
  mediaKind?: 'image' | 'video';
  /** Video duration in seconds (mediaKind === 'video') */
  duration?: number;
  /** Video poster frame (mediaKind === 'video') */
  thumbUrl?: string;
}

export interface FeedComment {
  id: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface FeedItem {
  id: string;
  type: 'log';
  createdAt: string;

  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };

  log: {
    id: string;
    rating?: number;
    note?: string;
    visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
    photos: FeedPhoto[];
  };

  event: {
    id: string;
    name: string;
    date: string;
    artist: {
      id: string;
      name: string;
      imageUrl?: string;
    };
    venue: {
      id: string;
      name: string;
      city: string;
    };
  };

  // Interactions
  commentCount: number;
  comments: FeedComment[]; // preview
  wasThereCount: number;
  userWasThere: boolean;
  // First few was-there users, inlined by the feed serializer for the
  // over-photo facepile (absent on older API builds — render nothing).
  wasThereUsers?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    /** 1 = you follow them · 2 = friend-of-friend (C15 degree facepile). */
    degree?: 1 | 2;
  }[];

  // Like data inlined by the feed serializer (absent on older API builds —
  // FeedCard falls back to a lazy GET /logs/:id/likes when missing).
  likeCount?: number;
  likedByMe?: boolean;
  recentLikers?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  }[];
}

export interface LogDetail extends FeedItem {
  log: FeedItem['log'] & {
    section?: string;
    row?: string;
    seat?: string;
    taggedFriends: {
      id: string;
      username: string;
      avatarUrl?: string;
    }[];
  };

  allComments: FeedComment[];

  othersWhoWent: {
    id: string;
    username: string;
    avatarUrl?: string;
    rating?: number;
  }[];
}



