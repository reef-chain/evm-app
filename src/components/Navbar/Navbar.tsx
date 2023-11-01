import GradientButton from '../GradientButton/GradientButton';
import './styles.css'
function Navbar(props:{isOpen:boolean,setIsOpen:(isOpen:boolean)=>void,isMainnet:boolean}) {
  return (
    <div className='navbar'>
        <img src={props.isMainnet?`/reef-logo.svg`:'/reef-logo-testnet.svg'} className='logo' alt="reef-logo" />
        <div className='nav-title'>Custom Reef EVM address</div>
        <div style={{position:'absolute',right:'10px'}}><GradientButton title={'Change Account'} func={()=>{
            props.setIsOpen(!props.isOpen);
          }} mini={true}/></div>
    </div>
  )
}

export default Navbar
