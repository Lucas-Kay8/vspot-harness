import * as crypto from 'crypto';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * 自动生成 2048 位的非对称 RSA 密钥对
 */
export function generateOwnerKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return { publicKey, privateKey };
}

/**
 * 将审批记录的核心判定属性序列化，以用于数字签名
 * 注意：对数组进行排序以防数组乱序引发验签失败
 */
export function normalizeApprovalPayload(approval: Record<string, any>): string {
  const normalized = {
    story_id: approval.story_id || '',
    run_id: approval.run_id || '',
    decision: approval.decision || '',
    commands: Array.isArray(approval.commands) ? [...approval.commands].sort() : [],
    resources: Array.isArray(approval.resources) ? [...approval.resources].sort() : []
  };
  return JSON.stringify(normalized);
}

/**
 * 用人类 Owner 的 RSA 私钥为审批 payload 进行签名
 */
export function signApproval(approval: Record<string, any>, privateKeyPem: string): string {
  const payload = normalizeApprovalPayload(approval);
  const sign = crypto.createSign('SHA256');
  sign.update(payload);
  return sign.sign(privateKeyPem, 'base64');
}

/**
 * 用公钥验证审批文件中的数字签名是否合法，防御智能体虚假声明已获审批
 */
export function verifyApprovalSignature(
  approval: Record<string, any>,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    const payload = normalizeApprovalPayload(approval);
    const verify = crypto.createVerify('SHA256');
    verify.update(payload);
    return verify.verify(publicKeyPem, signatureBase64, 'base64');
  } catch (e) {
    return false;
  }
}
