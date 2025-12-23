export interface FeedPhoto {
  id: string;
  photoUrl: string;
  thumbnailUrl?: string;
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



