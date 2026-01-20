import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, PersistConfig } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './authSlice.tsx';

// Define the shape of root state 
export type RootState = ReturnType<typeof store.getState>;

// Define dispatch type 
export type AppDispatch = typeof store.dispatch;

// Persist config
const persistConfig: PersistConfig<ReturnType<typeof authReducer>> = {
  key: 'root',
  storage,
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, authReducer);

// Configure store
export const store = configureStore({
  reducer: {
    auth: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PAUSE', 'persist/PURGE', 'persist/REGISTER'],
      },
    }),
});

// Create persistor
export const persistor = persistStore(store);