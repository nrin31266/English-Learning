import type { IWord } from '@/types'
import { timeAgo } from '@/utils/timeUtils'
import React from 'react'

interface IRecentWordProps {
    word: IWord
}

const RecentWord = ({ word }: IRecentWordProps) => {
  return (
    <div  className={`not-first:border-t not-first:border-gray-300 p-2 flex justify-between relative items-center
    `}>
        <h3 className='font-medium'>{word.displayWord} {word.wordType ? <span className='text-xs text-gray-600 '>
            ({word.wordType})
        </span> : ''}</h3>
        <div className={` h-2 w-2 mt-2 rounded-full
            ${word.isValidWord ? 'bg-green-600' : 'bg-amber-600'}`}></div>
            <span className='absolute top-0 right-0 bg-background text-xs text-gray-500 px-1 rounded-br-md'>{timeAgo(new Date(word.createdAt))}</span>
    </div>
  )
}

export default RecentWord