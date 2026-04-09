# 修复API问题 Spec

## Why
系统显示"由于网络异常或未配置API Key"错误，导致AI功能无法正常工作。经检查，MiniMax API的基础URL配置错误，导致API调用失败。

## What Changes
- 修正MiniMax API的基础URL配置，从'https://api.minimaxi.com/v1'改为'https://api.minimax.chat/v1'
- 确保API Key配置正确且能正常读取
- 优化错误处理和日志记录，提高系统稳定性

## Impact
- Affected specs: AI服务功能
- Affected code: server/src/modules/ai/providers/minimax.provider.ts

## ADDED Requirements
### Requirement: API Configuration Validation
The system SHALL validate API configuration on startup and log any issues

#### Scenario: Success case
- **WHEN** system starts up
- **THEN** API configuration is validated and logged

## MODIFIED Requirements
### Requirement: MiniMax API Provider
The MiniMax API provider SHALL use the correct API endpoint URL

#### Scenario: API Call Success
- **WHEN** AI service calls MiniMax API
- **THEN** API request is sent to the correct endpoint
