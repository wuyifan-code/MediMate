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

// ==================== 组合赋权 ====================

/**
 * AHP-熵权组合赋权
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
