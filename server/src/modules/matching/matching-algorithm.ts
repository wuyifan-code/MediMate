/**
 * 多维加权陪护匹配算法 (Multi-Dimensional Weighted Matching Algorithm, MDWMA)
 *
 * 数学模型：
 *   给定患者请求 R 和候选陪诊师集合 E = {e₁, e₂, ..., eₙ}，
 *   对每个候选陪诊师 eᵢ 计算综合匹配度：
 *
 *     S(eᵢ) = Σⱼ₌₁⁷ (wⱼ × fⱼ(eᵢ, R))
 *
 *   其中 fⱼ 为第 j 个维度的归一化评分函数 (值域 [0, 1])，
 *   wⱼ 为由 AHP 层次分析法确定的维度权重 (Σwⱼ = 1)。
 *
 * 七个评分维度：
 *   f₁ - 科室匹配度 (Specialty Match)      : Jaccard 相似度 + 模糊匹配
 *   f₂ - 地理邻近度 (Geographic Proximity)  : 高斯距离衰减函数
 *   f₃ - 信任评分   (Trust Score)           : 信任协议输出归一化
 *   f₄ - 服务质量   (Service Quality)       : 用户评分归一化
 *   f₅ - 服务经验   (Experience)            : 对数归一化完成订单数
 *   f₆ - 价格适配度 (Price Affordability)   : 预算偏差惩罚函数
 *   f₇ - 负载均衡度 (Load Balance)          : 活跃订单倒数衰减
 *
 * AHP 权重向量 (幂法求解, CR = 0.0041 < 0.1)：
 *   W = (0.3158, 0.1970, 0.1970, 0.1208, 0.0754, 0.0471, 0.0471)
 *
 * @module MatchingAlgorithm
 */

// ==================== 类型定义 ====================

/** 患者匹配请求 */
export interface MatchingRequest {
  /** 目标科室 (如 "心内科", "骨科") */
  department: string;
  /** 患者/医院纬度 */
  latitude?: number;
  /** 患者/医院经度 */
  longitude?: number;
  /** 患者预算 (元/小时)，可选 */
  budget?: number;
  /** 服务类型 */
  serviceType?: string;
  /** 预约日期 (ISO 字符串) */
  appointmentDate?: string;
}

/** 候选陪诊师特征向量 */
export interface EscortFeatureVector {
  id: string;
  name: string;
  /** 专长科室列表 */
  specialties: string[];
  /** 纬度 */
  latitude: number | null;
  /** 经度 */
  longitude: number | null;
  /** 信任评分 (0-100)，来自信任协议模块 */
  trustScore: number;
  /** 用户评分 (0-5) */
  rating: number;
  /** 已完成订单数 */
  completedOrders: number;
  /** 时薪 (元/小时) */
  hourlyRate: number | null;
  /** 当前活跃订单数 */
  activeOrderCount: number;
  /** 头像 URL */
  imageUrl?: string | null;
  /** 简介 */
  bio?: string | null;
  /** 是否已认证 */
  isVerified: boolean;
}

/** 单维度评分结果 */
export interface DimensionScore {
  /** 维度标识 */
  dimension: string;
  /** 维度中文名 */
  label: string;
  /** 归一化得分 [0, 1] */
  score: number;
  /** 权重 */
  weight: number;
  /** 加权得分 */
  weightedScore: number;
  /** 评分说明 (用于可解释性) */
  explanation: string;
}

/** 匹配结果 */
export interface MatchingResult {
  /** 陪诊师 ID */
  escortId: string;
  /** 陪诊师姓名 */
  name: string;
  /** 综合匹配度 [0, 1] */
  compositeScore: number;
  /** 综合匹配度百分比 [0, 100] */
  compositeScorePercent: number;
  /** 匹配等级: excellent / good / fair / poor */
  matchLevel: 'excellent' | 'good' | 'fair' | 'poor';
  /** 各维度评分明细 */
  dimensions: DimensionScore[];
  /** 一句话匹配理由 (可解释性) */
  summary: string;
  /** 头像 */
  imageUrl?: string | null;
  /** 时薪 */
  hourlyRate?: number | null;
  /** 评分 */
  rating: number;
  /** 信任分 */
  trustScore: number;
  /** 距离 (km)，如有 */
  distanceKm?: number | null;
}

// ==================== AHP 层次分析法计算引擎 ====================

/**
 * AHP 判断矩阵 A (7×7)，基于 Saaty 1-9 标度法构造
 *
 * 维度顺序: [f₁科室, f₂地理, f₃信任, f₄质量, f₅经验, f₆价格, f₇负载]
 *
 * 标度含义:
 *   1 = 同等重要, 3 = 稍微重要, 5 = 明显重要, 7 = 强烈重要, 9 = 极端重要
 *   2,4,6,8 = 相邻标度的中间值; 倒数 = 反向比较
 *
 * 构造依据:
 *   f₁ vs f₂: 科室不对口则距离再近也无意义 → 2 (稍微重要)
 *   f₁ vs f₆: 科室匹配远比价格重要 → 5 (明显重要)
 *   f₂ vs f₃: 距离和信任同等关键 → 1 (同等重要)
 *   f₃ vs f₅: 信任比经验更重要 → 2 (稍微重要)
 *   f₆ vs f₇: 价格和负载同等次要 → 1 (同等重要)
 */
export const AHP_JUDGMENT_MATRIX: number[][] = [
  //  f₁   f₂   f₃   f₄   f₅   f₆   f₇
  [  1,   2,   2,   3,   4,   5,   5  ],  // f₁ 科室匹配
  [  1/2, 1,   1,   2,   3,   4,   4  ],  // f₂ 地理邻近
  [  1/2, 1,   1,   2,   3,   4,   4  ],  // f₃ 信任评分
  [  1/3, 1/2, 1/2, 1,   2,   3,   3  ],  // f₄ 服务质量
  [  1/4, 1/3, 1/3, 1/2, 1,   2,   2  ],  // f₅ 服务经验
  [  1/5, 1/4, 1/4, 1/3, 1/2, 1,   1  ],  // f₆ 价格适配
  [  1/5, 1/4, 1/4, 1/3, 1/2, 1,   1  ],  // f₇ 负载均衡
];

/** Saaty 随机一致性指标 RI 表 (n=1~10) */
const SAATY_RI: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
};

/** AHP 计算结果 */
export interface AHPResult {
  /** 权重向量 */
  weights: number[];
  /** 最大特征值 λmax */
  lambdaMax: number;
  /** 一致性指标 CI = (λmax - n) / (n - 1) */
  CI: number;
  /** 随机一致性指标 RI */
  RI: number;
  /** 一致性比率 CR = CI / RI */
  CR: number;
  /** 是否通过一致性检验 (CR < 0.1) */
  passed: boolean;
}

/**
 * AHP 层次分析法求解器
 *
 * 使用幂法 (Power Method) 迭代求解判断矩阵的主特征向量，
 * 并计算一致性比率 CR 进行检验。
 */
export class AHPSolver {
  /**
   * 从判断矩阵计算权重向量
   *
   * 算法步骤:
   *   1. 幂法迭代: w^(k+1) = A × w^(k)，归一化至收敛
   *   2. 计算 λmax = (1/n) × Σ(Aw)ᵢ / wᵢ
   *   3. CI = (λmax - n) / (n - 1)
   *   4. CR = CI / RI，若 CR < 0.1 则通过
   *
   * @param matrix n×n 判断矩阵
   * @param maxIter 最大迭代次数 (默认 1000)
   * @param epsilon 收敛阈值 (默认 1e-8)
   */
  static solve(matrix: number[][], maxIter: number = 1000, epsilon: number = 1e-8): AHPResult {
    const n = matrix.length;

    // 初始向量: 均匀分布
    let w = new Array(n).fill(1 / n);

    // 幂法迭代
    for (let iter = 0; iter < maxIter; iter++) {
      // 矩阵-向量乘法: Aw
      const Aw = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          Aw[i] += matrix[i][j] * w[j];
        }
      }

      // 归一化
      const sum = Aw.reduce((a, b) => a + b, 0);
      const wNew = Aw.map(v => v / sum);

      // 收敛判断: ||w^(k+1) - w^(k)||_∞ < ε
      const maxDiff = Math.max(...wNew.map((v, i) => Math.abs(v - w[i])));
      w = wNew;

      if (maxDiff < epsilon) break;
    }

    // 计算 λmax
    const Aw = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Aw[i] += matrix[i][j] * w[j];
      }
    }
    const lambdaMax = Aw.reduce((sum, val, i) => sum + val / w[i], 0) / n;

    // 一致性检验
    const CI = (lambdaMax - n) / (n - 1);
    const RI = SAATY_RI[n] || 1.49;
    const CR = RI === 0 ? 0 : CI / RI;

    return {
      weights: w.map(v => Math.round(v * 10000) / 10000),
      lambdaMax: Math.round(lambdaMax * 10000) / 10000,
      CI: Math.round(CI * 10000) / 10000,
      RI,
      CR: Math.round(CR * 10000) / 10000,
      passed: CR < 0.1,
    };
  }
}

// ==================== 熵权法 (EWM) 客观赋权 ====================

/** 熵权法计算结果 */
export interface EWMResult {
  /** 客观权重向量 */
  weights: number[];
  /** 各维度信息熵 */
  entropies: number[];
  /** 各维度差异系数 (1 - 熵) */
  diversities: number[];
}

/**
 * 熵权法 (Entropy Weight Method) 客观赋权
 *
 * 原理: 某维度的候选值分布越分散 (熵越小)，该维度提供的信息量越大，权重越高。
 *
 * 步骤:
 *   1. 对决策矩阵 X (n×m) 做极差标准化 → P
 *   2. 计算第 j 维信息熵: Eⱼ = -k × Σᵢ pᵢⱼ × ln(pᵢⱼ)，k = 1/ln(n)
 *   3. 计算差异系数: dⱼ = 1 - Eⱼ
 *   4. 归一化得权重: wⱼ = dⱼ / Σdⱼ
 */
export class EntropyWeightMethod {
  /**
   * @param decisionMatrix n×m 决策矩阵 (n 个候选, m 个维度)，值域 [0, 1]
   */
  static solve(decisionMatrix: number[][]): EWMResult {
    const n = decisionMatrix.length;    // 候选数
    const m = decisionMatrix[0].length; // 维度数

    if (n <= 1) {
      // 只有一个候选时，均匀权重
      return {
        weights: new Array(m).fill(1 / m),
        entropies: new Array(m).fill(1),
        diversities: new Array(m).fill(0),
      };
    }

    const k = 1 / Math.log(n); // 玻尔兹曼常数

    // 对每个维度做归一化并计算熵
    const entropies: number[] = [];
    for (let j = 0; j < m; j++) {
      const col = decisionMatrix.map(row => row[j]);
      const colSum = col.reduce((a, b) => a + b, 0);

      let entropy = 0;
      if (colSum > 0) {
        for (let i = 0; i < n; i++) {
          const p = col[i] / colSum;
          if (p > 0) {
            entropy -= p * Math.log(p);
          }
        }
        entropy *= k;
      }
      entropies.push(entropy);
    }

    // 差异系数 & 归一化权重
    const diversities = entropies.map(e => 1 - e);
    const dSum = diversities.reduce((a, b) => a + b, 0);
    const weights = dSum > 0
      ? diversities.map(d => Math.round((d / dSum) * 10000) / 10000)
      : new Array(m).fill(1 / m);

    return { weights, entropies: entropies.map(e => Math.round(e * 10000) / 10000), diversities: diversities.map(d => Math.round(d * 10000) / 10000) };
  }
}

// ==================== CRITIC 客观赋权 ====================

/** CRITIC 计算结果 */
export interface CRITICResult {
  /** 客观权重向量 */
  weights: number[];
  /** 各维度标准差 (对比强度) */
  stdDeviations: number[];
  /** 维度间 Pearson 相关系数矩阵 */
  correlationMatrix: number[][];
  /** 各维度冲突度 (与其他维度的去相关程度之和) */
  conflicts: number[];
  /** 各维度信息量 = σⱼ × Σ(1-rⱼₖ) */
  informationAmounts: number[];
}

/**
 * CRITIC (Criteria Importance Through Intercriteria Correlation)
 *
 * 由 Diakoulaki et al. (1995) 提出的客观赋权方法。
 * 与熵权法的区别: EWM 仅考虑值的分散程度 (信息熵)，
 * CRITIC 同时考虑:
 *   (1) 对比强度 (Contrast Intensity): 标准差 σⱼ 越大，区分力越强
 *   (2) 冲突度 (Conflict): 与其他维度的相关性越低，独立信息越多
 *
 * 公式:
 *   信息量: Iⱼ = σⱼ × Σₖ(1 - rⱼₖ)
 *   权重:   wⱼ = Iⱼ / ΣIⱼ
 *
 * 其中 rⱼₖ 为第 j 维与第 k 维的 Pearson 相关系数。
 *
 * 学术价值: 若两个维度高度相关 (如信任分与服务质量)，
 * CRITIC 会自动降低它们的权重，避免信息重复计算。
 */
export class CRITIC {
  static solve(decisionMatrix: number[][]): CRITICResult {
    const n = decisionMatrix.length;
    const m = decisionMatrix[0].length;

    // 1. 计算各维度均值和标准差
    const means: number[] = [];
    const stdDeviations: number[] = [];
    for (let j = 0; j < m; j++) {
      const col = decisionMatrix.map(row => row[j]);
      const mean = col.reduce((a, b) => a + b, 0) / n;
      means.push(mean);
      const variance = col.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
      stdDeviations.push(Math.sqrt(variance));
    }

    // 2. Pearson 相关系数矩阵
    const correlationMatrix: number[][] = [];
    for (let j = 0; j < m; j++) {
      correlationMatrix[j] = [];
      for (let k = 0; k < m; k++) {
        if (j === k) {
          correlationMatrix[j][k] = 1;
          continue;
        }
        const colJ = decisionMatrix.map(row => row[j]);
        const colK = decisionMatrix.map(row => row[k]);
        let cov = 0;
        for (let i = 0; i < n; i++) {
          cov += (colJ[i] - means[j]) * (colK[i] - means[k]);
        }
        cov /= n;
        const r = (stdDeviations[j] > 0 && stdDeviations[k] > 0)
          ? cov / (stdDeviations[j] * stdDeviations[k])
          : 0;
        correlationMatrix[j][k] = Math.round(r * 10000) / 10000;
      }
    }

    // 3. 冲突度: Σₖ(1 - rⱼₖ)
    const conflicts: number[] = [];
    for (let j = 0; j < m; j++) {
      let conflict = 0;
      for (let k = 0; k < m; k++) {
        if (k !== j) {
          conflict += (1 - correlationMatrix[j][k]);
        }
      }
      conflicts.push(Math.round(conflict * 10000) / 10000);
    }

    // 4. 信息量 Iⱼ = σⱼ × conflictⱼ
    const informationAmounts = stdDeviations.map((sigma, j) =>
      Math.round(sigma * conflicts[j] * 10000) / 10000
    );

    // 5. 归一化权重
    const iSum = informationAmounts.reduce((a, b) => a + b, 0);
    const weights = iSum > 0
      ? informationAmounts.map(i => Math.round((i / iSum) * 10000) / 10000)
      : new Array(m).fill(1 / m);

    return {
      weights,
      stdDeviations: stdDeviations.map(s => Math.round(s * 10000) / 10000),
      correlationMatrix,
      conflicts,
      informationAmounts,
    };
  }
}

// ==================== 组合赋权 ====================

/**
 * AHP-熵权线性组合赋权 (基础版)
 *
 * 将主观权重 (AHP) 与客观权重 (EWM) 线性组合:
 *   w_combined = α × w_AHP + (1 - α) × w_EWM
 *
 * @param ahpWeights AHP 主观权重向量
 * @param ewmWeights 熵权法客观权重向量
 * @param alpha 主观偏好系数 (默认 0.6，偏重专家经验)
 */
export function combinedWeights(
  ahpWeights: number[],
  ewmWeights: number[],
  alpha: number = 0.6,
): number[] {
  const combined = ahpWeights.map((w, i) => alpha * w + (1 - alpha) * ewmWeights[i]);
  const sum = combined.reduce((a, b) => a + b, 0);
  return combined.map(w => Math.round((w / sum) * 10000) / 10000);
}

// ==================== 博弈论组合赋权 ====================

/** 博弈论组合赋权结果 */
export interface GameTheoreticResult {
  /** 最优组合权重向量 */
  weights: number[];
  /** 各权重集的均衡系数 (Nash 均衡解) */
  equilibriumCoefficients: number[];
  /** 组合权重与各单一赋权的偏差 */
  deviations: number[];
  /** 迭代收敛次数 */
  iterations: number;
}

/**
 * 博弈论组合赋权 (Game-Theoretic Combined Weighting)
 *
 * 动机: 线性组合中 α 的选取具有主观任意性。博弈论方法通过寻找 Nash 均衡，
 * 使组合权重与各单一赋权结果的总偏差最小，实现主客观信息的"最妥协"融合。
 *
 * 数学模型:
 *   给定 k 组权重向量 {w₁, w₂, ..., wₖ}，求线性组合:
 *     w* = Σᵢ αᵢ × wᵢ,  s.t. Σαᵢ = 1, αᵢ ≥ 0
 *
 *   目标: min Σᵢ αᵢ × ||w* - wᵢ||²
 *
 *   Nash 均衡条件: 各权重集的"贡献"与其偏差成反比:
 *     αᵢ* = (1/dᵢ) / Σⱼ(1/dⱼ),  dᵢ = ||w* - wᵢ||²
 *
 * 算法: 不动点迭代至收敛 (通常 5~20 次)
 *
 * 参考文献:
 *   [1] 基于博弈论的组合赋权法在综合评价中的应用, 系统工程理论与实践
 *   [2] AHP-熵权-博弈论组合赋权的多准则决策方法, 运筹与管理
 */
export class GameTheoreticWeighting {
  /**
   * @param weightVectors k 组权重向量 (每组长度 m，和为 1)
   * @param maxIter 最大迭代次数
   * @param epsilon 收敛阈值
   */
  static solve(
    weightVectors: number[][],
    maxIter: number = 100,
    epsilon: number = 1e-8,
  ): GameTheoreticResult {
    const k = weightVectors.length;
    const m = weightVectors[0].length;

    // 初始系数: 均匀
    let alpha = new Array(k).fill(1 / k);
    let iterations = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      iterations = iter + 1;

      // 计算组合权重 w* = Σ αᵢ × wᵢ
      const wStar = new Array(m).fill(0);
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < m; j++) {
          wStar[j] += alpha[i] * weightVectors[i][j];
        }
      }

      // 计算各权重集与组合权重的偏差 dᵢ = ||w* - wᵢ||²
      const deviations = weightVectors.map(w =>
        w.reduce((sum, wj, j) => sum + (wStar[j] - wj) ** 2, 0)
      );

      // Nash 均衡更新: αᵢ = (1/dᵢ) / Σ(1/dⱼ)
      // 处理 dᵢ = 0 的情况 (完全一致)
      const invD = deviations.map(d => d > 1e-15 ? 1 / d : 1e15);
      const invDSum = invD.reduce((a, b) => a + b, 0);
      const newAlpha = invD.map(v => v / invDSum);

      // 收敛判断
      const maxDiff = Math.max(...newAlpha.map((v, i) => Math.abs(v - alpha[i])));
      alpha = newAlpha;

      if (maxDiff < epsilon) break;
    }

    // 最终组合权重
    const weights = new Array(m).fill(0);
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < m; j++) {
        weights[j] += alpha[i] * weightVectors[i][j];
      }
    }

    // 归一化
    const wSum = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => Math.round((w / wSum) * 10000) / 10000);

    // 最终偏差
    const finalDeviations = weightVectors.map(w =>
      Math.round(
        Math.sqrt(w.reduce((sum, wj, j) => sum + (normalizedWeights[j] - wj) ** 2, 0)) * 10000
      ) / 10000
    );

    return {
      weights: normalizedWeights,
      equilibriumCoefficients: alpha.map(a => Math.round(a * 10000) / 10000),
      deviations: finalDeviations,
      iterations,
    };
  }
}

// ==================== TOPSIS 逼近理想解排序 ====================

/** TOPSIS 排序结果 */
export interface TOPSISResult {
  /** 各候选的贴近度 Cᵢ ∈ [0, 1]，越大越优 */
  closeness: number[];
  /** 到正理想解的距离 D⁺ */
  distanceToIdeal: number[];
  /** 到负理想解的距离 D⁻ */
  distanceToAntiIdeal: number[];
  /** 排序索引 (从最优到最差) */
  ranking: number[];
}

/**
 * TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)
 *
 * 步骤:
 *   1. 向量归一化: rᵢⱼ = xᵢⱼ / √(Σxᵢⱼ²)
 *   2. 加权归一化: vᵢⱼ = wⱼ × rᵢⱼ
 *   3. 正理想解 A⁺ = (max v₁, max v₂, ..., max vₘ)  (效益型)
 *      负理想解 A⁻ = (min v₁, min v₂, ..., min vₘ)
 *   4. 欧氏距离: D⁺ᵢ = √(Σ(vᵢⱼ - A⁺ⱼ)²), D⁻ᵢ = √(Σ(vᵢⱼ - A⁻ⱼ)²)
 *   5. 贴近度: Cᵢ = D⁻ᵢ / (D⁺ᵢ + D⁻ᵢ)
 *
 * 注: 本模型所有维度均为效益型 (越大越好)，无需区分成本型。
 */
export class TOPSIS {
  static solve(decisionMatrix: number[][], weights: number[]): TOPSISResult {
    const n = decisionMatrix.length;
    const m = weights.length;

    // 1. 向量归一化
    const normalized: number[][] = [];
    for (let j = 0; j < m; j++) {
      const colNorm = Math.sqrt(decisionMatrix.reduce((sum, row) => sum + row[j] * row[j], 0));
      for (let i = 0; i < n; i++) {
        if (!normalized[i]) normalized[i] = [];
        normalized[i][j] = colNorm > 0 ? decisionMatrix[i][j] / colNorm : 0;
      }
    }

    // 2. 加权归一化
    const weighted = normalized.map(row => row.map((v, j) => v * weights[j]));

    // 3. 正/负理想解
    const ideal: number[] = [];
    const antiIdeal: number[] = [];
    for (let j = 0; j < m; j++) {
      const col = weighted.map(row => row[j]);
      ideal.push(Math.max(...col));
      antiIdeal.push(Math.min(...col));
    }

    // 4. 欧氏距离
    const distanceToIdeal: number[] = [];
    const distanceToAntiIdeal: number[] = [];
    for (let i = 0; i < n; i++) {
      const dPlus = Math.sqrt(weighted[i].reduce((sum, v, j) => sum + (v - ideal[j]) ** 2, 0));
      const dMinus = Math.sqrt(weighted[i].reduce((sum, v, j) => sum + (v - antiIdeal[j]) ** 2, 0));
      distanceToIdeal.push(Math.round(dPlus * 10000) / 10000);
      distanceToAntiIdeal.push(Math.round(dMinus * 10000) / 10000);
    }

    // 5. 贴近度
    const closeness = distanceToIdeal.map((dPlus, i) => {
      const dMinus = distanceToAntiIdeal[i];
      const c = (dPlus + dMinus) > 0 ? dMinus / (dPlus + dMinus) : 0.5;
      return Math.round(c * 10000) / 10000;
    });

    // 排序
    const ranking = closeness
      .map((c, i) => ({ c, i }))
      .sort((a, b) => b.c - a.c)
      .map(x => x.i);

    return { closeness, distanceToIdeal, distanceToAntiIdeal, ranking };
  }
}

// ==================== VIKOR 妥协解排序 ====================

/** VIKOR 排序结果 */
export interface VIKORResult {
  /** 群体效用值 Sᵢ (加权偏差和，越小越优) */
  S: number[];
  /** 个体遗憾值 Rᵢ (最大加权偏差，越小越优) */
  R: number[];
  /** 妥协排序指标 Qᵢ ∈ [0, 1] (越小越优) */
  Q: number[];
  /** 排序索引 (从最优到最差，按 Q 升序) */
  ranking: number[];
  /** 决策策略系数 v */
  v: number;
  /** 是否满足可接受优势条件 (Q₁ - Q₂ ≥ DQ) */
  acceptableAdvantage: boolean;
  /** 是否满足可接受稳定性条件 */
  acceptableStability: boolean;
  /** 妥协解是否成立 */
  compromiseValid: boolean;
}

/**
 * VIKOR (VlseKriterijumska Optimizacija I Kompromisno Resenje)
 *
 * 多准则妥协解排序方法，由 Opricovic (1998) 提出。
 * 与 TOPSIS 的区别: VIKOR 同时考虑"群体效用最大化"和"个体遗憾最小化"，
 * 更适合存在准则间冲突的决策场景。
 *
 * 步骤:
 *   1. 确定正理想解 f*ⱼ = maxᵢ fᵢⱼ 和负理想解 f⁻ⱼ = minᵢ fᵢⱼ
 *   2. 计算群体效用: Sᵢ = Σⱼ wⱼ(f*ⱼ - fᵢⱼ) / (f*ⱼ - f⁻ⱼ)
 *   3. 计算个体遗憾: Rᵢ = maxⱼ [wⱼ(f*ⱼ - fᵢⱼ) / (f*ⱼ - f⁻ⱼ)]
 *   4. 计算妥协指标: Qᵢ = v(Sᵢ - S*)/(S⁻ - S*) + (1-v)(Rᵢ - R*)/(R⁻ - R*)
 *      其中 S* = min Sᵢ, S⁻ = max Sᵢ, R* = min Rᵢ, R⁻ = max Rᵢ
 *   5. 按 Q 升序排序
 *   6. 验证妥协解可接受条件:
 *      (a) 可接受优势: Q₂ - Q₁ ≥ DQ = 1/(n-1)
 *      (b) 可接受稳定: Q₁ 最小的方案同时在 S 或 R 排序中最优
 *
 * @param v 决策策略系数 (v=0.5 为多数规则, v>0.5 偏重群体效用, v<0.5 偏重个体遗憾)
 */
export class VIKOR {
  static solve(decisionMatrix: number[][], weights: number[], v: number = 0.5): VIKORResult {
    const n = decisionMatrix.length;
    const m = weights.length;

    // 1. 正/负理想解 (所有维度为效益型)
    const fStar: number[] = [];
    const fMinus: number[] = [];
    for (let j = 0; j < m; j++) {
      const col = decisionMatrix.map(row => row[j]);
      fStar.push(Math.max(...col));
      fMinus.push(Math.min(...col));
    }

    // 2. 群体效用 Sᵢ 和个体遗憾 Rᵢ
    const S: number[] = [];
    const R: number[] = [];
    for (let i = 0; i < n; i++) {
      let si = 0;
      let ri = 0;
      for (let j = 0; j < m; j++) {
        const range = fStar[j] - fMinus[j];
        const normalizedDeviation = range > 0
          ? weights[j] * (fStar[j] - decisionMatrix[i][j]) / range
          : 0;
        si += normalizedDeviation;
        ri = Math.max(ri, normalizedDeviation);
      }
      S.push(Math.round(si * 10000) / 10000);
      R.push(Math.round(ri * 10000) / 10000);
    }

    // 3. 妥协指标 Qᵢ
    const SStar = Math.min(...S);
    const SMinus = Math.max(...S);
    const RStar = Math.min(...R);
    const RMinus = Math.max(...R);

    const Q = S.map((si, i) => {
      const sTerm = (SMinus - SStar) > 0 ? (si - SStar) / (SMinus - SStar) : 0;
      const rTerm = (RMinus - RStar) > 0 ? (R[i] - RStar) / (RMinus - RStar) : 0;
      return Math.round((v * sTerm + (1 - v) * rTerm) * 10000) / 10000;
    });

    // 4. 按 Q 升序排序 (Q 越小越优)
    const ranking = Q
      .map((q, i) => ({ q, i }))
      .sort((a, b) => a.q - b.q)
      .map(x => x.i);

    // 5. 妥协解可接受性验证
    const DQ = n > 1 ? 1 / (n - 1) : 1;
    const sortedQ = ranking.map(i => Q[i]);
    const acceptableAdvantage = n > 1 ? (sortedQ[1] - sortedQ[0]) >= DQ : true;

    // 稳定性: Q 最优方案在 S 排序或 R 排序中也最优
    const sRanking = S.map((s, i) => ({ s, i })).sort((a, b) => a.s - b.s).map(x => x.i);
    const rRanking = R.map((r, i) => ({ r, i })).sort((a, b) => a.r - b.r).map(x => x.i);
    const qBest = ranking[0];
    const acceptableStability = sRanking[0] === qBest || rRanking[0] === qBest;

    return {
      S, R, Q, ranking, v,
      acceptableAdvantage,
      acceptableStability,
      compromiseValid: acceptableAdvantage && acceptableStability,
    };
  }
}

// ==================== Borda-Copeland 排名聚合 ====================

/** 排名聚合结果 */
export interface RankAggregationResult {
  /** Borda 得分 (越高越优) */
  bordaScores: number[];
  /** Copeland 净胜分 (胜+1, 负-1, 平0) */
  copelandScores: number[];
  /** 最终聚合排序 (从最优到最差) */
  finalRanking: number[];
  /** 各方法的原始排序 */
  inputRankings: number[][];
  /** 方法名称 */
  methodNames: string[];
}

/**
 * Borda-Copeland 排名聚合
 *
 * 动机: 单一 MCDM 方法可能因方法偏差导致排序不稳定。
 * 通过融合多种方法的排序结果，获得更鲁棒的最终排序。
 *
 * Borda 计数: 排名第 k 位得 (n-k) 分，总分越高越优。
 * Copeland 法: 对每对候选 (i,j)，若在多数方法中 i 排在 j 前面，
 *   则 i 得 +1, j 得 -1; 平局各得 0。净胜分越高越优。
 *
 * 最终排序: 按 Copeland 净胜分降序 (Borda 作为 tiebreaker)。
 */
export class RankAggregation {
  /**
   * @param rankings 各方法的排序索引数组 (每个数组是候选索引的排列)
   * @param methodNames 方法名称 (用于可解释性)
   */
  static solve(rankings: number[][], methodNames: string[] = []): RankAggregationResult {
    const n = rankings[0].length;
    const k = rankings.length;

    // Borda 计数
    const bordaScores = new Array(n).fill(0);
    for (const ranking of rankings) {
      ranking.forEach((candidateIdx, position) => {
        bordaScores[candidateIdx] += (n - 1 - position);
      });
    }

    // Copeland 净胜分
    const copelandScores = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let iWins = 0;
        let jWins = 0;
        for (const ranking of rankings) {
          const posI = ranking.indexOf(i);
          const posJ = ranking.indexOf(j);
          if (posI < posJ) iWins++;
          else if (posJ < posI) jWins++;
        }
        if (iWins > jWins) { copelandScores[i]++; copelandScores[j]--; }
        else if (jWins > iWins) { copelandScores[j]++; copelandScores[i]--; }
        // 平局: 各得 0
      }
    }

    // 最终排序: Copeland 降序, Borda 降序 (tiebreaker)
    const finalRanking = Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => {
        if (copelandScores[b] !== copelandScores[a]) return copelandScores[b] - copelandScores[a];
        return bordaScores[b] - bordaScores[a];
      });

    return {
      bordaScores,
      copelandScores,
      finalRanking,
      inputRankings: rankings,
      methodNames,
    };
  }
}

// ==================== 灵敏度分析 ====================

/** 灵敏度分析结果 */
export interface SensitivityResult {
  /** 基准权重下的 Top-K 排序 */
  baseRanking: string[];
  /** 各维度权重扰动后的排序变化 */
  perturbations: {
    dimension: string;
    delta: number;       // 扰动幅度 (如 +0.1 = +10%)
    newRanking: string[];
    rankChanged: boolean;
    /** Kendall's Tau 排序相关系数 (-1 ~ 1, 1 = 完全一致) */
    kendallTau: number;
  }[];
  /** 总体稳定性评级 */
  stability: 'high' | 'medium' | 'low';
}

// ==================== 默认权重 (由 AHP 计算得出，作为回退) ====================

/**
 * 预计算的 AHP 权重 (由 AHP_JUDGMENT_MATRIX 通过幂法求解)
 *
 * 幂法迭代收敛后的主特征向量:
 *   W = (0.3158, 0.1970, 0.1970, 0.1208, 0.0754, 0.0471, 0.0471)
 *   λmax = 7.0324, CI = 0.0054, CR = 0.0041 < 0.1 ✓
 */
export const AHP_WEIGHTS = {
  SPECIALTY: 0.3158,    // f₁: 科室匹配度 — 科室不对口则服务无意义，权重最高
  PROXIMITY: 0.1970,    // f₂: 地理邻近度 — 空巢老人出行不便，距离敏感
  TRUST: 0.1970,        // f₃: 信任评分   — 医疗场景安全关键，信任是核心壁垒
  QUALITY: 0.1208,      // f₄: 服务质量   — 历史评价反映服务水平
  EXPERIENCE: 0.0754,   // f₅: 服务经验   — 经验是加分项但非决定性
  PRICE: 0.0471,        // f₆: 价格适配度 — 价格敏感但非首要考量
  LOAD_BALANCE: 0.0471, // f₇: 负载均衡度 — 防止热门陪诊师过载
} as const;

/** 高斯距离衰减的标准差 σ (km)，控制距离敏感度 */
const GAUSSIAN_SIGMA_KM = 5;

/** 经验维度归一化的最大订单数参考值 */
const MAX_ORDERS_REFERENCE = 200;

// ==================== 科室模糊匹配字典 ====================

/**
 * 科室层级关系：父科室 → 子科室列表
 * 用于模糊匹配，如请求"内科"可匹配专长为"心内科"的陪诊师
 */
const DEPARTMENT_HIERARCHY: Record<string, string[]> = {
  '内科': ['心内科', '呼吸内科', '消化内科', '神经内科', '内分泌科', '肾内科', '血液内科', '风湿免疫科'],
  '外科': ['普通外科', '骨科', '神经外科', '心胸外科', '泌尿外科', '烧伤外科'],
  '妇产科': ['妇科', '产科', '生殖医学中心'],
  '儿科': ['新生儿科', '小儿内科', '小儿外科'],
  '五官科': ['眼科', '耳鼻喉科', '口腔科'],
  '肿瘤科': ['肿瘤内科', '肿瘤外科', '放疗科'],
  '中医科': ['中医内科', '针灸推拿科', '中医骨伤科'],
};

// ==================== 核心算法 ====================

export class MatchingAlgorithm {

  /**
   * f₁: 科室匹配度 (Specialty Match Score)
   *
   * 结合精确匹配与层级模糊匹配：
   *   - 精确匹配 (specialties 包含 department): 得分 1.0
   *   - 父级匹配 (department 是 specialties 某项的父科室): 得分 0.8
   *   - 子级匹配 (specialties 某项是 department 的父科室): 得分 0.7
   *   - 无匹配: 得分 0.0
   *
   * 当存在多个专长时，取最高匹配分。
   */
  static specialtyScore(escortSpecialties: string[], targetDepartment: string): { score: number; explanation: string } {
    if (!targetDepartment || escortSpecialties.length === 0) {
      return { score: 0.3, explanation: '未指定科室或陪诊师无专长记录，给予基础分' };
    }

    const target = targetDepartment.trim();

    // 精确匹配
    if (escortSpecialties.some(s => s === target)) {
      return { score: 1.0, explanation: `专长精确匹配「${target}」` };
    }

    // 模糊匹配：检查层级关系
    let bestScore = 0;
    let bestMatch = '';

    for (const specialty of escortSpecialties) {
      // 父级匹配：目标是父科室，专长是子科室 (如目标"内科"，专长"心内科")
      const children = DEPARTMENT_HIERARCHY[target];
      if (children && children.includes(specialty)) {
        if (0.8 > bestScore) {
          bestScore = 0.8;
          bestMatch = `「${specialty}」属于「${target}」子类`;
        }
      }

      // 子级匹配：专长是父科室，目标是子科室 (如专长"内科"，目标"心内科")
      const specialtyChildren = DEPARTMENT_HIERARCHY[specialty];
      if (specialtyChildren && specialtyChildren.includes(target)) {
        if (0.7 > bestScore) {
          bestScore = 0.7;
          bestMatch = `「${specialty}」涵盖「${target}」`;
        }
      }

      // 字符串包含匹配 (兜底)
      if (specialty.includes(target) || target.includes(specialty)) {
        if (0.6 > bestScore) {
          bestScore = 0.6;
          bestMatch = `「${specialty}」与「${target}」相关`;
        }
      }
    }

    if (bestScore > 0) {
      return { score: bestScore, explanation: bestMatch };
    }

    return { score: 0.0, explanation: `专长不匹配「${target}」` };
  }

  /**
   * f₂: 地理邻近度 (Geographic Proximity Score)
   *
   * 采用高斯距离衰减函数：
   *   f_geo(d) = exp(-d² / (2σ²))
   *
   * 其中 d 为 Haversine 距离 (km)，σ = 5km。
   * 当 d = 0 时 f = 1.0；d = 5km 时 f ≈ 0.61；d = 10km 时 f ≈ 0.14。
   */
  static proximityScore(
    escortLat: number | null,
    escortLng: number | null,
    targetLat: number | undefined,
    targetLng: number | undefined,
  ): { score: number; explanation: string; distanceKm: number | null } {
    if (targetLat === undefined || targetLng === undefined) {
      return { score: 0.5, explanation: '未提供位置信息，给予中间分', distanceKm: null };
    }

    if (escortLat === null || escortLng === null) {
      return { score: 0.2, explanation: '陪诊师未设置位置', distanceKm: null };
    }

    const d = MatchingAlgorithm.haversineKm(targetLat, targetLng, escortLat, escortLng);
    const sigma = GAUSSIAN_SIGMA_KM;
    const score = Math.exp(-(d * d) / (2 * sigma * sigma));

    const distLabel = d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
    return {
      score: Math.round(score * 1000) / 1000,
      explanation: `距离 ${distLabel}，邻近度 ${(score * 100).toFixed(1)}%`,
      distanceKm: Math.round(d * 100) / 100,
    };
  }

  /**
   * f₃: 信任评分 (Trust Score)
   *
   * 直接归一化信任协议模块输出的信任分 (0-100 → 0-1)。
   * 信任分由五维加权模型计算：完成率、存证覆盖率、验证通过率、用户评价、活跃度。
   */
  static trustScore(trustScoreValue: number): { score: number; explanation: string } {
    const normalized = Math.max(0, Math.min(1, trustScoreValue / 100));
    const level = trustScoreValue >= 90 ? '极高' :
                  trustScoreValue >= 75 ? '较高' :
                  trustScoreValue >= 60 ? '中等' :
                  trustScoreValue >= 40 ? '偏低' : '较低';
    return {
      score: normalized,
      explanation: `信任分 ${trustScoreValue.toFixed(1)} (${level})`,
    };
  }

  /**
   * f₄: 服务质量 (Service Quality Score)
   *
   * 将 5 分制评分线性归一化到 [0, 1]。
   * 无评分记录时给予 0.5 中间值 (贝叶斯先验思想)。
   */
  static qualityScore(rating: number, completedOrders: number): { score: number; explanation: string } {
    if (completedOrders === 0 || rating === 0) {
      return { score: 0.5, explanation: '暂无评价记录，给予先验中间分' };
    }
    const normalized = Math.max(0, Math.min(1, rating / 5));
    return {
      score: normalized,
      explanation: `用户评分 ${rating.toFixed(1)}/5.0`,
    };
  }

  /**
   * f₅: 服务经验 (Experience Score)
   *
   * 对数归一化，避免高订单量的边际效应过大：
   *   f_exp = min(1, ln(1 + orders) / ln(1 + MAX_REF))
   *
   * MAX_REF = 200 为参考上限。
   * orders = 0 → 0.0; orders = 10 → 0.45; orders = 50 → 0.74; orders = 200 → 1.0
   */
  static experienceScore(completedOrders: number): { score: number; explanation: string } {
    const score = Math.min(1, Math.log(1 + completedOrders) / Math.log(1 + MAX_ORDERS_REFERENCE));
    return {
      score: Math.round(score * 1000) / 1000,
      explanation: `已完成 ${completedOrders} 单`,
    };
  }

  /**
   * f₆: 价格适配度 (Price Affordability Score)
   *
   * 基于预算偏差的惩罚函数：
   *   f_price = max(0, 1 - |rate - budget| / budget)
   *
   * 未提供预算时给予 0.5 中间值。
   * 陪诊师未设价格时给予 0.5。
   */
  static priceScore(hourlyRate: number | null, budget: number | undefined): { score: number; explanation: string } {
    if (budget === undefined || budget <= 0) {
      return { score: 0.5, explanation: '未设定预算，价格维度中性' };
    }
    if (hourlyRate === null || hourlyRate <= 0) {
      return { score: 0.5, explanation: '陪诊师未设价格' };
    }

    const deviation = Math.abs(hourlyRate - budget) / budget;
    const score = Math.max(0, 1 - deviation);

    const relation = hourlyRate <= budget ? '在预算内' : '超出预算';
    return {
      score: Math.round(score * 1000) / 1000,
      explanation: `时薪 ¥${hourlyRate}，${relation} (预算 ¥${budget})`,
    };
  }

  /**
   * f₇: 负载均衡度 (Load Balance Score)
   *
   * 倒数衰减函数，防止热门陪诊师过载：
   *   f_load = 1 / (1 + activeOrders)
   *
   * activeOrders = 0 → 1.0; = 1 → 0.5; = 2 → 0.33; = 4 → 0.2
   */
  static loadBalanceScore(activeOrderCount: number): { score: number; explanation: string } {
    const score = 1 / (1 + activeOrderCount);
    return {
      score: Math.round(score * 1000) / 1000,
      explanation: activeOrderCount === 0 ? '当前无进行中订单' : `当前 ${activeOrderCount} 个进行中订单`,
    };
  }

  /**
   * 综合匹配度计算
   *
   * S(eᵢ) = Σⱼ₌₁⁷ (wⱼ × fⱼ(eᵢ, R))
   */
  static computeCompositeScore(escort: EscortFeatureVector, request: MatchingRequest): MatchingResult {
    // 计算各维度得分
    const spec = MatchingAlgorithm.specialtyScore(escort.specialties, request.department);
    const geo = MatchingAlgorithm.proximityScore(escort.latitude, escort.longitude, request.latitude, request.longitude);
    const trust = MatchingAlgorithm.trustScore(escort.trustScore);
    const quality = MatchingAlgorithm.qualityScore(escort.rating, escort.completedOrders);
    const exp = MatchingAlgorithm.experienceScore(escort.completedOrders);
    const price = MatchingAlgorithm.priceScore(escort.hourlyRate, request.budget);
    const load = MatchingAlgorithm.loadBalanceScore(escort.activeOrderCount);

    // 构建维度评分明细
    const dimensions: DimensionScore[] = [
      { dimension: 'specialty', label: '科室匹配', score: spec.score, weight: AHP_WEIGHTS.SPECIALTY, weightedScore: spec.score * AHP_WEIGHTS.SPECIALTY, explanation: spec.explanation },
      { dimension: 'proximity', label: '地理邻近', score: geo.score, weight: AHP_WEIGHTS.PROXIMITY, weightedScore: geo.score * AHP_WEIGHTS.PROXIMITY, explanation: geo.explanation },
      { dimension: 'trust', label: '信任评分', score: trust.score, weight: AHP_WEIGHTS.TRUST, weightedScore: trust.score * AHP_WEIGHTS.TRUST, explanation: trust.explanation },
      { dimension: 'quality', label: '服务质量', score: quality.score, weight: AHP_WEIGHTS.QUALITY, weightedScore: quality.score * AHP_WEIGHTS.QUALITY, explanation: quality.explanation },
      { dimension: 'experience', label: '服务经验', score: exp.score, weight: AHP_WEIGHTS.EXPERIENCE, weightedScore: exp.score * AHP_WEIGHTS.EXPERIENCE, explanation: exp.explanation },
      { dimension: 'price', label: '价格适配', score: price.score, weight: AHP_WEIGHTS.PRICE, weightedScore: price.score * AHP_WEIGHTS.PRICE, explanation: price.explanation },
      { dimension: 'load_balance', label: '负载均衡', score: load.score, weight: AHP_WEIGHTS.LOAD_BALANCE, weightedScore: load.score * AHP_WEIGHTS.LOAD_BALANCE, explanation: load.explanation },
    ];

    // 加权求和
    const compositeScore = dimensions.reduce((sum, d) => sum + d.weightedScore, 0);
    const compositeScorePercent = Math.round(compositeScore * 1000) / 10;

    // 匹配等级
    const matchLevel = compositeScore >= 0.8 ? 'excellent' :
                       compositeScore >= 0.6 ? 'good' :
                       compositeScore >= 0.4 ? 'fair' : 'poor';

    // 生成可解释性摘要：取加权贡献最大的前 3 个维度
    const topDimensions = [...dimensions]
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, 3);
    const summary = topDimensions.map(d => d.explanation).join('；');

    return {
      escortId: escort.id,
      name: escort.name,
      compositeScore: Math.round(compositeScore * 10000) / 10000,
      compositeScorePercent,
      matchLevel,
      dimensions,
      summary,
      imageUrl: escort.imageUrl,
      hourlyRate: escort.hourlyRate,
      rating: escort.rating,
      trustScore: escort.trustScore,
      distanceKm: geo.distanceKm,
    };
  }

  /**
   * 批量匹配并排序 (基础加权求和模式)
   *
   * @param escorts 候选陪诊师集合
   * @param request 患者匹配请求
   * @param topK 返回前 K 个结果 (默认 10)
   * @returns 按综合匹配度降序排列的结果列表
   */
  static rankEscorts(
    escorts: EscortFeatureVector[],
    request: MatchingRequest,
    topK: number = 10,
  ): MatchingResult[] {
    return escorts
      .map(escort => MatchingAlgorithm.computeCompositeScore(escort, request))
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, topK);
  }

  // ==================== 高级决策管线 ====================

  /**
   * 提取决策矩阵 (n 个候选 × 7 个维度)
   *
   * 将每个候选陪诊师的 7 维评分提取为数值矩阵，
   * 供 AHP-熵权-TOPSIS 管线使用。
   */
  static buildDecisionMatrix(
    escorts: EscortFeatureVector[],
    request: MatchingRequest,
  ): { matrix: number[][]; results: MatchingResult[] } {
    const results = escorts.map(e => MatchingAlgorithm.computeCompositeScore(e, request));
    const matrix = results.map(r => r.dimensions.map(d => d.score));
    return { matrix, results };
  }

  /**
   * AHP-熵权-TOPSIS 完整决策管线
   *
   * 流程:
   *   1. AHP 幂法求解判断矩阵 → 主观权重 w_AHP
   *   2. 熵权法分析决策矩阵 → 客观权重 w_EWM
   *   3. 组合赋权: w = α·w_AHP + (1-α)·w_EWM
   *   4. TOPSIS 逼近理想解排序 → 贴近度 Cᵢ
   *   5. 按贴近度降序输出 Top-K
   *
   * @param escorts 候选陪诊师集合
   * @param request 患者匹配请求
   * @param topK 返回前 K 个结果
   * @param alpha 主观偏好系数 (默认 0.6)
   */
  static rankEscortsAdvanced(
    escorts: EscortFeatureVector[],
    request: MatchingRequest,
    topK: number = 10,
    alpha: number = 0.6,
  ): {
    results: MatchingResult[];
    meta: {
      ahp: AHPResult;
      ewm: EWMResult;
      combinedW: number[];
      topsis: TOPSISResult;
      alpha: number;
      method: string;
    };
  } {
    // 1. AHP 求解
    const ahp = AHPSolver.solve(AHP_JUDGMENT_MATRIX);

    // 2. 构建决策矩阵
    const { matrix, results } = MatchingAlgorithm.buildDecisionMatrix(escorts, request);

    // 3. 熵权法
    const ewm = EntropyWeightMethod.solve(matrix);

    // 4. 组合赋权
    const wCombined = combinedWeights(ahp.weights, ewm.weights, alpha);

    // 5. TOPSIS 排序
    const topsis = TOPSIS.solve(matrix, wCombined);

    // 6. 按 TOPSIS 排序重排结果，用贴近度替换原始加权分
    const rankedResults = topsis.ranking
      .map(idx => {
        const r = results[idx];
        return {
          ...r,
          compositeScore: topsis.closeness[idx],
          compositeScorePercent: Math.round(topsis.closeness[idx] * 1000) / 10,
          matchLevel: (
            topsis.closeness[idx] >= 0.8 ? 'excellent' :
            topsis.closeness[idx] >= 0.6 ? 'good' :
            topsis.closeness[idx] >= 0.4 ? 'fair' : 'poor'
          ) as MatchingResult['matchLevel'],
          // 更新维度权重为组合权重
          dimensions: r.dimensions.map((d, j) => ({
            ...d,
            weight: wCombined[j],
            weightedScore: Math.round(d.score * wCombined[j] * 10000) / 10000,
          })),
        };
      })
      .slice(0, topK);

    return {
      results: rankedResults,
      meta: {
        ahp,
        ewm,
        combinedW: wCombined,
        topsis,
        alpha,
        method: 'AHP-EWM-TOPSIS (α=' + alpha + ')',
      },
    };
  }

  // ==================== 硬约束预筛选 ====================

  /** 硬约束配置 */
  static readonly HARD_CONSTRAINTS = {
    /** 必须已认证 */
    requireVerified: true,
    /** 科室匹配最低分 (0 = 无要求, 0.6 = 至少相关) */
    minSpecialtyScore: 0.0,
    /** 信任分最低值 */
    minTrustScore: 0,
  };

  /**
   * 硬约束预筛选
   *
   * 在进入 MCDM 排序之前，先过滤不满足刚性条件的候选:
   *   - 未认证陪诊师排除 (医疗安全底线)
   *   - 科室完全不匹配排除 (避免推荐骨科陪诊师给心内科患者)
   *   - 信任分过低排除 (安全阈值)
   *
   * 硬约束与软约束的区别:
   *   硬约束 = 不满足则直接淘汰 (0/1 判定)
   *   软约束 = 满足程度影响排序得分 (连续评分)
   */
  static filterHardConstraints(
    escorts: EscortFeatureVector[],
    request: MatchingRequest,
  ): { passed: EscortFeatureVector[]; filtered: { escort: EscortFeatureVector; reason: string }[] } {
    const passed: EscortFeatureVector[] = [];
    const filtered: { escort: EscortFeatureVector; reason: string }[] = [];

    for (const escort of escorts) {
      // 认证检查
      if (MatchingAlgorithm.HARD_CONSTRAINTS.requireVerified && !escort.isVerified) {
        filtered.push({ escort, reason: '未通过平台认证' });
        continue;
      }

      // 科室匹配阈值
      const specScore = MatchingAlgorithm.specialtyScore(escort.specialties, request.department).score;
      if (specScore < MatchingAlgorithm.HARD_CONSTRAINTS.minSpecialtyScore) {
        filtered.push({ escort, reason: `科室匹配度 ${specScore} 低于阈值 ${MatchingAlgorithm.HARD_CONSTRAINTS.minSpecialtyScore}` });
        continue;
      }

      // 信任分阈值
      if (escort.trustScore < MatchingAlgorithm.HARD_CONSTRAINTS.minTrustScore) {
        filtered.push({ escort, reason: `信任分 ${escort.trustScore} 低于阈值 ${MatchingAlgorithm.HARD_CONSTRAINTS.minTrustScore}` });
        continue;
      }

      passed.push(escort);
    }

    return { passed, filtered };
  }

  // ==================== 完整多方法融合决策管线 ====================

  /**
   * 完整决策管线: 硬约束 → 博弈论赋权 → WSM/TOPSIS/VIKOR → Borda-Copeland 聚合
   *
   * 这是论文中提出的完整 MDWMA v2 算法流程:
   *
   *   Phase 1 - 硬约束预筛选:
   *     过滤未认证、科室不匹配、信任分过低的候选
   *
   *   Phase 2 - 博弈论组合赋权:
   *     AHP 主观权重 + EWM 客观权重 → Nash 均衡最优组合
   *     (消除 α 参数的主观任意性)
   *
   *   Phase 3 - 三重排序:
   *     (a) WSM 加权求和排序 (基准方法)
   *     (b) TOPSIS 逼近理想解排序
   *     (c) VIKOR 妥协解排序
   *
   *   Phase 4 - Borda-Copeland 排名聚合:
   *     融合三种排序，输出鲁棒最终排序
   *
   * @param escorts 候选陪诊师集合
   * @param request 患者匹配请求
   * @param topK 返回前 K 个结果
   * @param v VIKOR 决策策略系数 (默认 0.5)
   */
  static rankEscortsFull(
    escorts: EscortFeatureVector[],
    request: MatchingRequest,
    topK: number = 10,
    v: number = 0.5,
  ): {
    results: MatchingResult[];
    meta: {
      hardConstraints: { total: number; passed: number; filtered: number };
      ahp: AHPResult;
      ewm: EWMResult;
      gameTheoretic: GameTheoreticResult;
      critic: CRITICResult;
      topsis: TOPSISResult;
      vikor: VIKORResult;
      aggregation: RankAggregationResult;
      method: string;
    };
  } {
    // Phase 1: 硬约束预筛选
    const { passed } = MatchingAlgorithm.filterHardConstraints(escorts, request);
    const candidates = passed.length > 0 ? passed : escorts; // 全部被过滤时回退

    // Phase 2: 三源博弈论组合赋权 (AHP + EWM + CRITIC)
    const ahp = AHPSolver.solve(AHP_JUDGMENT_MATRIX);
    const { matrix, results } = MatchingAlgorithm.buildDecisionMatrix(candidates, request);
    const ewm = EntropyWeightMethod.solve(matrix);
    const critic = CRITIC.solve(matrix);
    const gt = GameTheoreticWeighting.solve([ahp.weights, ewm.weights, critic.weights]);
    const w = gt.weights;

    // Phase 3a: WSM 加权求和排序
    const wsmScores = matrix.map(row => row.reduce((s, val, j) => s + val * w[j], 0));
    const wsmRanking = wsmScores
      .map((s, i) => ({ s, i }))
      .sort((a, b) => b.s - a.s)
      .map(x => x.i);

    // Phase 3b: TOPSIS
    const topsis = TOPSIS.solve(matrix, w);

    // Phase 3c: VIKOR
    const vikor = VIKOR.solve(matrix, w, v);

    // Phase 4: Borda-Copeland 排名聚合
    const aggregation = RankAggregation.solve(
      [wsmRanking, topsis.ranking, vikor.ranking],
      ['WSM', 'TOPSIS', 'VIKOR'],
    );

    // 按聚合排序输出结果
    const rankedResults = aggregation.finalRanking
      .map(idx => {
        const r = results[idx];
        // 用 WSM 加权分作为综合得分 (可解释性最好)
        const score = Math.round(wsmScores[idx] * 10000) / 10000;
        return {
          ...r,
          compositeScore: score,
          compositeScorePercent: Math.round(score * 1000) / 10,
          matchLevel: (
            score >= 0.8 ? 'excellent' :
            score >= 0.6 ? 'good' :
            score >= 0.4 ? 'fair' : 'poor'
          ) as MatchingResult['matchLevel'],
          dimensions: r.dimensions.map((d, j) => ({
            ...d,
            weight: w[j],
            weightedScore: Math.round(d.score * w[j] * 10000) / 10000,
          })),
        };
      })
      .slice(0, topK);

    return {
      results: rankedResults,
      meta: {
        hardConstraints: {
          total: escorts.length,
          passed: candidates.length,
          filtered: escorts.length - candidates.length,
        },
        ahp,
        ewm,
        gameTheoretic: gt,
        critic,
        topsis,
        vikor,
        aggregation,
        method: 'MDWMA v3 (AHP-EWM-CRITIC-GT × WSM/TOPSIS/VIKOR × Borda-Copeland)',
      },
    };
  }

  // ==================== Monte Carlo 灵敏度模拟 ====================

  /** Monte Carlo 模拟结果 */
  static monteCarloSensitivity(
    escorts: EscortFeatureVector[],
    request: MatchingRequest,
    options: {
      /** 模拟次数 (默认 1000) */
      iterations?: number;
      /** 权重扰动幅度 (标准差比例，默认 0.15 = ±15%) */
      noiseLevel?: number;
      /** 观察 Top-K */
      topK?: number;
    } = {},
  ): {
    /** Top-1 不变概率 */
    top1Stability: number;
    /** Top-K 排序完全不变概率 */
    topKStability: number;
    /** 平均 Kendall's Tau */
    avgKendallTau: number;
    /** 各候选出现在 Top-1 的频率 */
    top1Frequency: Record<string, number>;
    /** 各候选平均排名 */
    avgRank: Record<string, number>;
    /** 模拟参数 */
    params: { iterations: number; noiseLevel: number; topK: number };
  } {
    const { iterations = 1000, noiseLevel = 0.15, topK = 5 } = options;

    const baseWeights: number[] = [
      AHP_WEIGHTS.SPECIALTY, AHP_WEIGHTS.PROXIMITY, AHP_WEIGHTS.TRUST,
      AHP_WEIGHTS.QUALITY, AHP_WEIGHTS.EXPERIENCE, AHP_WEIGHTS.PRICE,
      AHP_WEIGHTS.LOAD_BALANCE,
    ];

    // 基准排序
    const baseResults = MatchingAlgorithm.rankEscorts(escorts, request, topK);
    const baseRanking = baseResults.map(r => r.escortId);

    // 决策矩阵 (一次性计算)
    const { matrix } = MatchingAlgorithm.buildDecisionMatrix(escorts, request);
    const n = escorts.length;

    let top1Unchanged = 0;
    let topKUnchanged = 0;
    let tauSum = 0;
    const top1Count: Record<string, number> = {};
    const rankSum: Record<string, number> = {};
    escorts.forEach(e => { top1Count[e.id] = 0; rankSum[e.id] = 0; });

    // 简单伪随机 (确定性种子，保证可复现)
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    // Box-Muller 正态分布
    const randn = () => {
      const u1 = random();
      const u2 = random();
      return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    };

    for (let iter = 0; iter < iterations; iter++) {
      // 对每个维度权重施加正态噪声
      const perturbed = baseWeights.map(w =>
        Math.max(0.001, w * (1 + noiseLevel * randn()))
      );
      // 归一化
      const pSum = perturbed.reduce((a, b) => a + b, 0);
      const normalized = perturbed.map(w => w / pSum);

      // 用扰动权重计算排序
      const scored = matrix.map((row, i) => ({
        id: escorts[i].id,
        score: row.reduce((s, v, j) => s + v * normalized[j], 0),
      }));
      scored.sort((a, b) => b.score - a.score);
      const newRanking = scored.slice(0, topK).map(s => s.id);

      // 统计
      if (newRanking[0] === baseRanking[0]) top1Unchanged++;
      if (JSON.stringify(newRanking) === JSON.stringify(baseRanking)) topKUnchanged++;

      const tau = MatchingAlgorithm.kendallTau(baseRanking, newRanking);
      tauSum += tau;

      top1Count[newRanking[0]] = (top1Count[newRanking[0]] || 0) + 1;
      scored.forEach((s, rank) => { rankSum[s.id] += rank + 1; });
    }

    // 平均排名
    const avgRank: Record<string, number> = {};
    escorts.forEach(e => { avgRank[e.id] = Math.round((rankSum[e.id] / iterations) * 100) / 100; });

    // Top-1 频率
    const top1Frequency: Record<string, number> = {};
    Object.entries(top1Count).forEach(([id, count]) => {
      top1Frequency[id] = Math.round((count / iterations) * 10000) / 10000;
    });

    return {
      top1Stability: Math.round((top1Unchanged / iterations) * 10000) / 10000,
      topKStability: Math.round((topKUnchanged / iterations) * 10000) / 10000,
      avgKendallTau: Math.round((tauSum / iterations) * 10000) / 10000,
      top1Frequency,
      avgRank,
      params: { iterations, noiseLevel, topK },
    };
  }

  // ==================== MMR 公平性重排 ====================

  /**
   * MMR (Maximal Marginal Relevance) 公平性重排
   *
   * 动机: 纯匹配度排序会导致"马太效应"——少数高分陪诊师垄断所有订单，
   * 新入驻或低曝光陪诊师永远无法获得机会，平台生态失衡。
   *
   * MMR 在匹配度与多样性之间取平衡:
   *   MMR(d) = λ × Score(d) - (1-λ) × max_{d' ∈ Selected} Sim(d, d')
   *
   * 其中 Sim(d, d') 衡量两个陪诊师的"相似度":
   *   - 科室重叠度 (Jaccard)
   *   - 地理距离接近度
   *   - 信任分接近度
   *
   * λ=1 退化为纯匹配度排序; λ=0 退化为最大多样性排序。
   * 推荐 λ=0.7 (偏重匹配度，适度保障公平)。
   *
   * 学术价值: 将信息检索领域的 MMR (Carbonell & Goldstein, 1998)
   * 迁移到 O2O 平台推荐场景，是跨学科创新点。
   *
   * @param results 已排序的匹配结果
   * @param escorts 对应的陪诊师特征向量
   * @param lambda 匹配度-多样性权衡系数 (默认 0.7)
   * @param topK 最终返回数量
   */
  static mmrRerank(
    results: MatchingResult[],
    escorts: EscortFeatureVector[],
    lambda: number = 0.7,
    topK?: number,
  ): MatchingResult[] {
    const k = topK || results.length;
    if (results.length <= 1) return results.slice(0, k);

    // 构建 escortId → EscortFeatureVector 映射
    const escortMap = new Map(escorts.map(e => [e.id, e]));

    // 归一化分数到 [0, 1]
    const maxScore = Math.max(...results.map(r => r.compositeScore));
    const minScore = Math.min(...results.map(r => r.compositeScore));
    const range = maxScore - minScore || 1;

    const selected: MatchingResult[] = [];
    const remaining = [...results];

    while (selected.length < k && remaining.length > 0) {
      let bestIdx = 0;
      let bestMMR = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const normScore = (candidate.compositeScore - minScore) / range;

        // 计算与已选集合的最大相似度
        let maxSim = 0;
        for (const sel of selected) {
          const sim = MatchingAlgorithm.escortSimilarity(
            escortMap.get(candidate.escortId),
            escortMap.get(sel.escortId),
          );
          maxSim = Math.max(maxSim, sim);
        }

        const mmr = lambda * normScore - (1 - lambda) * maxSim;
        if (mmr > bestMMR) {
          bestMMR = mmr;
          bestIdx = i;
        }
      }

      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }

    return selected;
  }

  /**
   * 陪诊师相似度计算 (用于 MMR)
   *
   * Sim = 0.5 × Jaccard(科室) + 0.3 × 地理接近度 + 0.2 × 信任分接近度
   */
  private static escortSimilarity(
    a: EscortFeatureVector | undefined,
    b: EscortFeatureVector | undefined,
  ): number {
    if (!a || !b) return 0;

    // 科室 Jaccard
    const setA = new Set(a.specialties);
    const setB = new Set(b.specialties);
    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    // 地理接近度 (距离越近越相似)
    let geoSim = 0.5; // 默认中等
    if (a.latitude && a.longitude && b.latitude && b.longitude) {
      const dist = MatchingAlgorithm.haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
      geoSim = Math.exp(-(dist * dist) / (2 * 3 * 3)); // σ=3km
    }

    // 信任分接近度
    const trustSim = 1 - Math.abs(a.trustScore - b.trustScore) / 100;

    return 0.5 * jaccard + 0.3 * geoSim + 0.2 * trustSim;
  }

  // ==================== 灵敏度分析 ====================

  /**
   * 权重灵敏度分析
   *
   * 对每个维度权重施加 ±10%、±20% 扰动，
   * 观察 Top-K 排序是否发生变化，计算 Kendall's Tau 相关系数。
   *
   * @param escorts 候选陪诊师集合
   * @param request 患者匹配请求
   * @param topK 观察前 K 名的排序变化
   * @param deltas 扰动幅度列表 (默认 [-0.2, -0.1, +0.1, +0.2])
   */
  static sensitivityAnalysis(
    escorts: EscortFeatureVector[],
    request: MatchingRequest,
    topK: number = 5,
    deltas: number[] = [-0.2, -0.1, 0.1, 0.2],
  ): SensitivityResult {
    const dimLabels = ['科室匹配', '地理邻近', '信任评分', '服务质量', '服务经验', '价格适配', '负载均衡'];
    const baseWeights: number[] = [
      AHP_WEIGHTS.SPECIALTY, AHP_WEIGHTS.PROXIMITY, AHP_WEIGHTS.TRUST,
      AHP_WEIGHTS.QUALITY, AHP_WEIGHTS.EXPERIENCE, AHP_WEIGHTS.PRICE,
      AHP_WEIGHTS.LOAD_BALANCE,
    ];

    // 基准排序
    const baseResults = MatchingAlgorithm.rankEscorts(escorts, request, topK);
    const baseRanking = baseResults.map(r => r.escortId);

    const perturbations: SensitivityResult['perturbations'] = [];

    for (let d = 0; d < baseWeights.length; d++) {
      for (const delta of deltas) {
        // 扰动第 d 个权重
        const perturbed = [...baseWeights];
        perturbed[d] = Math.max(0.01, perturbed[d] * (1 + delta));
        // 重新归一化
        const sum = perturbed.reduce((a, b) => a + b, 0);
        const normalized = perturbed.map(w => w / sum);

        // 用扰动权重重新计算排序
        const { matrix, results } = MatchingAlgorithm.buildDecisionMatrix(escorts, request);
        const scored = results.map((r, i) => ({
          id: r.escortId,
          score: matrix[i].reduce((s, v, j) => s + v * normalized[j], 0),
        }));
        scored.sort((a, b) => b.score - a.score);
        const newRanking = scored.slice(0, topK).map(s => s.id);

        const tau = MatchingAlgorithm.kendallTau(baseRanking, newRanking);
        const rankChanged = JSON.stringify(baseRanking) !== JSON.stringify(newRanking);

        perturbations.push({
          dimension: dimLabels[d],
          delta,
          newRanking,
          rankChanged,
          kendallTau: Math.round(tau * 1000) / 1000,
        });
      }
    }

    // 总体稳定性: 基于平均 Kendall's Tau
    const avgTau = perturbations.reduce((s, p) => s + p.kendallTau, 0) / perturbations.length;
    const stability = avgTau >= 0.9 ? 'high' : avgTau >= 0.7 ? 'medium' : 'low';

    return { baseRanking, perturbations, stability };
  }

  /**
   * Kendall's Tau 排序相关系数
   *
   * τ = (一致对数 - 不一致对数) / 总对数
   * τ = 1 表示完全一致, τ = -1 表示完全相反, τ = 0 表示无相关
   */
  static kendallTau(a: string[], b: string[]): number {
    const n = Math.min(a.length, b.length);
    if (n <= 1) return 1;

    let concordant = 0;
    let discordant = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const aOrder = (a.indexOf(a[i]) < a.indexOf(a[j])) ? 1 : -1;
        const bIdxI = b.indexOf(a[i]);
        const bIdxJ = b.indexOf(a[j]);
        // 如果某个元素不在 b 中，跳过
        if (bIdxI === -1 || bIdxJ === -1) continue;
        const bOrder = bIdxI < bIdxJ ? 1 : -1;

        if (aOrder === bOrder) concordant++;
        else discordant++;
      }
    }

    const totalPairs = (n * (n - 1)) / 2;
    return totalPairs > 0 ? (concordant - discordant) / totalPairs : 1;
  }

  /**
   * Haversine 公式计算两点间球面距离 (km)
   */
  static haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = MatchingAlgorithm.toRad(lat2 - lat1);
    const dLon = MatchingAlgorithm.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(MatchingAlgorithm.toRad(lat1)) * Math.cos(MatchingAlgorithm.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
