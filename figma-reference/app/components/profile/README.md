# Sticket Profile Timeline Components

A comprehensive, modular timeline implementation for the Sticket concert tracking app.

## 📁 File Structure

```
profile/
├── index.ts                  # Main export file
├── types.ts                  # TypeScript interfaces
├── mockData.ts              # Mock concert data
├── ProfileTimeline.tsx      # Main container component
├── TimelineView.tsx         # Timeline layout view
├── GridView.tsx             # Photo grid view
├── MapView.tsx              # Map view placeholder
├── StatsView.tsx            # Stats view
├── YearHeaderCard.tsx       # Year summary card
├── FeaturedLogCard.tsx      # Full-width log card
├── CompactLogCard.tsx       # Small grid card
├── MilestoneCard.tsx        # Celebration card
└── README.md                # This file
```

## 🚀 Quick Start

### Import the complete component:

```tsx
import { ProfileTimeline } from './components/profile';

function App() {
  return <ProfileTimeline />;
}
```

### Import individual components:

```tsx
import { 
  TimelineView, 
  FeaturedLogCard,
  YearHeaderCard,
  mockYearData 
} from './components/profile';
```

## 📦 Components

### **ProfileTimeline** (Main Component)
Complete profile screen with header, stats, and 4 view modes.

**Props:**
- `onSettings?: () => void` - Settings button callback
- `onEditProfile?: () => void` - Edit profile button callback

### **TimelineView**
Chronological diary view with year headers and log cards.

**Props:**
- `data: YearData[]` - Array of year data

### **GridView**
2-column photo grid layout.

**Props:**
- `data: YearData[]` - Array of year data

### **MapView**
Geographic journey view (placeholder).

### **StatsView**
Concert statistics view.

### **YearHeaderCard**
Year summary with show/artist/venue counts and progress bar.

**Props:**
- `yearData: YearData` - Year data object

### **FeaturedLogCard**
Full-width card with photo, rating, notes, badges, and friends.

**Props:**
- `log: LogEntry` - Log entry object

### **CompactLogCard**
Compact card for grid layouts.

**Props:**
- `log: LogEntry` - Log entry object

### **MilestoneCard**
Celebration card with gradient background.

**Props:**
- `milestone: Milestone` - Milestone object

## 🎨 Design System

### Colors
- **Background:** `#0A0B1E`
- **Surface:** `#12132D`, `#1A1B3D`
- **Border:** `#2A2B4D`
- **Text Primary:** `#FFFFFF`
- **Text Secondary:** `#A1A1C7`
- **Text Tertiary:** `#6B6B8D`
- **Accent Cyan:** `#00D4FF`
- **Accent Purple:** `#8B5CF6`
- **Accent Pink:** `#E879F9`
- **Rating Gold:** `#FFD700`

### Typography
- **Year:** 32px, font-black
- **Artist (featured):** 24px, font-bold
- **Artist (compact):** 14px, font-bold
- **Venue/Date:** 13px, font-medium

## 📋 Data Structure

### YearData
```typescript
{
  year: number;
  showCount: number;
  artistCount: number;
  venueCount: number;
  isTopYear?: boolean;
  logs: LogEntry[];
  milestones?: Milestone[];
}
```

### LogEntry
```typescript
{
  id: number;
  artist: string;
  tour?: string;
  venue: string;
  city: string;
  date: string;
  dateObj: Date;
  rating: number;
  note?: string;
  photos?: string[];
  badges?: Badge[];
  friends?: Friend[];
  isFeatured?: boolean;
}
```

### Milestone
```typescript
{
  id: number;
  type: 'shows' | 'distance' | 'loyalty' | 'streak';
  icon: string;
  message: string;
  insertAfterLogId?: number;
}
```

## 🔧 Dependencies

- **React** - UI framework
- **lucide-react** - Icon library
- **Tailwind CSS** - Styling

## 📝 Usage Examples

### Use with custom data:
```tsx
import { ProfileTimeline } from './components/profile';
import { myCustomData } from './data';

<ProfileTimeline data={myCustomData} />
```

### Build a custom layout:
```tsx
import { YearHeaderCard, FeaturedLogCard } from './components/profile';

function CustomTimeline({ yearData }) {
  return (
    <div>
      <YearHeaderCard yearData={yearData} />
      {yearData.logs.map(log => (
        <FeaturedLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}
```

### Filter by year:
```tsx
import { TimelineView, mockYearData } from './components/profile';

const data2024 = mockYearData.filter(y => y.year === 2024);
<TimelineView data={data2024} />
```

## 🎯 Features

✅ **Year Headers** with stats and progress bars  
✅ **Featured Cards** with full-width photos  
✅ **Compact Cards** for grid layouts  
✅ **Milestone Celebrations** with gradient backgrounds  
✅ **4 View Modes:** Timeline, Grid, Map, Stats  
✅ **Star Ratings** with gold styling  
✅ **Badge Pills** with icons  
✅ **Friend Avatars** with stacking  
✅ **Responsive** layouts  
✅ **TypeScript** support  
✅ **Modular** and reusable  

## 📱 Mobile First

Designed for 390×844px (iPhone 14 Pro) but fully responsive.

## 🎨 Customization

All colors use Tailwind classes and can be customized via:
- Direct class replacement
- Tailwind config
- CSS variables

## 📄 License

Part of the Sticket design system.
