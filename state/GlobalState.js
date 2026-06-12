import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { timeList } from '@/utils/timeLabel';

const DEFAULT_ID = 'default';

function makeDefaultSchedule() {
  const today = new Date();
  return {
    id: DEFAULT_ID,
    name: '我默认课程表',
    schedulePeriod: [1, 20],
    startDate: [today.getFullYear(), today.getMonth(), today.getDate()],
    timeLabelList: timeList,
    myClassList: [],
  };
}

const initialState = {
  schedules: [makeDefaultSchedule()],
  activeScheduleId: DEFAULT_ID,
  secondScheduleId: null,
  needUpdate: [],
  defaultTab: 'index',
  notificationSettings: {
    classReminder: false,
    dailyDigest: false,
  },
  isHydrated: false,
};

function updateActive(state, fields) {
  return {
    ...state,
    needUpdate: [],
    schedules: state.schedules.map(s =>
      s.id === state.activeScheduleId ? { ...s, ...fields } : s
    ),
  };
}

function globalReducer(state, action) {
  switch (action.type) {
    case 'SET_SCHEDULE_PERIOD':
      return updateActive(state, { schedulePeriod: action.payload });
    case 'SET_START_DATE':
      return updateActive(state, { startDate: action.payload });
    case 'SET_TIME_LABEL_LIST':
      return updateActive(state, { timeLabelList: action.payload });
    case 'SET_MY_CLASS_LIST':
      return updateActive(state, { myClassList: action.payload });
    case 'SET_NEED_UPDATE':
      return { ...state, needUpdate: action.payload };

    case 'CREATE_SCHEDULE': {
      const today = new Date();
      const s = {
        id: Date.now().toString(),
        name: action.payload.name || '新课表',
        schedulePeriod: [1, 20],
        startDate: [today.getFullYear(), today.getMonth(), today.getDate()],
        timeLabelList: timeList,
        myClassList: [],
      };
      return { ...state, schedules: [...state.schedules, s] };
    }

    case 'IMPORT_SCHEDULE': {
      const today = new Date();
      const s = {
        id: Date.now().toString(),
        name: action.payload.name || '来自分享',
        schedulePeriod: action.payload.schedulePeriod ?? [1, 20],
        startDate: action.payload.startDate ?? [today.getFullYear(), today.getMonth(), today.getDate()],
        timeLabelList: action.payload.timeLabelList ?? timeList,
        myClassList: action.payload.myClassList ?? [],
      };
      return { ...state, schedules: [...state.schedules, s] };
    }

    case 'DELETE_SCHEDULE': {
      if (state.schedules.length <= 1) return state;
      const next = state.schedules.filter(s => s.id !== action.payload.id);
      return {
        ...state,
        schedules: next,
        activeScheduleId: state.activeScheduleId === action.payload.id ? next[0].id : state.activeScheduleId,
        secondScheduleId: state.secondScheduleId === action.payload.id ? null : state.secondScheduleId,
      };
    }

    case 'RENAME_SCHEDULE':
      return {
        ...state,
        schedules: state.schedules.map(s =>
          s.id === action.payload.id ? { ...s, name: action.payload.name } : s
        ),
      };

    case 'SWITCH_ACTIVE_SCHEDULE':
      return { ...state, activeScheduleId: action.payload.id };

    case 'SET_SECOND_SCHEDULE':
      return { ...state, secondScheduleId: action.payload.id };

    case 'SET_DEFAULT_TAB':
      return { ...state, defaultTab: action.payload };

    case 'SET_NOTIFICATION_SETTINGS':
      return { ...state, notificationSettings: action.payload };

    case 'HYDRATION_COMPLETE':
      return { ...state, isHydrated: true };

    case 'LOAD_STATE_FROM_STORAGE': {
      const saved = action.payload;
      if (!saved.schedules) {
        // 迁移旧平铺结构
        const today = new Date();
        const migrated = {
          id: DEFAULT_ID,
          name: '我默认课程表',
          schedulePeriod: saved.schedulePeriod ?? [1, 20],
          startDate: saved.startDate ?? [today.getFullYear(), today.getMonth(), today.getDate()],
          timeLabelList: saved.timeLabelList ?? timeList,
          myClassList: saved.myClassList ?? [],
        };
        return {
          ...state,
          schedules: [migrated],
          activeScheduleId: DEFAULT_ID,
          secondScheduleId: null,
          needUpdate: [],
          defaultTab: saved.defaultTab ?? 'index',
          notificationSettings: saved.notificationSettings ?? { classReminder: false, dailyDigest: false },
          isHydrated: true,
        };
      }
      return {
        ...state,
        ...saved,
        needUpdate: [],
        defaultTab: saved.defaultTab ?? 'index',
        notificationSettings: saved.notificationSettings ?? { classReminder: false, dailyDigest: false },
        isHydrated: true,
      };
    }

    case 'RESET_ALL_DATA':
      return {
        schedules: [makeDefaultSchedule()],
        activeScheduleId: DEFAULT_ID,
        secondScheduleId: null,
        needUpdate: [],
        defaultTab: 'index',
        notificationSettings: { classReminder: false, dailyDigest: false },
        isHydrated: true,
      };

    default:
      return state;
  }
}

const GlobalStateContext = createContext({ state: initialState, dispatch: (_action) => {} });

export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  useEffect(() => { loadStateFromStorage(dispatch); }, []);
  useEffect(() => { saveStateToStorage(state); }, [state]);

  return (
    <GlobalStateContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) throw new Error('useGlobalState must be used within GlobalStateProvider');
  return context;
};

const saveStateToStorage = async (state) => {
  try {
    await AsyncStorage.setItem('appState', JSON.stringify({
      schedules: state.schedules,
      activeScheduleId: state.activeScheduleId,
      secondScheduleId: state.secondScheduleId,
      defaultTab: state.defaultTab,
      notificationSettings: state.notificationSettings,
    }));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
};

const loadStateFromStorage = async (dispatch) => {
  try {
    const saved = await AsyncStorage.getItem('appState');
    if (saved) {
      dispatch({ type: 'LOAD_STATE_FROM_STORAGE', payload: JSON.parse(saved) });
    } else {
      dispatch({ type: 'HYDRATION_COMPLETE' });
    }
  } catch (e) {
    console.error('Failed to load state:', e);
    dispatch({ type: 'HYDRATION_COMPLETE' });
  }
};

export const resetAllData = (dispatch) => {
  dispatch({ type: 'RESET_ALL_DATA' });
  AsyncStorage.removeItem('appState').catch(e => console.error('Failed to clear storage:', e));
};
