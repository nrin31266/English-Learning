import React from 'react'
import { Spinner } from './ui/spinner'

const FullScreenSpinner = ({label} : {label: string}) => {
  return (
    <div className='h-screen w-screen flex items-center justify-center'>
     <Spinner/>
     <p className='ml-4 text-lg'>{label}</p>
    </div>
  )
}

export default FullScreenSpinner