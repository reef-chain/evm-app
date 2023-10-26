import GradientButton from '../GradientButton/GradientButton';
import './styles.css'
import React from "react";

function Navbar(props:{isOpen:boolean,setIsOpen:(isOpen:boolean)=>void}) {
  return (
    <div className='navbar'>
        <img src='/reef-logo.svg' className='logo' alt="reef-logo" />
        <div className='nav-title'>Custom Reef EVM address</div>
        <div style={{position:'absolute',right:'10px'}}><GradientButton title={'Change Account'} func={()=>{
            props.setIsOpen(!props.isOpen);
          }} mini={true}/></div>
    </div>
  )
}

export default Navbar
