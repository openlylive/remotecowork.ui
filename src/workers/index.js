import PromiseWorker from 'promise-worker'
import Worker from 'worker-loader!./cryptoWorker.js' // eslint-disable-line

const worker = new Worker()
const promiseWorker = new PromiseWorker(worker)

const send = (type, message) => promiseWorker.postMessage({
  type,
  message
})

export default {
  send
}
