import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

import type { RootState, AppDispatch } from '@/store';

/**
 * Typed Redux hooks for use throughout the application
 *
 * These hooks provide type safety for Redux operations by pre-typing
 * the dispatch and selector hooks with the app's specific store types.
 */

/**
 * Typed dispatch hook
 *
 * Use this instead of the plain `useDispatch` to get proper TypeScript
 * support for dispatched actions.
 *
 * @returns Typed dispatch function
 */
export const useAppDispatch: () => AppDispatch = useDispatch;

/**
 * Typed selector hook
 *
 * Use this instead of the plain `useSelector` to get proper TypeScript
 * support for accessing store state.
 *
 * @returns Typed selector hook with RootState type
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;