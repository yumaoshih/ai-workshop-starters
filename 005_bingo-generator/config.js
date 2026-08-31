// 部署 Cloudflare Worker 後，把 signalUrl 更新為該 Worker 的 /ws 網址。
// 本機開發留空時，會自動使用目前網址的 /ws。
window.BINGO_CONFIG = Object.freeze({
  signalUrl: '',
});
