import config from './configs/config'
import configlocal from './configs/config.local'

var c = config
if (process.env.NODE_ENV !== 'production') c = configlocal

export default (c)
