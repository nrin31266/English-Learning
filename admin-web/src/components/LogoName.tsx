import React from 'react'

const LogoName = ({fontSize} : {fontSize?: string}) => {
  return (
    <div>
        <span className='fugaz-one-regular text-orange-400 h-full' style={{ fontSize }}>{`MeowTalk`}</span>
    </div>
  )
}

export default LogoName