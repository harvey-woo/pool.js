// 任务相关的工具函数
// 由 TaskCreator 和 PoolExample 共同使用

// Task 基础接口（供 TaskCreator 和 PoolExample 使用）
export interface Task {
  id: number
  name: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: number
  endTime?: number
  backgroundColor: string
  color: string
  resourceName?: string
}

// 工具函数：创建新的任务
export function createTask(
  id: number,
  name: string,
  backgroundColor: string,
  color: string,
  description?: string
): Task {
  return {
    id,
    name,
    description: description || name,
    status: 'pending',
    backgroundColor,
    color
  }
}
