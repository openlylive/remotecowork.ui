const sodium = require('libsodium-wrappers')

let encoder = new TextEncoder()
let decoder = new TextDecoder()
export default ({
  generateCryptoBoxKeyPair () {
    return sodium.crypto_box_keypair()
  },
  // Crypto boxes are for assymetric encryption
  // https://libsodium.gitbook.io/doc/public-key_cryptography/authenticated_encryption#combined-mode
  createCryptoBox (text, pubKey, privKey) {
    if (pubKey == null || text == null) return (new Error('No public key found'))

    // console.log({ 'text': text }, { 'pubKey receiver': pubKey }, { 'privkey sender': privKey })
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)
    var ciphertext = sodium.crypto_box_easy(text, nonce, pubKey, privKey)
    return { ciphertext, nonce }
  },
  openCryptoBox (body, pubKey, privKey) {
    // const ciphertext = this.toUint8Array(this.a2b(body.ciphertext))
    // const nonce = this.toUint8Array(this.a2b(body.nonce))
    const ciphertext = this.toUint8Array(body.ciphertext)
    const nonce = this.toUint8Array(body.nonce)
    var plaintext = sodium.crypto_box_open_easy(ciphertext, nonce, pubKey, privKey)
    // Plaintext are still 'bytes'
    return (plaintext)
  },
  bytesToText (bytes) {
    return decoder.decode(bytes)
  },
  textToBytes (text) {
    return encoder.encode(text)
  },
  // Secret boxes are for symmetric encryption
  // https://libsodium.gitbook.io/doc/secret-key_cryptography/authenticated_encryption#example
  generateSecretBoxKey () {
    return sodium.crypto_secretbox_keygen()
  },
  createSecretBox (plaintext, key) {
    plaintext = encoder.encode(plaintext)
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
    var ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, key)
    return { ciphertext, nonce }
  },
  openSecretBox (cryptobox, key) {
    var ciphertext = this.toUint8Array(cryptobox.ciphertext)
    var nonce = this.toUint8Array(cryptobox.nonce)
    var plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key)
    return plaintext
  },
  toUint8Array (obj) {
    return new Uint8Array(Object.values(obj))
  },
  b2a (obj) {
    return Buffer.from(obj).toString('base64')
  },
  a2b (obj) {
    return new Uint8Array(Array.prototype.slice.call(Buffer.from(obj, 'base64'), 0))
  },
  edPkToCurve (publicKey) {
    return sodium.crypto_sign_ed25519_pk_to_curve25519(publicKey)
  },
  verify3botSignature (signature, publicKey) {
    publicKey = this.toUint8Array(this.a2b(publicKey))
    signature = this.a2b(signature)
    return sodium.crypto_sign_open(signature, publicKey)
  }
})
