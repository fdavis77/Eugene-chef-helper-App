
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

export interface OpeningClosingCheck {
  id: number;
  date: string;
  type: 'Opening' | 'Closing';
  time: string;
  checks: {
    kitchenClean: boolean;
    equipmentWorking: boolean;
    temperaturesCorrect: boolean;
    staffFitForWork: boolean;
    wasteManaged: boolean;
    pestControl: boolean;
  };
  comments: string;
  signedBy: string;
}

export interface CoolingLog {
  id: number;
  date: string;
  foodItem: string;
  startTime: string;
  startTemp: string;
  time90Min: string;
  temp90Min: string;
  isSafeAfter90Min: boolean;
  finalTime: string;
  finalTemp: string;
  totalTime: string;
  correctiveAction: string;
  signedBy: string;
}

export interface CosshLog {
  id: number;
  substanceName: string;
  dateReceived: string;
  location: string;
  safetyDataSheetAvailable: boolean;
  usageNotes: string;
  disposedDate?: string;
}

export interface ProbeCalibrationLog {
  id: number;
  date: string;
  probeId: string;
  icePointReading: string;
  boilingPointReading: string;
  result: 'Pass' | 'Fail';
  comments: string;
  calibratedBy: string;
}

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface RecipeCosting {
  totalCost: string;
  sellingPrice: string;
  taxRate: string;
  grossProfitPercent: string;
  foodCostPercent: string;
}

export interface Recipe {
  id?: string;
  title: string;
  description: string;
  yields: string;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
  costing?: RecipeCosting;
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

export interface ProfileData {
  image?: string;
  firstName?: string;
  lastName?: string;
  age?: string;
  country?: string;
  city?: string;
  placeOfWork?: string;
}

// Fix: Added ThemeName and Theme types for theme context.
export type ThemeName = 'dark' | 'light' | 'evergreen';

export interface Theme {
  name: string;
  classes: {
    appBg: string;
    headerBg: string;
    cardBg: string;
    cardBorder: string;
    textHeading: string;
    textColor: string;
    textAccent: string;
    textMuted: string;
    buttonBg: string;
    buttonHoverBg: string;
    buttonRing: string;
    buttonFocusRingOffset: string;
    navButtonActiveBg: string;
    navButtonHoverBg: string;
    inputBg: string;
    inputText: string;
    inputBorder: string;
    placeholderText: string;
  };
}

export type LogType = 'HaccpLog' | 'OpeningClosingCheck' | 'CoolingLog' | 'CosshLog' | 'ProbeCalibrationLog';

export interface RecentlyDeletedItem {
  type: LogType;
  item: HaccpLog | OpeningClosingCheck | CoolingLog | CosshLog | ProbeCalibrationLog;
  context?: { [key: string]: any }; // For nested items, e.g., { stockTakeId: number }
}
