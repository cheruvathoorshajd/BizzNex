import { configureStore, combineReducers, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import ui from './uiSlice';
import auth, { logout, setCredentials } from './authSlice';
import { api } from '../services/api';

const rootReducer = combineReducers({
  ui,
  auth,
  [api.reducerPath]: api.reducer,
});
export type RootState = ReturnType<typeof rootReducer>;

const UI_KEY = 'bizznex-ui';
const AUTH_KEY = 'bizznex-auth';

/** `?start=signup` / `?start=signin` deep-links past the landing page straight to that auth tab
 *  (used by the case study's "Open BizzNex"). The param is stripped from the URL once read. */
function deepLink(): 'signup' | 'signin' | null {
  try {
    const url = new URL(window.location.href);
    const start = url.searchParams.get('start');
    if (start !== 'signup' && start !== 'signin') return null;
    url.searchParams.delete('start');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    return start;
  } catch {
    return null;
  }
}

function load(): any {
  const start = deepLink();
  try {
    const p: any = {};
    const ui = localStorage.getItem(UI_KEY);
    const auth = localStorage.getItem(AUTH_KEY);
    if (ui) p.ui = { ...JSON.parse(ui), introSeen: false }; // every visit opens on the landing page
    if (start) p.ui = { language: 'en', theme: 'light', ...p.ui, introSeen: true, authMode: start };
    if (auth) p.auth = JSON.parse(auth);
    return Object.keys(p).length ? p : undefined;
  } catch {
    return start ? { ui: { language: 'en', theme: 'light', introSeen: true, authMode: start } } : undefined;
  }
}

// Drop every cached query when the signed-in user changes, so one account never sees another's data.
const session = createListenerMiddleware();
session.startListening({
  matcher: isAnyOf(logout, setCredentials),
  effect: (_action, api_) => { api_.dispatch(api.util.resetApiState()); },
});

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: load(),
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(session.middleware).concat(api.middleware),
});

let timer: number | undefined;
store.subscribe(() => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      const s = store.getState();
      localStorage.setItem(UI_KEY, JSON.stringify(s.ui));
      localStorage.setItem(AUTH_KEY, JSON.stringify(s.auth));
    } catch {
      /* ignore */
    }
  }, 150);
});

export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
