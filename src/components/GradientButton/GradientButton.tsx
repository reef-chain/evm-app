import React from 'react'
import './styles.css'

export interface Props{
    func?:any;
    title:String;
}

function GradientButton({func,title}:Props) {
  return (
    <button className='gradient-button' onClick={func}>{title}</button>
  )
}

export default GradientButton