/**
 * 启动期环境变量校验工具。
 *
 * 安全要求：JWT 密钥不允许存在任何硬编码回退值（如 'default-secret'）。
 * process.env.JWT_SECRET 缺失时直接抛错阻止启动（fail-fast），
 * 避免攻击者用已知默认密钥伪造任意角色的 token。
 */
export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      '环境变量 JWT_SECRET 未配置：拒绝以不安全的默认密钥启动。请在 .env 或运行环境中设置 JWT_SECRET。',
    );
  }
  return secret;
}
