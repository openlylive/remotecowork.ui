import Axios from 'axios'
import config from '../../public/static'

export default {
  getUserInfo (userName) {
    return Axios.get(`${config.nodeserver}/users/${userName}`)
  }
}
