import Moralis from 'moralis'

const MORALIS_API_KEY = process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_API_KEY

export const initializeMoralis = async () => {
  if (!Moralis.Core.isStarted) {
    await Moralis.start({
      apiKey: MORALIS_API_KEY
    })
  }
}

export { Moralis }
