const os = require('os');
const net = require('net');

/**
 * Descoberta "best effort": varre os últimos 254 endereços da(s)
 * sub-rede(s) locais tentando abrir a porta 8001 (porta que TVs
 * Samsung Tizen deixam aberta pra apps de controle). Não é tão
 * elegante quanto SSDP/mDNS, mas funciona em qualquer rede doméstica
 * sem exigir bibliotecas extras nem multicast (que em muitas redes
 * Wi-Fi de operadora/roteador vem bloqueado).
 */

function getLocalSubnets() {
  const interfaces = os.networkInterfaces();
  const subnets = [];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const parts = addr.address.split('.');
        subnets.push(parts.slice(0, 3).join('.')); // ex: "192.168.10"
      }
    }
  }
  return [...new Set(subnets)];
}

function checkPort(ip, port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (isOpen) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(isOpen);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, ip);
  });
}

/**
 * Varre a(s) sub-rede(s) local(is) em paralelo (com um limite de
 * concorrência) procurando hosts com a porta 8001 aberta.
 * Retorna uma lista de IPs candidatos — ainda não confirma marca
 * nem nome, isso fica pro passo de "adicionar TV" no frontend.
 */
async function scanForTvs({ concurrency = 40, port = 8001 } = {}) {
  const subnets = getLocalSubnets();
  const ips = [];
  for (const subnet of subnets) {
    for (let i = 1; i <= 254; i++) {
      ips.push(`${subnet}.${i}`);
    }
  }

  const found = [];
  let cursor = 0;

  async function worker() {
    while (cursor < ips.length) {
      const ip = ips[cursor++];
      const open = await checkPort(ip, port);
      if (open) found.push(ip);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, ips.length) }, worker);
  await Promise.all(workers);
  return found;
}

module.exports = { scanForTvs, getLocalSubnets };