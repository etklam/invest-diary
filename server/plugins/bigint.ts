export default defineNitroPlugin(() => {
  // @ts-ignore
  BigInt.prototype.toJSON = function () {
    return this.toString()
  }
})
