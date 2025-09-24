import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * UI state interface
 *
 * Manages global UI state including loading states, user messages,
 * and theme preferences.
 */
interface UiState {
  /** Global loading state indicator */
  isLoading: boolean;
  /** User-facing message for notifications or status updates */
  message: string | null;
  /** Current theme preference */
  theme: 'light' | 'dark';
}

const initialState: UiState = {
  isLoading: false,
  message: null,
  theme: 'light',
};

/**
 * UI slice for managing global UI state
 *
 * Handles loading states, user messages, and theme toggling functionality.
 * Uses Redux Toolkit's createSlice for simplified reducer and action creation.
 */
export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setMessage: (state, action: PayloadAction<string | null>) => {
      state.message = action.payload;
    },
    toggleTheme: state => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    clearMessage: state => {
      state.message = null;
    },
  },
});

/**
 * UI action creators
 *
 * Auto-generated action creators from the uiSlice reducers.
 * These actions can be dispatched to update the UI state.
 */
export const { setLoading, setMessage, toggleTheme, clearMessage } =
  uiSlice.actions;