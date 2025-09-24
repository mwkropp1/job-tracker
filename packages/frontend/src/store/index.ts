import { configureStore } from '@reduxjs/toolkit';

import { uiSlice } from './slices/uiSlice';

/**
 * Redux store configuration
 *
 * Configures the main Redux store with:
 * - UI slice for global application state
 * - Custom middleware configuration with serialization checks
 * - DevTools enabled for development debugging
 */
export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: true,
});

/** Root state type derived from the store's getState return type */
export type RootState = ReturnType<typeof store.getState>;

/** App dispatch type with all action creators properly typed */
export type AppDispatch = typeof store.dispatch;
