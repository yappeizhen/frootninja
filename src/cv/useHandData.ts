import { useContext } from 'react'
import { HandTrackerContext } from '@/cv/HandTrackerContext'

export const useHandData = () => {
  const context = useContext(HandTrackerContext)
  if (!context) {
    throw new Error('useHandData must be used within HandTrackerProvider')
  }
  return context
}

