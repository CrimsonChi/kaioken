console.log('background is running')

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === 'kaioken-devtools') {
  }
})
