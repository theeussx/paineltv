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

// Porta -> marca provável. Não é 100% confiável (algumas TVs deixam
// portas de gerência abertas mesmo sem ser da marca "dona" da porta),
// mas dá uma sugestão razoável pra pessoa não ter que adivinhar a marca
// ao cadastrar.
const BRAND_PORTS = {
  8001: 'samsung',
  8060: 'roku', // roku / tcl (roku os)
  3000: 'lg', // lg webos
  6466: 'androidtv', // android tv remote v2
  80: 'sony', // sony bravia rest
  9000: 'vizio', // vizio smartcast
};

/**
 * Varre a(s) sub-rede(s) local(is) em paralelo (com um limite de
 * concorrência) testando as portas de gerência conhecidas de cada marca.
 * Retorna uma lista de candidatos com IP + melhor palpite de marca.
 * Ainda não confirma 100% -- isso fica pro passo de "adicionar TV" no
 * frontend, onde a pessoa pode corrigir a marca sugerida.
 */
async function scanForTvs({ concurrency = 30 } = {}) {
  const subnets = getLocalSubnets();
  const ips = [];
  for (const subnet of subnets) {
    for (let i = 1; i <= 254; i++) {
      ips.push(`${subnet}.${i}`);
    }
  }

  const ports = Object.keys(BRAND_PORTS).map(Number);
  const found = new Map(); // ip -> brand sugerida
  let cursor = 0;

  async function worker() {
    while (cursor < ips.length) {
      const ip = ips[cursor++];
      for (const port of ports) {
        const open = await checkPort(ip, port, 300);
        if (open) {
          found.set(ip, BRAND_PORTS[port]);
          break; // achou uma porta conhecida nesse IP, não precisa testar as outras
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, ips.length) }, worker);
  await Promise.all(workers);

  return [...found.entries()].map(([ip, suggestedBrand]) => ({ ip, suggestedBrand }));
}

module.exports = { scanForTvs, getLocalSubnets };