import { create } from 'zustand'

const useAthleteStore = create((set) => ({

  athlete: null,
  sessions: JSON.parse(localStorage.getItem('gst-sessions') || '[]'),

  setAthlete: (data) => set({ athlete: data }),

  saveSession: (result) => set((state) => {
    const updated = [result, ...state.sessions]
    localStorage.setItem('gst-sessions', JSON.stringify(updated))
    return { sessions: updated }
  }),

  clearAthlete: () => set({ athlete: null }),

}))

export default useAthleteStore