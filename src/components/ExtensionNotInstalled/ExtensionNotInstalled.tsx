function ExtensionNotInstalled() {
  return (
    <div> 
              <div className='no-ext-banner'>
              <div className="no-ext-headline">
              REEF Chain Extension
              </div>
              <br />
              App uses browser extension to get accounts and securely sign transactions.<br/>Please install the extension and refresh the page.
              </div>
              <div className='no-ext-imgs'>
                <img src="/1.png" className='no-ext-img' alt="" />
                <img src="/2.png" className='no-ext-img' alt="" />
              </div>
              <div className='no-ext-tagline'>
              This browser extension manages accounts and allows signing of transactions. Besides that it enables easy overview and transfers of native REEF and other tokens. With swap you can access the Reefswap pools and exchange tokens.
              </div>
              <div className='extension-download-buttons' >
              <a className='extension-download' href='https://addons.mozilla.org/en-US/firefox/addon/reef-js-extension/'>
                Download for Firefox
              </a>
              <a className='extension-download' href='https://chrome.google.com/webstore/detail/reef-chain-wallet-extensi/mjgkpalnahacmhkikiommfiomhjipgjn' >
                Download for Chrome
              </a>
              </div>
              </div>
  )
}

export default ExtensionNotInstalled