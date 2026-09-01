// 公開版使用 Cloudflare Worker；本機與區網開發仍連回目前的伺服器。
const bingoHost = window.location.hostname;
const isLocalBingoHost = window.location.protocol === 'file:'
  || bingoHost === 'localhost'
  || bingoHost === '127.0.0.1'
  || bingoHost === '::1'
  || /^10\./.test(bingoHost)
  || /^192\.168\./.test(bingoHost)
  || /^172\.(1[6-9]|2\d|3[01])\./.test(bingoHost);

window.BINGO_CONFIG = Object.freeze({
  signalUrl: isLocalBingoHost ? '' : 'wss://ai-workshop-bingo-rooms.simonadsa.workers.dev/ws',
});
