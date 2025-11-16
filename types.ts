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
  type: 'Fridge' | 'Freezer';
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
  orderingList?: Ingredient[];
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  imageUrl?: string;
}

export type CalendarView = 'Month' | 'Agenda';

export interface SeasonalProduce {
  Fruits: string[];
  Vegetables: string[];
  Proteins: string[];
}

export type AnalysisMode = 'Custom' | 'Macro' | 'Technique' | 'Variation';

export type EmailClient = 'default' | 'gmail' | 'outlook';

// Fix: Added ThemeName and Theme types for theme context.
export type ThemeName = 'twilight' | 'crimson' | 'evergreen' | 'light';

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
