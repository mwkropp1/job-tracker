import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  isLoading: boolean;
  message: string | null;
  theme: 'light' | 'dark';
}

const initialState: UiState = {
  isLoading: false,
  message: null,
  theme: 'light',
};

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

export const { setLoading, setMessage, toggleTheme, clearMessage } =
  uiSlice.actions;