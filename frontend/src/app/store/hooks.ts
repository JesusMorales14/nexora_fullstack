import { useDispatch, useSelector } from 'react-redux'

import type { AppDispatch, RootState } from '@/app/store/store'

// Use these instead of the plain react-redux hooks so state and thunks stay typed.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
