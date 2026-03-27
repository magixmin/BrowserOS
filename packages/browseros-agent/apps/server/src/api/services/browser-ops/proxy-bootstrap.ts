function parseProxyServer(value: string): { host: string; port: number | null } | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.includes('://')) {
    try {
      const url = new URL(trimmed)
      return {
        host: url.hostname,
        port: url.port ? Number(url.port) : null,
      }
    } catch {
      return null
    }
  }

  const [host, port] = trimmed.split(':')
  if (!host) return null

  return {
    host,
    port: port ? Number(port) : null,
  }
}

export function resolveBootstrapProxyAuthRuleFromEnv(): {
  ruleId: string
  host: string
  port: number | null
  username: string
  password: string
} | null {
  const proxyServer = process.env.BROWSER_OPS_PROXY_SERVER
  const username = process.env.BROWSER_OPS_PROXY_AUTH_USERNAME_RESOLVED
  const password = process.env.BROWSER_OPS_PROXY_AUTH_PASSWORD_RESOLVED

  if (!proxyServer || !username || !password) {
    return null
  }

  const parsed = parseProxyServer(proxyServer)
  if (!parsed) return null

  return {
    ruleId: 'bootstrap-launch-proxy',
    host: parsed.host,
    port: parsed.port,
    username,
    password,
  }
}
