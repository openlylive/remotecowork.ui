import ab2str from 'arraybuffer-to-string'
import str2ab from 'string-to-arraybuffer'
const sodium = require('libsodium-wrappers')
const webCrypto = window.crypto.subtle || window.msCrypto.subtle // TODO: add import for other browsers

const asymmRsaParams = {
  name: 'RSA-OAEP',
  modulusLength: 4096,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: { name: 'SHA-256' }
}
const symmRsaParams = {
  name: 'AES-CBC',
  length: 256
}

let asymmetricPrivateKey = null
let encoder = new TextEncoder()
let decoder = new TextDecoder()
export default ({
  generateSymmetricKey () {
    return new Promise(async (resolve, reject) => {
      webCrypto.generateKey(symmRsaParams, true, ['encrypt', 'decrypt'])
        .then(async (key) => {
          resolve(this.arrayBufferToPem(await webCrypto.exportKey('raw', key)))
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
      var symkey = await webCrypto.importKey('raw', str2ab(key), symmRsaParams, true, ['encrypt', 'decrypt'])
      var an = body.iv
      webCrypto.decrypt({
        ...symmRsaParams,
        iv: an
      }, symkey, body.ciphertext).then(result => {
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
      var symkey = await webCrypto.importKey('raw', str2ab(key), symmRsaParams, true, ['encrypt', 'decrypt'])
      var an = window.crypto.getRandomValues(new Uint8Array(16))
      webCrypto.encrypt({
        ...symmRsaParams,
        iv: an
      }, symkey, encoder.encode(text)).then(result => {
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

  asymmDecrypt (text) {
    return new Promise(async (resolve, reject) => {
      if (asymmetricPrivateKey == null) reject(new Error('No privateKey found'))
      if (!text) {
        resolve('')
        return
      }
      var privateKey = await webCrypto.importKey('pkcs8', this.pemToArrayBuffer(asymmetricPrivateKey), asymmRsaParams, true, ['decrypt'])
      webCrypto.decrypt(asymmRsaParams, privateKey, str2ab(text)).then(result => {
        resolve(ab2str(result, 'base64'))
      }).catch(e => {
        reject(e)
      })
    })
  },
  async asymmEncrypt (text, pubKey) {
    var key = this.pemToArrayBuffer(pubKey)

    var publicKey = await webCrypto.importKey('spki', key, asymmRsaParams, true, ['encrypt'])

    return new Promise(async (resolve, reject) => {
      if (publicKey == null) reject(new Error('No public key found'))
      if (!text) {
        resolve('')
        return
      }

      webCrypto.encrypt(asymmRsaParams, publicKey, str2ab(text)).then(result => {
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
  // all libdosium here
  generateAsymmetricKeypairLibsodium () {
    return new Promise(async (resolve, reject) => {
      // var phrase = bip39.entropyToMnemonic(sodium.randombytes_buf(sodium.crypto_box_SEEDBYTES / 2))
      // var ken = new TextEncoder().encode(bip39.mnemonicToEntropy(phrase))
      console.log(sodium)

      var keys = sodium.crypto_sign_keypair()

      console.log(keys)
      // resolve({
      //   privateKey: encodeBase64(keys.privateKey),
      //   publicKey: encodeBase64(keys.publicKey)
      // })
    })
  }
})
