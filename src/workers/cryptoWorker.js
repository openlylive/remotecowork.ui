import ab2str from 'arraybuffer-to-string'
import str2ab from 'string-to-arraybuffer'
// const sodium = require('libsodium-wrappers')

const webCrypto = window.crypto.subtle || window.msCrypto.subtle // TODO: add import for other browsers

const asymmRsaParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: { name: 'SHA-256' }
}
const symmAESParams = {
  name: 'AES-GCM',
  length: 128
}

let asymmetricPrivateKey = null
let encoder = new TextEncoder()
let decoder = new TextDecoder()
export default ({
  generateSymmetricKey () {
    return new Promise(async (resolve, reject) => {
      console.time('generateSymmetricKey')
      webCrypto.generateKey(symmAESParams, true, ['encrypt', 'decrypt'])
        .then(async (key) => {
          console.timeEnd('generateSymmetricKey')
          resolve(key)
        })
        .catch((err) => {
          reject(err)
        })
    })
  },

  symmDecrypt (body, key) {
    return new Promise(async (resolve, reject) => {
      if (!key) reject(new Error('No symmetric key found'))
      if (!body.ciphertext) {
        resolve('')
        return
      }

      console.time('symmDecrypt')
      var an = body.iv
      webCrypto.decrypt({
        ...symmAESParams,
        iv: an
      }, key, body.ciphertext).then(result => {
        console.timeEnd('symmDecrypt')
        resolve(decoder.decode(result))
      }).catch(e => {
        reject(e)
      })
    })
  },

  symmEncrypt (text, key) {
    return new Promise(async (resolve, reject) => {
      if (!key) {
        reject(new Error('No symmetric key found'))
        return
      }
      if (!text) {
        resolve('')
        return
      }
      let int = Math.floor(Math.random() * Math.floor(10))
      console.time('symmEncrypt_' + int)
      console.time('getRandomValues' + int)
      var an = window.crypto.getRandomValues(new Uint8Array(16))
      console.timeEnd('getRandomValues' + int)
      webCrypto.encrypt({
        ...symmAESParams,
        iv: an
      }, key, encoder.encode(text)).then(result => {
        console.timeEnd('symmEncrypt_' + int)
        resolve({ ciphertext: result, iv: an })
      }).catch(e => {
        reject(e)
      })
    })
  },
  generateAsymmetricKeypair () {
    return new Promise((resolve, reject) => {
      webCrypto.generateKey(asymmRsaParams, true, ['encrypt', 'decrypt']).then(async key => {
        asymmetricPrivateKey = this.arrayBufferToPem(await webCrypto.exportKey('pkcs8', key.privateKey), true)
        var pubKey = this.arrayBufferToPem(await webCrypto.exportKey('spki', key.publicKey))

        resolve({
          private: asymmetricPrivateKey,
          public: pubKey
        })
      }).catch(e => {
        reject(e)
      })
    })
  },
  generatekey (key) {
    return new Promise((resolve, reject) => {
      asymmetricPrivateKey = key
      resolve({
        private: asymmetricPrivateKey
      })
    })
  },

  asymmDecrypt (ciphertext) {
    return new Promise(async (resolve, reject) => {
      if (asymmetricPrivateKey == null) reject(new Error('No privateKey found'))
      if (!ciphertext) {
        resolve('')
        return
      }
      console.time('asymmDecrypt')
      var privateKey = await webCrypto.importKey('pkcs8', this.pemToArrayBuffer(asymmetricPrivateKey), asymmRsaParams, true, ['decrypt'])
      // webCrypto.decrypt(asymmRsaParams, privateKey, str2ab(ciphertext)).then(result => {
      webCrypto.decrypt(asymmRsaParams, privateKey, str2ab(ciphertext)).then(result => {
        console.time('asymmDecrypt')
        resolve(ab2str(result, 'base64'))
      }).catch(e => {
        reject(e)
      })
    })
  },
  async asymmEncrypt (text, pubKey) {
    return new Promise(async (resolve, reject) => {
      console.time('asymmEncrypt')
      var key = this.pemToArrayBuffer(pubKey)
      var publicKey = await webCrypto.importKey('spki', key, asymmRsaParams, true, ['encrypt'])
      if (publicKey == null) reject(new Error('No public key found'))
      if (!text) {
        resolve('')
        return
      }

      webCrypto.encrypt(asymmRsaParams, publicKey, str2ab(text)).then(result => {
        console.timeEnd('asymmEncrypt')
        resolve(ab2str(result, 'base64'))
      }).catch(e => {
        reject(e)
      })
    })
  },
  pemToArrayBuffer (pem, isPrivate = false) {
    return str2ab(pem)

    // const b64Lines = pem.replace('\n', '')
    // const keyType = isPrivate ? 'PRIVATE' : 'PUBLIC'
    // const b64Prefix = b64Lines.replace(`-----BEGIN ${keyType} KEY-----`, '')
    // const b64Final = b64Prefix.replace(`-----END ${keyType} KEY-----`, '')
  },
  arrayBufferToPem (ab, isPrivate = false) {
    return ab2str(ab, 'base64')
    // const keyType = isPrivate ? 'PRIVATE' : 'PUBLIC'
    // const b64Prefix = `-----BEGIN ${keyType} KEY-----`
    // const b64Final = `-----END ${keyType} KEY-----`

    // return `${b64Prefix}\n${ab2str(ab, 'base64')}\n${b64Final}`
  },
  async pemKeyToKey (symPemKey) {
    console.time('pemKeyToKey')
    var key = await webCrypto.importKey('raw', str2ab(symPemKey), symmAESParams, true, ['encrypt', 'decrypt'])
    console.log('key:', key)
    console.timeEnd('pemKeyToKey')
    return key
  },
  async keyToPemKey (key) {
    console.time('keyToPemKey')
    return new Promise(async (resolve, reject) => {
      var hmm = ab2str(await webCrypto.exportKey('raw', key), 'base64')
      console.timeEnd('keyToPemKey')
      resolve(hmm)
    })
  }
})
