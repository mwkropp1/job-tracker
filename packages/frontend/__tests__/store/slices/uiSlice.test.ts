import { describe, it, expect } from 'vitest';
import { uiSlice, setLoading, setMessage, toggleTheme, clearMessage } from '@/store/slices/uiSlice';

describe('uiSlice', () => {
  const initialState = {
    isLoading: false,
    message: null,
    theme: 'light' as const,
  };

  describe('reducers', () => {
    describe('setLoading', () => {
      it('should set loading to true', () => {
        const action = setLoading(true);
        const result = uiSlice.reducer(initialState, action);

        expect(result.isLoading).toBe(true);
      });

      it('should set loading to false', () => {
        const state = { ...initialState, isLoading: true };
        const action = setLoading(false);
        const result = uiSlice.reducer(state, action);

        expect(result.isLoading).toBe(false);
      });
    });

    describe('setMessage', () => {
      it('should set a message', () => {
        const message = 'Test message';
        const action = setMessage(message);
        const result = uiSlice.reducer(initialState, action);

        expect(result.message).toBe(message);
      });

      it('should set message to null', () => {
        const state = { ...initialState, message: 'Existing message' };
        const action = setMessage(null);
        const result = uiSlice.reducer(state, action);

        expect(result.message).toBe(null);
      });

      it('should overwrite existing message', () => {
        const state = { ...initialState, message: 'Old message' };
        const newMessage = 'New message';
        const action = setMessage(newMessage);
        const result = uiSlice.reducer(state, action);

        expect(result.message).toBe(newMessage);
      });
    });

    describe('toggleTheme', () => {
      it('should toggle theme from light to dark', () => {
        const state = { ...initialState, theme: 'light' as const };
        const action = toggleTheme();
        const result = uiSlice.reducer(state, action);

        expect(result.theme).toBe('dark');
      });

      it('should toggle theme from dark to light', () => {
        const state = { ...initialState, theme: 'dark' as const };
        const action = toggleTheme();
        const result = uiSlice.reducer(state, action);

        expect(result.theme).toBe('light');
      });

      it('should maintain other state properties when toggling theme', () => {
        const state = {
          ...initialState,
          theme: 'light' as const,
          isLoading: true,
          message: 'Test message',
        };
        const action = toggleTheme();
        const result = uiSlice.reducer(state, action);

        expect(result.theme).toBe('dark');
        expect(result.isLoading).toBe(true);
        expect(result.message).toBe('Test message');
      });
    });

    describe('clearMessage', () => {
      it('should clear message when message exists', () => {
        const state = { ...initialState, message: 'Test message' };
        const action = clearMessage();
        const result = uiSlice.reducer(state, action);

        expect(result.message).toBe(null);
      });

      it('should keep message as null when already null', () => {
        const state = { ...initialState, message: null };
        const action = clearMessage();
        const result = uiSlice.reducer(state, action);

        expect(result.message).toBe(null);
      });

      it('should maintain other state properties when clearing message', () => {
        const state = {
          ...initialState,
          message: 'Test message',
          isLoading: true,
          theme: 'dark' as const,
        };
        const action = clearMessage();
        const result = uiSlice.reducer(state, action);

        expect(result.message).toBe(null);
        expect(result.isLoading).toBe(true);
        expect(result.theme).toBe('dark');
      });
    });
  });

  describe('action creators', () => {
    it('should create setLoading action with correct type and payload', () => {
      const action = setLoading(true);

      expect(action.type).toBe('ui/setLoading');
      expect(action.payload).toBe(true);
    });

    it('should create setMessage action with correct type and payload', () => {
      const message = 'Test message';
      const action = setMessage(message);

      expect(action.type).toBe('ui/setMessage');
      expect(action.payload).toBe(message);
    });

    it('should create toggleTheme action with correct type', () => {
      const action = toggleTheme();

      expect(action.type).toBe('ui/toggleTheme');
      expect(action.payload).toBeUndefined();
    });

    it('should create clearMessage action with correct type', () => {
      const action = clearMessage();

      expect(action.type).toBe('ui/clearMessage');
      expect(action.payload).toBeUndefined();
    });
  });

  describe('initial state', () => {
    it('should return the initial state when called with undefined state', () => {
      const result = uiSlice.reducer(undefined, { type: 'unknown' });

      expect(result).toEqual(initialState);
    });
  });
});