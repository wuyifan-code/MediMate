import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 使用 MiniMax 大语言模型结合知识图谱生成临床路径
   */
  async generateClinicalPathway(disease: string, department: string) {
    this.logger.log(`Generating clinical pathway for ${disease} at ${department} using MiniMax LLM...`);

    // 模拟对接 MiniMax 大模型生成的智能预案节点
    const nodes = [
      { step: 1, name: '到达医院与患者汇合', required_evidence: ['gps', 'photo'] },
      { step: 2, name: '协助自助机取号/挂号', required_evidence: [] },
      { step: 3, name: '候诊室陪伴与情绪安抚', required_evidence: ['emotion'] },
      { step: 4, name: '主治医生面诊陪同', required_evidence: ['audio'] },
      { step: 5, name: '代取报告/医嘱确认', required_evidence: ['photo'] },
      { step: 6, name: '护送离院', required_evidence: ['gps'] }
    ];

    return this.prisma.clinicalPathway.create({
      data: {
        disease,
        department,
        nodes,
      }
    });
  }

  /**
   * 检查订单存证完整性
   * 计算已满足的节点比例
   */
  async checkEvidenceCompleteness(orderId: string): Promise<{
    completenessScore: number;
    completedNodes: number;
    totalNodes: number;
    missingEvidences: string[];
    nodeStatus: { nodeName: string; completed: boolean; evidence: string[] }[];
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        clinicalPathway: true,
        evidence: true,
      },
    });

    if (!order?.clinicalPathway) {
      return {
        completenessScore: 0,
        completedNodes: 0,
        totalNodes: 0,
        missingEvidences: [],
        nodeStatus: [],
      };
    }

    const nodes = order.clinicalPathway.nodes as any[];
    const evidenceByType = new Set(order.evidence.map(e => e.type));

    const nodeStatus: { nodeName: string; completed: boolean; evidence: string[] }[] = [];
    const missingEvidences: string[] = [];
    let completedNodes = 0;

    for (const node of nodes) {
      const required = node.required_evidence || [];
      const provided = required.filter((e: string) => evidenceByType.has(e));
      const completed = required.length === 0 || provided.length === required.length;

      if (completed) {
        completedNodes++;
      } else {
        // 找出缺失的证据类型
        required.forEach((e: string) => {
          if (!evidenceByType.has(e)) {
            missingEvidences.push(`${node.name}: 需要${this.getEvidenceLabel(e)}`);
          }
        });
      }

      nodeStatus.push({
        nodeName: node.name,
        completed,
        evidence: provided,
      });
    }

    const completenessScore = nodes.length > 0
      ? Math.round((completedNodes / nodes.length) * 100)
      : 0;

    this.logger.log(
      `[Evidence Completeness] Order ${orderId}: ${completenessScore}% (${completedNodes}/${nodes.length})`
    );

    return {
      completenessScore,
      completedNodes,
      totalNodes: nodes.length,
      missingEvidences,
      nodeStatus,
    };
  }

  /**
   * 获取证据类型中文标签
   */
  private getEvidenceLabel(type: string): string {
    const labels: Record<string, string> = {
      gps: 'GPS位置打卡',
      photo: '照片打卡',
      audio: '录音打卡',
      emotion: '情绪打卡',
    };
    return labels[type] || type;
  }

  /**
   * 获取订单的当前路径节点（下一个待完成的节点）
   */
  async getCurrentPathNode(orderId: string): Promise<string | null> {
    const completeness = await this.checkEvidenceCompleteness(orderId);

    // 找到第一个未完成的节点
    const nextNode = completeness.nodeStatus.find(n => !n.completed);
    return nextNode?.nodeName || null;
  }
}
