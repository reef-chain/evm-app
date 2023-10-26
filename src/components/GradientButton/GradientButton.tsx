import React from 'react'
import './styles.css'

export interface Props{
    func?:any;
    title:String;
    isEnabled?:false;
    mini?:boolean;
}

function GradientButton({func,title,isEnabled,mini}:Props) {
  return (
    <button className={`${(isEnabled==false)?'gradient-button-disabled':mini?'gradient-button-mini':'gradient-button'} `} onClick={func}>{title}</button>
  )
}

export default GradientButton