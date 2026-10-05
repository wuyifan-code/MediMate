import * as dns from 'dns';
import * as net from 'net';

/**
 * 出站请求统一 URL 安全校验工具。
 *
 * 所有服务端发起的出站 HTTP(S) 请求（fetch / axios）在调用前必须经过
 * assertPublicHttpUrl 校验，以阻断 SSRF：
 * - 仅允许 http/https 协议；
 * - 携带凭据（userinfo）的 URL 强制 https；
 * - 字面量 IP 直接比对，拒绝环回、私有、链路本地与保留地址段；
 * - 域名先 DNS 解析，再对全部解析结果做同样的检查，解析失败即拒绝。
 *
 * 另外统一导出 OUTBOUND_REQUEST_TIMEOUT_MS，供所有出站请求设置超时兜底
 * （fetch 用 AbortSignal.timeout，axios 用 timeout 配置）。
 */

export const OUTBOUND_REQUEST_TIMEOUT_MS = 30_000;

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

function cidrRange(baseIp: string, prefixBits: number): [number, number] | null {
  const ip = ipv4ToInt(baseIp);
  if (ip === null) return null;
  const size = Math.pow(2, 32 - prefixBits);
  const start = Math.floor(ip / size) * size;
  return [start, start + size - 1];
}

// 禁止出站访问的 IPv4 地址段：环回、私有、链路本地与保留段
const IPV4_DISALLOWED_RANGES: Array<[number, number]> = (
  [
    ['0.0.0.0', 8], // 本网络（含 0.0.0.0）
    ['10.0.0.0', 8], // 私有
    ['100.64.0.0', 10], // 运营商级 NAT 保留
    ['127.0.0.0', 8], // 环回
    ['169.254.0.0', 16], // 链路本地
    ['172.16.0.0', 12], // 私有
    ['192.0.0.0', 24], // IETF 协议分配
    ['192.0.2.0', 24], // TEST-NET-1
    ['192.168.0.0', 16], // 私有
    ['198.18.0.0', 15], // 基准测试保留
    ['198.51.100.0', 24], // TEST-NET-2
    ['203.0.113.0', 24], // TEST-NET-3
    ['224.0.0.0', 4], // 组播
    ['240.0.0.0', 4], // 保留（含受限广播）
  ] as Array<[string, number]>
)
  .map(([base, bits]) => cidrRange(base, bits))
  .filter((range): range is [number, number] => range !== null);

function isDisallowedIPv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true;
  return IPV4_DISALLOWED_RANGES.some(([start, end]) => value >= start && value <= end);
}

function hexPairToIPv4(highGroup: string, lowGroup: string): string {
  const value = parseInt(highGroup, 16) * 65536 + parseInt(lowGroup, 16);
  return [
    Math.floor(value / 16777216) % 256,
    Math.floor(value / 65536) % 256,
    Math.floor(value / 256) % 256,
    value % 256,
  ].join('.');
}

/** 将 IPv6 展开为 8 组 4 位十六进制；无法解析时返回 null */
function expandIPv6(ip: string): string[] | null {
  // 先把内嵌的点分 IPv4（如 ::ffff:192.168.1.1）换算成两组十六进制
  let normalized = ip;
  const embeddedV4 = normalized.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (embeddedV4) {
    const v4 = ipv4ToInt(embeddedV4[2]);
    if (v4 === null) return null;
    const high = Math.floor(v4 / 65536);
    const low = v4 % 65536;
    normalized = `${embeddedV4[1]}${high.toString(16)}:${low.toString(16)}`;
  }

  const sections = normalized.split('::');
  let groups: string[];
  if (sections.length === 2) {
    const head = sections[0] ? sections[0].split(':') : [];
    const tail = sections[1] ? sections[1].split(':') : [];
    const fill = 8 - head.length - tail.length;
    if (fill < 1) return null;
    groups = [...head, ...new Array<string>(fill).fill('0'), ...tail];
  } else if (sections.length === 1) {
    groups = normalized.split(':');
  } else {
    return null;
  }

  if (groups.length !== 8 || groups.some(g => !/^[0-9a-fA-F]{1,4}$/.test(g))) {
    return null;
  }
  return groups.map(g => g.padStart(4, '0').toLowerCase());
}

function isDisallowedIPv6(ip: string): boolean {
  const groups = expandIPv6(ip);
  if (!groups) return true; // 无法解析的一律拒绝

  const allZero = groups.every(g => g === '0000');
  // :: 未指定地址
  if (allZero) return true;
  // ::1 环回
  if (groups.slice(0, 7).every(g => g === '0000') && groups[7] === '0001') return true;

  const first = groups[0];
  // fe80::/10 链路本地
  if (/^fe[89ab]/.test(first)) return true;
  // fc00::/7 唯一本地地址（含 fd00::/8）
  if (/^f[cd]/.test(first)) return true;
  // ff00::/8 组播
  if (first.startsWith('ff')) return true;
  // 2001:db8::/32 文档保留
  if (first === '2001' && groups[1].startsWith('db8')) return true;
  // 64:ff9b::/96 NAT64（内嵌 IPv4）
  if (first === '0064' && groups[1] === 'ff9b' && groups.slice(2, 6).every(g => g === '0000')) {
    return isDisallowedIPv4(hexPairToIPv4(groups[6], groups[7]));
  }
  // 2002::/16 6to4（内嵌 IPv4）
  if (first === '2002') {
    return isDisallowedIPv4(hexPairToIPv4(groups[1], groups[2]));
  }
  // ::ffff:0:0/96 IPv4 映射地址（内嵌 IPv4）
  if (groups.slice(0, 5).every(g => g === '0000') && groups[5] === 'ffff') {
    return isDisallowedIPv4(hexPairToIPv4(groups[6], groups[7]));
  }
  return false;
}

/** 判断一个 IP 字符串是否属于禁止出站访问的地址（无法识别一律视为禁止） */
export function isDisallowedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isDisallowedIPv4(ip);
  if (family === 6) return isDisallowedIPv6(ip);
  return true;
}

/** 解析并做协议/凭据层面的校验（不做 DNS），不合法直接抛错 */
export function parseOutboundHttpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Outbound URL is not a valid URL: ${rawUrl}`);
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`Outbound URL protocol is not allowed: ${parsed.protocol}`);
  }
  if ((parsed.username || parsed.password) && parsed.protocol !== 'https:') {
    throw new Error('Outbound URL carrying credentials must use https');
  }
  if (!parsed.hostname) {
    throw new Error('Outbound URL is missing a hostname');
  }
  return parsed;
}

const DISALLOWED_HOSTNAME_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain'];

/**
 * 校验出站 URL 并返回解析后的 URL 对象：
 * - 协议、凭据、字面量 IP 同步校验；
 * - 域名做 DNS 解析并对全部解析结果逐一检查，解析失败即抛错。
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  const parsed = parseOutboundHttpUrl(rawUrl);
  const host = parsed.hostname;

  const family = net.isIP(host);
  if (family !== 0) {
    if (isDisallowedIp(host)) {
      throw new Error(`Outbound URL host is a disallowed IP address: ${host}`);
    }
    return parsed;
  }

  const lowerHost = host.toLowerCase();
  if (lowerHost === 'localhost' || DISALLOWED_HOSTNAME_SUFFIXES.some(suffix => lowerHost.endsWith(suffix))) {
    throw new Error(`Outbound URL host is not allowed: ${host}`);
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(host, { all: true });
  } catch {
    throw new Error(`Outbound URL host could not be resolved: ${host}`);
  }
  if (addresses.length === 0) {
    throw new Error(`Outbound URL host resolved to no addresses: ${host}`);
  }
  for (const { address } of addresses) {
    if (isDisallowedIp(address)) {
      throw new Error(`Outbound URL host resolves to a disallowed IP address: ${host} -> ${address}`);
    }
  }
  return parsed;
}
