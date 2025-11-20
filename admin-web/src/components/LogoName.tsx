import React from 'react'

const LogoName = ({fontSize} : {fontSize?: string}) => {
  return (
    <div>
        <span className='fugaz-one-regular text-orange-400' style={{ fontSize }}>{`Meow Talk`}</span>
    </div>
  )
}

export default LogoName