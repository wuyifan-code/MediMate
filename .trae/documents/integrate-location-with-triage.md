# AI导诊与定位集成计划

## 目标
将用户位置信息传递给AI导诊API，实现基于地理位置的智能医疗建议推荐。

## 当前状态

### 现有功能
| 功能 | 参数 | 位置 |
|------|------|------|
| AI导诊 | `symptoms` | aiService.ts, PatientDashboard.tsx |
| 位置获取 | navigator.geolocation | PatientDashboard.tsx (L159-184) |
| 附近陪诊师 | `latitude`, `longitude`, `radius` | escortService.ts |

### 问题
- AI导诊API仅接受症状，无法考虑用户地理位置
- 无法根据位置推荐附近的医院/陪诊师

## 修改计划

### 1. 修改后端DTO
**文件**: `server/src/modules/ai/dto/ai.dto.ts`

新增可选的位置参数：
```typescript
export class TriageRequestDto {
  @ApiProperty()
  @IsString()
  symptoms: string;
  
  @ApiPropertyOptional()
  @IsNumber()
  latitude?: number;
  
  @ApiPropertyOptional()
  @IsNumber()
  longitude?: number;
}
```

### 2. 修改后端AI服务
**文件**: `server/src/modules/ai/ai.service.ts`

更新prompt，包含位置感知能力：
```typescript
async getHealthTriage(dto: TriageRequestDto): Promise<string> {
  let locationContext = '';
  
  if (dto.latitude && dto.longitude) {
    locationContext = `\n\nUser Location: latitude ${dto.latitude}, longitude ${dto.longitude}. 
    Consider recommending hospitals or medical resources near this location.`;
  }
  
  const prompt = [
    {
      role: 'user',
      content:
        `You are a professional medical triage assistant.
        Based on the user's symptoms, provide:
        1. Recommended hospital department
        2. Preparation advice
        3. One warm tip
        ${locationContext}
        Symptoms: ${dto.symptoms}
        
        Keep the answer concise and practical. No thinking tags, no markdown.`,
    },
  ];
  // ...
}
```

### 3. 修改前端API调用
**文件**: `services/aiService.ts`

新增可选位置参数：
```typescript
export const getHealthTriage = async (
  symptoms: string,
  location?: { latitude: number; longitude: number }
): Promise<string> => {
  try {
    const response = await aiClient.post('/ai/triage', {
      symptoms,
      ...location
    });
    return response.data?.data?.text || '...';
  } catch (error) {
    // ...
  }
};
```

### 4. 修改前端组件
**文件**: `components/patient/PatientDashboard.tsx`

传递位置信息到AI导诊：
```typescript
const handleAIChat = async () => {
  if (!symptoms.trim()) return;
  setAiLoading(true);
  
  // 获取位置（已有代码）
  let userLocation: { latitude: number; longitude: number } | undefined;
  if (navigator.geolocation) {
    // ... 位置获取逻辑
  }
  
  try {
    const advice = await getHealthTriage(symptoms, userLocation);
    setAiAdvice(advice);
  } catch (error) {
    // ...
  }
};
```

## 预期效果

### 修改前
```
AI导诊: "根据您的头痛症状，建议就诊神经内科..."
```

### 修改后
```
AI导诊: "根据您在贵阳市云岩区的位置，推荐就诊贵州省人民医院神经内科...
距离您约3公里，该科室为省级重点专科...准备建议..."
```

## 文件清单

| 文件 | 操作 |
|------|------|
| server/src/modules/ai/dto/ai.dto.ts | 修改：添加位置参数 |
| server/src/modules/ai/ai.service.ts | 修改：更新prompt包含位置信息 |
| services/aiService.ts | 修改：API调用传递位置 |
| components/patient/PatientDashboard.tsx | 修改：获取并传递位置 |
