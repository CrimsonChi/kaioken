console.info('contentScript is running')

var port = chrome.runtime.connect({ name: 'kaioken-devtools' })
//port.postMessage({ joke: 'Knock knock' })
port.onMessage.addListener(function (msg) {
  //if (msg.question === "Who's there?") port.postMessage({ answer: 'Madame' })
  //else if (msg.question === 'Madame who?') port.postMessage({ answer: 'Madame... Bovary' })
})
