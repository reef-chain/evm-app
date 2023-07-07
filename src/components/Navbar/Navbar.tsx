import './styles.css'
import React from "react";

function Navbar() {
  return (
    <div className='navbar'>
        <img src='/reef-logo.svg' className='logo' alt="reef-logo" />
        <div className='nav-title'>Custom Reef EVM address</div>
    </div>
  )
}

export default Navbar
