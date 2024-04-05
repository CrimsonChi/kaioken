// import "./styles.css"
import { mount } from 'kaioken'
import App from './App'

const root = document.querySelector<HTMLDivElement>('#app')!
mount(App, root)

chrome.devtools.panels.create(`Kaioken Devtools`, '', '../../devtools.html', function () {
  console.log('devtools panel created')
})
