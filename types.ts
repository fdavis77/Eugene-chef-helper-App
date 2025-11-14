export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

export interface TemperatureLog {
  id: number;
  type: 'Food' | 'Fridge' | 'Freezer';
  item: string;
  temperature: string;
  // Timestamp is now a full ISO date string to allow for filtering.
  timestamp: string;
}

export interface HaccpLog {
  id: number;
  label: string;
  date: string;
  time: string;
  temperature: string;
  checkedBy: string;
  correctiveAction: string;
}

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface Recipe {
  title: string;
  description: string;
  yields: string;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  instructions: string[];
}

export interface CalendarDay {
  menuItem?: string;
  rota?: string[];
}


// fix: Added Theme and ThemeName types that were missing.
export type ThemeName = 'twilight' | 'crimson' | 'evergreen';

export interface Theme {
  name: string;
  classes: {
    appBg: string;
    headerBg: string;
    cardBg: string;
    cardBorder: string;
    textAccent: string;
    textMuted: string;
    buttonBg: string;
    buttonHoverBg: string;
    buttonRing: string;
    buttonFocusRingOffset: string;
    navButtonActiveBg: string;
    navButtonHoverBg: string;
  };
}